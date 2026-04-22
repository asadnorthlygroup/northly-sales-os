import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { proposalText, clientName } = await request.json();

  if (!process.env.ANTHROPIC_API_KEY || !proposalText) {
    return NextResponse.json({ issues: [], fixed: null });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      messages: [{
        role: "user",
        content: `You are doing two things at once: (1) a technical QA pass for Northly Group's proposal tool, and (2) reading this email as if you are the prospective client receiving it for the first time.

Client receiving this email: ${clientName || "unknown"}

PROPOSAL:
${proposalText}

───────────────────────────────────────
PASS 1 — TECHNICAL QA
───────────────────────────────────────
Flag and fix:
1. Bullets in "already has:" that are AI-generated filler, not real business attributes (e.g. "Based on the limited content", "not clearly articulated", "A strong concept with real potential", placeholder text)
2. Any sentence that reads like AI talking about itself rather than the client's business
3. Any section that references something not established elsewhere (dangling references, missing info)

───────────────────────────────────────
PASS 2 — CLIENT PERSPECTIVE
───────────────────────────────────────
Read this as the business owner or marketing manager who just received it. Ask yourself:
- Does the opener feel like it was written specifically for me, or is it generic?
- Does "The Opportunity" section make me feel understood — do they get my business?
- Are the campaign options clear? Do I understand what I'm actually buying?
- Is the recommendation convincing? Do I know why they picked that option for me?
- Is anything confusing, contradictory, or missing that would make me hesitate to reply?
- Does the tone feel like a real person who knows my industry, or does it feel templated?

───────────────────────────────────────
FIXING RULES
───────────────────────────────────────
If you find issues from either pass:
- Rewrite ONLY the problematic sections — keep everything else exactly the same
- "already has:" bullets must be SHORT and punchy (5-10 words each). If you genuinely don't know specifics, use professional placeholders like "Established local reputation" or "Prime [city] location" — never AI hedging language
- The opener should feel warm and personal, referencing the specific client/city/goal
- Option descriptions should be written so a non-marketing person understands what they're getting and why it costs what it costs
- Never use markdown like ** or ## in the output
- Keep $ formatting (not CA$)
- Keep the tone: warm, direct, confident — like a trusted advisor, not a vendor

Return a JSON object with:
- issues: array of short strings (under 15 words each) describing each problem found — from both passes. Empty array if the proposal is genuinely clean.
- fixed: the complete corrected proposal text if any issues were found, or null if clean.

Return ONLY valid JSON.`,
      }],
    });

    const raw = (message.content[0] as { text: string }).text.trim();
    const json = JSON.parse(raw.replace(/^```json?\n?/, "").replace(/```$/, ""));
    return NextResponse.json({ issues: json.issues ?? [], fixed: json.fixed ?? null });
  } catch (err) {
    console.error("Review proposal error:", err);
    return NextResponse.json({ issues: [], fixed: null });
  }
}
