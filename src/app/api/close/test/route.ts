import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.CLOSE_API_KEY ?? "";
  const authHeader = `Basic ${Buffer.from(`${key}:`).toString("base64")}`;

  const res = await fetch("https://api.close.com/api/v1/me/", {
    headers: { Authorization: authHeader },
  });
  const data = await res.json();

  return NextResponse.json({
    keyLength: key.length,
    keyStart: key.slice(0, 8),
    keyEnd: key.slice(-6),
    httpStatus: res.status,
    closeResponse: data,
  });
}
