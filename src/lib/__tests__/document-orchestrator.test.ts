import {
  draftBody,
  draftSubject,
  generateDealDocuments,
  toPricingInput,
  type CreatedInvoice,
  type DealDocumentsInput,
  type Ports,
} from "@/lib/document-orchestrator";
import { computeInvoiceTotals, ReconciliationError } from "@/lib/invoice-pricing";

const oakberry = (
  overrides: Partial<DealDocumentsInput> = {}
): DealDocumentsInput => ({
  dealId: "deal-oakberry",
  aeEmail: "asif@northlygroup.com",
  clientCompany: "14249828 Canada Inc O/A Oakberry",
  clientContactName: "Carter Friesen",
  clientEmail: "carter@snowbank.capital",
  clientStreet: "409 North Dr",
  clientCity: "Winnipeg",
  clientProvince: "MB",
  clientPostal: "R3T 0A1",
  campaignTitle: "Intro Campaign",
  billingTerm: "Due Upon Receipt",
  initialSubscriptionTerm: "One Time",
  serviceStartDate: "Sept 3, 2026",
  invoiceDate: "2026-09-03",
  dueDate: "2026-09-03",
  paymentMethod: "credit_card",
  discountCents: 85_000,
  lines: [
    { item: "BA Feed @northlywindsor", description: "Feed activation.", quantity: 1, unitPriceCents: 115_000 },
    { item: "BA Feed @northlyottawa", description: "Feed activation.", quantity: 1, unitPriceCents: 95_000 },
    { item: "BA Feed @northlylondon", description: "Feed activation.", quantity: 1, unitPriceCents: 75_000 },
    { item: "Story", description: "Story post.", quantity: 6, unitPriceCents: 0, zeroRated: true },
  ],
  ...overrides,
});

interface Recorder {
  calls: string[];
  events: { action: string; payload: Record<string, unknown> }[];
  invoicesCreated: number;
  ports: Ports;
}

function makePorts(options: { existingInvoiceId?: string | null; qboTotalCents?: number } = {}): Recorder {
  const calls: string[] = [];
  const events: { action: string; payload: Record<string, unknown> }[] = [];
  let invoicesCreated = 0;

  const invoice = (id: string, totalCents: number): CreatedInvoice => ({
    qboInvoiceId: id,
    invoiceNumber: "1820",
    totalCents,
    qboUrl: "https://app.qbo.intuit.com/app/invoice?txnId=" + id,
  });

  const recorder: Recorder = {
    calls,
    events,
    get invoicesCreated() {
      return invoicesCreated;
    },
    ports: {
      qbo: {
        async findOrCreateCustomer() {
          calls.push("findOrCreateCustomer");
          return "cust-1";
        },
        async createInvoice(_input, _customerId, totals) {
          calls.push("createInvoice");
          invoicesCreated += 1;
          return invoice("qbo-new", options.qboTotalCents ?? totals.totalCents);
        },
        async getInvoice(id) {
          calls.push("getInvoice");
          return invoice(id, options.qboTotalCents ?? 216_300);
        },
        async fetchInvoicePdf() {
          calls.push("fetchInvoicePdf");
          return Buffer.from("invoice-pdf");
        },
        async fetchPaymentLink() {
          calls.push("fetchPaymentLink");
          return "https://quickbooks.intuit.com/pay/abc";
        },
      },
      agreement: {
        async render(_input, _totals, invoiceNumber) {
          calls.push("render:" + invoiceNumber);
          return { documentId: "doc-1", webViewLink: "https://docs.google.com/document/d/doc-1/edit" };
        },
        async exportPdf() {
          calls.push("exportPdf");
          return Buffer.from("agreement-pdf");
        },
      },
      mail: {
        async createDraft() {
          calls.push("createDraft");
          return { draftId: "draft-1", webLink: "https://mail.google.com/mail/u/0/#drafts" };
        },
      },
      store: {
        async findExistingInvoiceId() {
          calls.push("findExistingInvoiceId");
          return options.existingInvoiceId ?? null;
        },
        async recordInvoice() {
          calls.push("recordInvoice");
        },
        async recordDocuments() {
          calls.push("recordDocuments");
        },
        async recordEvent(_dealId, action, payload) {
          events.push({ action, payload });
        },
      },
    },
  } as Recorder;

  return recorder;
}

describe("toPricingInput", () => {
  it("marks zero-rated lines so they stay out of the tax base", () => {
    const pricing = toPricingInput(oakberry());
    expect(pricing.lines[3].taxTreatment).toBe("zero_rated");
    expect(pricing.lines[0].taxTreatment).toBe("standard");
  });

  it("reproduces the Oakberry total end to end", () => {
    expect(computeInvoiceTotals(toPricingInput(oakberry())).totalCents).toBe(216_300);
  });
});

