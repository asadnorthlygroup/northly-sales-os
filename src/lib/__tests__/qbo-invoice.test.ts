import { buildInvoicePayload, escapeQboLiteral } from "@/lib/qbo-invoice";
import { computeInvoiceTotals } from "@/lib/invoice-pricing";

const oakberryTotals = computeInvoiceTotals({
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

const chequeTotals = computeInvoiceTotals({
  province: "ON",
  paymentMethod: "cheque",
  discountCents: 0,
  lines: [{ quantity: 1, unitPriceCents: 170_000, taxTreatment: "standard" }],
});

const params = (totals = oakberryTotals) => ({
  customerId: "cust-1",
  clientEmail: "carter@snowbank.capital",
  invoiceDate: "2026-09-03",
  dueDate: "2026-09-03",
  lines: [
    { description: "BA Feed @northlywindsor", quantity: 1, unitPriceCents: 115_000, zeroRated: false },
    { description: "BA Feed @northlyottawa", quantity: 1, unitPriceCents: 95_000, zeroRated: false },
    { description: "BA Feed @northlylondon", quantity: 1, unitPriceCents: 75_000, zeroRated: false },
    { description: "Story", quantity: 6, unitPriceCents: 0, zeroRated: true },
  ],
  totals,
  memo: "Please remit payment via E-transfer",
});

interface QboLine {
  Amount: number;
  Description: string;
  SalesItemLineDetail: { Qty: number; UnitPrice: number; TaxCodeRef: { value: string } };
}

const linesOf = (payload: Record<string, unknown>) => payload.Line as QboLine[];

describe("escapeQboLiteral", () => {
  it("escapes apostrophes so a name like O'Brien does not break the query", () => {
    expect(escapeQboLiteral("O'Brien")).toBe("O\\'Brien");
  });

  it("escapes backslashes before apostrophes", () => {
    expect(escapeQboLiteral("a\\b'c")).toBe("a\\\\b\\'c");
  });
});

describe("buildInvoicePayload", () => {
  it("emits one line per deal line", () => {
    const lines = linesOf(buildInvoicePayload(params(chequeTotals)));
    expect(lines).toHaveLength(4);
  });

  it("adds the processing fee as a separate zero-rated line on card deals", () => {
    const lines = linesOf(buildInvoicePayload(params()));
    const fee = lines.find((l) => l.Description.includes("processing fee"));
    expect(fee).toBeDefined();
    expect(fee!.Amount).toBe(67.8);
    expect(fee!.SalesItemLineDetail.TaxCodeRef.value).toBe("NON");
  });

  it("omits the fee line entirely for a cheque deal", () => {
    const lines = linesOf(buildInvoicePayload(params(chequeTotals)));
    expect(lines.find((l) => l.Description.includes("processing fee"))).toBeUndefined();
  });

  it("marks zero-rated lines NON and standard lines TAX", () => {
    const lines = linesOf(buildInvoicePayload(params()));
    expect(lines[0].SalesItemLineDetail.TaxCodeRef.value).toBe("TAX");
    expect(lines[3].SalesItemLineDetail.TaxCodeRef.value).toBe("NON");
  });

  it("multiplies quantity by unit price for the line amount", () => {
    const lines = linesOf(buildInvoicePayload(params()));
    expect(lines[0].Amount).toBe(1150);
    expect(lines[0].SalesItemLineDetail.Qty).toBe(1);
  });

  it("takes the tax from the engine, not from a rate it recomputes", () => {
    const payload = buildInvoicePayload(params()) as Record<string, { TotalTax: number; TaxLine: { TaxLineDetail: { TaxPercent: number; NetAmountTaxable: number } }[] }>;
    const detail = payload.TxnTaxDetail;
    expect(detail.TotalTax).toBe(260);
    expect(detail.TaxLine[0].TaxLineDetail.NetAmountTaxable).toBe(2000);
    expect(detail.TaxLine[0].TaxLineDetail.TaxPercent).toBeCloseTo(13, 6);
  });

  it("excludes the zero-rated fee from the taxable base", () => {
    const payload = buildInvoicePayload(params()) as Record<string, { TaxLine: { TaxLineDetail: { NetAmountTaxable: number } }[] }>;
    // $2,000 taxable, not $2,063 — the fee is never taxed.
    expect(payload.TxnTaxDetail.TaxLine[0].TaxLineDetail.NetAmountTaxable).toBe(2000);
  });

  it("enables online card payment only when a fee is charged", () => {
    expect(buildInvoicePayload(params()).AllowOnlineCreditCardPayment).toBe(true);
    expect(buildInvoicePayload(params(chequeTotals)).AllowOnlineCreditCardPayment).toBe(false);
  });

  it("sends the discount, so QuickBooks agrees with the engine", () => {
    const lines = linesOf(buildInvoicePayload(params())) as unknown as { Amount: number; DetailType: string }[];
    const discount = lines.find((l) => l.DetailType === "DiscountLineDetail");
    expect(discount).toBeDefined();
    expect(discount!.Amount).toBe(850);
  });

  it("omits the discount line when there is no discount", () => {
    const lines = linesOf(buildInvoicePayload(params(chequeTotals))) as unknown as { DetailType: string }[];
    expect(lines.find((l) => l.DetailType === "DiscountLineDetail")).toBeUndefined();
  });

  it("sums to the total the engine computed", () => {
    // This is what reconciliation compares. If it drifts, every deal fails.
    const payload = buildInvoicePayload(params());
    const lines = linesOf(payload) as unknown as { Amount: number; DetailType: string }[];
    const net = lines.reduce(
      (s, l) => s + (l.DetailType === "DiscountLineDetail" ? -l.Amount : l.Amount),
      0
    );
    const tax = (payload.TxnTaxDetail as { TotalTax: number }).TotalTax;
    expect(net + tax).toBeCloseTo(2327.8, 2);
  });

  it("omits BillEmail when no client email is given", () => {
    const payload = buildInvoicePayload({ ...params(), clientEmail: undefined });
    expect(payload.BillEmail).toBeUndefined();
  });
});
