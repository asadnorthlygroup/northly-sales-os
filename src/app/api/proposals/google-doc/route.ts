import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const providerToken = session.provider_token;
  if (!providerToken) {
    return NextResponse.json({
      error: "no_drive_token",
      message: "Please sign out and sign back in to grant Google Drive access.",
    }, { status: 403 });
  }

  const { proposalId, title, content } = await request.json();

  // 1. Create Google Doc
  const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: title || "Northly Proposal" }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error("Docs create error:", err);
    return NextResponse.json({ error: "Failed to create Google Doc", detail: err }, { status: 500 });
  }

  const doc = await createRes.json();
  const docId = doc.documentId;

  // 2. Insert proposal text
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.text();
    console.error("Docs update error:", err);
    return NextResponse.json({ error: "Failed to write proposal content", detail: err }, { status: 500 });
  }

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

  // 3. Save doc URL back to proposal record
  if (proposalId) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    await admin.from("proposals").update({ google_doc_id: docId, google_doc_url: docUrl }).eq("id", proposalId);
  }

  return NextResponse.json({ docId, docUrl });
}
