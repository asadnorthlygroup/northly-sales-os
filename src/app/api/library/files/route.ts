import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Scan project root for PDFs
  const root = process.cwd();
  let pdfFiles: string[] = [];
  try {
    pdfFiles = fs.readdirSync(root)
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .sort();
  } catch {
    // In production, no local PDFs — return empty list
  }

  // Check which are already ingested
  const admin = adminClient();
  const { data: ingested } = await admin
    .from("proposal_examples")
    .select("source_file, extraction_status, client_name, outcome, created_at");

  const ingestedMap: Record<string, { extraction_status: string; client_name: string | null; outcome: string; created_at: string }> = {};
  for (const row of ingested ?? []) ingestedMap[row.source_file] = row;

  const files = pdfFiles.map((f) => ({
    filename: f,
    ingested: !!ingestedMap[f],
    status: ingestedMap[f]?.extraction_status ?? null,
    client_name: ingestedMap[f]?.client_name ?? null,
    outcome: ingestedMap[f]?.outcome ?? null,
    ingested_at: ingestedMap[f]?.created_at ?? null,
  }));

  return NextResponse.json({ files, total: pdfFiles.length, ingested: Object.keys(ingestedMap).length });
}
