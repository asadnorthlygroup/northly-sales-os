import {
  applyBasisPoints,
  assertReconciled,
  computeInvoiceTotals,
  dollarsToCents,
  formatCents,
  parseProvince,
  PROVINCES,
  reconcile,
  ReconciliationError,
  roundHalfAwayFromZero,
  taxRuleFor,
  UnsupportedProvinceError,
  type InvoicePricingInput,
} from "@/lib/invoice-pricing";

describe("roundHalfAwayFromZero", () => {
  it("rounds a positive half up", () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1);
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
  });

  it("rounds a negative half away from zero, unlike Math.round", () => {
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
  });
});

describe("applyBasisPoints", () => {
  it("computes 13% HST on $1,700.00", () => {
    expect(applyBasisPoints(170_000, 1300)).toBe(22_100);
  });

  it("computes the 3% fee on the $4,520.00 gross of invoice 1765", () => {
    expect(applyBasisPoints(452_000, 300)).toBe(13_560);
  });

  it("rounds a fractional cent half away from zero", () => {
    expect(applyBasisPoints(10_005, 300)).toBe(300);
    expect(applyBasisPoints(10_175, 300)).toBe(305);
  });
});

describe("dollarsToCents", () => {
  it("converts without floating-point drift", () => {
    expect(dollarsToCents(1700)).toBe(170_000);
    expect(dollarsToCents(135.6)).toBe(13_560);
    expect(dollarsToCents(0.07)).toBe(7);
  });
});

describe("formatCents", () => {
  it("formats Canadian dollars with a thousands separator", () => {
    expect(formatCents(192_100)).toBe("$1,921.00");
    expect(formatCents(0)).toBe("$0.00");
  });
});

