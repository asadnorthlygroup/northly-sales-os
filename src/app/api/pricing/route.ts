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

// GET /api/pricing — return all pricing_config rows as a flat object
export async function GET() {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = adminClient();
  const { data, error } = await admin.from("pricing_config").select("key, value, label, description");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const config: Record<string, number> = {};
  for (const row of data ?? []) config[row.key] = Number(row.value);
  return NextResponse.json({ config, rows: data });
}

// PUT /api/pricing — bulk-update pricing_config values
export async function PUT(request: NextRequest) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const updates: Record<string, number> = await request.json();
  const admin = adminClient();

  const upserts = Object.entries(updates).map(([key, value]) => ({
    key,
    value,
    updated_by: session.user.id,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await admin
    .from("pricing_config")
    .upsert(upserts, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: upserts.length });
}
