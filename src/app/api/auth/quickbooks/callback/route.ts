import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("qb_oauth_state")?.value;
  const appUrl = requestUrl.origin;
  const returnTo = request.cookies.get("qb_return_to")?.value;
  const successPath = returnTo && returnTo.startsWith("/") ? returnTo : "/deals";
  const errorPath = successPath;

  function redirectAndClear(target: string) {
    const res = NextResponse.redirect(`${appUrl}${target}`);
    res.cookies.delete("qb_return_to");
    res.cookies.delete("qb_oauth_state");
    return res;
  }

  // Cross-site request forgery check. The state we sent must come back.
  if (!state || !expectedState || state !== expectedState) {
    return redirectAndClear(
      `${errorPath}${errorPath.includes("?") ? "&" : "?"}error=qb_bad_state`
    );
  }

  if (!code) {
    return redirectAndClear(`${errorPath}${errorPath.includes("?") ? "&" : "?"}error=qb_no_code`);
  }

  // Northly has more than one company under the same Intuit login. Falling back
  // to a configured realm here would silently connect the wrong books, so a
  // missing realm is an error rather than a guess.
  if (!realmId) {
    return redirectAndClear(`${errorPath}${errorPath.includes("?") ? "&" : "?"}error=qb_no_realm`);
  }

  const creds = Buffer.from(
    `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${appUrl}/api/auth/quickbooks/callback`,
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    console.error("QB token exchange failed:", detail);
    return redirectAndClear(`${errorPath}${errorPath.includes("?") ? "&" : "?"}error=qb_token_failed`);
  }

  const t = await tokenRes.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from("quickbooks_tokens").upsert(
    {
      id: 1,
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      realm_id: realmId,
      expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("QB token save error:", error);
    return redirectAndClear(`${errorPath}${errorPath.includes("?") ? "&" : "?"}error=qb_save_failed`);
  }

  return redirectAndClear(`${successPath}${successPath.includes("?") ? "&" : "?"}qb=connected`);
}
