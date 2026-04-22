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
  const leadId = searchParams.get("lead_id");
  if (!leadId) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  try {
    const qs = new URLSearchParams({
      lead_id: leadId,
      _limit: "20",
      _fields: "id,type,date_created,user_name,note,subject,body_text,duration",
    });
    const res = await fetch(`${CLOSE_BASE}/activity/?${qs}`, { headers });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Close activities error:", err);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}
