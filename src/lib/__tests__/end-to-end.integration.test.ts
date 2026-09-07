/**
 * Full path against live systems: QuickBooks (sandbox) and Google.
 *
 * Creates a real invoice in the connected QuickBooks company and a real
 * agreement Doc in Drive, then deletes the Doc. The invoice remains and must
 * be voided by hand — QuickBooks keeps deleted invoices in the audit log.
 *
 * Run:
 *   QUICKBOOKS_ENVIRONMENT=sandbox RUN_E2E=1 npx jest end-to-end
 *
 * The store port is in-memory, so no rows are written to Supabase.
 */
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import {
  generateDealDocuments,
  type DealDocumentsInput,
  type DealStorePort,
} from "@/lib/document-orchestrator";
import { makeAgreementPort, mailPort, qboPort } from "@/lib/deal-document-ports";
import { googleAuth } from "@/lib/google-auth";
import { formatCents } from "@/lib/invoice-pricing";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq < 1 || line.startsWith("#")) continue;
    const k = line.slice(0, eq);
    let v = line.slice(eq + 1).trim();
    const q = v[0];
    if ((q === "'" || q === '"') && v[v.length - 1] === q) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvLocal();

const TEMPLATE_ID = "1XmbFXYNsbGDYNKyNT3AVeNJkJ9sXhhAISWuSVLgs5YQ";
const FOLDER_ID = "19MdRpMCppEeA-MC5k2d9z21EFDoNfqzY";

/** Records calls instead of writing to Supabase. */
function memoryStore(): DealStorePort & { events: string[] } {
  const events: string[] = [];
  return {
    events,
    async findExistingInvoiceId() {
      return null;
    },
    async recordInvoice() {},
    async recordDocuments() {},
    async recordEvent(_dealId, action) {
      events.push(action);
    },
  };
}

const maybe = process.env.RUN_E2E ? describe : describe.skip;

maybe("agreement + invoice, end to end", () => {
  jest.setTimeout(180_000);
  let agreementDocId = "";

  afterAll(async () => {
    if (!agreementDocId) return;
    await google
      .drive({ version: "v3", auth: googleAuth() as never })
      .files.delete({ fileId: agreementDocId });
    // eslint-disable-next-line no-console
    console.log("cleaned up agreement doc " + agreementDocId);
  });

  it("creates an invoice, an agreement carrying its number, and reconciles them", async () => {
    const input: DealDocumentsInput = {
      dealId: "e2e-" + Date.now(),
      aeEmail: "info@waveroomtv.com",
      clientCompany: "ZZ TEST CLIENT — DELETE ME",
      clientContactName: "Test Contact",
      clientEmail: "info@waveroomtv.com",
      clientStreet: "1 Test Street",
      clientCity: "Toronto",
      clientProvince: "ON",
      clientPostal: "M5B 2G9",
      campaignTitle: "Automation Test Campaign",
      billingTerm: "Due Upon Receipt",
      initialSubscriptionTerm: "One Time",
      serviceStartDate: "Sept 8, 2026",
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "credit_card",
      discountCents: 0,
      lines: [
        {
          item: "Brand Awareness Feed Post @northlytoronto",
          description: "Automation test line. Not a real campaign.",
          quantity: 1,
          unitPriceCents: 100_000,
        },
      ],
    };

    const store = memoryStore();
    const result = await generateDealDocuments(input, {
      qbo: qboPort,
      agreement: makeAgreementPort({
        templateDocumentId: TEMPLATE_ID,
        targetFolderId: FOLDER_ID,
      }),
      mail: mailPort,
      store,
    });

    agreementDocId = result.agreementDocumentId;

    /* eslint-disable no-console */
    console.log("E2E invoice number : " + result.invoiceNumber);
    console.log("E2E quickbooks     : " + result.qboUrl);
    console.log("E2E agreement      : " + result.agreementLink);
    console.log("E2E payment link   : " + (result.paymentLink ?? "(none)"));
    console.log("E2E draft          : " + (result.draftId ?? "not created"));
    console.log("E2E draft error    : " + (result.draftError ?? "none"));
    console.log("E2E subtotal       : " + formatCents(result.totals.subtotalCents));
    console.log("E2E tax            : " + formatCents(result.totals.taxCents));
    console.log("E2E fee            : " + formatCents(result.totals.feeCents));
    console.log("E2E total          : " + formatCents(result.totals.totalCents));
    console.log("E2E events         : " + store.events.join(", "));
    /* eslint-enable no-console */

    // $1,000 + 13% HST = $1,130 gross; 3% fee = $33.90; total $1,163.90
    expect(result.totals.taxCents).toBe(13_000);
    expect(result.totals.feeCents).toBe(3_390);
    expect(result.totals.totalCents).toBe(116_390);

    expect(result.invoiceNumber).toMatch(/^\d+$/);
    expect(result.agreementDocumentId).toBeTruthy();

    // The agreement must carry the number QuickBooks minted.
    const docs = google.docs({ version: "v1", auth: googleAuth() as never });
    const { data: doc } = await docs.documents.get({ documentId: agreementDocId });
    const flat = JSON.stringify(doc.body?.content ?? []);
    expect(flat).toContain(result.invoiceNumber);
    expect(flat).toContain("$1,163.90");
    expect(flat).toContain("Processing Fee");
    expect(flat).toContain("ZZ TEST CLIENT");

    // The email text is always available, whatever happened to the draft.
    expect(result.emailBody).toContain("$1,163.90");
  });
});
