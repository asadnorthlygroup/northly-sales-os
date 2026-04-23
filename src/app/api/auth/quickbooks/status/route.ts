import { NextResponse } from "next/server";
import { qbIsConnected } from "@/lib/quickbooks";

export async function GET() {
  const connected = await qbIsConnected();
  return NextResponse.json({ connected });
}
