import { NextRequest, NextResponse } from "next/server";

const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const SCOPE = "com.intuit.quickbooks.accounting";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const returnTo = url.searchParams.get("return_to");
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.QUICKBOOKS_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/quickbooks/callback`,
    response_type: "code",
    scope: SCOPE,
    state,
  });
  const res = NextResponse.redirect(`${QB_AUTH_URL}?${params.toString()}`);
  // Stash where to return after the OAuth round-trip. Only accept relative paths.
  if (returnTo && returnTo.startsWith("/")) {
    res.cookies.set("qb_return_to", returnTo, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 600,
    });
  }
  return res;
}
