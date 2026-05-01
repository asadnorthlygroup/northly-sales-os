import { NextResponse } from "next/server";
import { qbVerifyConnection } from "@/lib/quickbooks";

export async function GET() {
  const result = await qbVerifyConnection();
  return NextResponse.json({
    connected: result.ok,
    environment: result.environment,
    realmId: result.realmId,
    status: result.status,
    detail: result.detail,
  });
}
