/**
 * Northly Group — 2026 Rate Card
 *
 * GENERATED FILE. Do not edit by hand.
 * Regenerate with: node scripts/generate-rate-card.js "<path to rate card .xlsm>"
 *
 * Feed, collaborator and original content prices come from this card, which is
 * the source of truth. Story, carousel, GA feed and talking head are still
 * computed by lib/pricing.ts, because the card does not price them.
 *
 * Card rules, verified at generation time for all 74 pages
 * (deduplicated from 75 sheet rows):
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

export const RATE_TIERS: readonly RateTier[] = [
  {
    "lowerBound": 0,
    "upperBound": 10000,
    "label": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "lowerBound": 10001,
    "upperBound": 25000,
    "label": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "lowerBound": 25001,
    "upperBound": 50000,
    "label": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "lowerBound": 50001,
    "upperBound": 75000,
    "label": "50,000-75,000",
    "feed": 650,
    "collaborator": 325,
    "originalContent": 1300
  },
  {
    "lowerBound": 75001,
    "upperBound": 100000,
    "label": "75,000-100,000",
    "feed": 750,
    "collaborator": 375,
    "originalContent": 1400
  },
  {
    "lowerBound": 100001,
    "upperBound": 125000,
    "label": "100,000-125,000",
    "feed": 850,
    "collaborator": 425,
    "originalContent": 1500
  },
  {
    "lowerBound": 125001,
    "upperBound": 150000,
    "label": "125,000-150,000",
    "feed": 950,
    "collaborator": 475,
    "originalContent": 1600
  },
  {
    "lowerBound": 150001,
    "upperBound": 175000,
    "label": "150,000-175,000",
    "feed": 1050,
    "collaborator": 525,
    "originalContent": 1700
  },
  {
    "lowerBound": 175001,
    "upperBound": 200000,
    "label": "175,000-200,000",
    "feed": 1150,
    "collaborator": 575,
    "originalContent": 1800
  },
  {
    "lowerBound": 200001,
    "upperBound": 225000,
    "label": "200,000-225,000",
    "feed": 1250,
    "collaborator": 625,
    "originalContent": 1900
  },
  {
    "lowerBound": 225001,
    "upperBound": 250000,
    "label": "225,000-250,000",
    "feed": 1350,
    "collaborator": 675,
    "originalContent": 2000
  },
  {
    "lowerBound": 250001,
    "upperBound": 275000,
    "label": "250,000-275,000",
    "feed": 1450,
    "collaborator": 725,
    "originalContent": 2100
  },
  {
    "lowerBound": 275001,
    "upperBound": 300000,
    "label": "275,000-300,000",
    "feed": 1550,
    "collaborator": 775,
    "originalContent": 2200
  },
  {
    "lowerBound": 300001,
    "upperBound": null,
    "label": "300K+",
    "feed": 1750,
    "collaborator": 875,
    "originalContent": 2400
  }
];

export const RATE_CARD_PAGES: readonly RateCardPage[] = [
  {
    "markets": [
      "Alberta"
    ],
    "network": "Northly",
    "handle": "@northlycalgary",
    "followers": 75800,
    "tierLabel": "75,000-100,000",
    "feed": 750,
    "collaborator": 375,
    "originalContent": 1400
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Northly",
    "handle": "@northlyedmonton",
    "followers": 72600,
    "tierLabel": "50,000-75,000",
    "feed": 650,
    "collaborator": 325,
    "originalContent": 1300
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Waveroom",
    "handle": "@waveroomedmonton",
    "followers": 54600,
    "tierLabel": "50,000-75,000",
    "feed": 650,
    "collaborator": 325,
    "originalContent": 1300
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Must Be",
    "handle": "@mustbeedmonton",
    "followers": 42000,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Must Be",
    "handle": "@mustbecalgary",
    "followers": 34800,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Waveroom",
    "handle": "@waveroomcalgary",
    "followers": 24967,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Girl Plans",
    "handle": "@girlplanscalgary",
    "followers": 21600,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Got Deals",
    "handle": "@edmontongotdeals",
    "followers": 12600,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Bites",
    "handle": "@bites.calgary",
    "followers": 10100,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Girl Plans",
    "handle": "@girlplansedmonton",
    "followers": 3170,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Bites",
    "handle": "@bitesedmonton",
    "followers": 2062,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Alberta"
    ],
    "network": "Got Deals",
    "handle": "@calgarygotdeals",
    "followers": 1635,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "British Columbia"
    ],
    "network": "Waveroom",
    "handle": "@waveroomvancouver",
    "followers": 185300,
    "tierLabel": "175,000-200,000",
    "feed": 1150,
    "collaborator": 575,
    "originalContent": 1800
  },
  {
    "markets": [
      "British Columbia"
    ],
    "network": "Northly",
    "handle": "@northlyvancouver",
    "followers": 181200,
    "tierLabel": "175,000-200,000",
    "feed": 1150,
    "collaborator": 575,
    "originalContent": 1800
  },
  {
    "markets": [
      "British Columbia"
    ],
    "network": "Girl Plans",
    "handle": "@girlplansvancouver",
    "followers": 42600,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "British Columbia"
    ],
    "network": "NightOut",
    "handle": "@nightoutvancouver",
    "followers": 33200,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "British Columbia"
    ],
    "network": "Bites",
    "handle": "@bitesvancouver",
    "followers": 23400,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "British Columbia"
    ],
    "network": "Must Be",
    "handle": "@mustbevancouver",
    "followers": 11000,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "British Columbia"
    ],
    "network": "Must Be",
    "handle": "@mustbevan",
    "followers": 9341,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "British Columbia"
    ],
    "network": "Got Deals",
    "handle": "@vancouvergotdeals",
    "followers": 1879,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "British Columbia"
    ],
    "network": "Housing Watch",
    "handle": "@vancouverhousingwatch",
    "followers": 1104,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Manitoba"
    ],
    "network": "Northly",
    "handle": "@northlywinnipeg",
    "followers": 196000,
    "tierLabel": "175,000-200,000",
    "feed": 1150,
    "collaborator": 575,
    "originalContent": 1800
  },
  {
    "markets": [
      "Manitoba"
    ],
    "network": "Other",
    "handle": "@waverooomwinnipeg",
    "followers": 29400,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "National - Canada",
      "Ontario"
    ],
    "network": "Other",
    "handle": "@waverooom",
    "followers": 636400,
    "tierLabel": "300K+",
    "feed": 1750,
    "collaborator": 875,
    "originalContent": 2400
  },
  {
    "markets": [
      "National - Canada"
    ],
    "network": "Northly",
    "handle": "@northlycanada",
    "followers": 266000,
    "tierLabel": "250,000-275,000",
    "feed": 1450,
    "collaborator": 725,
    "originalContent": 2100
  },
  {
    "markets": [
      "National - Canada"
    ],
    "network": "Bites",
    "handle": "@bitescanada",
    "followers": 236000,
    "tierLabel": "225,000-250,000",
    "feed": 1350,
    "collaborator": 675,
    "originalContent": 2000
  },
  {
    "markets": [
      "National - Canada"
    ],
    "network": "Must Be",
    "handle": "@mustbecanada",
    "followers": 110800,
    "tierLabel": "100,000-125,000",
    "feed": 850,
    "collaborator": 425,
    "originalContent": 1500
  },
  {
    "markets": [
      "National - Canada"
    ],
    "network": "Other",
    "handle": "@Canadablog",
    "followers": 96400,
    "tierLabel": "75,000-100,000",
    "feed": 750,
    "collaborator": 375,
    "originalContent": 1400
  },
  {
    "markets": [
      "National - Canada"
    ],
    "network": "Got Deals",
    "handle": "@canadagotdeals",
    "followers": 53577,
    "tierLabel": "50,000-75,000",
    "feed": 650,
    "collaborator": 325,
    "originalContent": 1300
  },
  {
    "markets": [
      "Nova Scotia"
    ],
    "network": "Northly",
    "handle": "@northlyhalifax",
    "followers": 73700,
    "tierLabel": "50,000-75,000",
    "feed": 650,
    "collaborator": 325,
    "originalContent": 1300
  },
  {
    "markets": [
      "Nova Scotia"
    ],
    "network": "Must Be",
    "handle": "@mustbehalifax",
    "followers": 3978,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Nova Scotia"
    ],
    "network": "NightOut",
    "handle": "@nightouthalifax",
    "followers": 1427,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Nova Scotia"
    ],
    "network": "Girl Plans",
    "handle": "@girlplanshalifax",
    "followers": 1391,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Nova Scotia"
    ],
    "network": "Bites",
    "handle": "@biteshalifax",
    "followers": 1321,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Nova Scotia"
    ],
    "network": "Waveroom",
    "handle": "@waveroomhalifax",
    "followers": 1065,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlytoronto",
    "followers": 309000,
    "tierLabel": "300K+",
    "feed": 1750,
    "collaborator": 875,
    "originalContent": 2400
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Waveroom",
    "handle": "@waveroom.toronto",
    "followers": 281000,
    "tierLabel": "275,000-300,000",
    "feed": 1550,
    "collaborator": 775,
    "originalContent": 2200
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlyhamilton",
    "followers": 199100,
    "tierLabel": "175,000-200,000",
    "feed": 1150,
    "collaborator": 575,
    "originalContent": 1800
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlybrampton",
    "followers": 169700,
    "tierLabel": "150,000-175,000",
    "feed": 1050,
    "collaborator": 525,
    "originalContent": 1700
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "NightOut",
    "handle": "@nightouttoronto",
    "followers": 167000,
    "tierLabel": "150,000-175,000",
    "feed": 1050,
    "collaborator": 525,
    "originalContent": 1700
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Must Be",
    "handle": "@mustbetoronto",
    "followers": 157000,
    "tierLabel": "150,000-175,000",
    "feed": 1050,
    "collaborator": 525,
    "originalContent": 1700
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlyottawa",
    "followers": 128800,
    "tierLabel": "125,000-150,000",
    "feed": 950,
    "collaborator": 475,
    "originalContent": 1600
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Girl Plans",
    "handle": "@girlplanstoronto",
    "followers": 113400,
    "tierLabel": "100,000-125,000",
    "feed": 850,
    "collaborator": 425,
    "originalContent": 1500
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlydurham",
    "followers": 104700,
    "tierLabel": "100,000-125,000",
    "feed": 850,
    "collaborator": 425,
    "originalContent": 1500
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Bites",
    "handle": "@bites.toronto",
    "followers": 96400,
    "tierLabel": "75,000-100,000",
    "feed": 750,
    "collaborator": 375,
    "originalContent": 1400
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlylondon",
    "followers": 86200,
    "tierLabel": "75,000-100,000",
    "feed": 750,
    "collaborator": 375,
    "originalContent": 1400
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Got Deals",
    "handle": "@torontogotdeals",
    "followers": 61500,
    "tierLabel": "50,000-75,000",
    "feed": 650,
    "collaborator": 325,
    "originalContent": 1300
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Girl Plans",
    "handle": "@girlplansottawa_",
    "followers": 57200,
    "tierLabel": "50,000-75,000",
    "feed": 650,
    "collaborator": 325,
    "originalContent": 1300
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlykitchener",
    "followers": 57100,
    "tierLabel": "50,000-75,000",
    "feed": 650,
    "collaborator": 325,
    "originalContent": 1300
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlywindsor",
    "followers": 55300,
    "tierLabel": "50,000-75,000",
    "feed": 650,
    "collaborator": 325,
    "originalContent": 1300
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Other",
    "handle": "@torontoclip",
    "followers": 54700,
    "tierLabel": "50,000-75,000",
    "feed": 650,
    "collaborator": 325,
    "originalContent": 1300
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Housing Watch",
    "handle": "@torontohousingwatch",
    "followers": 41900,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Girl Plans",
    "handle": "@girlplanshamilton",
    "followers": 41600,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Waveroom",
    "handle": "@waveroommississauga",
    "followers": 34400,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Other",
    "handle": "@torontosight",
    "followers": 28800,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Waveroom",
    "handle": "@waveroom.brampton",
    "followers": 26300,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Waveroom",
    "handle": "@waveroomottawa",
    "followers": 24950,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlymississauga",
    "followers": 18300,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Waveroom",
    "handle": "@waveroomhamilton",
    "followers": 18025,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Housing Watch",
    "handle": "@ontariohousingwatch",
    "followers": 13800,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlyyorkregion",
    "followers": 12100,
    "tierLabel": "10,000-25,000",
    "feed": 300,
    "collaborator": 150,
    "originalContent": 950
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Bites",
    "handle": "@biteshamilton",
    "followers": 7026,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Must Be",
    "handle": "@mustbehamilton",
    "followers": 5095,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Girl Plans",
    "handle": "@girlplansmississauga",
    "followers": 1364,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Bites",
    "handle": "@biteslondon_",
    "followers": 1081,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Ontario"
    ],
    "network": "Northly",
    "handle": "@northlyniagara",
    "followers": 163,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Quebec"
    ],
    "network": "Northly",
    "handle": "@northlymontreal",
    "followers": 157800,
    "tierLabel": "150,000-175,000",
    "feed": 1050,
    "collaborator": 525,
    "originalContent": 1700
  },
  {
    "markets": [
      "Quebec"
    ],
    "network": "Waveroom",
    "handle": "@waveroommontreal",
    "followers": 114300,
    "tierLabel": "100,000-125,000",
    "feed": 850,
    "collaborator": 425,
    "originalContent": 1500
  },
  {
    "markets": [
      "Quebec"
    ],
    "network": "Girl Plans",
    "handle": "@girlplansmontreal",
    "followers": 35200,
    "tierLabel": "25,000-50,000",
    "feed": 500,
    "collaborator": 250,
    "originalContent": 1150
  },
  {
    "markets": [
      "Quebec"
    ],
    "network": "Housing Watch",
    "handle": "@montrealhousingwatch",
    "followers": 5866,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Quebec"
    ],
    "network": "Must Be",
    "handle": "@mustbemontreal",
    "followers": 2470,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Quebec"
    ],
    "network": "Bites",
    "handle": "@bitesmontreal",
    "followers": 1075,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  },
  {
    "markets": [
      "Saskatchewan"
    ],
    "network": "Northly",
    "handle": "@northlysaskatoon",
    "followers": 120400,
    "tierLabel": "100,000-125,000",
    "feed": 850,
    "collaborator": 425,
    "originalContent": 1500
  },
  {
    "markets": [
      "Saskatchewan"
    ],
    "network": "Must Be",
    "handle": "@mustbesaskatoon",
    "followers": 1329,
    "tierLabel": "0-10,000",
    "feed": 0,
    "collaborator": 0,
    "originalContent": 650
  }
];

/** Resolves the tier a follower count falls into. Throws on a negative count. */
export function tierForFollowers(followers: number): RateTier {
  if (!Number.isFinite(followers) || followers < 0) {
    throw new Error(`Follower count must be zero or more, got ${followers}.`);
  }
  const tier = RATE_TIERS.find(
    (t) => followers >= t.lowerBound && (t.upperBound === null || followers <= t.upperBound)
  );
  if (!tier) {
    throw new Error(`No rate tier covers a follower count of ${followers}.`);
  }
  return tier;
}

/** Looks up a page by handle, case-insensitively. Returns undefined if absent. */
export function pageByHandle(handle: string): RateCardPage | undefined {
  const needle = handle.trim().toLowerCase();
  return RATE_CARD_PAGES.find((p) => p.handle.toLowerCase() === needle);
}
