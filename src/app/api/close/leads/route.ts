import { NextResponse, type NextRequest } from "next/server";

const CLOSE_BASE = "https://api.close.com/api/v1";

function closeHeaders() {
  const key = process.env.CLOSE_API_KEY;
  if (!key) return null;
  return {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    "Content-Type": "application/json",
  };
}

export async function GET(request: NextRequest) {
  const headers = closeHeaders();
  if (!headers) {
    return NextResponse.json({ error: "CLOSE_API_KEY not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const cursor = searchParams.get("cursor") ?? "";
  const status = searchParams.get("status") ?? "";

  // Build Close search query
  const queryParts: string[] = [];
  if (query) queryParts.push(`"${query}"`);
  if (status) queryParts.push(`lead_status:"${status}"`);

  const qs = new URLSearchParams({
    _limit: "50",
    _fields: "id,display_name,status_label,status_id,contacts,opportunities,date_created,date_updated,custom,description,url",
  });
  if (queryParts.length) qs.set("query", queryParts.join(" "));
  if (cursor) qs.set("_cursor", cursor);

  try {
    const res = await fetch(`${CLOSE_BASE}/lead/?${qs}`, { headers });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Close leads error:", err);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
