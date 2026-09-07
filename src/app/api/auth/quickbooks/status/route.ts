import { NextResponse } from "next/server";
import { qbCompanyName, qbVerifyConnection, looksLikeSandboxCompany } from "@/lib/quickbooks";

export async function GET() {
  const result = await qbVerifyConnection();
  const companyName = result.ok ? await qbCompanyName() : null;

  return NextResponse.json({
    connected: result.ok,
    environment: result.environment,
    realmId: result.realmId,
    companyName,
    isSandbox: looksLikeSandboxCompany(companyName),
    status: result.status,
    detail: result.detail,
  });
}
