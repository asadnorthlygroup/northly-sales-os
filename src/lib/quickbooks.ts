import { createClient } from "@supabase/supabase-js";

const QB_API_BASE = "https://sandbox-quickbooks.api.intuit.com/v3/company";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

function serviceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getValidToken(): Promise<{ access_token: string; realm_id: string }> {
  const supabase = serviceSupabase();
  const { data, error } = await supabase
    .from("quickbooks_tokens")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) throw new Error("QuickBooks not connected. Connect via Settings.");

  // Refresh if expiring within 2 minutes
  if (new Date(data.expires_at) < new Date(Date.now() + 120_000)) {
    const creds = Buffer.from(
      `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch(QB_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
      }),
    });

    if (!res.ok) throw new Error("Failed to refresh QuickBooks token — reconnect via Settings.");
    const t = await res.json();

    await supabase.from("quickbooks_tokens").update({
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", data.id);

    return { access_token: t.access_token, realm_id: data.realm_id };
  }

  return { access_token: data.access_token, realm_id: data.realm_id };
}

export async function qbFetch(path: string, options: RequestInit = {}) {
  const { access_token, realm_id } = await getValidToken();
  return fetch(`${QB_API_BASE}/${realm_id}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

export async function qbIsConnected(): Promise<boolean> {
  try {
    await getValidToken();
    return true;
  } catch {
    return false;
  }
}
