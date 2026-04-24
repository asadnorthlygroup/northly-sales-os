import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNTS_SEED, CITY_GROUPS } from "@/lib/accounts-seed";
import { formatCurrency, roundProposalPrice } from "@/lib/pricing";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Build a compact account inventory string for context ─────────────────────
function buildAccountContext(): string {
  const byMarket: Record<string, typeof ACCOUNTS_SEED> = {};
  for (const a of ACCOUNTS_SEED) {
    if (!byMarket[a.marketLabel]) byMarket[a.marketLabel] = [];
    byMarket[a.marketLabel].push(a);
  }

  return Object.entries(byMarket).map(([market, accounts]) => {
    const lines = accounts.map((a) => {
      const followers = a.followers >= 1000000
        ? `${(a.followers / 1000000).toFixed(1)}M`
        : `${Math.round(a.followers / 1000)}k`;
      const ba = formatCurrency(roundProposalPrice(a.baseRate * 1.2)); // 20% markup example
      return `  ${a.handle} (${followers} followers, ${a.subNetwork}) — BA: ${ba}`;
    }).join("\n");
    return `${market}:\n${lines}`;
  }).join("\n\n");
}

// ─── Fetch won examples from PDF library ──────────────────────────────────────
async function buildLibraryContext(): Promise<string> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data } = await admin
      .from("proposal_examples")
      .select("client_name, industry_category, cities, outcome, final_deal_size, options_presented, chosen_option, strategy_framing, objections, closing_cta, time_to_close_days")
      .eq("outcome", "won")
      .not("strategy_framing", "is", null)
      .order("ingested_at", { ascending: false })
      .limit(6);

    if (!data?.length) return "";

    const lines = data.map((ex) => {
      const parts = [
        `Client: ${ex.client_name ?? "Unknown"} (${ex.industry_category ?? "unknown industry"})`,
        `Markets: ${(ex.cities ?? []).join(", ") || "—"}`,
        ex.final_deal_size ? `Deal size: $${ex.final_deal_size.toLocaleString()}` : null,
        ex.chosen_option ? `Chose Option ${ex.chosen_option} of [${(ex.options_presented ?? []).join(", ")}]` : null,
        ex.time_to_close_days ? `Closed in ${ex.time_to_close_days} days` : null,
        ex.strategy_framing ? `Strategy: ${ex.strategy_framing}` : null,
        (ex.objections ?? []).length > 0 ? `Objections overcome: ${ex.objections.join(", ")}` : null,
        ex.closing_cta ? `CTA used: ${ex.closing_cta}` : null,
      ].filter(Boolean).join(" | ");
      return `• ${parts}`;
    }).join("\n");

    return `## Past won deals (from Northly proposal library)\n${lines}`;
  } catch {
    return "";
  }
}

// ─── Fetch live pipeline context ──────────────────────────────────────────────
async function buildPipelineContext(): Promise<string> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: deals } = await admin
      .from("deals")
      .select("status, cities, goal, clients(company_name), proposals(ladder_data)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!deals?.length) return "No deals in pipeline yet.";

    const counts: Record<string, number> = {};
    let totalOpt2 = 0, opt2Count = 0;
    for (const d of deals) {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
      const opt2 = (d.proposals as { ladder_data: Record<string, number> }[])?.[0]?.ladder_data?.option2Price;
      if (opt2) { totalOpt2 += opt2; opt2Count++; }
    }

    const recentWon = deals.filter((d) => d.status === "won").slice(0, 3)
      .map((d) => `${(d.clients as unknown as { company_name: string })?.company_name ?? "Unknown"} (${(d.cities ?? []).join(", ")})`).join(", ");

    return [
      `Pipeline: ${deals.length} total deals`,
      Object.entries(counts).map(([s, n]) => `  ${s}: ${n}`).join("\n"),
      opt2Count > 0 ? `Average Option 2 value: ${formatCurrency(Math.round(totalOpt2 / opt2Count))}` : "",
      recentWon ? `Recent wins: ${recentWon}` : "",
    ].filter(Boolean).join("\n");
  } catch {
    return "Pipeline data unavailable.";
  }
}

const SYSTEM_PROMPT = (accountCtx: string, pipelineCtx: string, libraryCtx: string) => `You are NORI — Northly's internal AI assistant for the Sales OS platform.

You help Account Executives (AEs) at Northly Group, a Canadian social media publisher network. Northly operates Instagram, TikTok, and Facebook pages across Canadian cities. AEs use this platform to build proposals, manage deals, and track clients.

## Your personality
- Direct, sharp, and useful. No filler, no hedging.
- You speak like a seasoned media planner, not a generic AI.
- When recommending accounts, be specific — name pages, give follower counts, give pricing.
- When helping with proposals, match the AE's tone and keep it punchy.

## About Northly
- Sub-networks: Northly, Waveroom, Bites, Nightout, Whats the Plan, Must Be, Housing Watch, Got Deals, Extra Assets
- Markets: National, Toronto, Hamilton, GTA (Mississauga/Brampton/Scarborough), Ottawa, Calgary, Vancouver, Edmonton, Montreal, Winnipeg, Halifax, Kitchener/Waterloo, London, Kingston, Victoria, Kelowna, Saskatoon, Regina, Quebec City
- Content types: BA Feed Post (Brand Awareness), Story Posts, GA (Giveaway) Feed Post, OC Reel, Talking Head Reel
- Typical campaign: 1-3 pages, 1-2 posts per page, stories bundled in
- Markup: Small agency = 20%, Large agency = 40%
- Proposal structure: 5-option ladder (Option 1 = à la carte, Options 2-5 = bundles with increasing scale and discount)

## Pricing structure (base rates, pre-markup)
- BA Feed Post: varies by account (see inventory below)
- Story: ~50% of BA rate
- GA Feed: ~120% of BA rate
- OC Reel: BA + $1,000
- Talking Head: BA + $400
- Discounts: Option 2 = ~25% off, Option 3 = ~30% off, Option 4 = ~35% off, Option 5 = ~40% off

## Account inventory (BA rates shown at 20% markup)
${accountCtx}

## Live pipeline
${pipelineCtx}

## What you can help with
- Account selection and recommendations by market/category/budget
- Proposal strategy (which option to pitch, how to frame it)
- Pricing estimates and package calculations
- Email drafting: openers, follow-ups, objection handling
- Pipeline questions: deal counts, win rates, recent activity
- Explaining Northly's network, reach, and value proposition
- General sales coaching and objection handling

Keep responses concise. Use bullet points for lists. If asked for a pricing estimate, calculate it properly using the rates above.

${libraryCtx}`.trim();

export async function POST(request: NextRequest) {
  // Auth check
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured." }, { status: 503 });
  }

  const { messages } = await request.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const [pipelineCtx, libraryCtx] = await Promise.all([
    buildPipelineContext(),
    buildLibraryContext(),
  ]);
  const accountCtx = buildAccountContext();

  // Stream the response
  const stream = anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT(accountCtx, pipelineCtx, libraryCtx),
    messages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(enc.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}
