import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { qbFetch } from "@/lib/quickbooks";
import {
  centsToDollars,
  computeInvoiceTotals,
  dollarsToCents,
  formatCents,
  parseProvince,
  reconcile,
  type InvoiceLineInput,
  type InvoiceTotals,
  type PaymentMethod,
} from "@/lib/invoice-pricing";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface InvoiceRequestBody {
  dealId?: string;
  clientName: string;
  clientEmail: string;
  clientStreet: string;
  clientCity: string;
  clientProvince: string;
  clientPostal: string;
  optionNumber: number;
  /** Legacy single-line callers send a dollar subtotal. */
  subtotal?: number;
  /** Preferred: explicit lines in dollars. Takes precedence over subtotal. */
  lines?: { description?: string; quantity: number; unitPrice: number; zeroRated?: boolean }[];
  paymentMethod?: PaymentMethod;
  discount?: number;
  serviceDescription: string;
  invoiceDate: string;
  dueDate: string;
  selectedAccountHandles: string[];
}

async function saveInvoiceLocally(
  inv: { Id: string; DocNumber: string },
  body: InvoiceRequestBody,
  totals: InvoiceTotals,
  paymentMethod: PaymentMethod,
  qbUrl: string,
  userId: string
) {
  const admin = adminClient();
  await admin.from("invoices").insert({
    deal_id: body.dealId ?? null,
    client_name: body.clientName,
    option_number: body.optionNumber,
    subtotal: centsToDollars(totals.subtotalCents),
    discount_amount: centsToDollars(totals.discountCents),
    tax_amount: centsToDollars(totals.taxCents),
    processing_fee: centsToDollars(totals.feeCents),
    total: centsToDollars(totals.totalCents),
    payment_method: paymentMethod,
    province: body.clientProvince,
    invoice_date: body.invoiceDate,
    due_date: body.dueDate,
    service_description: body.serviceDescription || null,
    selected_accounts: body.selectedAccountHandles ?? [],
    qb_invoice_id: inv.Id,
    qb_invoice_number: inv.DocNumber,
    qb_url: qbUrl,
    status: "sent",
    created_by: userId,
  });
}

