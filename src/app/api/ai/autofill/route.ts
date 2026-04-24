import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchWinningExamples(category?: string): Promise<string> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return "";
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Pull AE-rated wins from proposal_feedback
  let fbQuery = supabase
    .from("proposal_feedback")
    .select("notes, business_category, markets, goals, proposals(generated_text, intake_data)")
    .in("status", ["won", "sent"])
    .eq("rating", 1)
    .order("updated_at", { ascending: false })
    .limit(3);
  if (category) fbQuery = fbQuery.eq("business_category", category);
  const { data: fbData } = await fbQuery;

  // Pull won deals from PDF library
  let libQuery = supabase
    .from("proposal_examples")
    .select("client_name, industry_category, cities, final_deal_size, chosen_option, strategy_framing, objections, closing_cta")
    .eq("outcome", "won")
    .not("strategy_framing", "is", null)
    .order("ingested_at", { ascending: false })
    .limit(4);
  if (category) libQuery = libQuery.eq("industry_category", category);
  const { data: libData } = await libQuery;

  const parts: string[] = [];

  if (fbData?.length) {
    parts.push(fbData.map((ex, i) => {
      const proposalArr = ex.proposals as unknown;
      const proposal = Array.isArray(proposalArr) ? proposalArr[0] : proposalArr;
      const intake = (proposal as { intake_data?: Record<string, unknown> } | null)?.intake_data ?? {};
      const snippet = ((proposal as { generated_text?: string | null } | null)?.generated_text ?? "").substring(0, 500);
      return `AE-rated win ${i + 1} (${ex.business_category ?? "unknown"} — ${(ex.markets ?? []).join(", ")}):
Goals: ${(ex.goals ?? []).join(", ")}
Proposed direction: ${(intake as Record<string, string>).proposedDirection ?? ""}
Proposal excerpt: ${snippet}
AE notes: ${ex.notes ?? "(none)"}`;
    }).join("\n\n---\n\n"));
  }

  if (libData?.length) {
    parts.push(libData.map((ex) =>
      `Library win (${ex.industry_category ?? "unknown"} — ${(ex.cities ?? []).join(", ")}):` +
      (ex.final_deal_size ? ` $${ex.final_deal_size.toLocaleString()}` : "") +
      (ex.chosen_option ? ` | Chose Opt ${ex.chosen_option}` : "") +
      `\nStrategy: ${ex.strategy_framing ?? ""}` +
      ((ex.objections ?? []).length > 0 ? `\nObjections overcome: ${ex.objections.join(", ")}` : "") +
      (ex.closing_cta ? `\nCTA used: ${ex.closing_cta}` : "")
    ).join("\n\n---\n\n"));
  }

  return parts.join("\n\n=====\n\n");
}

export async function POST(request: NextRequest) {
  const { type, website, transcript, businessName, goals, category, cities, challenge } = await request.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured. Add ANTHROPIC_API_KEY to environment variables." }, { status: 503 });
  }

  try {
    if (type === "transcript") {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: `You are a sales assistant at Northly Group, an influencer marketing agency. Extract key information from this discovery call transcript.

Transcript:
${transcript}

Return a JSON object with exactly these fields:
- businessInfo: 1-2 sentences describing what the business does (plain, factual — no fluff)
- differentiator: 2-3 SHORT bullet-ready phrases (5-10 words each), comma-separated, about what makes them different or special. These will appear as bullet points in a proposal. Example: "Family recipe since 1987, Only steak frites concept downtown, 22-day dry-aged beef". If you can't identify real differentiators, return empty string.
- challenge: 1 short sentence about their main marketing challenge or goal

Return ONLY valid JSON, no other text. Never include hedging phrases like "Based on the transcript" or "It appears that".`,
        }],
      });

      const raw = (message.content[0] as { text: string }).text.trim();
      const json = JSON.parse(raw.replace(/^```json?\n?/, "").replace(/```$/, ""));
      return NextResponse.json(json);
    }

    if (type === "business") {
      let siteContent = "";
      if (website) {
        try {
          const res = await fetch(website, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0" } });
          const html = await res.text();
          siteContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").substring(0, 4000);
        } catch {
          // proceed without it
        }
      }

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `You are a sales assistant at Northly Group, an influencer marketing agency. Based on the following website content for "${businessName || "this business"}", extract key information for a proposal.

Website content:
${siteContent || "(website content unavailable)"}

Return a JSON object with exactly these fields:
- businessInfo: 1-2 sentences describing what the business does (plain and factual, like you're explaining to a colleague)
- differentiator: 2-3 SHORT bullet-ready phrases (5-10 words each), comma-separated, about what genuinely makes them different. These will appear as bullet points in a proposal. Example: "Signature 22-day dry-aged steak, Family-owned since 1987, Only steak frites concept in the city". If the website content is too vague to find real differentiators, return empty string — do NOT make up generic differentiators or write hedging language.

Return ONLY valid JSON, no other text. Never include phrases like "Based on the website" or "It appears" or "not clearly articulated".`,
        }],
      });

      const raw = (message.content[0] as { text: string }).text.trim();
      const json = JSON.parse(raw.replace(/^```json?\n?/, "").replace(/```$/, ""));
      return NextResponse.json(json);
    }

    if (type === "direction") {
      const winningExamples = await fetchWinningExamples(category);
      const examplesBlock = winningExamples
        ? `\n\nHere are real proposals that landed well with similar clients (rated positively by AEs):\n\n${winningExamples}\n\nUse these as reference for tone, sequencing style, and framing — adapt to the new client's specifics.`
        : "";

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `You are an experienced Account Executive at Northly Group, a Canadian social media publisher network (Instagram, TikTok, Facebook pages across Toronto, Hamilton, GTA, Ottawa, Calgary, Vancouver, etc.).

Write a 2-4 sentence media rollout plan for this client. This is the AE's internal note — the execution strategy for how to sequence and structure the campaign posts.

Business: ${businessName || "the client"}
Category: ${category || ""}
Goals: ${(goals || []).join(", ") || "awareness"}
Markets: ${(cities || []).join(", ") || ""}
Challenge: ${challenge || ""}${examplesBlock}

RULES:
- Think like a media planner, not a generic marketer
- Reference timing and sequencing: e.g. "Teaser post 2-3 weeks before launch, hard announcement day-of, recap post in week 1"
- If it's a Grand Opening: structure around pre-launch awareness → opening day → follow-up
- If it's brand awareness: which pages to start with and why, what content types fit the business
- If it's conversion/LTO: when to drop the offer post relative to the awareness post
- Mention which type of accounts to lead with (high-follower vs local niche) based on their goals
- Keep it short and punchy — 2-4 sentences max
- Do NOT write generic influencer marketing advice, SEO tips, or micro-influencer strategies

Return ONLY the text, no quotes, no JSON.`,
        }],
      });

      const direction = (message.content[0] as { text: string }).text.trim();
      return NextResponse.json({ direction });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("AI autofill error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
