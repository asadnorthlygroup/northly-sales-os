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

// GET /api/clients/[id] — full client profile: info + deals + notes
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = adminClient();

  const [clientRes, dealsRes, notesRes] = await Promise.all([
    admin.from("clients").select("*").eq("id", id).single(),
    admin
      .from("deals")
      .select(`
        id, title, status, cities, goal, created_at, final_amount,
        proposals ( id, ladder_data, selected_accounts, generated_text, created_at )
      `)
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("client_notes")
      .select("id, note_type, body, created_at, user_id")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (clientRes.error) return NextResponse.json({ error: clientRes.error.message }, { status: 500 });

  return NextResponse.json({
    client: clientRes.data,
    deals: dealsRes.data ?? [],
    notes: notesRes.data ?? [],
  });
}
