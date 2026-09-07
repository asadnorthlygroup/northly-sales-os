/**
 * Northly Group — Agreement table rows.
 *
 * Turns a priced deal into the exact cell values the IO template's tables
 * expect. Pure: no Google calls, no I/O, so the numbers that reach a client
 * can be tested exhaustively.
 *
 * Template shape (see scripts/inspect-agreement-template.cjs):
 *   Table 1  Customer          2 x 3
 *   Table 2  Order Details     2 x 5   <- carries the invoice number
 *   Table 3  Services         26 x 6   <- 21 item rows, then summary rows
 *   Table 4  Story Services   25 x 5   <- deleted when unused
 *   Table 5  Billing           7 x 5   <- deleted for single-invoice deals
 *   Table 6  Terms             2 x 1
 *   Table 7  Signatures        4 x 5
 */

import { centsToDollars, formatCents, type InvoiceTotals } from "./invoice-pricing";

/** Item rows the Services table ships with, before the summary rows. */
export const SERVICES_ITEM_ROW_COUNT = 21;

export interface AgreementLine {
  item: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface AgreementInput {
  customerBlock: string;
  invoiceContactName: string;
  invoiceEmail: string;
  initialSubscriptionTerm: string;
  billingTerm: string;
  currency: string;
  serviceStartDate: string;
  invoiceNumber: string;
  lines: AgreementLine[];
  totals: InvoiceTotals;
}

/** Row 0 and row 1 of the Customer table, left to right. */
export function customerRows(input: AgreementInput): string[][] {
  return [
    [input.customerBlock, "Invoice Contact:", input.invoiceContactName],
    ["", "Invoice Email:", input.invoiceEmail],
  ];
}

/** Row 1 of the Order Details table. Row 0 is fixed headers. */
export function orderDetailsRow(input: AgreementInput): string[] {
  return [
    input.initialSubscriptionTerm,
    input.billingTerm,
    input.currency,
    input.serviceStartDate,
    input.invoiceNumber,
  ];
}

export interface ServiceRow {
  item: string;
  description: string;
  price: string;
  /** The template carries an unused spacer column between price and quantity. */
  spacer: string;
  quantity: string;
  fee: string;
}

/** One row per deal line, formatted for the Services table. */
export function serviceRows(input: AgreementInput): ServiceRow[] {
  return input.lines.map((line) => ({
    item: line.item,
    description: line.description,
    price: formatCents(line.unitPriceCents),
    spacer: "",
    quantity: String(line.quantity),
    fee: formatCents(line.quantity * line.unitPriceCents),
  }));
}

export interface SummaryRow {
  label: string;
  value: string;
}

/**
 * The rows beneath the line items. A discount row appears only when there is a
 * discount, and the processing fee row only on credit card deals — which is
 * what makes the agreement total match the invoice.
 */
export function summaryRows(totals: InvoiceTotals): SummaryRow[] {
  const rows: SummaryRow[] = [];

  if (totals.discountCents > 0) {
    rows.push({ label: "Total Saving", value: formatCents(totals.discountCents) });
  }

  rows.push({ label: "Subtotal", value: formatCents(totals.subtotalCents - totals.discountCents) });
  rows.push({ label: totals.taxLabel, value: formatCents(totals.taxCents) });

  if (totals.feeCents > 0) {
    rows.push({
      label: "Processing Fee 3% (zero-rated)",
      value: formatCents(totals.feeCents),
    });
  }

  rows.push({ label: "Total", value: formatCents(totals.totalCents) });
  return rows;
}

/** How many of the template's 21 item rows must be deleted for this deal. */
export function surplusItemRowCount(lineCount: number): number {
  if (lineCount < 1) {
    throw new Error("An agreement needs at least one line.");
  }
  if (lineCount > SERVICES_ITEM_ROW_COUNT) {
    throw new Error(
      `The template has ${SERVICES_ITEM_ROW_COUNT} item rows but the deal has ${lineCount} lines. ` +
        "Add rows to the template, or combine lines."
    );
  }
  return SERVICES_ITEM_ROW_COUNT - lineCount;
}

/**
 * The agreement's grand total in dollars, for reconciling against QuickBooks.
 */
export function agreementTotalDollars(totals: InvoiceTotals): number {
  return centsToDollars(totals.totalCents);
}
