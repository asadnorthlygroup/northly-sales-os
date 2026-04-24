import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const BUCKET = "case-studies";
const INDEX_PATH = "_index.json";

export interface CaseStudySummary {
  id: string;
  title: string;
  client_name: string;
  niche: string;
  sub_niche: string | null;
  content_type: "pdf" | "link" | "notes";
  created_at: string;
  created_by_email: string;
}

export interface CaseStudyFull extends CaseStudySummary {
  link_url: string;
  notes: string;
  results: string;
  tags: string[];
}

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

async function ensureBucket(admin: ReturnType<typeof adminClient>) {
  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {});
}

async function readIndex(admin: ReturnType<typeof adminClient>): Promise<CaseStudySummary[]> {
  const { data, error } = await admin.storage.from(BUCKET).download(INDEX_PATH);
  if (error || !data) return [];
  try {
    const text = await data.text();
    return JSON.parse(text) as CaseStudySummary[];
  } catch {
    return [];
  }
}

async function writeIndex(admin: ReturnType<typeof adminClient>, index: CaseStudySummary[]) {
  const blob = new Blob([JSON.stringify(index)], { type: "application/json" });
  await admin.storage.from(BUCKET).upload(INDEX_PATH, blob, { upsert: true });
}

export async function GET(request: NextRequest) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = adminClient();
  await ensureBucket(admin);

  const url = new URL(request.url);
  const niche = url.searchParams.get("niche") ?? "";
  const q = url.searchParams.get("q") ?? "";
  const mine = url.searchParams.get("mine") === "true";

  let index = await readIndex(admin);

  if (niche) index = index.filter((c) => c.niche === niche || c.sub_niche === niche);
  if (q) index = index.filter((c) =>
    c.title.toLowerCase().includes(q.toLowerCase()) ||
    c.client_name.toLowerCase().includes(q.toLowerCase())
  );
  if (mine) index = index.filter((c) => c.created_by_email === session.user.email);

  return NextResponse.json({ data: index.sort((a, b) => b.created_at.localeCompare(a.created_at)) });
}

export async function POST(request: NextRequest) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const admin = adminClient();
  await ensureBucket(admin);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const full: CaseStudyFull = {
    id,
    title: body.title ?? "Untitled",
    client_name: body.client_name ?? "",
    niche: body.niche ?? "other",
    sub_niche: body.sub_niche ?? null,
    content_type: body.content_type ?? "notes",
    link_url: body.link_url ?? "",
    notes: body.notes ?? "",
    results: body.results ?? "",
    tags: body.tags ?? [],
    created_at: now,
    created_by_email: session.user.email ?? "",
  };

  // Store full data
  const blob = new Blob([JSON.stringify(full)], { type: "application/json" });
  const { error } = await admin.storage.from(BUCKET).upload(`${id}.json`, blob);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update index
  const index = await readIndex(admin);
  const summary: CaseStudySummary = { id, title: full.title, client_name: full.client_name, niche: full.niche, sub_niche: full.sub_niche, content_type: full.content_type, created_at: now, created_by_email: full.created_by_email };
  index.push(summary);
  await writeIndex(admin, index);

  return NextResponse.json({ data: full });
}
