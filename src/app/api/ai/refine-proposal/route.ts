import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { proposalText, instruction } = await request.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured. Add ANTHROPIC_API_KEY to your environment variables." }, { status: 503 });
  }

  if (!proposalText || !instruction) {
    return NextResponse.json({ error: "proposalText and instruction are required" }, { status: 400 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `You are an expert at writing influencer marketing proposals for Northly Group, a Canadian influencer marketing agency.

The AE has generated the following proposal and wants you to modify it based on their instruction.

CURRENT PROPOSAL:
${proposalText}

AE INSTRUCTION: "${instruction}"

Rules:
- Keep the same overall structure (opener, Campaign Strategy heading, The Opportunity, Campaign Options, Recommendation, Next Steps)
- Do not add markdown formatting like ## or ** — keep it plain text with section titles in ALL CAPS or as plain headings
- Prices should use $ format (e.g. $1,500 not CA$1,500)
- Keep the tone professional but warm and conversational — like Asif's writing style
- Make only the changes the AE requested, keep everything else the same
- Output ONLY the updated proposal text, nothing else`,
      }],
    });

    const refined = (message.content[0] as { text: string }).text.trim();
    return NextResponse.json({ refined });
  } catch (err) {
    console.error("Refine proposal error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
