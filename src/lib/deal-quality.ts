export interface DealForScore {
  status: string;
  cities: string[];
  goal: string | null;
  proposals: {
    ladder_data: Record<string, number> | null;
    selected_accounts: string[] | null;
    generated_text: string | null;
  }[];
}

export interface QualityScore {
  score: number;       // 0–100
  label: string;       // "Strong" | "Good" | "Needs Work" | "Incomplete"
  color: string;       // Tailwind classes
  breakdown: { label: string; earned: number; max: number }[];
}

export function computeDealQuality(deal: DealForScore): QualityScore {
  const proposal = deal.proposals?.[0];
  const accounts = proposal?.selected_accounts ?? [];
  const ladder = proposal?.ladder_data ?? {};
  const hasText = !!proposal?.generated_text?.trim();
  const opt2 = ladder.option2Price ?? 0;

  const checks = [
    { label: "Proposal created",        earned: proposal ? 20 : 0,                   max: 20 },
    { label: "Pages selected",          earned: accounts.length >= 3 ? 20 : accounts.length > 0 ? 10 : 0, max: 20 },
    { label: "Goal defined",            earned: deal.goal ? 10 : 0,                  max: 10 },
    { label: "Market selected",         earned: deal.cities.length > 0 ? 10 : 0,     max: 10 },
    { label: "Proposal text generated", earned: hasText ? 15 : 0,                    max: 15 },
    { label: "Budget fit (Opt 2 > $1k)", earned: opt2 >= 1000 ? 15 : opt2 > 0 ? 8 : 0, max: 15 },
    { label: "Sent to client",          earned: ["proposal_sent","negotiating","won","lost"].includes(deal.status) ? 10 : 0, max: 10 },
  ];

  const score = checks.reduce((s, c) => s + c.earned, 0);

  const label = score >= 80 ? "Strong" : score >= 60 ? "Good" : score >= 35 ? "Needs Work" : "Incomplete";
  const color = score >= 80
    ? "bg-green-100 text-green-700"
    : score >= 60
    ? "bg-blue-100 text-blue-700"
    : score >= 35
    ? "bg-yellow-100 text-yellow-700"
    : "bg-slate-100 text-slate-500";

  return { score, label, color, breakdown: checks };
}