describe("taxRuleFor", () => {
  it("returns 13% HST for Ontario", () => {
    expect(taxRuleFor("ON").basisPoints).toBe(1300);
    expect(taxRuleFor("ON").qboTaxCodeKey).toBe("HST_ON");
  });

  it("returns 5% GST for British Columbia, matching invoice 1779", () => {
    // The old PROVINCE_TAX table said 12% here, which would have over-billed
    // Rethink by $1,050 on the A&W campaign.
    expect(taxRuleFor("BC").basisPoints).toBe(500);
  });

  it("returns 5% GST for Manitoba, matching invoice 1820", () => {
    expect(taxRuleFor("MB").basisPoints).toBe(500);
    expect(taxRuleFor("MB").qboTaxCodeKey).toBe("GST_MB");
  });

  it("returns 15% HST for the Atlantic HST provinces", () => {
    for (const province of ["NB", "NL", "NS", "PE"] as const) {
      expect(taxRuleFor(province).basisPoints).toBe(1500);
    }
  });

  it("gives every supported province a distinct QuickBooks tax code key", () => {
    const keys = PROVINCES.filter((p) => p !== "QC").map(
      (p) => taxRuleFor(p).qboTaxCodeKey
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("refuses Quebec until QST registration is confirmed", () => {
    expect(() => taxRuleFor("QC")).toThrow(UnsupportedProvinceError);
    expect(() => taxRuleFor("QC")).toThrow(/QST registration/);
  });
});

describe("parseProvince", () => {
  it("accepts a lowercase or padded code", () => {
    expect(parseProvince(" on ")).toBe("ON");
    expect(parseProvince("bc")).toBe("BC");
  });

  it("throws rather than silently defaulting to Ontario", () => {
    // The old route did `PROVINCE_TAX[code] ?? PROVINCE_TAX.ON`, which taxed a
    // typo'd province at 13% without telling anyone.
    expect(() => parseProvince("Ontario")).toThrow(/Unrecognised province/);
    expect(() => parseProvince("")).toThrow(/Unrecognised province/);
    expect(() => parseProvince(null)).toThrow(/Unrecognised province/);
  });
});

const input = (
  overrides: Partial<InvoicePricingInput> = {}
): InvoicePricingInput => ({
  province: "ON",
  paymentMethod: "cheque",
  discountCents: 0,
  lines: [{ quantity: 1, unitPriceCents: 100_000, taxTreatment: "standard" }],
  ...overrides,
});

describe("computeInvoiceTotals", () => {
  it("multiplies quantity by unit price and sums lines", () => {
    const totals = computeInvoiceTotals(
      input({
        lines: [
          { quantity: 24, unitPriceCents: 67_200, taxTreatment: "standard" },
          { quantity: 1, unitPriceCents: 95_000, taxTreatment: "standard" },
        ],
      })
    );
    expect(totals.subtotalCents).toBe(1_707_800);
  });

  it("excludes zero-rated lines from the tax base but not the subtotal", () => {
    const totals = computeInvoiceTotals(
      input({
        lines: [
          { quantity: 1, unitPriceCents: 100_000, taxTreatment: "standard" },
          { quantity: 1, unitPriceCents: 50_000, taxTreatment: "zero_rated" },
        ],
      })
    );
    expect(totals.subtotalCents).toBe(150_000);
    expect(totals.taxableBaseCents).toBe(100_000);
    expect(totals.taxCents).toBe(13_000);
  });

  it("adds no fee for cheque, e-transfer or EFT", () => {
    expect(computeInvoiceTotals(input({ paymentMethod: "cheque" })).feeCents).toBe(0);
    expect(computeInvoiceTotals(input({ paymentMethod: "e_transfer" })).feeCents).toBe(0);
    expect(computeInvoiceTotals(input({ paymentMethod: "eft" })).feeCents).toBe(0);
  });

  it("adds 3% of the tax-inclusive total for a credit card payment", () => {
    const totals = computeInvoiceTotals(input({ paymentMethod: "credit_card" }));
    expect(totals.grossCents).toBe(113_000);
    expect(totals.feeCents).toBe(3_390);
    expect(totals.totalCents).toBe(116_390);
  });

  it("never taxes the processing fee", () => {
    const card = computeInvoiceTotals(input({ paymentMethod: "credit_card" }));
    const cheque = computeInvoiceTotals(input({ paymentMethod: "cheque" }));
    expect(card.taxCents).toBe(cheque.taxCents);
  });

  it("rejects an invoice with no lines", () => {
    expect(() => computeInvoiceTotals(input({ lines: [] }))).toThrow(/at least one line/);
  });

  it("rejects a discount larger than the taxable base", () => {
    expect(() => computeInvoiceTotals(input({ discountCents: 200_000 }))).toThrow(
      /exceeds the taxable base/
    );
  });
});

interface IssuedInvoiceFixture {
  invoiceNumber: string;
  client: string;
  input: InvoicePricingInput;
  expectedTotalCents: number;
  issuedTotalCents: number;
  knownDefect?: string;
}

const ISSUED_INVOICES: IssuedInvoiceFixture[] = [
  {
    invoiceNumber: "1823",
    client: "Jimmy The Greek Incorporated",
    input: {
      province: "ON",
      paymentMethod: "cheque",
      discountCents: 0,
      lines: [{ quantity: 1, unitPriceCents: 170_000, taxTreatment: "standard" }],
    },
    expectedTotalCents: 192_100,
    issuedTotalCents: 192_100,
  },
  {
    invoiceNumber: "1820",
    client: "14249828 Canada Inc O/A Oakberry",
    input: {
      province: "MB",
      paymentMethod: "credit_card",
      discountCents: 85_000,
      lines: [
        { quantity: 1, unitPriceCents: 115_000, taxTreatment: "standard" },
        { quantity: 1, unitPriceCents: 95_000, taxTreatment: "standard" },
        { quantity: 1, unitPriceCents: 75_000, taxTreatment: "standard" },
        { quantity: 6, unitPriceCents: 0, taxTreatment: "zero_rated" },
      ],
    },
    expectedTotalCents: 216_300,
    issuedTotalCents: 216_300,
  },
  {
    invoiceNumber: "1765",
    client: "National Event Management",
    input: {
      province: "ON",
      paymentMethod: "credit_card",
      discountCents: 0,
      lines: [{ quantity: 1, unitPriceCents: 400_000, taxTreatment: "standard" }],
    },
    expectedTotalCents: 465_560,
    issuedTotalCents: 465_500,
    knownDefect:
      "The fee was hand-rounded to $135.00 instead of $135.60, under-billing by 60 cents.",
  },
  {
    invoiceNumber: "1822",
    client: "Boulevard of Dreams PR A/F SHEIN Canada",
    input: {
      province: "ON",
      paymentMethod: "credit_card",
      discountCents: 0,
      lines: [{ quantity: 1, unitPriceCents: 900_000, taxTreatment: "standard" }],
    },
    expectedTotalCents: 1_047_510,
    issuedTotalCents: 1_017_000,
    knownDefect:
      "The processing fee line was omitted entirely from a credit card invoice, losing $305.10.",
  },
  {
    invoiceNumber: "1779",
    client: "Rethink Communications LP",
    input: {
      province: "BC",
      paymentMethod: "eft",
      discountCents: 0,
      lines: [{ quantity: 1, unitPriceCents: 1_500_000, taxTreatment: "standard" }],
    },
    expectedTotalCents: 1_575_000,
    issuedTotalCents: 1_575_000,
  },
];

describe("regression against issued invoices", () => {
  it.each(ISSUED_INVOICES)(
    "reproduces invoice $invoiceNumber ($client)",
    (fixture) => {
      expect(computeInvoiceTotals(fixture.input).totalCents).toBe(
        fixture.expectedTotalCents
      );
    }
  );

  it("agrees with every invoice that was billed correctly", () => {
    const clean = ISSUED_INVOICES.filter((f) => f.knownDefect === undefined);
    expect(clean).toHaveLength(3);
    for (const fixture of clean) {
      expect(computeInvoiceTotals(fixture.input).totalCents).toBe(
        fixture.issuedTotalCents
      );
    }
  });

  it("disagrees with every invoice that carried a known defect", () => {
    const defective = ISSUED_INVOICES.filter((f) => f.knownDefect !== undefined);
    expect(defective).toHaveLength(2);
    for (const fixture of defective) {
      expect(computeInvoiceTotals(fixture.input).totalCents).not.toBe(
        fixture.issuedTotalCents
      );
    }
  });

  it("recovers $305.10 on the invoice that dropped its fee line", () => {
    const shein = ISSUED_INVOICES.find((f) => f.invoiceNumber === "1822")!;
    const recovered =
      computeInvoiceTotals(shein.input).totalCents - shein.issuedTotalCents;
    expect(recovered).toBe(30_510);
  });
});

describe("reconcile", () => {
  it("passes when the two totals match to the cent", () => {
    expect(reconcile(216_300, 216_300).ok).toBe(true);
  });

  it("catches the Oakberry gap: agreement $2,100.00 against invoice $2,163.00", () => {
    const result = reconcile(210_000, 216_300);
    expect(result.ok).toBe(false);
    expect(result.differenceCents).toBe(6_300);
  });

  it("throws a ReconciliationError naming both formatted totals", () => {
    expect(() => assertReconciled(210_000, 216_300, "deal_abc")).toThrow(
      ReconciliationError
    );
    expect(() => assertReconciled(210_000, 216_300, "deal_abc")).toThrow(/\$2,100\.00/);
    expect(() => assertReconciled(210_000, 216_300, "deal_abc")).toThrow(/\$2,163\.00/);
  });

  it("returns silently when the totals match", () => {
    expect(() => assertReconciled(192_100, 192_100, "deal_abc")).not.toThrow();
  });
});
