/**
 * Regenerates src/lib/rate-card-2026.ts from the source workbook.
 * Run: node scripts/generate-rate-card.js "<path to .xlsm>"
 * Committing generated output keeps the app independent of the spreadsheet.
 */
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const source = process.argv[2];
if (!source) {
  console.error('Usage: node scripts/generate-rate-card.js "<path to rate card .xlsm>"');
  process.exit(1);
}

const wb = XLSX.readFile(source);

const tiers = XLSX.utils
  .sheet_to_json(wb.Sheets["Pricing Tiers"], { header: 1, blankrows: false })
  .slice(3)
  .filter((r) => typeof r[0] === "number")
  .map((r) => ({
    lowerBound: r[0],
    upperBound: r[1] === null || r[1] === undefined ? null : r[1],
    label: r[2],
    feed: r[3],
    collaborator: r[4],
    originalContent: r[5],
  }));

const rawPages = XLSX.utils
  .sheet_to_json(wb.Sheets["All Pages Overview"], { header: 1, blankrows: false })
  .slice(3)
  .filter((r) => r[2] && String(r[2]).startsWith("@"))
  .map((r) => ({
    markets: [r[0]],
    network: r[1],
    handle: r[2],
    followers: r[3],
    tierLabel: r[4],
    feed: r[5],
    collaborator: r[6],
    originalContent: r[7],
  }));

// A page that serves several markets is listed once per market on the sheet.
// @waverooom appears under both National - Canada and Ontario, with follower
// counts that differ by 400. Collapse to one entry so it cannot be sold twice
// in a single campaign, keeping the markets it serves and the higher count.
const byHandle = new Map();
for (const row of rawPages) {
  const key = row.handle.trim().toLowerCase();
  const seen = byHandle.get(key);
  if (!seen) {
    byHandle.set(key, { ...row });
    continue;
  }
  seen.markets = [...new Set([...seen.markets, ...row.markets])];
  if (row.followers > seen.followers) {
    seen.followers = row.followers;
    seen.tierLabel = row.tierLabel;
  }
}
const pages = [...byHandle.values()];

// Fail loudly rather than emit a card that breaks its own stated rules.
const violations = pages.filter(
  (p) => p.collaborator !== p.feed / 2 || p.originalContent !== p.feed + 650
);
if (violations.length > 0) {
  console.error("Rows breaking collaborator = feed/2 or OC = feed + 650:");
  console.error(JSON.stringify(violations, null, 2));
  process.exit(1);
}

const out = `/**
 * Northly Group — 2026 Rate Card
 *
 * GENERATED FILE. Do not edit by hand.
 * Regenerate with: node scripts/generate-rate-card.js "<path to rate card .xlsm>"
 *
 * Feed, collaborator and original content prices come from this card, which is
 * the source of truth. Story, carousel, GA feed and talking head are still
 * computed by lib/pricing.ts, because the card does not price them.
 *
 * Card rules, verified at generation time for all ${pages.length} pages
 * (deduplicated from ${rawPages.length} sheet rows):
 *   collaborator     = feed / 2
 *   originalContent  = feed + 650
 */

export interface RateTier {
  lowerBound: number;
  /** null on the open-ended top tier. */
  upperBound: number | null;
  label: string;
  feed: number;
  collaborator: number;
  originalContent: number;
}

export interface RateCardPage {
  /** Every market this page serves. Multi-market pages appear once. */
  markets: string[];
  network: string;
  handle: string;
  followers: number;
  tierLabel: string;
  feed: number;
  collaborator: number;
  originalContent: number;
}

export const ORIGINAL_CONTENT_UPLIFT = 650;

export const RATE_TIERS: readonly RateTier[] = ${JSON.stringify(tiers, null, 2)};

export const RATE_CARD_PAGES: readonly RateCardPage[] = ${JSON.stringify(pages, null, 2)};

/** Resolves the tier a follower count falls into. Throws on a negative count. */
export function tierForFollowers(followers: number): RateTier {
  if (!Number.isFinite(followers) || followers < 0) {
    throw new Error(\`Follower count must be zero or more, got \${followers}.\`);
  }
  const tier = RATE_TIERS.find(
    (t) => followers >= t.lowerBound && (t.upperBound === null || followers <= t.upperBound)
  );
  if (!tier) {
    throw new Error(\`No rate tier covers a follower count of \${followers}.\`);
  }
  return tier;
}

/** Looks up a page by handle, case-insensitively. Returns undefined if absent. */
export function pageByHandle(handle: string): RateCardPage | undefined {
  const needle = handle.trim().toLowerCase();
  return RATE_CARD_PAGES.find((p) => p.handle.toLowerCase() === needle);
}
`;

const target = path.join(__dirname, "..", "src", "lib", "rate-card-2026.ts");
fs.writeFileSync(target, out);
console.log(`Wrote ${target}: ${tiers.length} tiers, ${pages.length} pages.`);
