/**
 * Northly Group — Agreement + Invoice orchestration.
 *
 * One AE action produces both documents. The order is forced by a constraint:
 * the agreement prints the invoice number, and only QuickBooks can mint one.
 *
 *   1. find or create the customer
 *   2. create the invoice            -> QuickBooks returns DocNumber
 *   3. render the agreement          -> the number is already in it
 *   4. reconcile                     -> the two documents must agree
 *   5. fetch PDFs and the pay link
 *   6. draft the email               -> a person still presses send
 *
 * There is no step that stamps a number onto a finished PDF, because the
 * number exists before the agreement is rendered.
 *
 * Every external system is a port, so the sequence — especially the
 * idempotency and reconciliation guards — is testable without network calls.
 */

import {
  assertReconciled,
  centsToDollars,
  computeInvoiceTotals,
  dollarsToCents,
  formatCents,
  type InvoicePricingInput,
  type InvoiceTotals,
  type PaymentMethod,
  type Province,
} from "./invoice-pricing";
import type { AgreementLine } from "./agreement-rows";

export interface DealDocumentsInput {
  dealId: string;
  aeEmail: string;

  clientCompany: string;
  clientContactName: string;
  clientEmail: string;
  clientStreet: string;
  clientCity: string;
  clientProvince: Province;
  clientPostal: string;

  campaignTitle: string;
  billingTerm: string;
  initialSubscriptionTerm: string;
  serviceStartDate: string;
  invoiceDate: string;
  dueDate: string;

  paymentMethod: PaymentMethod;
  discountCents: number;
  lines: (AgreementLine & { zeroRated?: boolean })[];
  specialConditions?: string;
}

export interface CreatedInvoice {
  qboInvoiceId: string;
  invoiceNumber: string;
  /** What QuickBooks recorded, used to reconcile against the agreement. */
  totalCents: number;
  qboUrl: string;
}

export interface QboPort {
  findOrCreateCustomer(input: DealDocumentsInput): Promise<string>;
  createInvoice(
    input: DealDocumentsInput,
    customerId: string,
    totals: InvoiceTotals
  ): Promise<CreatedInvoice>;
  /** Reads back an invoice this deal already created, for idempotent retries. */
  getInvoice(qboInvoiceId: string): Promise<CreatedInvoice>;
  fetchInvoicePdf(qboInvoiceId: string): Promise<Buffer>;
  fetchPaymentLink(qboInvoiceId: string): Promise<string | null>;
}

export interface AgreementPort {
  render(
    input: DealDocumentsInput,
    totals: InvoiceTotals,
    invoiceNumber: string
  ): Promise<{ documentId: string; webViewLink: string }>;
  exportPdf(documentId: string): Promise<Buffer>;
}

export interface MailPort {
  createDraft(params: {
    to: string;
    aeEmail: string;
    subject: string;
    body: string;
    attachments: { filename: string; content: Buffer }[];
  }): Promise<{ draftId: string; webLink: string }>;
}

export interface DealStorePort {
  /** The invoice this deal already created, if any. Prevents duplicates. */
  findExistingInvoiceId(dealId: string): Promise<string | null>;
  recordInvoice(dealId: string, invoice: CreatedInvoice, totals: InvoiceTotals): Promise<void>;
  recordDocuments(
    dealId: string,
    docs: { agreementDocId: string; agreementPdfUrl?: string; paymentLink?: string | null }
  ): Promise<void>;
  recordEvent(dealId: string, action: string, payload: Record<string, unknown>): Promise<void>;
}

export interface Ports {
  qbo: QboPort;
  agreement: AgreementPort;
  mail: MailPort;
  store: DealStorePort;
}

export interface DealDocumentsResult {
  invoiceNumber: string;
  qboInvoiceId: string;
  qboUrl: string;
  paymentLink: string | null;
  agreementDocumentId: string;
  agreementLink: string;
  /** Null when the draft could not be created. The documents still exist. */
  draftId: string | null;
  draftLink: string | null;
  /** Why the draft failed, when it did. */
  draftError?: string;
  /**
   * The email text, always returned whether or not a Gmail draft was created.
   * An AE can copy this into any mail client.
   */
  emailSubject: string;
  emailBody: string;
  totals: InvoiceTotals;
  /** True when an existing invoice was reused rather than a new one created. */
  reusedInvoice: boolean;
}

/** Maps the deal's lines onto the pricing engine's input. */
export function toPricingInput(input: DealDocumentsInput): InvoicePricingInput {
  return {
    province: input.clientProvince,
    paymentMethod: input.paymentMethod,
    discountCents: input.discountCents,
    lines: input.lines.map((line) => ({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      taxTreatment: line.zeroRated ? "zero_rated" : "standard",
    })),
  };
}

export function draftSubject(input: DealDocumentsInput): string {
  return `Invoice + Agreement — ${input.clientCompany} / ${input.campaignTitle}`;
}

/**
 * The email an AE reviews and sends, following the SOP wording.
 * Payment instructions follow the chosen method, so a credit card deal never
 * ships e-transfer instructions and vice versa.
 */
