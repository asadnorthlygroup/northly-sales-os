import { NextResponse } from "next/server";

const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const SCOPE = "com.intuit.quickbooks.accounting";

export async function GET() {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.QUICKBOOKS_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/quickbooks/callback`,
    response_type: "code",
    scope: SCOPE,
    state,
  });
  return NextResponse.redirect(`${QB_AUTH_URL}?${params.toString()}`);
}
