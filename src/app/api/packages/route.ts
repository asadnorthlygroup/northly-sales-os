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

async function getSession() {
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
  return supabase.auth.getSession();
}

export async function GET(request: NextRequest) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "active";
  const market = url.searchParams.get("market") ?? "";
  const q = url.searchParams.get("q") ?? "";

  const admin = adminClient();
  let query = admin
    .from("packages")
    .select("*")
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (market) query = query.contains("markets", [market]);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const admin = adminClient();

  const { data, error } = await admin
    .from("packages")
    .insert({
      title: body.title,
      description: body.description ?? "",
      deliverables: body.deliverables ?? [],
      pages_included: body.pages_included ?? [],
      primary_page: body.primary_page ?? null,
      collabs: body.collabs ?? [],
      markets: body.markets ?? [],
      pricing: body.pricing ?? 0,
      guaranteed_impressions: body.guaranteed_impressions ?? null,
      status: "active",
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
