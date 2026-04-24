import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
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

  const admin = adminClient();

  // Latest metric per account — join accounts to get handles
  const { data: metrics, error } = await admin
    .from("account_metrics")
    .select("account_id, followers, recorded_at, accounts!inner(handle)")
    .order("recorded_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate to one row per account (latest)
  const seen = new Set<string>();
  const latest: { handle: string; followers: number; recorded_at: string }[] = [];

  for (const row of metrics ?? []) {
    const handle = (row.accounts as unknown as { handle: string })?.handle;
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    latest.push({ handle, followers: row.followers, recorded_at: row.recorded_at });
  }

  const lastSync = latest[0]?.recorded_at ?? null;
  return NextResponse.json({ metrics: latest, lastSync });
}
