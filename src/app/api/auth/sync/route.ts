import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";

const ROLE_MAP: Record<string, string> = {
  "asad@northlygroup.com":    "admin",
  "abdul@northlygroup.com":   "admin",
  "asif@northlygroup.com":    "ae",
  "andrew@northlygroup.com":  "ae",
  "hamza@northlygroup.com":   "ae",
  "nick@northlygroup.com":    "ae",
  "arvin@northlygroup.com":   "sdr",
  "preksha@northlygroup.com": "sdr",
};

export async function POST() {
  const cookieStore = await cookies();

  // Get current user from session
  const supabase = createServerClient<Database>(
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

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Use admin client to bypass RLS
  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const role = ROLE_MAP[user.email ?? ""] ?? "readonly";
  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Unknown";

  const { error } = await admin.from("users").upsert(
    {
      id: user.id,
      email: user.email!,
      full_name: fullName,
      role: role as Database["public"]["Enums"]["user_role"],
      avatar_url: user.user_metadata?.avatar_url ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("sync-user error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role });
}
