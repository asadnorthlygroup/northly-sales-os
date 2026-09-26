/**
 * Live check against the real Google Doc template.
 *
 * Skipped by default because it creates and deletes a file in Drive.
 * Run with:  RUN_GOOGLE_TESTS=1 npx jest agreement-doc.integration
 */
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { computeInvoiceTotals } from "@/lib/invoice-pricing";
import { generateAgreement, exportAgreementPdf } from "@/lib/agreement-doc";
import { googleAuth } from "@/lib/google-auth";

const TEMPLATE_ID = "1XmbFXYNsbGDYNKyNT3AVeNJkJ9sXhhAISWuSVLgs5YQ";
const FOLDER_ID = "19MdRpMCppEeA-MC5k2d9z21EFDoNfqzY";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq < 1 || line.startsWith("#")) continue;
    const key = line.slice(0, eq);
    let value = line.slice(eq + 1).trim();
    const q = value[0];
    if ((q === "'" || q === '"') && value[value.length - 1] === q) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const maybe = process.env.RUN_GOOGLE_TESTS ? describe : describe.skip;

maybe("agreement generation against the live template", () => {
  jest.setTimeout(120_000);
  let documentId = "";

  afterAll(async () => {
    if (!documentId) return;
    await google.drive({ version: "v3", auth: googleAuth() as never }).files.delete({ fileId: documentId });
  });

  it("produces an agreement whose total matches the invoice", async () => {
    const totals = computeInvoiceTotals({
      province: "MB",
      paymentMethod: "credit_card",
      discountCents: 85_000,
      lines: [
        { quantity: 1, unitPriceCents: 115_000, taxTreatment: "standard" },
        { quantity: 1, unitPriceCents: 95_000, taxTreatment: "standard" },
        { quantity: 1, unitPriceCents: 75_000, taxTreatment: "standard" },
        { quantity: 6, unitPriceCents: 0, taxTreatment: "zero_rated" },
      ],
    });

    const result = await generateAgreement(
      {
        customerBlock: "14249828 Canada Inc\nO/A Oakberry\n409 North Dr\nWinnipeg, MB R3T 0A1",
        invoiceContactName: "Carter Friesen",
        invoiceEmail: "carter@snowbank.capital",
        initialSubscriptionTerm: "One Time",
        billingTerm: "Due Upon Receipt",
        currency: "CAD",
        serviceStartDate: "Sept 3, 2026",
        invoiceNumber: "1820",
        lines: [
          { item: "Brand Awareness Feed Post @northlywindsor", description: "An Instagram feed activation on @northlywindsor.", quantity: 1, unitPriceCents: 115_000 },
          { item: "Brand Awareness Feed Post @northlyottawa", description: "An Instagram feed activation on @northlyottawa.", quantity: 1, unitPriceCents: 95_000 },
          { item: "Brand Awareness Feed Post @northlylondon", description: "An Instagram feed activation on @northlylondon.", quantity: 1, unitPriceCents: 75_000 },
          { item: "Story", description: "Story post on accounts mentioned above", quantity: 6, unitPriceCents: 0 },
        ],
        totals,
      },
      {
        templateDocumentId: TEMPLATE_ID,
        targetFolderId: FOLDER_ID,
        documentName: "TEST - agreement generator (auto-deleted)",
      }
    );

    documentId = result.documentId;
    expect(documentId).toBeTruthy();

    const docs = google.docs({ version: "v1", auth: googleAuth() as never });
    const { data: doc } = await docs.documents.get({ documentId });

    const flat = JSON.stringify(doc.body?.content ?? []);
    // The numbers that matter, straight out of the rendered document.
    expect(flat).toContain("1820");
    expect(flat).toContain("Carter Friesen");
    expect(flat).toContain("$67.80");
    expect(flat).toContain("$2,327.80");
    expect(flat).toContain("@northlywindsor");

    // Story Services and the Billing schedule are dropped for this deal.
    const tableCount = (doc.body?.content ?? []).filter((e) => e.table).length;
    expect(tableCount).toBe(5);

    const pdf = await exportAgreementPdf(documentId);
    expect(pdf.length).toBeGreaterThan(10_000);

    // eslint-disable-next-line no-console
    console.log("generated: " + result.webViewLink + " (" + pdf.length + " byte PDF)");
  });
});
