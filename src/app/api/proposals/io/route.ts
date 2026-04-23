import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNTS_SEED } from "@/lib/accounts-seed";
import { formatCurrency } from "@/lib/pricing";

const DRIVE_FOLDER_ID = "1niP6cYzjtISrUy9pIWYY3OWNQttGkFZf";

const PROVINCE_TAX: Record<string, { name: string; rate: number }> = {
  ON: { name: "HST (ON)", rate: 0.13 },
  BC: { name: "GST + PST (BC)", rate: 0.12 },
  AB: { name: "GST", rate: 0.05 },
  QC: { name: "GST + QST (QC)", rate: 0.14975 },
  MB: { name: "GST + PST (MB)", rate: 0.12 },
  SK: { name: "GST + PST (SK)", rate: 0.11 },
  NS: { name: "HST (NS)", rate: 0.15 },
  NB: { name: "HST (NB)", rate: 0.15 },
  PE: { name: "HST (PE)", rate: 0.15 },
  NL: { name: "HST (NL)", rate: 0.15 },
  NT: { name: "GST", rate: 0.05 },
  NU: { name: "GST", rate: 0.05 },
  YT: { name: "GST", rate: 0.05 },
};

type DocLine = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  alignment?: "CENTER" | "LEFT";
};

function buildDocRequests(lines: DocLine[]): unknown[] {
  const fullText = lines.map((l) => l.text + "\n").join("");
  const requests: unknown[] = [
    { insertText: { location: { index: 1 }, text: fullText } },
  ];

  let idx = 1;
  for (const line of lines) {
    const len = line.text.length;
    if (len > 0) {
      const textStyle: Record<string, unknown> = {};
      const fields: string[] = [];
      if (line.bold) { textStyle.bold = true; fields.push("bold"); }
      if (line.italic) { textStyle.italic = true; fields.push("italic"); }
      if (line.fontSize) {
        textStyle.fontSize = { magnitude: line.fontSize, unit: "PT" };
        fields.push("fontSize");
      }
      if (fields.length > 0) {
        requests.push({
          updateTextStyle: {
            range: { startIndex: idx, endIndex: idx + len },
            textStyle,
            fields: fields.join(","),
          },
        });
      }
      if (line.alignment) {
        requests.push({
          updateParagraphStyle: {
            range: { startIndex: idx, endIndex: idx + len + 1 },
            paragraphStyle: { alignment: line.alignment },
            fields: "alignment",
          },
        });
      }
    }
    idx += line.text.length + 1;
  }
  return requests;
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "TBD";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-CA", {
      month: "long", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

function getOptionLabel(n: number): string {
  const labels: Record<number, string> = {
    2: "Option 2 — Pilot",
    3: "Option 3 — Multi-Page Awareness Bundle",
    4: "Option 4 — Awareness + Conversion Bundle",
    5: "Option 5 — Full Campaign",
  };
  return labels[n] ?? `Option ${n}`;
}

function getDeliverables(n: number, count: number): string[] {
  const p = `${count} account${count !== 1 ? "s" : ""}`;
  switch (n) {
    case 2: return [
      `1 branded Instagram feed post per account across ${p}`,
      `2 story slides per account`,
      `Campaign management: strategy, copywriting, scheduling, and optimization`,
    ];
    case 3: return [
      `2 branded Instagram feed posts per account across ${p}`,
      `4 story slides per account`,
      `Full multi-page awareness push with repeated exposure`,
      `Campaign management: strategy, copywriting, scheduling, and optimization`,
    ];
    case 4: return [
      `2 branded Instagram feed posts per account across ${p}`,
      `1 conversion / LTO (Limited Time Offer) post per account`,
      `4 story slides per account`,
      `Awareness-to-action structure designed to drive measurable results`,
      `Campaign management: strategy, copywriting, scheduling, and optimization`,
    ];
    case 5: return [
      `2 branded Instagram feed posts per account across ${p}`,
      `1 conversion / LTO post per account`,
      `4 story slides per account`,
      `1 original content video per account`,
      `Full-funnel campaign with original creative production`,
      `Campaign management: strategy, copywriting, scheduling, and optimization`,
    ];
    default: return [`Campaign deliverables across ${p}`];
  }
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

  const providerToken = session.provider_token;
  if (!providerToken) {
    return NextResponse.json({
      error: "no_drive_token",
      message: "Sign out and back in to grant Google Drive access.",
    }, { status: 403 });
  }

  const body = await request.json();
  const {
    optionNumber,
    businessName,
    clientLegalName,
    clientStreet,
    clientCity,
    clientProvince,
    clientPostal,
    clientEmail,
    offerExpiry,
    serviceStartDate,
    campaignEndDate,
    storyServicesType,
    storyServicesNote,
    paymentType,
    paymentSchedule,
    specialConditions,
    selectedAccountHandles,
    optionPrice,
    markets,
  } = body as {
    optionNumber: number;
    businessName: string;
    clientLegalName: string;
    clientStreet: string;
    clientCity: string;
    clientProvince: string;
    clientPostal: string;
    clientEmail: string;
    offerExpiry: string;
    serviceStartDate: string;
    campaignEndDate: string;
    storyServicesType: string;
    storyServicesNote: string;
    paymentType: string;
    paymentSchedule: Array<{ date: string; amount: string }>;
    specialConditions: string;
    selectedAccountHandles: string[];
    optionPrice: number;
    markets: string[];
  };

  // Tax
  const tax = PROVINCE_TAX[clientProvince?.toUpperCase()] ?? PROVINCE_TAX.ON;
  const subtotal = optionPrice ?? 0;
  const taxAmount = Math.round(subtotal * tax.rate * 100) / 100;
  const total = subtotal + taxAmount;

  // Accounts + followers
  const accounts = selectedAccountHandles
    .map((h) => ACCOUNTS_SEED.find((a) => a.handle === h))
    .filter(Boolean);
  const totalFollowers = accounts.reduce((s, a) => s + (a?.followers ?? 0), 0);
  const formattedFollowers = new Intl.NumberFormat("en-CA").format(totalFollowers);

  // Story services text
  let storyText = "";
  if (storyServicesType === "complementary") {
    storyText = `Story slides are included as complementary support posts on each account involved in this campaign (${selectedAccountHandles.join(", ")}).`;
  } else if (storyServicesType === "full_price") {
    storyText = "Story slides are billed as standalone deliverables on each account at the standard story rate.";
  } else {
    storyText = storyServicesNote || "Story services as per agreement.";
  }

  // Payment text
  let paymentText = "";
  if (paymentType === "single") {
    paymentText = `Single payment of ${formatCurrency(total)} (incl. applicable tax) due upon signing.`;
  } else {
    paymentText = (paymentSchedule ?? [])
      .map((p, i) => `Payment ${i + 1}: ${p.amount} — due ${fmtDate(p.date)}`)
      .join("\n");
  }

  const DIV = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  const deliverables = getDeliverables(optionNumber, accounts.length);
  const marketsStr = Array.isArray(markets) ? markets.join(", ") : (markets ?? "");

  const lines: DocLine[] = [
    { text: "NORTHLY GROUP", bold: true, fontSize: 18, alignment: "CENTER" },
    { text: "INSERTION ORDER", bold: true, fontSize: 14, alignment: "CENTER" },
    { text: "" },
    { text: DIV },
    { text: "" },
    { text: "CLIENT DETAILS", bold: true, fontSize: 12 },
    { text: "" },
    { text: `Customer:          ${businessName}` },
    { text: `Company:           ${clientLegalName || businessName}` },
    { text: `Address:           ${clientStreet}` },
    { text: `                   ${clientCity}, ${clientProvince}  ${clientPostal}` },
    { text: `                   Canada` },
    { text: `Invoice Email:     ${clientEmail}` },
    { text: `Offer Expiry:      ${fmtDate(offerExpiry)}` },
    { text: `Service Start:     ${fmtDate(serviceStartDate)}` },
    { text: `Invoice #:         To be assigned upon deal close` },
    { text: "" },
    { text: DIV },
    { text: "" },
    { text: "SECTION 1 — CAMPAIGN SERVICES", bold: true, fontSize: 12 },
    { text: "" },
    { text: `Item:       Northly Group Marketing Package — ${getOptionLabel(optionNumber)}`, bold: true },
    { text: `Markets:    ${marketsStr}` },
    { text: "" },
    { text: "Deliverables:", bold: true },
    ...deliverables.map((d) => ({ text: `  • ${d}` })),
    { text: "" },
    { text: "Pages Included:", bold: true },
    { text: `  ${selectedAccountHandles.join("   ")}` },
    { text: "" },
    { text: `Total Following Reach:   ${formattedFollowers} followers across ${accounts.length} accounts`, bold: true },
    { text: "" },
    { text: `Qty:        1` },
    { text: `Rate:       ${formatCurrency(subtotal)}` },
    { text: `Amount:     ${formatCurrency(subtotal)}` },
    { text: "" },
    { text: `Special Conditions:   ${specialConditions?.trim() || "None"}` },
    { text: "" },
    { text: DIV },
    { text: "" },
    { text: "SECTION 2 — STORY SERVICES", bold: true, fontSize: 12 },
    { text: "" },
    { text: storyText },
    { text: "" },
    { text: DIV },
    { text: "" },
    { text: "BILLING & PAYMENT", bold: true, fontSize: 12 },
    { text: "" },
    { text: `Campaign Term:      ${fmtDate(serviceStartDate)} — ${fmtDate(campaignEndDate)}` },
    { text: "" },
    { text: "Payment Schedule:", bold: true },
    { text: paymentText },
    { text: "" },
    { text: DIV },
    { text: "" },
    { text: "PRICING SUMMARY", bold: true, fontSize: 12 },
    { text: "" },
    { text: `Subtotal:                                ${formatCurrency(subtotal)}` },
    { text: `${tax.name} @ ${(tax.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%:    ${formatCurrency(taxAmount)}` },
    { text: `                                         ──────────────────` },
    { text: `TOTAL:                                   ${formatCurrency(total)}`, bold: true },
    { text: "" },
    { text: `BALANCE DUE:                             ${formatCurrency(total)}`, bold: true },
    { text: "" },
    { text: DIV },
    { text: "" },
    { text: "VENDOR", bold: true, fontSize: 12 },
    { text: "" },
    { text: "Name:       Asad Rahman" },
    { text: "Title:      Director, Northly Group" },
    { text: "Company:    WAVEROOMTV INC." },
    { text: "Address:    305 Milner Avenue, Suite 700" },
    { text: "            Scarborough, Toronto ON M1B 3V4" },
    { text: "Email:      management@northlygroup.com" },
    { text: "GST/HST:    752988071RT0001" },
    { text: "" },
    { text: "Authorized Signature:" },
    { text: "" },
    { text: "________________________                    Date: _______________" },
    { text: "" },
    { text: DIV },
    { text: "" },
    { text: "CLIENT AUTHORIZATION", bold: true, fontSize: 12 },
    { text: "" },
    { text: "By signing below, the client agrees to the terms of this Insertion Order and authorizes" },
    { text: "WAVEROOMTV INC. (Northly Group) to proceed with the campaign as outlined above." },
    { text: "" },
    { text: "Client Signature:    ________________________                Date: _______________" },
    { text: "" },
    { text: "Client Name (Print): ________________________" },
    { text: "" },
    { text: DIV },
    { text: "" },
    { text: "Please submit payment via E-transfer to payments@waveroomtv.com", italic: true, alignment: "CENTER" },
  ];

  const docRequests = buildDocRequests(lines);
  const dateStr = new Date().toISOString().slice(0, 10);
  const docTitle = `IO — ${businessName} — Option ${optionNumber} — ${dateStr}`;

  // 1. Create document
  const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: docTitle }),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    console.error("Docs create error:", err);
    return NextResponse.json({ error: "Failed to create Google Doc" }, { status: 500 });
  }
  const doc = await createRes.json();
  const docId = doc.documentId;

  // 2. Insert content + formatting
  const updateRes = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests: docRequests }),
    }
  );
  if (!updateRes.ok) {
    const err = await updateRes.text();
    console.error("Docs batchUpdate error:", err);
    return NextResponse.json({ error: "Failed to write IO content", detail: err }, { status: 500 });
  }

  // 3. Move to Drive folder
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${docId}?addParents=${DRIVE_FOLDER_ID}&removeParents=root`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${providerToken}` },
    }
  );

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  return NextResponse.json({ docId, docUrl, title: docTitle });
}
