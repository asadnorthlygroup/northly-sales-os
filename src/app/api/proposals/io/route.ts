import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNTS_SEED } from "@/lib/accounts-seed";
import { formatCurrency } from "@/lib/pricing";

const TEMPLATE_DOC_ID = "19HpFMnB48ur0WxhNT4e6owWOni9sbAK4_qoWdVSMgno";
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

// Google Docs structure types
type GElement = { textRun?: { content?: string } };
type GContent = { paragraph?: { elements?: GElement[] }; startIndex?: number };
type GCell = { content?: GContent[]; startIndex?: number; endIndex?: number };
type GRow = { tableCells?: GCell[]; startIndex?: number };
type GTable = { tableRows?: GRow[]; startIndex?: number };
type GBodyEl = { table?: GTable };

function cellText(cell: GCell): string {
  return (cell.content ?? [])
    .flatMap((c) => c.paragraph?.elements ?? [])
    .map((e) => e.textRun?.content ?? "")
    .join("")
    .trim();
}

function findBillingTable(content: GBodyEl[]): GTable | null {
  for (const el of content) {
    if (!el.table) continue;
    for (const row of el.table.tableRows ?? []) {
      const texts = (row.tableCells ?? []).map(cellText);
      if (texts.some((t) => t.includes("Invoice #")) && texts.some((t) => t.includes("Campaign Term"))) {
        return el.table;
      }
    }
  }
  return null;
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
    contactName,
    clientLegalName,
    clientStreet,
    clientCity,
    clientProvince,
    clientPostal,
    clientEmail,
    serviceStartDate,
    campaignEndDate,
    storyServicesType,
    storyServicesNote,
    storyRate,
    storyAssignments,
    paymentType,
    paymentSchedule,
    specialConditions,
    selectedAccountHandles,
    collaboratorHandles,
    optionPrice,
    markets,
    offerExpiry,
  } = body as {
    optionNumber: number;
    businessName: string;
    contactName: string;
    clientLegalName: string;
    clientStreet: string;
    clientCity: string;
    clientProvince: string;
    clientPostal: string;
    clientEmail: string;
    serviceStartDate: string;
    campaignEndDate: string;
    storyServicesType: string;
    storyServicesNote: string;
    storyRate: number;
    storyAssignments: Array<{ handle: string; qty: number }>;
    paymentType: string;
    paymentSchedule: Array<{ date: string; amount: string }>;
    specialConditions: string;
    selectedAccountHandles: string[];
    collaboratorHandles: string[];
    optionPrice: number;
    markets: string[];
    offerExpiry: string;
  };

  const tax = PROVINCE_TAX[clientProvince?.toUpperCase()] ?? PROVINCE_TAX.ON;
  const subtotal = optionPrice ?? 0;
  const taxAmount = Math.round(subtotal * tax.rate * 100) / 100;
  const total = subtotal + taxAmount;

  const collabSet = new Set(collaboratorHandles ?? []);
  const accounts = selectedAccountHandles
    .map((h) => ACCOUNTS_SEED.find((a) => a.handle === h))
    .filter(Boolean);
  const primaryAccounts = accounts.filter((a) => a && !collabSet.has(a.handle));
  const collabAccounts  = accounts.filter((a) => a && collabSet.has(a.handle));
  const totalFollowers  = accounts.reduce((s, a) => s + (a?.followers ?? 0), 0);

  const deliverables = getDeliverables(optionNumber, accounts.length);
  const accountLines: string[] = [];
  if (primaryAccounts.length) {
    accountLines.push(`Primary accounts: ${primaryAccounts.map((a) => a!.handle).join(", ")}`);
  }
  if (collabAccounts.length) {
    accountLines.push(`Collaborated accounts: ${collabAccounts.map((a) => a!.handle).join(", ")}`);
  }
  const delivText = [
    ...deliverables.map((d) => `• ${d}`),
    "",
    ...accountLines,
    `Total reach: ${new Intl.NumberFormat("en-CA").format(totalFollowers)} followers across ${accounts.length} accounts`,
  ].join("\n");

  // Markets sentence — if National is included alongside specific markets, drop National from the list
  const specificMarkets = Array.isArray(markets)
    ? markets.filter((m) => m.toLowerCase() !== "national")
    : [];
  const hasNational = Array.isArray(markets) && markets.some((m) => m.toLowerCase() === "national");
  let marketsText: string;
  if (specificMarkets.length > 0) {
    marketsText = `This campaign will go live across ${specificMarkets.join(", ")}.`;
  } else if (hasNational) {
    marketsText = "This campaign will go live nationally across Canada.";
  } else {
    marketsText = Array.isArray(markets) ? markets.join(", ") : "";
  }

  const assignments = Array.isArray(storyAssignments) && storyAssignments.length > 0
    ? storyAssignments
    : selectedAccountHandles.map((h) => ({ handle: h, qty: 1 }));

  const assignmentLines = assignments
    .map((a) => `• ${a.handle}: ${a.qty} story slide${a.qty !== 1 ? "s" : ""}`)
    .join("\n");

  let storyText = "";
  if (storyServicesType === "complementary") {
    storyText = `Story slides included as complementary support posts:\n${assignmentLines}`;
  } else if (storyServicesType === "full_price") {
    storyText = `Story slides billed as standalone deliverables:\n${assignmentLines}`;
  } else {
    storyText = storyServicesNote
      ? `${storyServicesNote}\n\n${assignmentLines}`
      : `Story services as per agreement:\n${assignmentLines}`;
  }

  const storyRateVal = storyServicesType === "complementary" ? 0 : (storyRate || 0);
  const storyQtyVal = assignments.reduce((s, a) => s + a.qty, 0);
  const storyFee = storyRateVal * storyQtyVal;
  const storyLabel = storyServicesType === "complementary" ? "Story Services (Complimentary)" : "Story Services";

  const payment1Amount = paymentType === "single"
    ? total
    : Number(paymentSchedule?.[0]?.amount || total);
  const payment1Terms = paymentType === "single"
    ? "Due upon signing"
    : (paymentSchedule?.[0]?.date ? `Due ${fmtDate(paymentSchedule[0].date)}` : "Due upon signing");

  const dateStr = new Date().toISOString().slice(0, 10);
  const docTitle = `IO — ${businessName} — Option ${optionNumber} — ${dateStr}`;
  const ah = { Authorization: `Bearer ${providerToken}`, "Content-Type": "application/json" };

  // 1. Copy template
  const copyRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${TEMPLATE_DOC_ID}/copy`,
    { method: "POST", headers: ah, body: JSON.stringify({ name: docTitle }) }
  );
  if (!copyRes.ok) {
    const err = await copyRes.text();
    return NextResponse.json({ error: "Failed to copy IO template", detail: err }, { status: 500 });
  }
  const { id: docId } = await copyRes.json();

  // 2. Move to Drive folder
  const moveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${docId}?addParents=${DRIVE_FOLDER_ID}&removeParents=root`,
    { method: "PATCH", headers: ah }
  );
  if (!moveRes.ok) {
    const moveErr = await moveRes.text();
    return NextResponse.json({
      error: "no_folder_access",
      message: "Doc was created but could not be moved to the shared folder. Ask management@northlygroup.com to share the IO folder with your account as Editor.",
      detail: moveErr,
    }, { status: 403 });
  }

  // 3. Replace all placeholders
  const replacements: [string, string][] = [
    ["{{BUSINESS_NAME}}", businessName],
    ["{{CLIENT_LEGAL_NAME}}", clientLegalName || businessName],
    ["{{CLIENT_STREET}}", clientStreet || ""],
    ["{{CLIENT_CITY_PROV_POSTAL}}", `${clientCity || ""}, ${clientProvince || ""}  ${clientPostal || ""}`],
    ["{{CONTACT_NAME}}", contactName || ""],
    ["{{CLIENT_EMAIL}}", clientEmail || ""],
    ["{{BILLING_CYCLE}}", paymentType === "single" ? "One-time" : "Installments"],
    ["{{SERVICE_START}}", fmtDate(serviceStartDate)],
    ["{{INVOICE_NUMBER}}", "TBD — assigned upon close"],
    ["{{OPTION_LABEL}}", getOptionLabel(optionNumber)],
    ["{{MARKETS}}", marketsText],
    ["{{OFFER_EXPIRY}}", offerExpiry ? fmtDate(offerExpiry) : "TBD"],
    ["{{DELIVERABLES_TEXT}}", delivText],
    ["{{OPTION_PRICE}}", formatCurrency(subtotal)],
    ["{{OPTION_FEE}}", formatCurrency(subtotal)],
    ["{{STORY_SERVICES}}", storyLabel],
    ["{{STORY_SERVICES_TEXT}}", storyText],
    ["{{STORY_RATE}}", formatCurrency(storyRateVal)],
    ["{{STORY_QTY}}", String(storyQtyVal)],
    ["{{STORY_FEE}}", formatCurrency(storyFee)],
    ["{{SPECIAL_CONDITIONS}}", specialConditions?.trim() || "None"],
    ["{{SUBTOTAL}}", formatCurrency(subtotal)],
    ["{{TAX_LABEL}}", `${tax.name} (${(tax.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%)`],
    ["{{TAX_LINE}}", formatCurrency(taxAmount)],
    ["{{TOTAL}}", formatCurrency(total)],
    ["{{TOTAL_FOLLOWERS}}", `${new Intl.NumberFormat("en-CA").format(totalFollowers)} across ${accounts.length} accounts`],
    ["{{CAMPAIGN_TERM}}", `${fmtDate(serviceStartDate)} — ${fmtDate(campaignEndDate)}`],
    ["{{PAYMENT_1_NUM}}", "1"],
    ["{{PAYMENT_1_AMOUNT}}", formatCurrency(payment1Amount)],
    ["{{PAYMENT_1_TERMS}}", payment1Terms],
  ];

  const updateRes = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: "POST", headers: ah,
      body: JSON.stringify({
        requests: replacements.map(([find, replace]) => ({
          replaceAllText: {
            containsText: { text: find, matchCase: true },
            replaceText: replace,
          },
        })),
      }),
    }
  );
  if (!updateRes.ok) {
    const err = await updateRes.text();
    return NextResponse.json({ error: "Failed to fill template", detail: err }, { status: 500 });
  }

  // 4. Handle billing table rows dynamically
  const docReadRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const docData = await docReadRes.json();
  const billingTable = findBillingTable(docData.body?.content ?? []);

  if (billingTable?.tableRows) {
    const allRows = billingTable.tableRows;
    // allRows[0] = header, allRows[1] = payment 1 (filled above), allRows[2+] = empty template rows
    const emptyRows = allRows.slice(2);
    const additionalPayments = paymentType === "multiple" ? (paymentSchedule ?? []).slice(1) : [];
    const tableStartIdx = billingTable.startIndex!;
    const tableOps: unknown[] = [];

    // Fill empty rows that have a corresponding additional payment
    // Process from highest document index to lowest to avoid index shifting
    for (let i = emptyRows.length - 1; i >= 0; i--) {
      const payment = additionalPayments[i];
      if (!payment) continue;

      const amount = formatCurrency(Number(payment.amount) || 0);
      const terms = payment.date ? `Due ${fmtDate(payment.date)}` : "TBD";
      // Columns: Invoice # | Campaign Term | Total | Billing Cycle | Payment Terms
      const cellValues = [String(i + 2), "", amount, "", terms];
      const cells = emptyRows[i].tableCells ?? [];

      for (let c = cells.length - 1; c >= 0; c--) {
        if (!cellValues[c]) continue;
        const cell = cells[c];
        const insertIdx = (cell.content?.[0] as (GContent & { startIndex?: number }) | undefined)?.startIndex
          ?? (cell.startIndex ?? 0) + 1;
        tableOps.push({ insertText: { location: { index: insertIdx }, text: cellValues[c] } });
      }
    }

    // Delete unused empty rows (no corresponding payment), highest row index first
    for (let i = emptyRows.length - 1; i >= 0; i--) {
      if (i >= additionalPayments.length) {
        tableOps.push({
          deleteTableRow: {
            tableCellLocation: {
              tableStartLocation: { index: tableStartIdx },
              rowIndex: allRows.indexOf(emptyRows[i]),
              columnIndex: 0,
            },
          },
        });
      }
    }

    if (tableOps.length > 0) {
      await fetch(
        `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
        { method: "POST", headers: ah, body: JSON.stringify({ requests: tableOps }) }
      );
    }
  }

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  return NextResponse.json({ docId, docUrl, title: docTitle });
}
