/**
 * Northly Group — QuickBooks invoice operations.
 *
 * Extracted so the API route and the document orchestrator share one
 * implementation. Amounts always come from lib/invoice-pricing; nothing here
 * computes tax or fees.
 */

import { qbFetch } from "./quickbooks";
import { centsToDollars, type InvoiceTotals, type Province } from "./invoice-pricing";
import {
  assertAutoNumbering,
  fetchTaxCodes,
  taxCodeForProvince,
  zeroRatedTaxCode,
} from "./qbo-tax-codes";

/** Escapes a value for a QuickBooks query string literal. */
export function escapeQboLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export interface QboInvoiceSummary {
  qboInvoiceId: string;
  invoiceNumber: string;
  totalCents: number;
  qboUrl: string;
}

export interface CustomerDetails {
  displayName: string;
  email: string;
  street: string;
  city: string;
  province: string;
  postal: string;
}

function invoiceUrl(id: string): string {
  return `https://app.qbo.intuit.com/app/invoice?txnId=${id}`;
}

function authError(status: number, body: string): Error | null {
  if (
    body.includes("ApplicationAuthorizationFailed") ||
    body.includes("003100") ||
    status === 403
  ) {
    const env = process.env.QUICKBOOKS_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
    const e = new Error(
      `QuickBooks rejected the request (3100/ApplicationAuthorizationFailed). ` +
        `App is set to "${env}" environment. If your QB Developer app is configured ` +
        `for the other environment, set QUICKBOOKS_ENVIRONMENT=${env === "sandbox" ? "production" : "sandbox"} and redeploy.`
    );
    (e as Error & { code?: string }).code = "qb_auth_failed";
    return e;
  }
  return null;
}

