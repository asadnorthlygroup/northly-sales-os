import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { formatCurrency } from "@/lib/pricing";
import { ACCOUNTS_SEED } from "@/lib/accounts-seed";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const PROVINCE_TAX: Record<string, { name: string; rate: number }> = {
  ON: { name: "HST", rate: 0.13 }, BC: { name: "GST+PST", rate: 0.12 },
  AB: { name: "GST", rate: 0.05 }, QC: { name: "GST+QST", rate: 0.14975 },
  MB: { name: "GST+PST", rate: 0.12 }, SK: { name: "GST+PST", rate: 0.11 },
  NS: { name: "HST", rate: 0.15 }, NB: { name: "HST", rate: 0.15 },
  PE: { name: "HST", rate: 0.15 }, NL: { name: "HST", rate: 0.15 },
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  ba: "Brand Awareness Feed Post",
  story: "Story Post",
  ga: "Giveaway Feed Post",
  oc_reel: "OC Reel",
  talking_head: "Talking Head Reel",
};

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

  const { proposalId, optionNumber, province, clientAddress, aeName } = await request.json() as {
    proposalId: string;
    optionNumber: number;
    province?: string;
    clientAddress?: string;
    aeName?: string;
  };

  const admin = adminClient();
  const { data: proposal, error } = await admin
    .from("proposals")
    .select(`
      id, intake_data, ladder_data, selected_accounts,
      deals ( title, cities, goal, clients ( company_name, primary_contact_name ) )
    `)
    .eq("id", proposalId)
    .single();

  if (error || !proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

  const deal = proposal.deals as unknown as {
    title: string; cities: string[];
    clients: { company_name: string; primary_contact_name: string | null } | null;
  } | null;

  const clientName = deal?.clients?.company_name ?? "Client";
  const contactName = deal?.clients?.primary_contact_name ?? "";
  const ladderData = (proposal.ladder_data ?? {}) as Record<string, number>;
  const intakeData = (proposal.intake_data ?? {}) as Record<string, unknown>;
  const selectedHandles = (proposal.selected_accounts ?? []) as string[];

  const optKey = `option${optionNumber}Price`;
  const subtotal = ladderData[optKey] ?? 0;
  const prov = province?.toUpperCase() ?? "ON";
  const tax = PROVINCE_TAX[prov] ?? PROVINCE_TAX.ON;
  const taxAmount = Math.round(subtotal * tax.rate * 100) / 100;
  const total = subtotal + taxAmount;

  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  const cities = (deal?.cities ?? []).join(", ") || (intakeData.cities as string[] ?? []).join(", ");

  // Build deliverables list from selected accounts
  const accountDetails = selectedHandles
    .map((h) => ACCOUNTS_SEED.find((a) => a.handle === h))
    .filter(Boolean)
    .map((a) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${a!.handle}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${a!.marketLabel}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${a!.subNetwork}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${(a!.followers / 1000).toFixed(0)}k</td></tr>`)
    .join("");

  const contentTypes = Object.entries(ladderData)
    .filter(([k]) => k.startsWith("option") && k.includes("Post") || CONTENT_TYPE_LABELS[k])
    .map(([k, v]) => v > 0 ? `<li>${CONTENT_TYPE_LABELS[k] ?? k}: included</li>` : "")
    .filter(Boolean)
    .join("") || "<li>Social media content posts as specified in the accepted proposal</li>";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Service Agreement — ${clientName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', serif; font-size: 11pt; line-height: 1.6; color: #1e293b; background: #fff; padding: 48px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E8192C; padding-bottom: 20px; margin-bottom: 32px; }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-mark { width: 40px; height: 40px; background: #E8192C; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px; font-family: sans-serif; }
  .logo-name { font-family: sans-serif; font-weight: 600; font-size: 15px; color: #1e293b; }
  .logo-sub { font-family: sans-serif; font-size: 11px; color: #64748b; }
  .doc-title { font-family: sans-serif; font-size: 13px; color: #64748b; text-align: right; }
  h1 { font-size: 18pt; color: #1e293b; margin-bottom: 6px; }
  h2 { font-size: 12pt; color: #1e293b; margin: 24px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; font-family: sans-serif; }
  p { margin-bottom: 10px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; background: #f8fafc; padding: 20px; border-radius: 8px; }
  .party h3 { font-size: 10pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; font-family: sans-serif; }
  .party .name { font-weight: 700; font-size: 13pt; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-family: sans-serif; font-size: 9pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 6px 12px; border-bottom: 1px solid #f1f5f9; }
  .financial { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 16px 0; }
  .fin-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11pt; }
  .fin-row.total { border-top: 2px solid #1e293b; margin-top: 8px; padding-top: 10px; font-weight: 700; font-size: 13pt; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 32px; }
  .sig-block { border-top: 1px solid #94a3b8; padding-top: 10px; }
  .sig-block .label { font-size: 9pt; color: #64748b; font-family: sans-serif; }
  .sig-block .name { font-weight: 600; margin-top: 4px; }
  ul { padding-left: 20px; margin: 8px 0; }
  li { margin-bottom: 4px; }
  .clause { margin-bottom: 16px; }
  .clause-num { font-weight: 700; font-family: sans-serif; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>

<div class="header">
  <div class="logo">
    <div class="logo-mark">N</div>
    <div>
      <div class="logo-name">Northly Group</div>
      <div class="logo-sub">Social Media Publisher Network</div>
    </div>
  </div>
  <div class="doc-title">
    <strong>SERVICE AGREEMENT</strong><br>
    Date: ${today}
  </div>
</div>

<h1>Social Media Marketing Agreement</h1>
<p style="color:#64748b;font-size:10pt">This agreement is entered into as of <strong>${today}</strong></p>

<div class="parties">
  <div class="party">
    <h3>Service Provider</h3>
    <div class="name">Northly Group</div>
    <div style="font-size:10pt;color:#475569;margin-top:4px">
      social@northlygroup.com<br>
      northlygroup.com
    </div>
  </div>
  <div class="party">
    <h3>Client</h3>
    <div class="name">${clientName}</div>
    ${contactName ? `<div style="font-size:10pt;color:#475569;margin-top:4px">${contactName}</div>` : ""}
    ${clientAddress ? `<div style="font-size:10pt;color:#475569">${clientAddress}</div>` : ""}
  </div>
</div>

<h2>1. Campaign Overview</h2>
<p><strong>Campaign Markets:</strong> ${cities || "As specified in proposal"}</p>
<p><strong>Campaign Goal:</strong> ${deal?.title ?? "Social media marketing campaign"}</p>
<p><strong>Selected Package:</strong> Option ${optionNumber}</p>

<h2>2. Deliverables</h2>
<p>Northly Group agrees to provide the following social media content services:</p>
${selectedHandles.length > 0 ? `
<table>
  <thead>
    <tr><th>Page / Handle</th><th>Market</th><th>Network</th><th>Followers</th></tr>
  </thead>
  <tbody>${accountDetails}</tbody>
</table>
<p style="font-size:10pt;color:#64748b">Content formats included: Brand Awareness Feed Post + Story bundle per page. Additional content types as per accepted proposal.</p>
` : `<ul>${contentTypes}</ul>`}

<h2>3. Campaign Timeline</h2>
<div class="clause">
  <p><span class="clause-num">3.1</span> Campaign launch is contingent on receipt of full payment and all required creative assets from the Client.</p>
  <p><span class="clause-num">3.2</span> Northly Group will schedule and publish content within <strong>14 days</strong> of receiving all assets and confirmation of payment, unless otherwise agreed in writing.</p>
  <p><span class="clause-num">3.3</span> Content scheduling and specific posting dates will be coordinated between the parties prior to launch.</p>
</div>

<h2>4. Payment Terms</h2>
<div class="financial">
  <div class="fin-row"><span>Subtotal (Option ${optionNumber})</span><span>${formatCurrency(subtotal)}</span></div>
  <div class="fin-row"><span>${tax.name} (${(tax.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%)</span><span>${formatCurrency(taxAmount)}</span></div>
  <div class="fin-row total"><span>Total</span><span>${formatCurrency(total)}</span></div>
</div>
<div class="clause">
  <p><span class="clause-num">4.1</span> Full payment is due prior to campaign launch. Payment via E-transfer to <strong>payments@waveroomtv.com</strong>.</p>
  <p><span class="clause-num">4.2</span> Invoices are subject to applicable Canadian taxes as indicated above.</p>
  <p><span class="clause-num">4.3</span> Late payments are subject to a 2% monthly interest charge on outstanding balances.</p>
</div>

<h2>5. Creative Assets & Approvals</h2>
<div class="clause">
  <p><span class="clause-num">5.1</span> The Client is responsible for providing all required creative assets (photos, videos, copy, offers) in a timely manner.</p>
  <p><span class="clause-num">5.2</span> Northly Group will provide one round of revisions on any content requiring Client approval. Additional revisions may be subject to additional fees.</p>
  <p><span class="clause-num">5.3</span> The Client grants Northly Group permission to publish content on their behalf on the agreed social media pages.</p>
</div>

<h2>6. Cancellation Policy</h2>
<div class="clause">
  <p><span class="clause-num">6.1</span> Cancellations must be received in writing at least <strong>7 days</strong> prior to the scheduled campaign launch date.</p>
  <p><span class="clause-num">6.2</span> Campaigns cancelled after content has been created are subject to a 50% kill fee.</p>
  <p><span class="clause-num">6.3</span> No refunds will be issued for campaigns that have already launched.</p>
</div>

<h2>7. Reporting & Performance</h2>
<p>Northly Group will provide a post-campaign performance report within 7 days of campaign completion, including reach, impressions, and engagement metrics where available.</p>

<h2>8. Confidentiality</h2>
<p>Both parties agree to keep the terms of this agreement and any proprietary information confidential, except as required by law.</p>

<h2>9. Governing Law</h2>
<p>This agreement shall be governed by the laws of the Province of Ontario, Canada.</p>

<h2>10. Signatures</h2>
<p>By signing below, both parties agree to the terms outlined in this Service Agreement.</p>

<div class="sig-grid">
  <div class="sig-block">
    <div style="height:48px"></div>
    <div class="label">Authorized Signature — Northly Group</div>
    <div class="name">${aeName ?? "Account Executive"}</div>
    <div style="font-size:10pt;color:#64748b">Northly Group</div>
    <div style="font-size:10pt;color:#94a3b8;margin-top:4px">Date: _______________</div>
  </div>
  <div class="sig-block">
    <div style="height:48px"></div>
    <div class="label">Authorized Signature — Client</div>
    <div class="name">${contactName || clientName}</div>
    <div style="font-size:10pt;color:#64748b">${clientName}</div>
    <div style="font-size:10pt;color:#94a3b8;margin-top:4px">Date: _______________</div>
  </div>
</div>

<p style="margin-top:40px;font-size:9pt;color:#94a3b8;text-align:center">
  Northly Group · social@northlygroup.com · northlygroup.com<br>
  Generated ${today} via Northly Sales OS
</p>

</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="Agreement_${clientName.replace(/[^a-z0-9]/gi, "_")}_${today}.html"`,
    },
  });
}
