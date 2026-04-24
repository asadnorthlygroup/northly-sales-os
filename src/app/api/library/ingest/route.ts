import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

const EXTRACT_PROMPT = `You are analyzing a sales proposal or CRM activity export from Northly Group, a Canadian social media publisher network.

Extract the following from this document and return ONLY valid JSON with no markdown, no code blocks, just raw JSON:

{
  "client_name": "string or null",
  "industry_category": "restaurant|bar|beauty|service|retail|event_space|app|ecommerce|gifting|other or null",
  "industry_niche": "specific niche description or null",
  "geography_tier": "single_city|multi_city|national or null",
  "cities": ["array of city names"],
  "outcome": "won|lost|stalled|unknown",
  "budget_discussed": number or null,
  "final_deal_size": number or null,
  "deal_size_tier": "lt_2k|2k_5k|5k_10k|10k_25k|gt_25k or null",
  "options_presented": [array of option numbers e.g. 2,3,4],
  "recommended_option": number or null,
  "chosen_option": number or null,
  "time_to_close_days": number or null,
  "ae_name": "string or null",
  "objections": ["array of objection strings"],
  "strategy_framing": "1-2 sentence summary of the strategic angle used",
  "closing_cta": "what was the call to action or proposed next step",
  "raw_text": "full verbatim text content of the document, max 3000 chars"
}

For deal_size_tier: lt_2k = under $2000, 2k_5k = $2000-5000, 5k_10k = $5000-10000, 10k_25k = $10000-25000, gt_25k = over $25000.
For outcome: if the document mentions a signed agreement, payment, or confirmed deal = won. If explicitly rejected = lost. If inconclusive = unknown.`;

export async function POST(request: NextRequest) {
  const { data: { session } } = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { filename } = await request.json() as { filename: string };
  if (!filename?.endsWith(".pdf")) return NextResponse.json({ error: "Invalid filename" }, { status: 400 });

  // Safety check — no path traversal
  const safeName = path.basename(filename);
  const filePath = path.join(process.cwd(), safeName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found — ingestion must run on local dev server" }, { status: 404 });
  }

  // Read PDF + encode
  const pdfBuffer = fs.readFileSync(filePath);
  const base64 = pdfBuffer.toString("base64");

  // Extract with Claude
  let extracted: Record<string, unknown> = {};
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          } as import("@anthropic-ai/sdk/resources/messages").ContentBlockParam,
          { type: "text", text: EXTRACT_PROMPT },
        ] as import("@anthropic-ai/sdk/resources/messages").ContentBlockParam[],
      }],
    });

    const text = msg.content.find((c) => c.type === "text")?.type === "text"
      ? (msg.content.find((c) => c.type === "text") as { type: "text"; text: string }).text
      : "";

    extracted = JSON.parse(text.trim());
  } catch (err) {
    return NextResponse.json({ error: `Extraction failed: ${String(err)}` }, { status: 500 });
  }

  // Upsert into proposal_examples
  const admin = adminClient();
  const { data, error } = await admin
    .from("proposal_examples")
    .upsert({
      source_file: safeName,
      source_type: "close_crm",
      client_name: extracted.client_name as string | null,
      industry_category: extracted.industry_category as string | null,
      industry_niche: extracted.industry_niche as string | null,
      geography_tier: extracted.geography_tier as string | null,
      cities: extracted.cities as string[] ?? [],
      outcome: (extracted.outcome as string) ?? "unknown",
      budget_discussed: extracted.budget_discussed as number | null,
      final_deal_size: extracted.final_deal_size as number | null,
      deal_size_tier: extracted.deal_size_tier as string | null,
      options_presented: extracted.options_presented as number[] ?? [],
      recommended_option: extracted.recommended_option as number | null,
      chosen_option: extracted.chosen_option as number | null,
      time_to_close_days: extracted.time_to_close_days as number | null,
      ae_name: extracted.ae_name as string | null,
      objections: extracted.objections as string[] ?? [],
      strategy_framing: extracted.strategy_framing as string | null,
      closing_cta: extracted.closing_cta as string | null,
      raw_text: (extracted.raw_text as string ?? "").slice(0, 5000),
      extraction_status: "ai_generated",
    }, { onConflict: "source_file,source_type" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