export function draftBody(
  input: DealDocumentsInput,
  totals: InvoiceTotals,
  paymentLink: string | null
): string {
  const firstName = input.clientContactName.trim().split(/\s+/)[0] || "there";
  const total = formatCents(totals.totalCents);

  const payment =
    input.paymentMethod === "credit_card"
      ? `The invoice total is ${total} and credit card payment can be made using the link below:\n\n${paymentLink ?? "[payment link unavailable — open the invoice in QuickBooks]"}`
      : `The invoice total is ${total} and E-Transfer can be made to this email:\n\npayments@waveroomtv.com`;

  return [
    `Hey ${firstName},`,
    "",
    "As promised, I've attached the agreement and invoice here for you to review. When you get a chance, please sign the agreement and settle the invoice so we can get things rolling.",
    "",
    payment,
    "",
    "Once we have it, we'll set up your client profile and create a group chat to keep everything organized throughout the campaign.",
    "",
    "If you have any questions while going through the docs or about anything else, feel free to reach out. I'm happy to help.",
    "",
    "Best,",
  ].join("\n");
}

function safeFilename(value: string): string {
  return value.replace(/[^\w\-. ]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Runs the whole sequence. Safe to retry: a deal that already has a QuickBooks
 * invoice reuses it rather than minting a second one.
 */
export async function generateDealDocuments(
  input: DealDocumentsInput,
  ports: Ports
): Promise<DealDocumentsResult> {
  const totals = computeInvoiceTotals(toPricingInput(input));

  // ---- invoice, created at most once per deal ----------------------------
  const existingId = await ports.store.findExistingInvoiceId(input.dealId);
  let invoice: CreatedInvoice;
  let reusedInvoice = false;

  if (existingId) {
    invoice = await ports.qbo.getInvoice(existingId);
    reusedInvoice = true;
    await ports.store.recordEvent(input.dealId, "invoice_reused", {
      qboInvoiceId: invoice.qboInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
    });
  } else {
    const customerId = await ports.qbo.findOrCreateCustomer(input);
    invoice = await ports.qbo.createInvoice(input, customerId, totals);
    await ports.store.recordInvoice(input.dealId, invoice, totals);
    await ports.store.recordEvent(input.dealId, "invoice_created", {
      qboInvoiceId: invoice.qboInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      totalCents: totals.totalCents,
    });
  }

  // ---- the gate ----------------------------------------------------------
  // Runs before the agreement is rendered, so a mismatch costs nothing but the
  // invoice, which a human can void.
  try {
    assertReconciled(totals.totalCents, invoice.totalCents, `deal ${input.dealId}`);
  } catch (error) {
    await ports.store.recordEvent(input.dealId, "reconciliation_failed", {
      expectedCents: totals.totalCents,
      actualCents: invoice.totalCents,
      qboInvoiceId: invoice.qboInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
    });
    throw error;
  }

  // ---- agreement ---------------------------------------------------------
  const agreement = await ports.agreement.render(input, totals, invoice.invoiceNumber);
  const [agreementPdf, invoicePdf, paymentLink] = await Promise.all([
    ports.agreement.exportPdf(agreement.documentId),
    ports.qbo.fetchInvoicePdf(invoice.qboInvoiceId),
    input.paymentMethod === "credit_card"
      ? ports.qbo.fetchPaymentLink(invoice.qboInvoiceId)
      : Promise.resolve(null),
  ]);

  await ports.store.recordDocuments(input.dealId, {
    agreementDocId: agreement.documentId,
    paymentLink,
  });

  // ---- draft, never sent -------------------------------------------------
  // The invoice and the agreement already exist and are correct. A failure
  // here must not discard them, so the draft is best-effort and reported.
  const base = safeFilename(`${input.clientCompany} ${input.campaignTitle}`);
  const subject = draftSubject(input);
  const body = draftBody(input, totals, paymentLink);
  let draft: { draftId: string; webLink: string } | null = null;
  let draftError: string | undefined;

  try {
    draft = await ports.mail.createDraft({
      to: input.clientEmail,
      aeEmail: input.aeEmail,
      subject,
      body,
      attachments: [
        { filename: `Agreement - ${base}.pdf`, content: agreementPdf },
        { filename: `Invoice ${invoice.invoiceNumber}.pdf`, content: invoicePdf },
      ],
    });
  } catch (error) {
    draftError = error instanceof Error ? error.message : "Could not create the email draft.";
    await ports.store.recordEvent(input.dealId, "draft_failed", {
      aeEmail: input.aeEmail,
      reason: draftError,
    });
  }

  await ports.store.recordEvent(input.dealId, "documents_ready", {
    invoiceNumber: invoice.invoiceNumber,
    agreementDocId: agreement.documentId,
    draftId: draft?.draftId ?? null,
    totalDollars: centsToDollars(totals.totalCents),
  });

  return {
    emailSubject: subject,
    emailBody: body,
    invoiceNumber: invoice.invoiceNumber,
    qboInvoiceId: invoice.qboInvoiceId,
    qboUrl: invoice.qboUrl,
    paymentLink,
    agreementDocumentId: agreement.documentId,
    agreementLink: agreement.webViewLink,
    draftId: draft?.draftId ?? null,
    draftLink: draft?.webLink ?? null,
    draftError,
    totals,
    reusedInvoice,
  };
}

/** Re-exported so callers can convert dollars at the edges. */
export { dollarsToCents, centsToDollars };
