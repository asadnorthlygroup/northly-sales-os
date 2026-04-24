import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNTS_SEED } from "@/lib/accounts-seed";

const ACTOR_ID = "apify~instagram-profile-scraper";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getSession() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  return supabase.auth.getSession();
}

// POST /api/accounts/sync — start an Apify run
export async function POST() {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const token = process.env.APIFY_API_TOKEN;
  if (!token) return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 503 });

  const usernames = ACCOUNTS_SEED
    .filter((a) => a.platform === "instagram")
    .map((a) => a.handle.replace(/^@/, ""));

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames }),
    }
  );

  if (!res.ok) {
    const msg = await res.text();
    return NextResponse.json({ error: `Apify error: ${msg}` }, { status: 502 });
  }

  const { data } = await res.json() as { data: { id: string } };
  return NextResponse.json({ runId: data.id, queued: usernames.length });
}

// GET /api/accounts/sync?runId=xxx — poll run + persist results when done
export async function GET(request: NextRequest) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const token = process.env.APIFY_API_TOKEN;
  if (!token) return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 503 });

  const runId = new URL(request.url).searchParams.get("runId");
  if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

  // Check run status
  const runRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
  );
  const runJson = await runRes.json() as { data: { status: string } };
  const status = runJson.data?.status;

  if (!status) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  if (["RUNNING", "READY", "ABORTING"].includes(status)) {
    return NextResponse.json({ status: "running", apifyStatus: status });
  }
  if (status !== "SUCCEEDED") {
    return NextResponse.json({ status: "failed", apifyStatus: status });
  }

  // Fetch dataset items
  const itemsRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&format=json`
  );
  const items = await itemsRes.json() as Array<{
    username?: string;
    followersCount?: number;
    postsCount?: number;
    followingCount?: number;
  }>;

  // Load account ID map from DB
  const admin = adminClient();
  const { data: accounts } = await admin.from("accounts").select("id, handle");
  const handleToId: Record<string, string> = {};
  for (const a of accounts ?? []) {
    handleToId[("@" + a.handle.replace(/^@/, "")).toLowerCase()] = a.id;
  }

  const now = new Date().toISOString();
  const metrics: {
    account_id: string;
    followers: number;
    avg_impressions_30d: number;
    source: string;
    recorded_at: string;
    raw_data: Record<string, unknown>;
  }[] = [];

  for (const item of items) {
    if (!item.username || !item.followersCount) continue;
    const key = ("@" + item.username).toLowerCase();
    const accountId = handleToId[key];
    if (!accountId) continue;

    metrics.push({
      account_id: accountId,
      followers: item.followersCount,
      avg_impressions_30d: Math.round(item.followersCount * 0.15),
      source: "apify",
      recorded_at: now,
      raw_data: {
        postsCount: item.postsCount ?? 0,
        followingCount: item.followingCount ?? 0,
      },
    });
  }

  if (metrics.length > 0) {
    const { error } = await admin.from("account_metrics").insert(metrics);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    status: "done",
    synced: metrics.length,
    total: items.length,
    syncedAt: now,
  });
}
