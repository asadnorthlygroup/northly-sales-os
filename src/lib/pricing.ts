/**
 * Northly Group — Follower-Weighted Geometric Blend Pricing Engine
 *
 * Core formula (BA Feed Post — Dedicated):
 *   Price = EXP(
 *     0.25 * LN( (avgImpressions / 1000) * CPM )
 *   + 0.75 * LN( k * followers ^ a )
 *   )
 *
 * All constants are admin-configurable via pricing_config table.
 * Hard floors are enforced at every level — never bypass.
 */

export interface PricingConfig {
  cpm: number;               // default 10
  impressionsWeight: number; // default 0.25
  followersWeight: number;   // default 0.75 (must sum to 1 with above)
  scaleConstant: number;     // default 1.77
  followerExponent: number;  // default 0.495
  bundleMinMultiplier: number; // default 0.40 (60% off)
  ocReelUplift: number;      // default 1000
  ocReelBundleUplift: number; // default 700
  talkingHeadUplift: number;  // default 400
  flatMarkup: number;         // default 175
  percentageMarkup: number;   // default 0.20 (20%)
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  cpm: 10,
  impressionsWeight: 0.25,
  followersWeight: 0.75,
  scaleConstant: 1.77,
  followerExponent: 0.495,
  bundleMinMultiplier: 0.40,
  ocReelUplift: 1000,
  ocReelBundleUplift: 700,
  talkingHeadUplift: 400,
  flatMarkup: 175,
  percentageMarkup: 0.20,
};

// Format floor values (client-facing minimums)
export const FORMAT_FLOORS = {
  baFeed: 100,
  baFeedBundleMin: 100,
  story: 50,
  storyBundleMin: 0,
  carousel: 100,
  carouselBundleMin: 100,
  gaFeed: 120,
  gaFeedBundleMin: 100,
  ocReel: 1100,
  ocReelBundleMin: 800,
  talkingHead: 500,
  talkingHeadBundleMin: 500,
} as const;

export type FormatKey = keyof typeof FORMAT_FLOORS;

/**
 * Round a price to the nearest 00/25/50/75 ending.
 * Searches nearestHundred ± $200. Hard floor: $100.
 */
export function roundProposalPrice(value: number): number {
  if (value <= 0) return 0;
  const endings = [0, 25, 50, 75];
  const nearestHundred = Math.floor(value / 100) * 100;
  let best = value;
  let bestDiff = Infinity;

  for (let base = nearestHundred - 100; base <= nearestHundred + 200; base += 100) {
    for (const ending of endings) {
      const candidate = base + ending;
      const diff = Math.abs(candidate - value);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = candidate;
      }
    }
  }
  return Math.max(100, best);
}

/**
 * Core BA Feed Post — Dedicated price calculation.
 * Returns raw (unrounded) value.
 */
export function computeBAFeedRaw(
  followers: number,
  avgImpressions: number,
  config: PricingConfig = DEFAULT_PRICING_CONFIG
): number {
  if (followers <= 0 || avgImpressions <= 0) return 0;

  const impressionComponent = (avgImpressions / 1000) * config.cpm;
  const followerComponent = config.scaleConstant * Math.pow(followers, config.followerExponent);

  if (impressionComponent <= 0 || followerComponent <= 0) return 0;

  return Math.exp(
    config.impressionsWeight * Math.log(impressionComponent) +
    config.followersWeight * Math.log(followerComponent)
  );
}

/**
 * All rates for an account, raw (unrounded).
 */
export interface AccountRatesRaw {
  baFeed: number;
  baFeedBundleMin: number;
  story: number;
  storyBundleMin: number;
  carousel: number;
  carouselBundleMin: number;
  gaFeed: number;
  gaFeedBundleMin: number;
  ocReel: number;
  ocReelBundleMin: number;
  talkingHead: number;
  talkingHeadBundleMin: number;
}

