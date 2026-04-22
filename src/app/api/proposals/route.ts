import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  // Get current user
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const body = await request.json();
  const { form, selectedAccountHandles, ladder, proposalText } = body;

  // 1. Upsert client
  const { data: client, error: clientErr } = await admin
    .from("clients")
    .upsert(
      {
        company_name: form.businessName || "Unnamed Client",
        primary_contact_name: form.contactName || null,
        website: form.website || null,
        industry_category: form.category || null,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_name" }
    )
    .select()
    .single();

  if (clientErr || !client) {
    console.error("client upsert error:", clientErr);
    return NextResponse.json({ error: clientErr?.message ?? "Failed to save client" }, { status: 500 });
  }

  // 2. Create deal
  const { data: deal, error: dealErr } = await admin
    .from("deals")
    .insert({
      client_id: client.id,
      ae_id: user.id,
      title: `${form.businessName || "Client"} — ${(form.cities ?? []).join(", ")} ${form.goal || ""}`.trim(),
      status: "draft",
      cities: form.cities ?? [],
      industry_category: form.category || null,
      goal: form.goal || null,
      budget_min: form.budgetMin ? parseFloat(form.budgetMin) : null,
      budget_max: form.budgetMax ? parseFloat(form.budgetMax) : null,
      markup_mode: form.markupMode ?? "flat",
      markup_value: form.markupMode === "percentage" ? 0.20 : 175,
      display_mode: form.displayMode ?? "package",
      recommended_option: form.recommendedOption ?? 2,
    })
    .select()
    .single();

  if (dealErr || !deal) {
    console.error("deal insert error:", dealErr);
    return NextResponse.json({ error: dealErr?.message ?? "Failed to save deal" }, { status: 500 });
  }

  // 3. Save proposal
  const { data: proposal, error: proposalErr } = await admin
    .from("proposals")
    .insert({
      deal_id: deal.id,
      version: 1,
      status: "draft",
      intake_data: form,
      selected_accounts: selectedAccountHandles,
      ladder_data: ladder,
      generated_text: proposalText,
      created_by: user.id,
    })
    .select()
    .single();

  if (proposalErr || !proposal) {
    console.error("proposal insert error:", proposalErr);
    return NextResponse.json({ error: proposalErr?.message ?? "Failed to save proposal" }, { status: 500 });
  }

  return NextResponse.json({ proposalId: proposal.id, dealId: deal.id, clientId: client.id });
}
