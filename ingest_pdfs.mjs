// Run: node ingest_pdfs.mjs
// Reads all PDFs from current directory, extracts proposal data with Claude, saves to Supabase

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// Load env from .env.local
const __dir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dir, ".env.local");
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
// Also accept ANTHROPIC_API_KEY from process env (override)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_API_KEY) { console.error("❌ ANTHROPIC_API_KEY not set"); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("❌ Supabase keys not set"); process.exit(1); }

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

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

const pdfs = fs.readdirSync(__dir).filter(f => f.toLowerCase().endsWith(".pdf")).sort();
console.log(`\nFound ${pdfs.length} PDFs to ingest\n${"─".repeat(60)}`);

let done = 0, skipped = 0, failed = 0;

for (const filename of pdfs) {
  process.stdout.write(`[${done + skipped + failed + 1}/${pdfs.length}] ${filename.substring(0, 50)}… `);

  // Check if already ingested
  const { data: existing } = await supabase
    .from("proposal_examples")
    .select("id, extraction_status")
    .eq("source_file", filename)
    .eq("source_type", "close_crm")
    .maybeSingle();

  if (existing && existing.extraction_status === "ai_generated") {
    console.log("✓ already ingested");
    skipped++;
    continue;
  }

  try {
    const pdfBuffer = fs.readFileSync(path.join(__dir, filename));
    const base64 = pdfBuffer.toString("base64");

    let msg;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        msg = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
              { type: "text", text: EXTRACT_PROMPT },
            ],
          }],
        });
        break;
      } catch (e) {
        if (e.status === 429 && attempt < 3) {
          const wait = (attempt + 1) * 15000;
          process.stdout.write(`[rate limit, waiting ${wait/1000}s] `);
          await new Promise(r => setTimeout(r, wait));
        } else { throw e; }
      }
    }

    const rawText = msg.content.find(c => c.type === "text")?.text ?? "";
    // Strip markdown fences if present
    const text = rawText.replace(/^```json?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const extracted = JSON.parse(text);

    const { error } = await supabase.from("proposal_examples").upsert({
      source_file: filename,
      source_type: "close_crm",
      client_name: extracted.client_name ?? null,
      industry_category: extracted.industry_category ?? null,
      industry_niche: extracted.industry_niche ?? null,
      geography_tier: extracted.geography_tier ?? null,
      cities: extracted.cities ?? [],
      outcome: extracted.outcome ?? "unknown",
      budget_discussed: extracted.budget_discussed ?? null,
      final_deal_size: extracted.final_deal_size ?? null,
      deal_size_tier: extracted.deal_size_tier ?? null,
      options_presented: extracted.options_presented ?? [],
      recommended_option: extracted.recommended_option ?? null,
      chosen_option: extracted.chosen_option ?? null,
      time_to_close_days: extracted.time_to_close_days ?? null,
      ae_name: extracted.ae_name ?? null,
      objections: extracted.objections ?? [],
      strategy_framing: extracted.strategy_framing ?? null,
      closing_cta: extracted.closing_cta ?? null,
      raw_text: (extracted.raw_text ?? "").slice(0, 5000),
      extraction_status: "ai_generated",
    }, { onConflict: "source_file,source_type" });

    if (error) throw new Error(error.message);

    const outcome = extracted.outcome ?? "unknown";
    const client = extracted.client_name ?? "unknown";
    const deal = extracted.final_deal_size ? ` $${extracted.final_deal_size.toLocaleString()}` : "";
    console.log(`✓  ${outcome.toUpperCase()} — ${client}${deal}`);
    done++;
  } catch (err) {
    console.log(`✗ FAILED: ${err.message?.substring(0, 60)}`);
    failed++;
  }

  // Delay to stay within rate limits
  await new Promise(r => setTimeout(r, 2000));
}

console.log(`\n${"─".repeat(60)}`);
console.log(`Done: ${done} ingested, ${skipped} already done, ${failed} failed`);
if (done > 0) console.log(`\n✅ Library is ready — NORI and autofill now have context from ${done + skipped} real deals.`);