export function computeAccountRatesRaw(
  followers: number,
  avgImpressions: number,
  config: PricingConfig = DEFAULT_PRICING_CONFIG
): AccountRatesRaw {
  const ba = computeBAFeedRaw(followers, avgImpressions, config);

  return {
    baFeed: Math.max(FORMAT_FLOORS.baFeed, ba),
    baFeedBundleMin: Math.max(FORMAT_FLOORS.baFeedBundleMin, ba * config.bundleMinMultiplier),
    story: Math.max(FORMAT_FLOORS.story, ba * 0.50),
    storyBundleMin: 0, // always bundled in
    carousel: Math.max(FORMAT_FLOORS.carousel, ba * 0.50),
    carouselBundleMin: Math.max(FORMAT_FLOORS.carouselBundleMin, ba * config.bundleMinMultiplier),
    gaFeed: Math.max(FORMAT_FLOORS.gaFeed, ba * 1.20),
    gaFeedBundleMin: Math.max(FORMAT_FLOORS.gaFeedBundleMin, ba * config.bundleMinMultiplier),
    ocReel: Math.max(FORMAT_FLOORS.ocReel, ba + config.ocReelUplift),
    ocReelBundleMin: Math.max(FORMAT_FLOORS.ocReelBundleMin, ba * config.bundleMinMultiplier + config.ocReelBundleUplift),
    talkingHead: Math.max(FORMAT_FLOORS.talkingHead, ba + config.talkingHeadUplift),
    talkingHeadBundleMin: Math.max(FORMAT_FLOORS.talkingHeadBundleMin, ba * config.bundleMinMultiplier),
  };
}

/**
 * Rounded client-facing rates.
 */
export function computeAccountRates(
  followers: number,
  avgImpressions: number,
  config: PricingConfig = DEFAULT_PRICING_CONFIG
): AccountRatesRaw {
  const raw = computeAccountRatesRaw(followers, avgImpressions, config);
  return {
    baFeed: roundProposalPrice(raw.baFeed),
    baFeedBundleMin: roundProposalPrice(raw.baFeedBundleMin),
    story: roundProposalPrice(raw.story),
    storyBundleMin: 0,
    carousel: roundProposalPrice(raw.carousel),
    carouselBundleMin: roundProposalPrice(raw.carouselBundleMin),
    gaFeed: roundProposalPrice(raw.gaFeed),
    gaFeedBundleMin: roundProposalPrice(raw.gaFeedBundleMin),
    ocReel: roundProposalPrice(raw.ocReel),
    ocReelBundleMin: roundProposalPrice(raw.ocReelBundleMin),
    talkingHead: roundProposalPrice(raw.talkingHead),
    talkingHeadBundleMin: roundProposalPrice(raw.talkingHeadBundleMin),
  };
}

export type MarkupMode = "flat" | "percentage";

/**
 * Apply markup to a base rate.
 * Mode A: flat +$175 per account
 * Mode B: percentage of total (applied at package level, not here)
 */
export function applyFlatMarkup(
  baseRate: number,
  config: PricingConfig = DEFAULT_PRICING_CONFIG
): number {
  return roundProposalPrice(baseRate + config.flatMarkup);
}

/**
 * Package-level percentage markup. Applied to the total.
 * Returns rounded total.
 */
export function applyPercentageMarkup(
  total: number,
  markupPct: number = 0.20
): number {
  return roundProposalPrice(total * (1 + markupPct));
}

/**
 * 5-Option Ladder pricing.
 * selectedBaseTotal: sum of base rates (after markup) for AE-selected pages
 */
export interface LadderInput {
  selectedBaseTotal: number; // sum of markedUpPrice for selected pages in Option 2
  option2Discount: number;   // 0–1, default 0.25
  option3Discount: number;   // 0–1, default 0.30
  option4Discount: number;   // 0–1, default 0.35
  option5Discount: number;   // 0–1, default 0.40
}

export interface LadderPrices {
  option2StandardValue: number;
  option2Price: number;
  option3StandardValue: number;
  option3Price: number;
  option4StandardValue: number;
  option4Price: number;
  option5StandardValue: number;
  option5Price: number;
}

export function computeLadderPrices(input: LadderInput): LadderPrices {
  const { selectedBaseTotal: sv } = input;

  const option2StandardValue = sv;
  const option3StandardValue = sv * 2;
  const option4StandardValue = sv * 2 + 1200;
  const option5StandardValue = sv * 2.5 + 1800;

  return {
    option2StandardValue,
    option2Price: roundProposalPrice(option2StandardValue * (1 - input.option2Discount)),
    option3StandardValue,
    option3Price: roundProposalPrice(option3StandardValue * (1 - input.option3Discount)),
    option4StandardValue,
    option4Price: roundProposalPrice(option4StandardValue * (1 - input.option4Discount)),
    option5StandardValue,
    option5Price: roundProposalPrice(option5StandardValue * (1 - input.option5Discount)),
  };
}

/**
 * Enforce bundle floor: total price must be >= sum of absolute minimums.
 * Returns true if the proposed price clears the floor.
 */
export function checkBundleFloor(
  proposedPrice: number,
  absoluteMinimumSum: number
): { passes: boolean; shortfall: number } {
  const passes = proposedPrice >= absoluteMinimumSum;
  return {
    passes,
    shortfall: passes ? 0 : absoluteMinimumSum - proposedPrice,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
