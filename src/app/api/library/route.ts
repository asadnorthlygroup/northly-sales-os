import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
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

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? "";
  const outcome = url.searchParams.get("outcome") ?? "";
  const industry = url.searchParams.get("industry") ?? "";

  const admin = adminClient();
  let query = admin
    .from("proposal_examples")
    .select("id, source_file, client_name, industry_category, industry_niche, geography_tier, cities, outcome, final_deal_size, deal_size_tier, options_presented, recommended_option, chosen_option, ae_name, strategy_framing, objections, closing_cta, extraction_status, ingested_at, time_to_close_days")
    .neq("extraction_status", "rejected")
    .order("ingested_at", { ascending: false });

  if (outcome) query = query.eq("outcome", outcome);
  if (industry) query = query.eq("industry_category", industry);
  if (search) query = query.ilike("client_name", `%${search}%`);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
