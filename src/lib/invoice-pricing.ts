/**
 * Northly Group — Invoice Pricing Engine
 *
 * The single source of truth for every figure printed on an agreement or an
 * invoice. Both documents must read this module; neither may recompute.
 *
 * Distinct from lib/pricing.ts, which prices proposal ladders. This module
 * takes settled line items and produces the tax, credit card processing fee
 * and totals that go on the billing documents.
 *
 * Three rules, each fixing a defect found in issued invoices:
 *   1. Money is integer cents. Floats produced $135.00 where $135.60 was due
 *      on invoice 1765.
 *   2. Credit card payments carry a 3% processing fee, zero-rated, calculated
 *      on the tax-inclusive total. Invoice 1822 omitted it and lost $305.10.
 *   3. Tax comes from the client's province via a table, never typed by hand.
 *      Invoice 1820 billed a Manitoba client under a code labelled "GST - BC".
 */

/** A monetary amount in integer cents. Never a fractional value. */
export type Cents = number;

/** 3% of the tax-inclusive total, charged only on credit card payments. */
export const PROCESSING_FEE_BASIS_POINTS = 300;

export type TaxTreatment = "standard" | "zero_rated";
export type PaymentMethod = "credit_card" | "e_transfer" | "cheque" | "eft";

export const PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
] as const;

export type Province = (typeof PROVINCES)[number];

export interface TaxRule {
  /** Combined sales tax rate in basis points. 1300 is 13%. */
  basisPoints: number;
  /** Human-readable label, printed on the agreement and matching the invoice. */
  label: string;
  /**
   * Configuration key resolved to a real QuickBooks TaxCode id at setup.
   * Never a QuickBooks id itself — ids differ per company file.
   */
  qboTaxCodeKey: string;
}

export interface InvoiceLineInput {
  quantity: number;
  unitPriceCents: Cents;
  taxTreatment: TaxTreatment;
}

export interface InvoicePricingInput {
  province: Province;
  paymentMethod: PaymentMethod;
  /** Deal-level discount, applied against the taxable base before tax. */
  discountCents: Cents;
  lines: InvoiceLineInput[];
}

export interface InvoiceTotals {
  /** Sum of every line before any discount. */
  subtotalCents: Cents;
  discountCents: Cents;
  /** The amount tax is calculated on: standard-rated lines, less the discount. */
  taxableBaseCents: Cents;
  taxCents: Cents;
  /** Subtotal less discount, plus tax. The basis for the processing fee. */
  grossCents: Cents;
  feeCents: Cents;
  totalCents: Cents;
  taxLabel: string;
}

export class UnsupportedProvinceError extends Error {
  constructor(province: Province, reason: string) {
    super(`Cannot price a deal in ${province}: ${reason}`);
    this.name = "UnsupportedProvinceError";
  }
}

/**
 * Rounds half away from zero, the convention Canadian invoicing uses.
 * Math.round rounds -0.5 to -0, which silently under-bills credit notes.
 */
export function roundHalfAwayFromZero(value: number): Cents {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Applies a basis-point rate to a base amount. 1300 basis points is 13%. */
export function applyBasisPoints(base: Cents, basisPoints: number): Cents {
  return roundHalfAwayFromZero((base * basisPoints) / 10_000);
}

/** Converts a dollar figure to cents without accumulating float error. */
export function dollarsToCents(dollars: number): Cents {
  return roundHalfAwayFromZero(dollars * 100);
}

/** Converts cents back to dollars for the QuickBooks API, which wants decimals. */
export function centsToDollars(cents: Cents): number {
  return cents / 100;
}

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  currencyDisplay: "narrowSymbol",
});

/** Formats cents for display on an agreement or an invoice. */
export function formatCents(cents: Cents): string {
  return CAD.format(cents / 100);
}

const GST = (province: Province): TaxRule => ({
  basisPoints: 500,
  label: `GST (${province}) @ 5%`,
  qboTaxCodeKey: `GST_${province}`,
});

const HST = (province: Province, basisPoints: number): TaxRule => ({
  basisPoints,
  label: `HST (${province}) @ ${basisPoints / 100}%`,
  qboTaxCodeKey: `HST_${province}`,
});

/**
 * Rates reflect what finance actually issues: advertising services are billed
 * GST-only in the GST provinces. Invoice 1779 (BC) and invoice 1820 (MB) were
 * both taxed at 5%, not the 12% the old PROVINCE_TAX table would have applied.
 */
