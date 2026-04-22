import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { type, website, transcript, businessName, goals } = await request.json();

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
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `You are an experienced AE at Northly Group, an influencer marketing agency in Canada. Write a brief strategic recommendation (2-4 sentences) for this client's social media campaign.

Business: ${businessName || "the client"}
Goals: ${(goals || []).join(", ") || "awareness"}

The recommendation should sound like advice from an experienced AE — direct, specific, and confident. Focus on which pages/approach to start with and why. No generic fluff.

Return ONLY the recommendation text, no JSON, no quotes.`,
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
