import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

// POST — upsert feedback for a proposal
export async function POST(request: NextRequest) {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { proposalId, status, rating, notes, businessCategory, markets, goals, recommendedOption } = body as {
    proposalId: string;
    status?: string;
    rating?: number;
    notes?: string;
    businessCategory?: string;
    markets?: string[];
    goals?: string[];
    recommendedOption?: number;
  };

  if (!proposalId) return NextResponse.json({ error: "proposalId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("proposal_feedback")
    .upsert({
      proposal_id: proposalId,
      user_id: session.user.id,
      status: status ?? "draft",
      rating: rating ?? 0,
      notes: notes ?? null,
      business_category: businessCategory ?? null,
      markets: markets ?? [],
      goals: goals ?? [],
      recommended_option: recommendedOption ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "proposal_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// GET — fetch feedback for a specific proposal, or top winning examples for AI injection
export async function GET(request: NextRequest) {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get("proposalId");
  const forAI = searchParams.get("forAI");
  const category = searchParams.get("category");

  // Return top-rated examples for AI injection
  if (forAI === "true") {
    let query = supabase
      .from("proposal_feedback")
      .select(`
        id, status, rating, notes, business_category, markets, goals, recommended_option,
        proposals (
          id, intake_data, ladder_data, selected_accounts
        )
      `)
      .in("status", ["won", "sent"])
      .eq("rating", 1)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (category) query = query.eq("business_category", category);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // Return feedback for a specific proposal
  if (proposalId) {
    const { data, error } = await supabase
      .from("proposal_feedback")
      .select("*")
      .eq("proposal_id", proposalId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? null);
  }

  return NextResponse.json({ error: "proposalId or forAI=true required" }, { status: 400 });
}
