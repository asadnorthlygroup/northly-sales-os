/**
 * Seed data extracted from:
 * - Asif's proposal generator prototype (PAGE_DB)
 * - V2 Rate Sheet (April 2026)
 *
 * Base prices are the computed BA Feed Post rates (before $175 flat markup).
 * Follower counts are as of April 2026.
 * avgImpressions will be populated once Apify scraping is live.
 * Until then, we estimate avgImpressions = followers * 0.15 (15% reach) for IG.
 */

export type Platform = "instagram" | "tiktok" | "facebook" | "youtube";
export type SubNetwork =
  | "northly"
  | "waveroom"
  | "bites"
  | "nightout"
  | "whats_the_plan"
  | "must_be"
  | "housing_watch"
  | "got_deals"
  | "extra_assets";

export type BusinessCategory =
  | "restaurant"
  | "bar"
  | "beauty"
  | "service"
  | "retail"
  | "event_space"
  | "app"
  | "ecommerce"
  | "gifting";

export type PricingStatus = "active" | "contact_for_pricing" | "na";

export interface AccountSeed {
  handle: string;
  subNetwork: SubNetwork;
  platform: Platform;
  market: string;        // city/region key
  marketLabel: string;   // display name
  region: string;        // province
  followers: number;
  avgImpressions: number; // estimated until live scraping
  baseRate: number;       // computed BA rate (before $175 markup)
  categories: BusinessCategory[];
  pricingStatus: PricingStatus;
}

function estimateImpressions(followers: number, platform: Platform): number {
  // Conservative estimates by platform until Apify data is live
  const rates: Record<Platform, number> = {
    instagram: 0.15,
    tiktok: 0.25,
    facebook: 0.08,
    youtube: 0.20,
  };
  return Math.round(followers * rates[platform]);
}

function parseFollowers(raw: string | number): number {
  if (typeof raw === "number") return raw;
  const s = raw.replace(/K/i, "000").replace(/M/i, "000000").replace(/[.,]/g, "");
  return parseInt(s, 10) || 0;
}