const TAX_TABLE: Record<Exclude<Province, "QC">, TaxRule> = {
  ON: HST("ON", 1300),
  NB: HST("NB", 1500),
  NL: HST("NL", 1500),
  NS: HST("NS", 1500),
  PE: HST("PE", 1500),
  AB: GST("AB"),
  BC: GST("BC"),
  MB: GST("MB"),
  SK: GST("SK"),
  NT: GST("NT"),
  NU: GST("NU"),
  YT: GST("YT"),
};

/** Resolves the sales tax rule for a client's province. */
export function taxRuleFor(province: Province): TaxRule {
  if (province === "QC") {
    throw new UnsupportedProvinceError(
      "QC",
      "Quebec requires GST plus 9.975% QST, and QST registration has not been confirmed. " +
        "Confirm registration, then add a QC entry to the tax table."
    );
  }
  return TAX_TABLE[province];
}

/** Narrows a free-text province code, throwing rather than silently defaulting. */
export function parseProvince(value: string | null | undefined): Province {
  const code = (value ?? "").trim().toUpperCase();
  if ((PROVINCES as readonly string[]).includes(code)) return code as Province;
  throw new Error(
    `Unrecognised province "${value}". Expected one of: ${PROVINCES.join(", ")}.`
  );
}

/**
 * Computes every figure that appears on the agreement and the invoice.
 */
export function computeInvoiceTotals(input: InvoicePricingInput): InvoiceTotals {
  if (input.lines.length === 0) {
    throw new Error("An invoice needs at least one line.");
  }

  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error(
        `Line quantity must be a whole number of 1 or more, got ${line.quantity}.`
      );
    }
    if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) {
      throw new Error(
        `Line unit price must be a non-negative whole number of cents, got ${line.unitPriceCents}.`
      );
    }
  }

  if (!Number.isInteger(input.discountCents) || input.discountCents < 0) {
    throw new Error(
      `Discount must be a non-negative whole number of cents, got ${input.discountCents}.`
    );
  }

  const rule = taxRuleFor(input.province);

  const lineTotal = (line: InvoiceLineInput): Cents =>
    line.quantity * line.unitPriceCents;

  const subtotalCents = input.lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const standardCents = input.lines
    .filter((line) => line.taxTreatment === "standard")
    .reduce((sum, line) => sum + lineTotal(line), 0);

  if (input.discountCents > standardCents) {
    throw new Error(
      `Discount of ${input.discountCents} cents exceeds the taxable base of ${standardCents} cents.`
    );
  }

  const taxableBaseCents = standardCents - input.discountCents;
  const taxCents = applyBasisPoints(taxableBaseCents, rule.basisPoints);
  const grossCents = subtotalCents - input.discountCents + taxCents;

  const feeCents =
    input.paymentMethod === "credit_card"
      ? applyBasisPoints(grossCents, PROCESSING_FEE_BASIS_POINTS)
      : 0;

  return {
    subtotalCents,
    discountCents: input.discountCents,
    taxableBaseCents,
    taxCents,
    grossCents,
    feeCents,
    totalCents: grossCents + feeCents,
    taxLabel: rule.label,
  };
}

export interface ReconciliationResult {
  ok: boolean;
  expectedCents: Cents;
  actualCents: Cents;
  /** Absolute difference, always non-negative. */
  differenceCents: Cents;
}

export class ReconciliationError extends Error {
  readonly expectedCents: Cents;
  readonly actualCents: Cents;
  readonly differenceCents: Cents;

  constructor(result: ReconciliationResult, context: string) {
    super(
      `Agreement and invoice disagree on ${context}: ` +
        `the agreement totals ${formatCents(result.expectedCents)} but the invoice totals ` +
        `${formatCents(result.actualCents)}, a difference of ${formatCents(result.differenceCents)}. ` +
        "Nothing was sent."
    );
    this.name = "ReconciliationError";
    this.expectedCents = result.expectedCents;
    this.actualCents = result.actualCents;
    this.differenceCents = result.differenceCents;
  }
}

/** Compares the agreement total against the QuickBooks invoice total. */
export function reconcile(
  expectedCents: Cents,
  actualCents: Cents
): ReconciliationResult {
  const differenceCents = Math.abs(expectedCents - actualCents);
  return { ok: differenceCents === 0, expectedCents, actualCents, differenceCents };
}

/** Throws unless the two documents agree to the cent. */
export function assertReconciled(
  expectedCents: Cents,
  actualCents: Cents,
  context: string
): void {
  const result = reconcile(expectedCents, actualCents);
  if (!result.ok) {
    throw new ReconciliationError(result, context);
  }
}