async function findOrCreateCustomer(
  displayName: string,
  email: string,
  street: string,
  city: string,
  province: string,
  postal: string
): Promise<string> {
  // Search for existing customer
  const searchRes = await qbFetch(
    `/query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${displayName.replace(/'/g, "\\'")}'`)}&minorversion=70`
  );
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    const existing = searchData?.QueryResponse?.Customer?.[0];
    if (existing?.Id) return existing.Id;
  }

  // Create new customer
  const createRes = await qbFetch("/customer?minorversion=70", {
    method: "POST",
    body: JSON.stringify({
      DisplayName: displayName,
      PrimaryEmailAddr: email ? { Address: email } : undefined,
      BillAddr: {
        Line1: street,
        City: city,
        CountrySubDivisionCode: province,
        PostalCode: postal,
        Country: "Canada",
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    // Surface auth failures clearly so the client can prompt a reconnect.
    if (err.includes("ApplicationAuthorizationFailed") || err.includes("003100") || createRes.status === 403) {
      const env = process.env.QUICKBOOKS_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
      const e = new Error(
        `QuickBooks rejected the request (3100/ApplicationAuthorizationFailed). ` +
        `App is set to "${env}" environment. ` +
        `If your QB Developer app is configured for the other environment, set ` +
        `QUICKBOOKS_ENVIRONMENT=${env === "sandbox" ? "production" : "sandbox"} and redeploy.`
      );
      (e as Error & { code?: string }).code = "qb_auth_failed";
      throw e;
    }
    throw new Error(`Failed to create QB customer: ${err}`);
  }

  const created = await createRes.json();
  return created.Customer.Id;
}

/** Turns the request body into engine input, accepting legacy and multi-line callers. */
function toPricingLines(body: InvoiceRequestBody): {
  lines: InvoiceLineInput[];
  descriptions: string[];
} {
  if (body.lines && body.lines.length > 0) {
    return {
      lines: body.lines.map((line) => ({
        quantity: line.quantity,
        unitPriceCents: dollarsToCents(line.unitPrice),
        taxTreatment: line.zeroRated ? "zero_rated" : "standard",
      })),
      descriptions: body.lines.map((line) => line.description ?? ""),
    };
  }

  const pagesStr =
    body.selectedAccountHandles?.length > 0
      ? `\nPages: ${body.selectedAccountHandles.join(", ")}`
      : "";

  return {
    lines: [
      {
        quantity: 1,
        unitPriceCents: dollarsToCents(body.subtotal ?? 0),
        taxTreatment: "standard",
      },
    ],
    descriptions: [
      body.serviceDescription ||
        `Northly Group Marketing Package — Option ${body.optionNumber}${pagesStr}`,
    ],
  };
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = (await request.json()) as InvoiceRequestBody;

    const {
      clientName,
      clientEmail,
      clientStreet,
      clientCity,
      clientProvince,
      clientPostal,
      invoiceDate,
      dueDate,
    } = body;

    // Throws on an unrecognised code rather than silently taxing at Ontario's rate.
    const province = parseProvince(clientProvince);
    const paymentMethod: PaymentMethod = body.paymentMethod ?? "e_transfer";

    const { lines, descriptions } = toPricingLines(body);

    const totals = computeInvoiceTotals({
      province,
      paymentMethod,
      discountCents: dollarsToCents(body.discount ?? 0),
      lines,
    });

    const customerId = await findOrCreateCustomer(
      clientName,
      clientEmail,
      clientStreet,
      clientCity,
      clientProvince,
      clientPostal
    );

    const taxPercent = totals.taxableBaseCents > 0
      ? (totals.taxCents / totals.taxableBaseCents) * 100
      : 0;

    const serviceLines = lines.map((line, index) => ({
      Amount: centsToDollars(line.quantity * line.unitPriceCents),
      DetailType: "SalesItemLineDetail",
      Description: descriptions[index] ?? "",
      SalesItemLineDetail: {
        ItemRef: { value: "1", name: "Services" },
        UnitPrice: centsToDollars(line.unitPriceCents),
        Qty: line.quantity,
        TaxCodeRef: { value: line.taxTreatment === "zero_rated" ? "NON" : "TAX" },
      },
    }));

    // The line whose absence cost $305.10 on invoice 1822. Zero-rated, so the
    // fee is never itself taxed.
    if (totals.feeCents > 0) {
      serviceLines.push({
        Amount: centsToDollars(totals.feeCents),
        DetailType: "SalesItemLineDetail",
        Description: "Credit card payment processing fee 3%",
        SalesItemLineDetail: {
          ItemRef: { value: "1", name: "Services" },
          UnitPrice: centsToDollars(totals.feeCents),
          Qty: 1,
          TaxCodeRef: { value: "NON" },
        },
      });
    }

    const memo =
      paymentMethod === "credit_card"
        ? "Payable by credit card using the payment link on this invoice. A 3% processing fee is included."
        : "Please remit payment via E-transfer to payments@waveroomtv.com";

    const invoicePayload = {
      CustomerRef: { value: customerId },
      TxnDate: invoiceDate,
      DueDate: dueDate,
      Line: serviceLines,
      TxnTaxDetail: {
        TotalTax: centsToDollars(totals.taxCents),
        TaxLine: [
          {
            Amount: centsToDollars(totals.taxCents),
            DetailType: "TaxLineDetail",
            TaxLineDetail: {
              TaxRateRef: { value: "1" },
              PercentBased: true,
              TaxPercent: taxPercent,
              NetAmountTaxable: centsToDollars(totals.taxableBaseCents),
            },
          },
        ],
      },
      CustomerMemo: { value: memo },
      BillEmail: clientEmail ? { Address: clientEmail } : undefined,
    };

    let inv: { Id: string; DocNumber: string; TotalAmt?: number };

    const invoiceRes = await qbFetch("/invoice?minorversion=70", {
      method: "POST",
      body: JSON.stringify(invoicePayload),
    });

    if (invoiceRes.ok) {
      inv = (await invoiceRes.json()).Invoice;
    } else {
      const err = await invoiceRes.text();
      console.error("QB invoice create error:", err);

      // Fall back to expressing tax as its own line when the tax codes are
      // rejected. The fee line is carried through so it is never lost.
      const simplePayload = {
        CustomerRef: { value: customerId },
        TxnDate: invoiceDate,
        DueDate: dueDate,
        Line: [
          ...serviceLines.map((line) => ({
            ...line,
            SalesItemLineDetail: {
              ItemRef: line.SalesItemLineDetail.ItemRef,
              UnitPrice: line.SalesItemLineDetail.UnitPrice,
              Qty: line.SalesItemLineDetail.Qty,
            },
          })),
          {
            Amount: centsToDollars(totals.taxCents),
            DetailType: "SalesItemLineDetail",
            Description: totals.taxLabel,
            SalesItemLineDetail: {
              ItemRef: { value: "1", name: "Services" },
              UnitPrice: centsToDollars(totals.taxCents),
              Qty: 1,
            },
          },
        ],
        CustomerMemo: { value: memo },
      };

      const retryRes = await qbFetch("/invoice?minorversion=70", {
        method: "POST",
        body: JSON.stringify(simplePayload),
      });

      if (!retryRes.ok) {
        const retryErr = await retryRes.text();
        return NextResponse.json(
          { error: "Failed to create QB invoice", detail: retryErr },
          { status: 500 }
        );
      }

      inv = (await retryRes.json()).Invoice;
    }

    const qbUrl = `https://app.qbo.intuit.com/app/invoice?txnId=${inv.Id}`;
    await saveInvoiceLocally(inv, body, totals, paymentMethod, qbUrl, session.user.id);

    // The gate. If QuickBooks and our engine disagree, the invoice exists but
    // must not be treated as ready to send.
    if (typeof inv.TotalAmt === "number") {
      const check = reconcile(totals.totalCents, dollarsToCents(inv.TotalAmt));
      if (!check.ok) {
        return NextResponse.json(
          {
            error:
              `Invoice ${inv.DocNumber} was created but its total does not match the agreement. ` +
              `Expected ${formatCents(check.expectedCents)}, QuickBooks recorded ` +
              `${formatCents(check.actualCents)}, a difference of ${formatCents(check.differenceCents)}. ` +
              `Review it in QuickBooks before sending anything to the client.`,
            code: "reconciliation_failed",
            invoiceId: inv.Id,
            invoiceNumber: inv.DocNumber,
            qbUrl,
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({
      invoiceId: inv.Id,
      invoiceNumber: inv.DocNumber,
      subtotal: centsToDollars(totals.subtotalCents),
      tax: centsToDollars(totals.taxCents),
      processingFee: centsToDollars(totals.feeCents),
      total: centsToDollars(totals.totalCents),
      qbUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error creating QuickBooks invoice";
    const code = (err as Error & { code?: string })?.code;
    console.error("[invoices/quickbooks]", err);
    return NextResponse.json({ error: message, code }, { status: code === "qb_auth_failed" ? 403 : 500 });
  }
}