// Raw seed from Asif's PAGE_DB (handle, baseRate, followers, categories, market)
const RAW: Array<{
  handle: string; subNetwork: SubNetwork; platform: Platform;
  market: string; marketLabel: string; region: string;
  followers: string | number; baseRate: number;
  categories: BusinessCategory[]; pricingStatus?: PricingStatus;
}> = [
  // TORONTO
  { handle: "@waveroom.toronto", subNetwork: "waveroom", platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: "263K", baseRate: 729, categories: ["restaurant", "bar", "event_space", "app", "retail", "service"] },
  { handle: "@northlytoronto", subNetwork: "northly", platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: "162K", baseRate: 672, categories: ["restaurant", "bar", "event_space", "app", "retail", "service"] },
  { handle: "@girlplanstoronto", subNetwork: "whats_the_plan", platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: "55800", baseRate: 610, categories: ["restaurant", "beauty", "gifting", "retail", "service"] },
  { handle: "@mustbetoronto", subNetwork: "must_be", platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: "86300", baseRate: 467, categories: ["restaurant", "bar", "event_space", "app", "retail"] },
  { handle: "@nightouttoronto", subNetwork: "nightout", platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: "129K", baseRate: 364, categories: ["bar", "event_space", "restaurant"] },
  { handle: "@bites.toronto", subNetwork: "bites", platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: "62800", baseRate: 370, categories: ["restaurant"] },
  { handle: "@torontosight", subNetwork: "extra_assets", platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: "56200", baseRate: 367, categories: ["event_space", "retail", "service"] },
  { handle: "@torontogotdeals", subNetwork: "got_deals", platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: "24000", baseRate: 259, categories: ["retail", "restaurant", "service"] },

  // GTA / SUBURBS
  { handle: "@northlybrampton", subNetwork: "northly", platform: "instagram", market: "brampton", marketLabel: "Brampton", region: "Ontario", followers: "79500", baseRate: 465, categories: ["restaurant", "app", "retail", "service", "event_space"] },
  { handle: "@northlymississauga", subNetwork: "northly", platform: "instagram", market: "mississauga", marketLabel: "Mississauga", region: "Ontario", followers: "16200", baseRate: 260, categories: ["restaurant", "app", "retail", "service", "event_space"] },
  { handle: "@northlydurham", subNetwork: "northly", platform: "instagram", market: "durham", marketLabel: "Durham", region: "Ontario", followers: "56900", baseRate: 505, categories: ["restaurant", "app", "retail", "service", "event_space"] },
  { handle: "@northlyyorkregion", subNetwork: "northly", platform: "instagram", market: "york_region", marketLabel: "York Region", region: "Ontario", followers: "9800", baseRate: 188, categories: ["restaurant", "app", "retail", "service", "event_space"] },
  { handle: "@waveroommississauga", subNetwork: "waveroom", platform: "instagram", market: "mississauga", marketLabel: "Mississauga", region: "Ontario", followers: "27000", baseRate: 175, categories: ["app", "restaurant", "retail", "service", "event_space"] },
  { handle: "@waveroombrampton", subNetwork: "waveroom", platform: "instagram", market: "brampton", marketLabel: "Brampton", region: "Ontario", followers: "23000", baseRate: 175, categories: ["app", "restaurant", "retail", "service", "event_space"] },

  // HAMILTON
  { handle: "@northlyhamilton", subNetwork: "northly", platform: "instagram", market: "hamilton", marketLabel: "Hamilton", region: "Ontario", followers: "137K", baseRate: 659, categories: ["restaurant", "bar", "beauty", "retail", "service", "event_space"] },
  { handle: "@girlplanshamilton", subNetwork: "whats_the_plan", platform: "instagram", market: "hamilton", marketLabel: "Hamilton", region: "Ontario", followers: "28600", baseRate: 486, categories: ["restaurant", "beauty", "retail", "service", "gifting"] },
  { handle: "@waveroomhamilton", subNetwork: "waveroom", platform: "instagram", market: "hamilton", marketLabel: "Hamilton", region: "Ontario", followers: "15000", baseRate: 350, categories: ["restaurant", "bar", "event_space", "retail", "service"] },

  // MONTREAL
  { handle: "@waveroommontreal", subNetwork: "waveroom", platform: "instagram", market: "montreal", marketLabel: "Montreal", region: "Quebec", followers: "82400", baseRate: 411, categories: ["restaurant", "retail", "service", "event_space", "ecommerce"] },
  { handle: "@northlymontreal", subNetwork: "northly", platform: "instagram", market: "montreal", marketLabel: "Montreal", region: "Quebec", followers: "63300", baseRate: 369, categories: ["restaurant", "retail", "service", "event_space", "ecommerce"] },
  { handle: "@girlplansmontreal", subNetwork: "whats_the_plan", platform: "instagram", market: "montreal", marketLabel: "Montreal", region: "Quebec", followers: "32600", baseRate: 445, categories: ["retail", "service", "gifting", "ecommerce", "restaurant"] },

  // VANCOUVER
  { handle: "@waveroomvancouver", subNetwork: "waveroom", platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers: "78300", baseRate: 446, categories: ["restaurant", "retail", "service", "event_space", "ecommerce"] },
  { handle: "@northlyvancouver", subNetwork: "northly", platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers: "80900", baseRate: 476, categories: ["restaurant", "retail", "service", "event_space", "ecommerce"] },
  { handle: "@girlplansvancouver", subNetwork: "whats_the_plan", platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers: "37100", baseRate: 529, categories: ["retail", "service", "gifting", "ecommerce", "restaurant"] },
  { handle: "@mustbevancouver", subNetwork: "must_be", platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers: "15700", baseRate: 225, categories: ["restaurant", "retail", "event_space"] },
  { handle: "@bitesvancouver", subNetwork: "bites", platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers: "11000", baseRate: 153, categories: ["restaurant"] },

  // LONDON (ON)
  { handle: "@northlylondon", subNetwork: "northly", platform: "instagram", market: "london", marketLabel: "London", region: "Ontario", followers: "29400", baseRate: 303, categories: ["restaurant", "retail", "service", "event_space"] },

  // CALGARY
  { handle: "@northlycalgary", subNetwork: "northly", platform: "instagram", market: "calgary", marketLabel: "Calgary", region: "Alberta", followers: "50000", baseRate: 321, categories: ["restaurant", "retail", "service", "event_space"] },
  { handle: "@whatstheplancalgary", subNetwork: "whats_the_plan", platform: "instagram", market: "calgary", marketLabel: "Calgary", region: "Alberta", followers: "19200", baseRate: 327, categories: ["restaurant", "retail", "service"] },
  { handle: "@waveroomcalgary", subNetwork: "waveroom", platform: "instagram", market: "calgary", marketLabel: "Calgary", region: "Alberta", followers: "7800", baseRate: 175, categories: ["restaurant", "event_space", "retail"] },

  // NATIONAL
  { handle: "@waverooom", subNetwork: "waveroom", platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers: "602K", baseRate: 1496, categories: ["restaurant", "bar", "event_space", "app", "retail", "service", "ecommerce"] },
  { handle: "@northlycanada", subNetwork: "northly", platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers: "192K", baseRate: 806, categories: ["restaurant", "bar", "event_space", "app", "retail", "service", "ecommerce"] },
  { handle: "@mustbecanada", subNetwork: "must_be", platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers: "77300", baseRate: 399, categories: ["restaurant", "retail", "service", "ecommerce"] },
  { handle: "@canadagotdeals", subNetwork: "got_deals", platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers: "48200", baseRate: 346, categories: ["retail", "restaurant", "service", "ecommerce"] },
];

