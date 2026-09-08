import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const QB_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

/**
 * Disconnects the QuickBooks company.
 *
 * Revokes the token with Intuit and removes it locally, so a stale token
 * cannot be reused. Intuit requires a disconnect URL for production apps.
 */
export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data } = await admin.from("quickbooks_tokens").select("*").limit(1).single();

  if (data?.refresh_token) {
    try {
      const creds = Buffer.from(
        `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
      ).toString("base64");

      await fetch(QB_REVOKE_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${creds}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ token: data.refresh_token }),
      });
    } catch (err) {
      // Removing our copy still disconnects this application.
      console.error("[quickbooks/disconnect] revoke failed", err);
    }
  }

  if (data?.id !== undefined) {
    await admin.from("quickbooks_tokens").delete().eq("id", data.id);
  }

  return NextResponse.json({ disconnected: true });
}
