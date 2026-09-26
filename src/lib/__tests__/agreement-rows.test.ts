import {
  agreementTotalDollars,
  customerRows,
  orderDetailsRow,
  serviceRows,
  summaryRows,
  surplusItemRowCount,
  SERVICES_ITEM_ROW_COUNT,
  type AgreementInput,
} from "@/lib/agreement-rows";
import { computeInvoiceTotals } from "@/lib/invoice-pricing";

/** The Oakberry deal, the one where the signed total did not match the invoice. */
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

const oakberry: AgreementInput = {
  customerBlock: "14249828 Canada Inc\nO/A Oakberry\n409 North Dr\nWinnipeg, MB R3T 0A1",
  invoiceContactName: "Carter Friesen",
  invoiceEmail: "carter@snowbank.capital",
  initialSubscriptionTerm: "One Time",
  billingTerm: "Due Upon Receipt",
  currency: "CAD",
  serviceStartDate: "Sept 3, 2026",
  invoiceNumber: "1820",
  lines: [
    { item: "Brand Awareness Feed Post @northlywindsor", description: "Instagram feed activation.", quantity: 1, unitPriceCents: 115_000 },
    { item: "Brand Awareness Feed Post @northlyottawa", description: "Instagram feed activation.", quantity: 1, unitPriceCents: 95_000 },
    { item: "Brand Awareness Feed Post @northlylondon", description: "Instagram feed activation.", quantity: 1, unitPriceCents: 75_000 },
    { item: "Story", description: "Story post on accounts mentioned above", quantity: 6, unitPriceCents: 0 },
  ],
  totals: oakberryTotals,
};

describe("customerRows", () => {
  it("puts the contact name and email in the right cells", () => {
    const rows = customerRows(oakberry);
    expect(rows).toHaveLength(2);
    expect(rows[0][1]).toBe("Invoice Contact:");
    expect(rows[0][2]).toBe("Carter Friesen");
    expect(rows[1][1]).toBe("Invoice Email:");
    expect(rows[1][2]).toBe("carter@snowbank.capital");
  });
});

describe("orderDetailsRow", () => {
  it("carries the invoice number in the fifth cell", () => {
    const row = orderDetailsRow(oakberry);
    expect(row).toHaveLength(5);
    expect(row[4]).toBe("1820");
  });

  it("matches the order of the template header row", () => {
    expect(orderDetailsRow(oakberry)).toEqual([
      "One Time",
      "Due Upon Receipt",
      "CAD",
      "Sept 3, 2026",
      "1820",
    ]);
  });
});

describe("serviceRows", () => {
  it("produces one row per deal line", () => {
    expect(serviceRows(oakberry)).toHaveLength(4);
  });

  it("multiplies quantity by unit price for the fee column", () => {
    const rows = serviceRows(oakberry);
    expect(rows[0].price).toBe("$1,150.00");
    expect(rows[0].quantity).toBe("1");
    expect(rows[0].fee).toBe("$1,150.00");
  });

  it("handles a multi-quantity zero-rated line", () => {
    const story = serviceRows(oakberry)[3];
    expect(story.quantity).toBe("6");
    expect(story.fee).toBe("$0.00");
  });
});

describe("summaryRows", () => {
  it("shows the processing fee so the agreement total matches the invoice", () => {
    // This is the Oakberry defect: the client signed $2,100.00 while the
    // invoice billed $2,327.80, because the fee was invoice-only.
    const rows = summaryRows(oakberryTotals);
    const labels = rows.map((r) => r.label);
    expect(labels).toContain("Processing Fee 3% (zero-rated)");

    const fee = rows.find((r) => r.label.startsWith("Processing Fee"))!;
    expect(fee.value).toBe("$67.80");

    const total = rows.find((r) => r.label === "Total")!;
    expect(total.value).toBe("$2,327.80");
  });

  it("shows the discount as a saving when there is one", () => {
    const saving = summaryRows(oakberryTotals).find((r) => r.label === "Total Saving");
    expect(saving!.value).toBe("$850.00");
  });

  it("shows the subtotal net of the discount, matching the issued agreement", () => {
    const subtotal = summaryRows(oakberryTotals).find((r) => r.label === "Subtotal");
    expect(subtotal!.value).toBe("$2,000.00");
  });

  it("omits the fee row entirely for a non-card payment", () => {
    const totals = computeInvoiceTotals({
      province: "ON",
      paymentMethod: "cheque",
      discountCents: 0,
      lines: [{ quantity: 1, unitPriceCents: 170_000, taxTreatment: "standard" }],
    });
    const labels = summaryRows(totals).map((r) => r.label);
    expect(labels).not.toContain("Processing Fee 3% (zero-rated)");
    expect(labels).toEqual(["Subtotal", "HST (ON) @ 13%", "Total"]);
  });

  it("omits the saving row when there is no discount", () => {
    const totals = computeInvoiceTotals({
      province: "ON",
      paymentMethod: "cheque",
      discountCents: 0,
      lines: [{ quantity: 1, unitPriceCents: 170_000, taxTreatment: "standard" }],
    });
    expect(summaryRows(totals).map((r) => r.label)).not.toContain("Total Saving");
  });

  it("reproduces the Jimmy The Greek agreement exactly", () => {
    const totals = computeInvoiceTotals({
      province: "ON",
      paymentMethod: "cheque",
      discountCents: 0,
      lines: [{ quantity: 1, unitPriceCents: 170_000, taxTreatment: "standard" }],
    });
    expect(summaryRows(totals)).toEqual([
      { label: "Subtotal", value: "$1,700.00" },
      { label: "HST (ON) @ 13%", value: "$221.00" },
      { label: "Total", value: "$1,921.00" },
    ]);
  });
});

describe("surplusItemRowCount", () => {
  it("counts the template rows to delete", () => {
    expect(surplusItemRowCount(4)).toBe(SERVICES_ITEM_ROW_COUNT - 4);
    expect(surplusItemRowCount(SERVICES_ITEM_ROW_COUNT)).toBe(0);
  });

  it("rejects a deal with no lines", () => {
    expect(() => surplusItemRowCount(0)).toThrow(/at least one line/);
  });

  it("refuses to silently drop lines that exceed the template", () => {
    expect(() => surplusItemRowCount(22)).toThrow(/Add rows to the template/);
  });
});

describe("agreementTotalDollars", () => {
  it("returns the figure QuickBooks is reconciled against", () => {
    expect(agreementTotalDollars(oakberryTotals)).toBe(2327.8);
  });
});
