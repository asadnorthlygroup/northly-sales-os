import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { qbFetch } from "@/lib/quickbooks";

const PROVINCE_TAX: Record<string, { name: string; rate: number }> = {
  ON: { name: "HST", rate: 0.13 },
  BC: { name: "GST/PST", rate: 0.12 },
  AB: { name: "GST", rate: 0.05 },
  QC: { name: "GST/QST", rate: 0.14975 },
  MB: { name: "GST/PST", rate: 0.12 },
  SK: { name: "GST/PST", rate: 0.11 },
  NS: { name: "HST", rate: 0.15 },
  NB: { name: "HST", rate: 0.15 },
  PE: { name: "HST", rate: 0.15 },
  NL: { name: "HST", rate: 0.15 },
  NT: { name: "GST", rate: 0.05 },
  NU: { name: "GST", rate: 0.05 },
  YT: { name: "GST", rate: 0.05 },
};

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
    throw new Error(`Failed to create QB customer: ${err}`);
  }

  const created = await createRes.json();
  return created.Customer.Id;
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

  const body = await request.json() as {
    dealId: string;
    clientName: string;
    clientEmail: string;
    clientStreet: string;
    clientCity: string;
    clientProvince: string;
    clientPostal: string;
    optionNumber: number;
    subtotal: number;
    serviceDescription: string;
    invoiceDate: string;
    dueDate: string;
    selectedAccountHandles: string[];
  };

  const {
    clientName,
    clientEmail,
    clientStreet,
    clientCity,
    clientProvince,
    clientPostal,
    optionNumber,
    subtotal,
    serviceDescription,
    invoiceDate,
    dueDate,
    selectedAccountHandles,
  } = body;

  const tax = PROVINCE_TAX[clientProvince?.toUpperCase()] ?? PROVINCE_TAX.ON;
  const taxAmount = Math.round(subtotal * tax.rate * 100) / 100;
  const total = subtotal + taxAmount;

  // Find or create customer
  const customerId = await findOrCreateCustomer(
    clientName,
    clientEmail,
    clientStreet,
    clientCity,
    clientProvince,
    clientPostal
  );

  const pagesStr = selectedAccountHandles.length > 0
    ? `\nPages: ${selectedAccountHandles.join(", ")}`
    : "";

  const lineDescription = serviceDescription ||
    `Northly Group Marketing Package — Option ${optionNumber}${pagesStr}`;

  // Build invoice payload
  const invoicePayload = {
    CustomerRef: { value: customerId },
    TxnDate: invoiceDate,
    DueDate: dueDate,
    Line: [
      {
        Amount: subtotal,
        DetailType: "SalesItemLineDetail",
        Description: lineDescription,
        SalesItemLineDetail: {
          ItemRef: { value: "1", name: "Services" },
          UnitPrice: subtotal,
          Qty: 1,
          TaxCodeRef: { value: "TAX" },
        },
      },
    ],
    TxnTaxDetail: {
      TotalTax: taxAmount,
      TaxLine: [
        {
          Amount: taxAmount,
          DetailType: "TaxLineDetail",
          TaxLineDetail: {
            TaxRateRef: { value: "1" },
            PercentBased: true,
            TaxPercent: tax.rate * 100,
            NetAmountTaxable: subtotal,
          },
        },
      ],
    },
    CustomerMemo: { value: "Please remit payment via E-transfer to payments@waveroomtv.com" },
    BillEmail: clientEmail ? { Address: clientEmail } : undefined,
  };

  const invoiceRes = await qbFetch("/invoice?minorversion=70", {
    method: "POST",
    body: JSON.stringify(invoicePayload),
  });

  if (!invoiceRes.ok) {
    const err = await invoiceRes.text();
    console.error("QB invoice create error:", err);

    // If tax code fails, retry without tax codes (simpler approach)
    const simplePayload = {
      CustomerRef: { value: customerId },
      TxnDate: invoiceDate,
      DueDate: dueDate,
      Line: [
        {
          Amount: subtotal,
          DetailType: "SalesItemLineDetail",
          Description: lineDescription,
          SalesItemLineDetail: {
            ItemRef: { value: "1", name: "Services" },
            UnitPrice: subtotal,
            Qty: 1,
          },
        },
        {
          Amount: taxAmount,
          DetailType: "SalesItemLineDetail",
          Description: `${tax.name} @ ${(tax.rate * 100).toFixed(2).replace(/\.?0+$/, "")}%`,
          SalesItemLineDetail: {
            ItemRef: { value: "1", name: "Services" },
            UnitPrice: taxAmount,
            Qty: 1,
          },
        },
      ],
      CustomerMemo: { value: "Please remit payment via E-transfer to payments@waveroomtv.com" },
    };

    const retryRes = await qbFetch("/invoice?minorversion=70", {
      method: "POST",
      body: JSON.stringify(simplePayload),
    });

    if (!retryRes.ok) {
      const retryErr = await retryRes.text();
      return NextResponse.json({ error: "Failed to create QB invoice", detail: retryErr }, { status: 500 });
    }

    const retryData = await retryRes.json();
    const inv = retryData.Invoice;
    return NextResponse.json({
      invoiceId: inv.Id,
      invoiceNumber: inv.DocNumber,
      total,
      qbUrl: `https://sandbox.qbo.intuit.com/app/invoice?txnId=${inv.Id}`,
    });
  }

  const data = await invoiceRes.json();
  const inv = data.Invoice;

  return NextResponse.json({
    invoiceId: inv.Id,
    invoiceNumber: inv.DocNumber,
    total,
    qbUrl: `https://sandbox.qbo.intuit.com/app/invoice?txnId=${inv.Id}`,
  });
}
