/**
 * Northly Group — Live implementations of the orchestrator's ports.
 *
 * The orchestrator holds the sequence and the guards; this file holds the
 * plumbing to QuickBooks, Google and Supabase. Keeping them apart is what
 * lets the guards be tested without a network.
 */

import { createClient } from "@supabase/supabase-js";
import { centsToDollars, type InvoiceTotals } from "./invoice-pricing";
import {
  createInvoice,
  fetchInvoicePdf,
  fetchPaymentLink,
  findOrCreateCustomer,
  getInvoice,
} from "./qbo-invoice";
import { generateAgreement, exportAgreementPdf } from "./agreement-doc";
import { createGmailDraft } from "./gmail-draft";
import type {
  AgreementPort,
  DealDocumentsInput,
  DealStorePort,
  MailPort,
  Ports,
  QboPort,
} from "./document-orchestrator";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function memoFor(input: DealDocumentsInput): string {
  return input.paymentMethod === "credit_card"
    ? "Payable by credit card using the payment link on this invoice. A 3% processing fee is included."
    : "Please remit payment via E-transfer to payments@waveroomtv.com";
}

export const qboPort: QboPort = {
  async findOrCreateCustomer(input) {
    return findOrCreateCustomer({
      displayName: input.clientCompany,
      email: input.clientEmail,
      street: input.clientStreet,
      city: input.clientCity,
      province: input.clientProvince,
      postal: input.clientPostal,
    });
  },

  async createInvoice(input, customerId, totals) {
    return createInvoice({
      customerId,
      clientEmail: input.clientEmail,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      lines: input.lines.map((line) => ({
        description: [line.item, line.description].filter(Boolean).join("\n"),
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        zeroRated: Boolean(line.zeroRated),
      })),
      totals,
      memo: memoFor(input),
    });
  },

  getInvoice,
  fetchInvoicePdf,
  fetchPaymentLink,
};

export interface AgreementPortConfig {
  templateDocumentId: string;
  targetFolderId?: string;
}

export function makeAgreementPort(config: AgreementPortConfig): AgreementPort {
  return {
    async render(input, totals, invoiceNumber) {
      return generateAgreement(
        {
          customerBlock: [
            input.clientCompany,
            input.clientStreet,
            `${input.clientCity}, ${input.clientProvince} ${input.clientPostal}`,
          ]
            .filter(Boolean)
            .join("\n"),
          invoiceContactName: input.clientContactName,
          invoiceEmail: input.clientEmail,
          initialSubscriptionTerm: input.initialSubscriptionTerm,
          billingTerm: input.billingTerm,
          currency: "CAD",
          serviceStartDate: input.serviceStartDate,
          invoiceNumber,
          lines: input.lines,
          totals,
          specialConditions: input.specialConditions,
        },
        {
          templateDocumentId: config.templateDocumentId,
          targetFolderId: config.targetFolderId,
          documentName: `${input.clientCompany} — ${input.campaignTitle} — Agreement ${invoiceNumber}`,
        }
      );
    },
    exportPdf: exportAgreementPdf,
  };
}

export const mailPort: MailPort = {
  async createDraft({ to, aeEmail, subject, body, attachments }) {
    return createGmailDraft({ to, from: aeEmail, subject, body, attachments });
  },
};

export const dealStorePort: DealStorePort = {
  async findExistingInvoiceId(dealId) {
    const { data } = await adminClient()
      .from("invoices")
      .select("qb_invoice_id")
      .eq("deal_id", dealId)
      .not("qb_invoice_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0]?.qb_invoice_id ?? null;
  },

  async recordInvoice(dealId, invoice, totals: InvoiceTotals) {
    await adminClient().from("invoices").insert({
      deal_id: dealId,
      subtotal: centsToDollars(totals.subtotalCents),
      discount_amount: centsToDollars(totals.discountCents),
      tax_amount: centsToDollars(totals.taxCents),
      processing_fee: centsToDollars(totals.feeCents),
      total: centsToDollars(totals.totalCents),
      qb_invoice_id: invoice.qboInvoiceId,
      qb_invoice_number: invoice.invoiceNumber,
      qb_url: invoice.qboUrl,
      status: "draft",
    });
  },

  async recordDocuments(dealId, docs) {
    await adminClient()
      .from("invoices")
      .update({ qb_url: docs.paymentLink ?? undefined })
      .eq("deal_id", dealId)
      .is("qb_url", null);
  },

  async recordEvent(dealId, action, payload) {
    // audit_log exists in the schema; failures here must never break a deal.
    try {
      await adminClient().from("audit_log").insert({
        entity_type: "deal",
        entity_id: dealId,
        action,
        metadata: payload,
      });
    } catch {
      // Intentionally swallowed — the audit trail is not worth failing a deal for.
    }
  },
};

/** Everything the orchestrator needs, wired to the real systems. */
export function livePorts(agreementConfig: AgreementPortConfig): Ports {
  return {
    qbo: qboPort,
    agreement: makeAgreementPort(agreementConfig),
    mail: mailPort,
    store: dealStorePort,
  };
}
