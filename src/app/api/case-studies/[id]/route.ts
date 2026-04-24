import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { CaseStudyFull, CaseStudySummary } from "../route";

const BUCKET = "case-studies";
const INDEX_PATH = "_index.json";

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

async function readIndex(admin: ReturnType<typeof adminClient>): Promise<CaseStudySummary[]> {
  const { data, error } = await admin.storage.from(BUCKET).download(INDEX_PATH);
  if (error || !data) return [];
  try { return JSON.parse(await data.text()); } catch { return []; }
}

async function writeIndex(admin: ReturnType<typeof adminClient>, index: CaseStudySummary[]) {
  const blob = new Blob([JSON.stringify(index)], { type: "application/json" });
  await admin.storage.from(BUCKET).upload(INDEX_PATH, blob, { upsert: true });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const admin = adminClient();
  const { data, error } = await admin.storage.from(BUCKET).download(`${id}.json`);
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full = JSON.parse(await data.text()) as CaseStudyFull;
  return NextResponse.json({ data: full });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const admin = adminClient();

  const { data: existing, error } = await admin.storage.from(BUCKET).download(`${id}.json`);
  if (error || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prev = JSON.parse(await existing.text()) as CaseStudyFull;
  const updated: CaseStudyFull = { ...prev, ...body, id };
  const blob = new Blob([JSON.stringify(updated)], { type: "application/json" });
  await admin.storage.from(BUCKET).upload(`${id}.json`, blob, { upsert: true });

  // Update index entry
  const index = await readIndex(admin);
  const idx = index.findIndex((c) => c.id === id);
  const summary: CaseStudySummary = { id, title: updated.title, client_name: updated.client_name, niche: updated.niche, sub_niche: updated.sub_niche, content_type: updated.content_type, created_at: updated.created_at, created_by_email: updated.created_by_email };
  if (idx >= 0) index[idx] = summary;
  await writeIndex(admin, index);

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const admin = adminClient();
  await admin.storage.from(BUCKET).remove([`${id}.json`]);

  const index = await readIndex(admin);
  await writeIndex(admin, index.filter((c) => c.id !== id));

  return NextResponse.json({ ok: true });
}