export const ACCOUNTS_SEED: AccountSeed[] = RAW.map((r) => {
  const followers = parseFollowers(r.followers);
  return {
    ...r,
    followers,
    avgImpressions: estimateImpressions(followers, r.platform),
    pricingStatus: r.pricingStatus ?? "active",
  };
});

export const MARKETS = [
  { key: "toronto", label: "Toronto" },
  { key: "brampton", label: "Brampton" },
  { key: "mississauga", label: "Mississauga" },
  { key: "durham", label: "Durham" },
  { key: "york_region", label: "York Region" },
  { key: "hamilton", label: "Hamilton" },
  { key: "montreal", label: "Montreal" },
  { key: "vancouver", label: "Vancouver" },
  { key: "london", label: "London" },
  { key: "calgary", label: "Calgary" },
  { key: "national", label: "National" },
];

export const CITY_GROUPS = [
  { key: "toronto", label: "Toronto", markets: ["toronto"] },
  { key: "gta", label: "GTA / Suburbs", markets: ["brampton", "mississauga", "durham", "york_region"] },
  { key: "hamilton", label: "Hamilton", markets: ["hamilton"] },
  { key: "montreal", label: "Montreal", markets: ["montreal"] },
  { key: "vancouver", label: "Vancouver", markets: ["vancouver"] },
  { key: "london", label: "London ON", markets: ["london"] },
  { key: "calgary", label: "Calgary", markets: ["calgary"] },
  { key: "national", label: "National Rollout", markets: ["national"] },
];

export const CATEGORY_OPTIONS: { value: BusinessCategory; label: string }[] = [
  { value: "restaurant", label: "Restaurant / Food" },
  { value: "bar", label: "Bar / Nightlife" },
  { value: "beauty", label: "Beauty / Med Spa / Salon" },
  { value: "service", label: "Local Service" },
  { value: "retail", label: "Retail / Store" },
  { value: "event_space", label: "Event / Venue / Experience" },
  { value: "app", label: "App / Digital Product" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "gifting", label: "Gifting / Family / Female-led occasions" },
];

export const GOAL_OPTIONS = [
  "Awareness",
  "Foot Traffic",
  "Bookings",
  "Ticket Sales",
  "Sign Ups / Downloads",
  "E-commerce Sales",
  "Grand Opening",
  "Event Promotion",
];

export function getAccountsForCities(
  cityGroupKeys: string[],
  category?: BusinessCategory
): AccountSeed[] {
  const markets = cityGroupKeys.flatMap(
    (gk) => CITY_GROUPS.find((g) => g.key === gk)?.markets ?? []
  );
  return ACCOUNTS_SEED.filter(
    (a) =>
      markets.includes(a.market) &&
      a.pricingStatus === "active" &&
      (category == null || a.categories.includes(category))
  );
}

export function getStrategyHook(category: BusinessCategory): string {
  const hooks: Record<BusinessCategory, string> = {
    restaurant: "The opportunity here is not just getting seen. It's turning curiosity into traffic and repeat visits.",
    bar: "This needs to create buzz, repeated exposure, and a reason for people to come in now.",
    beauty: "The opportunity here is to build trust, visibility, and a reason for new clients to book now.",
    service: "For a service business like this, the biggest challenge is usually not quality. It's getting in front of the right local audience consistently.",
    retail: "The opportunity is to turn local discovery into store visits and measurable action.",
    event_space: "This is about positioning the space as a destination, not just promoting one-off dates or events.",
    app: "The goal here isn't just awareness. It's getting the product in front of the right audience and turning that into downloads and sign-ups.",
    ecommerce: "This needs to move people from awareness to purchase in a clean, measurable funnel.",
    gifting: "The opportunity is to put the brand in front of the right planner mindset and tie awareness to a clear purchase moment.",
  };
  return hooks[category] ?? "The goal here is to connect visibility to a clear business outcome.";
}
