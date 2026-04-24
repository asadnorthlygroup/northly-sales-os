import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
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

  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "true";

  let query = admin
    .from("proposals")
    .select(`
      id, version, status, created_at, generated_text, ladder_data, selected_accounts, intake_data, created_by,
      deals (
        id, title, status, cities, goal,
        clients ( company_name, primary_contact_name )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (mine) query = query.eq("created_by", user.id);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach creator emails
  const userIds = [...new Set((data ?? []).map((p: { created_by: string }) => p.created_by).filter(Boolean))];
  const emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    for (const u of users?.users ?? []) emailMap[u.id] = u.email ?? "";
  }
  const enriched = (data ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    created_by_email: emailMap[p.created_by as string] ?? "",
  }));

  return NextResponse.json({ data: enriched });
}

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

  // 1. Find or create client
  const companyName = form.businessName || "Unnamed Client";
  let client;

  const { data: existing } = await admin
    .from("clients")
    .select()
    .ilike("company_name", companyName)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update contact info if we have it
    const { data: updated, error: updateErr } = await admin
      .from("clients")
      .update({
        primary_contact_name: form.contactName || existing.primary_contact_name,
        website: form.website || existing.website,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (updateErr || !updated) {
      return NextResponse.json({ error: updateErr?.message ?? "Failed to update client" }, { status: 500 });
    }
    client = updated;
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("clients")
      .insert({
        company_name: companyName,
        primary_contact_name: form.contactName || null,
        website: form.website || null,
        industry_category: form.category || null,
        created_by: user.id,
      })
      .select()
      .single();
    if (insertErr || !inserted) {
      console.error("client insert error:", insertErr);
      return NextResponse.json({ error: insertErr?.message ?? "Failed to save client" }, { status: 500 });
    }
    client = inserted;
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
