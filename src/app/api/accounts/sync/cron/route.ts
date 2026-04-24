import { NextResponse } from "next/server";

// Called by Vercel Cron every Sunday at 3am ET.
// Protected by CRON_SECRET to prevent public access.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://northly-sales-os.vercel.app";
  const res = await fetch(`${base}/api/accounts/sync`, { method: "POST" });
  const data = await res.json() as { runId?: string; queued?: number; error?: string };

  if (!res.ok || !data.runId) {
    return NextResponse.json({ error: data.error ?? "Sync failed to start" }, { status: 502 });
  }

  // Fire-and-forget: poll is handled client-side for manual runs.
  // For cron, we wait up to 5 minutes for the run to complete.
  const token = process.env.APIFY_API_TOKEN!;
  const runId = data.runId;
  let attempts = 0;

  while (attempts < 30) {
    await new Promise((r) => setTimeout(r, 10000)); // 10s between polls
    attempts++;

    const poll = await fetch(`${base}/api/accounts/sync?runId=${runId}`);
    const pollData = await poll.json() as { status: string; synced?: number };

    if (pollData.status === "done") {
      return NextResponse.json({ ok: true, synced: pollData.synced, runId });
    }
    if (pollData.status === "failed") {
      return NextResponse.json({ error: "Apify run failed", runId }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true, note: "Run started but timed out waiting. Will complete async.", runId });
}

export const maxDuration = 300; // 5 min — Vercel Pro limit
