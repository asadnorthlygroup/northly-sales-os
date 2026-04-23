/**
 * Account seed — sourced from V2 Rate Sheet (April 2026) and Audience Profile (March 2026).
 * baseRate = BA Feed Post (Dedicated) rate from the rate sheet.
 * storyRate = Story Post (1 Slide) rate.
 * ocRate = OC Reel Post rate.
 * talkingHeadRate = Talking Head Reel Post rate.
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
  market: string;
  marketLabel: string;
  region: string;
  followers: number;
  avgImpressions: number;
  baseRate: number;       // BA Feed Post (Dedicated)
  storyRate: number;      // Story Post (1 Slide)
  ocRate: number;         // OC Reel Post
  talkingHeadRate: number; // Talking Head Reel Post
  categories: BusinessCategory[];
  pricingStatus: PricingStatus;
}

function estimateImpressions(followers: number, platform: Platform): number {
  const rates: Record<Platform, number> = {
    instagram: 0.15,
    tiktok: 0.25,
    facebook: 0.08,
    youtube: 0.20,
  };
  return Math.round(followers * rates[platform]);
}

const ALL_CATS: BusinessCategory[] = ["restaurant", "bar", "beauty", "service", "retail", "event_space", "app", "ecommerce", "gifting"];
const FOOD_CATS: BusinessCategory[] = ["restaurant", "bar", "event_space", "retail", "service"];
const LIFESTYLE_CATS: BusinessCategory[] = ["restaurant", "beauty", "gifting", "retail", "service", "event_space"];
const RETAIL_CATS: BusinessCategory[] = ["retail", "restaurant", "service", "ecommerce", "gifting"];
const BAR_CATS: BusinessCategory[] = ["bar", "event_space", "restaurant"];

// Raw data — all rates from V2 Rate Sheet (April 2026), followers from rate sheet
const RAW: Array<{
  handle: string; subNetwork: SubNetwork; platform: Platform;
  market: string; marketLabel: string; region: string;
  followers: number;
  baseRate: number; storyRate: number; ocRate: number; talkingHeadRate: number;
  categories: BusinessCategory[]; pricingStatus?: PricingStatus;
}> = [
  // ─── NATIONAL ────────────────────────────────────────────────────────────
  { handle: "@waverooom",     subNetwork: "waveroom", platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers: 603000, baseRate: 1497, storyRate: 749, ocRate: 2497, talkingHeadRate: 1897, categories: ALL_CATS },
  { handle: "@northlycanada", subNetwork: "northly",  platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers: 207000, baseRate:  829, storyRate: 415, ocRate: 1829, talkingHeadRate: 1229, categories: ALL_CATS },
  { handle: "@mustbecanada",  subNetwork: "must_be",  platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers:  77300, baseRate:  399, storyRate: 199, ocRate: 1399, talkingHeadRate:  799, categories: RETAIL_CATS },
  { handle: "@canadagotdeals",subNetwork: "got_deals",platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers:  48200, baseRate:  346, storyRate: 173, ocRate: 1346, talkingHeadRate:  746, categories: RETAIL_CATS },
  { handle: "@northlyfoodie", subNetwork: "northly",  platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers:  40200, baseRate:  210, storyRate: 105, ocRate: 1210, talkingHeadRate:  610, categories: FOOD_CATS },
  { handle: "@northlysports", subNetwork: "northly",  platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers:   9664, baseRate:  149, storyRate:  74, ocRate: 1149, talkingHeadRate:  549, categories: ["retail", "event_space", "service"] },
  { handle: "@northlyamerica",subNetwork: "northly",  platform: "instagram", market: "national", marketLabel: "National", region: "Canada", followers:  76000, baseRate:  604, storyRate: 302, ocRate: 1604, talkingHeadRate: 1004, categories: ALL_CATS },

  // ─── TORONTO ─────────────────────────────────────────────────────────────
  { handle: "@waveroom.toronto",    subNetwork: "waveroom",       platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: 264000, baseRate:  730, storyRate: 365, ocRate: 1730, talkingHeadRate: 1130, categories: ALL_CATS },
  { handle: "@northlytoronto",      subNetwork: "northly",        platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: 169000, baseRate:  682, storyRate: 341, ocRate: 1682, talkingHeadRate: 1082, categories: ALL_CATS },
  { handle: "@girlplanstoronto",    subNetwork: "whats_the_plan", platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers:  67300, baseRate:  620, storyRate: 310, ocRate: 1620, talkingHeadRate: 1020, categories: LIFESTYLE_CATS },
  { handle: "@mustbetoronto",       subNetwork: "must_be",        platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers:  90000, baseRate:  475, storyRate: 237, ocRate: 1475, talkingHeadRate:  875, categories: FOOD_CATS },
  { handle: "@nightouttoronto",     subNetwork: "nightout",       platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers: 131000, baseRate:  366, storyRate: 183, ocRate: 1366, talkingHeadRate:  766, categories: BAR_CATS },
  { handle: "@bites.toronto",       subNetwork: "bites",          platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers:  73600, baseRate:  393, storyRate: 196, ocRate: 1393, talkingHeadRate:  793, categories: FOOD_CATS },
  { handle: "@torontosight",        subNetwork: "extra_assets",   platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers:  56200, baseRate:  367, storyRate: 183, ocRate: 1367, talkingHeadRate:  767, categories: ["event_space", "retail", "service"] },
  { handle: "@torontoclip",         subNetwork: "extra_assets",   platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers:  56200, baseRate:  367, storyRate: 183, ocRate: 1367, talkingHeadRate:  767, categories: ["event_space", "retail", "service"] },
  { handle: "@torontogotdeals",     subNetwork: "got_deals",      platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers:  24000, baseRate:  259, storyRate: 130, ocRate: 1259, talkingHeadRate:  659, categories: RETAIL_CATS },
  { handle: "@torontohousingwatch", subNetwork: "housing_watch",  platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers:  33000, baseRate:  278, storyRate: 139, ocRate: 1278, talkingHeadRate:  678, categories: ["service", "retail", "ecommerce"] },
  { handle: "@ontariohousingwatch", subNetwork: "housing_watch",  platform: "instagram", market: "toronto", marketLabel: "Toronto", region: "Ontario", followers:  13900, baseRate:  100, storyRate:  50, ocRate: 1100, talkingHeadRate:  500, categories: ["service", "retail"] },

  // ─── GTA ─────────────────────────────────────────────────────────────────
  { handle: "@northlybrampton",   subNetwork: "northly",  platform: "instagram", market: "brampton",    marketLabel: "Brampton",    region: "Ontario", followers: 79500, baseRate: 465, storyRate: 232, ocRate: 1465, talkingHeadRate:  865, categories: ALL_CATS },
  { handle: "@waveroombrampton",  subNetwork: "waveroom", platform: "instagram", market: "brampton",    marketLabel: "Brampton",    region: "Ontario", followers: 24700, baseRate: 354, storyRate: 177, ocRate: 1354, talkingHeadRate:  754, categories: FOOD_CATS },
  { handle: "@northlymississauga",subNetwork: "northly",  platform: "instagram", market: "mississauga", marketLabel: "Mississauga", region: "Ontario", followers: 16200, baseRate: 260, storyRate: 130, ocRate: 1260, talkingHeadRate:  660, categories: ALL_CATS },
  { handle: "@waveroommississauga",subNetwork: "waveroom",platform: "instagram", market: "mississauga", marketLabel: "Mississauga", region: "Ontario", followers: 27900, baseRate: 299, storyRate: 150, ocRate: 1299, talkingHeadRate:  699, categories: FOOD_CATS },
  { handle: "@northlydurham",     subNetwork: "northly",  platform: "instagram", market: "durham",      marketLabel: "Durham",      region: "Ontario", followers: 56900, baseRate: 505, storyRate: 252, ocRate: 1505, talkingHeadRate:  905, categories: ALL_CATS },
  { handle: "@northlyyorkregion", subNetwork: "northly",  platform: "instagram", market: "york_region", marketLabel: "York Region", region: "Ontario", followers:  9760, baseRate: 188, storyRate:  94, ocRate: 1188, talkingHeadRate:  588, categories: ALL_CATS },

  // ─── HAMILTON ────────────────────────────────────────────────────────────
  { handle: "@northlyhamilton",     subNetwork: "northly",        platform: "instagram", market: "hamilton", marketLabel: "Hamilton", region: "Ontario", followers: 144000, baseRate: 671, storyRate: 336, ocRate: 1671, talkingHeadRate: 1071, categories: ALL_CATS },
  { handle: "@girlplanshamilton",   subNetwork: "whats_the_plan", platform: "instagram", market: "hamilton", marketLabel: "Hamilton", region: "Ontario", followers:  28600, baseRate: 486, storyRate: 243, ocRate: 1486, talkingHeadRate:  886, categories: LIFESTYLE_CATS },
  { handle: "@waveroomhamilton",    subNetwork: "waveroom",       platform: "instagram", market: "hamilton", marketLabel: "Hamilton", region: "Ontario", followers:   4949, baseRate: 148, storyRate:  74, ocRate: 1148, talkingHeadRate:  548, categories: FOOD_CATS },
  { handle: "@mustbehamilton",      subNetwork: "must_be",        platform: "instagram", market: "hamilton", marketLabel: "Hamilton", region: "Ontario", followers:   4963, baseRate: 160, storyRate:  80, ocRate: 1160, talkingHeadRate:  560, categories: FOOD_CATS },

  // ─── OTTAWA ──────────────────────────────────────────────────────────────
  { handle: "@northlyottawa",       subNetwork: "northly",        platform: "instagram", market: "ottawa", marketLabel: "Ottawa", region: "Ontario", followers: 78900, baseRate: 436, storyRate: 218, ocRate: 1436, talkingHeadRate:  836, categories: ALL_CATS },
  { handle: "@whatstheplanottawa",  subNetwork: "whats_the_plan", platform: "instagram", market: "ottawa", marketLabel: "Ottawa", region: "Ontario", followers: 35000, baseRate: 516, storyRate: 258, ocRate: 1516, talkingHeadRate:  916, categories: LIFESTYLE_CATS },
  { handle: "@waveroomottawa",      subNetwork: "waveroom",       platform: "instagram", market: "ottawa", marketLabel: "Ottawa", region: "Ontario", followers:  6450, baseRate: 100, storyRate:  50, ocRate: 1100, talkingHeadRate:  500, categories: FOOD_CATS },

  // ─── KITCHENER / WATERLOO ────────────────────────────────────────────────
  { handle: "@northlykitchener", subNetwork: "northly", platform: "instagram", market: "kitchener", marketLabel: "Kitchener", region: "Ontario", followers: 33600, baseRate: 300, storyRate: 150, ocRate: 1300, talkingHeadRate: 700, categories: ALL_CATS },

  // ─── LONDON ──────────────────────────────────────────────────────────────
  { handle: "@northlylondon", subNetwork: "northly", platform: "instagram", market: "london", marketLabel: "London ON", region: "Ontario", followers: 29400, baseRate: 303, storyRate: 151, ocRate: 1303, talkingHeadRate: 703, categories: ALL_CATS },

  // ─── WINDSOR ─────────────────────────────────────────────────────────────
  { handle: "@northlywindsor", subNetwork: "northly", platform: "instagram", market: "windsor", marketLabel: "Windsor", region: "Ontario", followers: 26000, baseRate: 240, storyRate: 120, ocRate: 1240, talkingHeadRate: 640, categories: ALL_CATS },

  // ─── MONTREAL ────────────────────────────────────────────────────────────
  { handle: "@waveroommontreal",    subNetwork: "waveroom",       platform: "instagram", market: "montreal", marketLabel: "Montreal", region: "Quebec", followers: 85100, baseRate: 416, storyRate: 208, ocRate: 1416, talkingHeadRate:  816, categories: ALL_CATS },
  { handle: "@northlymontreal",     subNetwork: "northly",        platform: "instagram", market: "montreal", marketLabel: "Montreal", region: "Quebec", followers: 63300, baseRate: 369, storyRate: 185, ocRate: 1369, talkingHeadRate:  769, categories: ALL_CATS },
  { handle: "@girlplansmontreal",   subNetwork: "whats_the_plan", platform: "instagram", market: "montreal", marketLabel: "Montreal", region: "Quebec", followers: 32600, baseRate: 445, storyRate: 223, ocRate: 1445, talkingHeadRate:  845, categories: LIFESTYLE_CATS },
  { handle: "@montrealhousingwatch",subNetwork: "housing_watch",  platform: "instagram", market: "montreal", marketLabel: "Montreal", region: "Quebec", followers:  3900, baseRate: 100, storyRate:  50, ocRate: 1100, talkingHeadRate:  500, categories: ["service", "retail"] },

  // ─── VANCOUVER ───────────────────────────────────────────────────────────
  { handle: "@waveroomvancouver",  subNetwork: "waveroom",       platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers: 91300, baseRate: 472, storyRate: 236, ocRate: 1472, talkingHeadRate:  872, categories: ALL_CATS },
  { handle: "@northlyvancouver",   subNetwork: "northly",        platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers: 87200, baseRate: 489, storyRate: 244, ocRate: 1489, talkingHeadRate:  889, categories: ALL_CATS },
  { handle: "@girlplansvancouver", subNetwork: "whats_the_plan", platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers: 37100, baseRate: 529, storyRate: 264, ocRate: 1529, talkingHeadRate:  929, categories: LIFESTYLE_CATS },
  { handle: "@nightoutvancouver",  subNetwork: "nightout",       platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers: 13400, baseRate: 158, storyRate:  79, ocRate: 1158, talkingHeadRate:  558, categories: BAR_CATS },
  { handle: "@mustbevan",          subNetwork: "must_be",        platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers:  7737, baseRate: 172, storyRate:  86, ocRate: 1172, talkingHeadRate:  572, categories: FOOD_CATS },
  { handle: "@bitesvancouver",     subNetwork: "bites",          platform: "instagram", market: "vancouver", marketLabel: "Vancouver", region: "BC", followers: 13600, baseRate: 166, storyRate:  83, ocRate: 1166, talkingHeadRate:  566, categories: FOOD_CATS },

  // ─── CALGARY ─────────────────────────────────────────────────────────────
  { handle: "@northlycalgary",      subNetwork: "northly",        platform: "instagram", market: "calgary", marketLabel: "Calgary", region: "Alberta", followers: 54300, baseRate: 331, storyRate: 166, ocRate: 1331, talkingHeadRate: 731, categories: ALL_CATS },
  { handle: "@whatstheplancalgary", subNetwork: "whats_the_plan", platform: "instagram", market: "calgary", marketLabel: "Calgary", region: "Alberta", followers: 19200, baseRate: 327, storyRate: 163, ocRate: 1327, talkingHeadRate: 727, categories: LIFESTYLE_CATS },
  { handle: "@waveroomcalgary",     subNetwork: "waveroom",       platform: "instagram", market: "calgary", marketLabel: "Calgary", region: "Alberta", followers:  9967, baseRate: 169, storyRate:  84, ocRate: 1169, talkingHeadRate: 569, categories: FOOD_CATS },
  { handle: "@mustbecalgary",       subNetwork: "must_be",        platform: "instagram", market: "calgary", marketLabel: "Calgary", region: "Alberta", followers: 18000, baseRate: 237, storyRate: 119, ocRate: 1237, talkingHeadRate: 637, categories: FOOD_CATS },
  { handle: "@bites.calgary",       subNetwork: "bites",          platform: "instagram", market: "calgary", marketLabel: "Calgary", region: "Alberta", followers: 10000, baseRate: 100, storyRate:  50, ocRate: 1100, talkingHeadRate: 500, categories: FOOD_CATS },

  // ─── EDMONTON ────────────────────────────────────────────────────────────
  { handle: "@northlyedmonton",  subNetwork: "northly",  platform: "instagram", market: "edmonton", marketLabel: "Edmonton", region: "Alberta", followers: 64700, baseRate: 430, storyRate: 215, ocRate: 1430, talkingHeadRate: 830, categories: ALL_CATS },
  { handle: "@mustbeedmonton",   subNetwork: "must_be",  platform: "instagram", market: "edmonton", marketLabel: "Edmonton", region: "Alberta", followers:  7241, baseRate: 169, storyRate:  85, ocRate: 1169, talkingHeadRate: 569, categories: FOOD_CATS },
  { handle: "@edmontongotdeals", subNetwork: "got_deals",platform: "instagram", market: "edmonton", marketLabel: "Edmonton", region: "Alberta", followers: 12300, baseRate: 122, storyRate:  61, ocRate: 1122, talkingHeadRate: 522, categories: RETAIL_CATS },
  { handle: "@waveroomedmonton", subNetwork: "waveroom", platform: "instagram", market: "edmonton", marketLabel: "Edmonton", region: "Alberta", followers: 17300, baseRate: 219, storyRate: 109, ocRate: 1219, talkingHeadRate: 619, categories: FOOD_CATS },

  // ─── WINNIPEG ────────────────────────────────────────────────────────────
  { handle: "@northlywinnipeg",  subNetwork: "northly",  platform: "instagram", market: "winnipeg", marketLabel: "Winnipeg", region: "Manitoba", followers: 55300, baseRate: 364, storyRate: 182, ocRate: 1364, talkingHeadRate: 764, categories: ALL_CATS },
  { handle: "@waveroomwinnipeg", subNetwork: "waveroom", platform: "instagram", market: "winnipeg", marketLabel: "Winnipeg", region: "Manitoba", followers:   690, baseRate: 100, storyRate:  50, ocRate: 1100, talkingHeadRate: 500, categories: FOOD_CATS },

  // ─── SASKATOON ───────────────────────────────────────────────────────────
  { handle: "@northlysaskatoon", subNetwork: "northly", platform: "instagram", market: "saskatoon", marketLabel: "Saskatoon", region: "Saskatchewan", followers: 49200, baseRate: 312, storyRate: 156, ocRate: 1312, talkingHeadRate: 712, categories: ALL_CATS },

  // ─── HALIFAX ─────────────────────────────────────────────────────────────
  { handle: "@northlyhalifax", subNetwork: "northly", platform: "instagram", market: "halifax", marketLabel: "Halifax", region: "Nova Scotia", followers: 56900, baseRate: 405, storyRate: 203, ocRate: 1405, talkingHeadRate: 805, categories: ALL_CATS },
];

export const ACCOUNTS_SEED: AccountSeed[] = RAW.map((r) => ({
  ...r,
  avgImpressions: estimateImpressions(r.followers, r.platform),
  pricingStatus: r.pricingStatus ?? "active",
}));

export const MARKETS = [
  { key: "toronto",    label: "Toronto" },
  { key: "brampton",   label: "Brampton" },
  { key: "mississauga",label: "Mississauga" },
  { key: "durham",     label: "Durham" },
  { key: "york_region",label: "York Region" },
  { key: "hamilton",   label: "Hamilton" },
  { key: "ottawa",     label: "Ottawa" },
  { key: "kitchener",  label: "Kitchener" },
  { key: "london",     label: "London ON" },
  { key: "windsor",    label: "Windsor" },
  { key: "montreal",   label: "Montreal" },
  { key: "vancouver",  label: "Vancouver" },
  { key: "calgary",    label: "Calgary" },
  { key: "edmonton",   label: "Edmonton" },
  { key: "winnipeg",   label: "Winnipeg" },
  { key: "saskatoon",  label: "Saskatoon" },
  { key: "halifax",    label: "Halifax" },
  { key: "national",   label: "National" },
];

export const CITY_GROUPS = [
  { key: "toronto",   label: "Toronto",              markets: ["toronto"] },
  { key: "gta",       label: "GTA / Suburbs",        markets: ["brampton", "mississauga", "durham", "york_region"] },
  { key: "hamilton",  label: "Hamilton",             markets: ["hamilton"] },
  { key: "ottawa",    label: "Ottawa",               markets: ["ottawa"] },
  { key: "kitchener", label: "Kitchener / Waterloo", markets: ["kitchener"] },
  { key: "london",    label: "London ON",            markets: ["london"] },
  { key: "windsor",   label: "Windsor",              markets: ["windsor"] },
  { key: "montreal",  label: "Montreal",             markets: ["montreal"] },
  { key: "vancouver", label: "Vancouver",            markets: ["vancouver"] },
  { key: "calgary",   label: "Calgary",              markets: ["calgary"] },
  { key: "edmonton",  label: "Edmonton",             markets: ["edmonton"] },
  { key: "winnipeg",  label: "Winnipeg",             markets: ["winnipeg"] },
  { key: "saskatoon", label: "Saskatoon",            markets: ["saskatoon"] },
  { key: "halifax",   label: "Halifax",              markets: ["halifax"] },
  { key: "national",  label: "National Rollout",     markets: ["national"] },
];

export const CATEGORY_OPTIONS: { value: BusinessCategory; label: string }[] = [
  { value: "restaurant",  label: "Restaurant / Food" },
  { value: "bar",         label: "Bar / Nightlife" },
  { value: "beauty",      label: "Beauty / Med Spa / Salon" },
  { value: "service",     label: "Local Service" },
  { value: "retail",      label: "Retail / Store" },
  { value: "event_space", label: "Event / Venue / Experience" },
  { value: "app",         label: "App / Digital Product" },
  { value: "ecommerce",   label: "E-commerce" },
  { value: "gifting",     label: "Gifting / Family / Female-led occasions" },
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