export async function findOrCreateCustomer(details: CustomerDetails): Promise<string> {
  const query = `SELECT * FROM Customer WHERE DisplayName = '${escapeQboLiteral(details.displayName)}'`;
  const searchRes = await qbFetch(`/query?query=${encodeURIComponent(query)}&minorversion=70`);

  if (searchRes.ok) {
    const data = await searchRes.json();
    const existing = data?.QueryResponse?.Customer?.[0];
    if (existing?.Id) return existing.Id;
  }

  const createRes = await qbFetch("/customer?minorversion=70", {
    method: "POST",
    body: JSON.stringify({
      DisplayName: details.displayName,
      PrimaryEmailAddr: details.email ? { Address: details.email } : undefined,
      BillAddr: {
        Line1: details.street,
        City: details.city,
        CountrySubDivisionCode: details.province,
        PostalCode: details.postal,
        Country: "Canada",
      },
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    const auth = authError(createRes.status, body);
    if (auth) throw auth;
    throw new Error(`Failed to create QuickBooks customer: ${body}`);
  }

  return (await createRes.json()).Customer.Id;
}

export interface InvoiceLineSpec {
  description: string;
  quantity: number;
  unitPriceCents: number;
  zeroRated: boolean;
}

export interface TaxCodeIds {
  /** The province tax code applied to standard-rated lines. */
  standard: string;
  /** The code applied to zero-rated lines and the processing fee. */
  zeroRated: string;
}

export interface CreateInvoiceParams {
  customerId: string;
  taxCodes: TaxCodeIds;
  clientEmail?: string;
  invoiceDate: string;
  dueDate: string;
  lines: InvoiceLineSpec[];
  totals: InvoiceTotals;
  memo: string;
}

/**
 * Builds the QuickBooks payload. Separated from the request so the line
 * structure, especially the zero-rated fee line, can be asserted in tests.
 */
export function buildInvoicePayload(params: CreateInvoiceParams): Record<string, unknown> {
  const { totals } = params;

  const lines: Record<string, unknown>[] = params.lines.map((line) => ({
    Amount: centsToDollars(line.quantity * line.unitPriceCents),
    DetailType: "SalesItemLineDetail",
    Description: line.description,
    SalesItemLineDetail: {
      ItemRef: { value: "1", name: "Services" },
      UnitPrice: centsToDollars(line.unitPriceCents),
      Qty: line.quantity,
      TaxCodeRef: { value: line.zeroRated ? params.taxCodes.zeroRated : params.taxCodes.standard },
    },
  }));

  // The line whose absence cost $305.10 on invoice 1822.
  if (totals.feeCents > 0) {
    lines.push({
      Amount: centsToDollars(totals.feeCents),
      DetailType: "SalesItemLineDetail",
      Description: "Credit card payment processing fee 3%",
      SalesItemLineDetail: {
        ItemRef: { value: "1", name: "Services" },
        UnitPrice: centsToDollars(totals.feeCents),
        Qty: 1,
        TaxCodeRef: { value: params.taxCodes.zeroRated },
      },
    });
  }

  // Without this QuickBooks totals the gross line values and disagrees with the
  // engine, which applies the discount before tax. Every discounted deal would
  // fail reconciliation.
  if (totals.discountCents > 0) {
    lines.push({
      Amount: centsToDollars(totals.discountCents),
      DetailType: "DiscountLineDetail",
      Description: "Total Saving",
      DiscountLineDetail: { PercentBased: false },
    });
  }

  return {
    CustomerRef: { value: params.customerId },
    TxnDate: params.invoiceDate,
    DueDate: params.dueDate,
    Line: lines,
    // QuickBooks computes the tax from these codes. The reconciliation gate
    // then checks its total against the engine, so a company file configured
    // at a different rate fails loudly instead of quietly billing the client
    // a different amount from the agreement.
    TxnTaxDetail: { TxnTaxCodeRef: { value: params.taxCodes.standard } },
    CustomerMemo: { value: params.memo },
    ...(params.clientEmail ? { BillEmail: { Address: params.clientEmail } } : {}),
    AllowOnlineCreditCardPayment: totals.feeCents > 0,
  };
}

/** Reads the company file and resolves the codes this province needs. */
export async function resolveTaxCodes(province: Province): Promise<TaxCodeIds> {
  const codes = await fetchTaxCodes();
  return {
    standard: taxCodeForProvince(province, codes).id,
    zeroRated: zeroRatedTaxCode(codes).id,
  };
}

export async function createInvoice(params: CreateInvoiceParams): Promise<QboInvoiceSummary> {
  // Checked first: an invoice QuickBooks will not number is useless to us, and
  // creating one anyway leaves a stray transaction to clean up.
  await assertAutoNumbering();

  const res = await qbFetch("/invoice?minorversion=70", {
    method: "POST",
    body: JSON.stringify(buildInvoicePayload(params)),
  });

  if (!res.ok) {
    const body = await res.text();
    const auth = authError(res.status, body);
    if (auth) throw auth;
    throw new Error(`Failed to create QuickBooks invoice: ${body}`);
  }

  const inv = (await res.json()).Invoice;
  if (!inv.DocNumber) {
    throw new Error(
      `QuickBooks created invoice ${inv.Id} but assigned no number, so the agreement ` +
        "cannot reference it. Void it in QuickBooks and check that custom transaction " +
        "numbers are turned off."
    );
  }
  return {
    qboInvoiceId: inv.Id,
    invoiceNumber: String(inv.DocNumber),
    totalCents: Math.round(Number(inv.TotalAmt) * 100),
    qboUrl: invoiceUrl(inv.Id),
  };
}

export async function getInvoice(qboInvoiceId: string): Promise<QboInvoiceSummary> {
  const res = await qbFetch(`/invoice/${encodeURIComponent(qboInvoiceId)}?minorversion=70`);
  if (!res.ok) {
    throw new Error(`Failed to read QuickBooks invoice ${qboInvoiceId}: ${await res.text()}`);
  }
  const inv = (await res.json()).Invoice;
  return {
    qboInvoiceId: inv.Id,
    invoiceNumber: inv.DocNumber,
    totalCents: Math.round(Number(inv.TotalAmt) * 100),
    qboUrl: invoiceUrl(inv.Id),
  };
}

export async function fetchInvoicePdf(qboInvoiceId: string): Promise<Buffer> {
  const res = await qbFetch(`/invoice/${encodeURIComponent(qboInvoiceId)}/pdf?minorversion=70`, {
    headers: { Accept: "application/pdf" },
  });
  if (!res.ok) {
    throw new Error(`Failed to download invoice PDF: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** The shareable payment link, present only when online payment is enabled. */
export async function fetchPaymentLink(qboInvoiceId: string): Promise<string | null> {
  const res = await qbFetch(
    `/invoice/${encodeURIComponent(qboInvoiceId)}?include=invoiceLink&minorversion=70`
  );
  if (!res.ok) return null;
  const inv = (await res.json()).Invoice;
  return inv?.InvoiceLink ?? null;
}