describe("generateDealDocuments", () => {
  it("creates the invoice before rendering the agreement", async () => {
    const r = makePorts();
    await generateDealDocuments(oakberry(), r.ports);
    expect(r.calls.indexOf("createInvoice")).toBeLessThan(r.calls.indexOf("render:1820"));
  });

  it("puts the QuickBooks invoice number into the agreement", async () => {
    const r = makePorts();
    const result = await generateDealDocuments(oakberry(), r.ports);
    expect(r.calls).toContain("render:1820");
    expect(result.invoiceNumber).toBe("1820");
  });

  it("returns both documents and a draft", async () => {
    const r = makePorts();
    const result = await generateDealDocuments(oakberry(), r.ports);
    expect(result.agreementDocumentId).toBe("doc-1");
    expect(result.qboInvoiceId).toBe("qbo-new");
    expect(result.draftId).toBe("draft-1");
    expect(result.totals.totalCents).toBe(216_300);
  });

  it("drafts the email but never sends it", async () => {
    const r = makePorts();
    await generateDealDocuments(oakberry(), r.ports);
    expect(r.calls).toContain("createDraft");
    expect(r.calls.join(",")).not.toContain("send");
  });

  it("never creates a second invoice for a deal that already has one", async () => {
    const r = makePorts({ existingInvoiceId: "qbo-existing" });
    const result = await generateDealDocuments(oakberry(), r.ports);

    expect(r.calls).not.toContain("createInvoice");
    expect(r.calls).toContain("getInvoice");
    expect(result.reusedInvoice).toBe(true);
    expect(result.qboInvoiceId).toBe("qbo-existing");
    expect(r.events.map((e) => e.action)).toContain("invoice_reused");
  });

  it("skips the customer lookup entirely when reusing an invoice", async () => {
    const r = makePorts({ existingInvoiceId: "qbo-existing" });
    await generateDealDocuments(oakberry(), r.ports);
    expect(r.calls).not.toContain("findOrCreateCustomer");
  });

  it("blocks when QuickBooks and the agreement disagree", async () => {
    // QuickBooks records $2,100.00 while the engine computed $2,163.00 —
    // exactly the Oakberry gap.
    const r = makePorts({ qboTotalCents: 210_000 });
    await expect(generateDealDocuments(oakberry(), r.ports)).rejects.toThrow(
      ReconciliationError
    );
  });

  it("does not render an agreement or draft an email when reconciliation fails", async () => {
    const r = makePorts({ qboTotalCents: 210_000 });
    await expect(generateDealDocuments(oakberry(), r.ports)).rejects.toThrow();
    expect(r.calls).not.toContain("render:1820");
    expect(r.calls).not.toContain("createDraft");
  });

  it("records the discrepancy for audit before throwing", async () => {
    const r = makePorts({ qboTotalCents: 210_000 });
    await expect(generateDealDocuments(oakberry(), r.ports)).rejects.toThrow();
    const failure = r.events.find((e) => e.action === "reconciliation_failed");
    expect(failure).toBeDefined();
    expect(failure!.payload).toMatchObject({ expectedCents: 216_300, actualCents: 210_000 });
  });

  it("does not fetch a payment link for an e-transfer deal", async () => {
    const r = makePorts();
    await generateDealDocuments(oakberry({ paymentMethod: "e_transfer" }), r.ports);
    expect(r.calls).not.toContain("fetchPaymentLink");
  });

  it("writes an audit trail of what happened", async () => {
    const r = makePorts();
    await generateDealDocuments(oakberry(), r.ports);
    expect(r.events.map((e) => e.action)).toEqual(["invoice_created", "documents_ready"]);
  });
});

describe("draftSubject", () => {
  it("follows the SOP subject line", () => {
    expect(draftSubject(oakberry())).toBe(
      "Invoice + Agreement — 14249828 Canada Inc O/A Oakberry / Intro Campaign"
    );
  });
});

describe("draftBody", () => {
  const totals = computeInvoiceTotals(toPricingInput(oakberry()));

  it("greets the contact by first name", () => {
    expect(draftBody(oakberry(), totals, null)).toContain("Hey Carter,");
  });

  it("quotes the total the client will actually be charged", () => {
    expect(draftBody(oakberry(), totals, "https://pay")).toContain("$2,163.00");
  });

  it("gives card payers the payment link and no e-transfer address", () => {
    const body = draftBody(oakberry(), totals, "https://pay/abc");
    expect(body).toContain("https://pay/abc");
    expect(body).not.toContain("payments@waveroomtv.com");
  });

  it("gives e-transfer payers the address and no payment link", () => {
    const etransfer = oakberry({ paymentMethod: "e_transfer" });
    const body = draftBody(etransfer, computeInvoiceTotals(toPricingInput(etransfer)), null);
    expect(body).toContain("payments@waveroomtv.com");
    expect(body).not.toContain("credit card payment");
  });

  it("says the link is missing rather than printing 'null'", () => {
    const body = draftBody(oakberry(), totals, null);
    expect(body).not.toContain("null");
    expect(body).toContain("payment link unavailable");
  });
});

describe("when the email draft cannot be created", () => {
  /**
   * AEs are on northlygroup.com while delegation is granted in the
   * waveroomtv.com Workspace, so impersonation fails. The invoice and the
   * agreement are already created and correct — losing them would be worse
   * than losing the draft.
   */
  function portsWithFailingMail() {
    const r = makePorts();
    r.ports.mail = {
      async createDraft() {
        throw new Error(
          "Client is unauthorized to retrieve access tokens using this method"
        );
      },
    };
    return r;
  }

  it("still returns the invoice and the agreement", async () => {
    const r = portsWithFailingMail();
    const result = await generateDealDocuments(oakberry(), r.ports);
    expect(result.invoiceNumber).toBe("1820");
    expect(result.agreementDocumentId).toBe("doc-1");
  });

  it("reports the draft as missing rather than pretending it exists", async () => {
    const r = portsWithFailingMail();
    const result = await generateDealDocuments(oakberry(), r.ports);
    expect(result.draftId).toBeNull();
    expect(result.draftLink).toBeNull();
    expect(result.draftError).toMatch(/unauthorized/i);
  });

  it("records the failure for audit", async () => {
    const r = portsWithFailingMail();
    await generateDealDocuments(oakberry(), r.ports);
    expect(r.events.map((e) => e.action)).toContain("draft_failed");
  });

  it("does not create a second invoice when the AE retries", async () => {
    const r = portsWithFailingMail();
    await generateDealDocuments(oakberry(), r.ports);
    expect(r.invoicesCreated).toBe(1);
  });
});
