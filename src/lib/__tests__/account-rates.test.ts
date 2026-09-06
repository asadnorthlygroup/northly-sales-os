import {
  collaboratorRateFromFeed,
  isOnRateCard,
  placementRate,
  unpricedHandles,
  resolveAccountRates,
  type RatedAccount,
} from "@/lib/account-rates";
import { ACCOUNTS_SEED } from "@/lib/accounts-seed";
import { pageByHandle, RATE_CARD_PAGES } from "@/lib/rate-card-2026";

const account = (overrides: Partial<RatedAccount> = {}): RatedAccount => ({
  handle: "@notonthecard",
  baseRate: 800,
  storyRate: 400,
  gaRate: 960,
  ocRate: 1800,
  talkingHeadRate: 1200,
  ...overrides,
});

describe("resolveAccountRates", () => {
  it("takes feed, collaborator and original content from the card when the page is on it", () => {
    const rates = resolveAccountRates(account({ handle: "@northlywindsor" }));
    const card = pageByHandle("@northlywindsor")!;

    expect(rates.source).toBe("rate_card_2026");
    expect(rates.feed).toBe(card.feed);
    expect(rates.collaborator).toBe(card.collaborator);
    expect(rates.originalContent).toBe(card.originalContent);
  });

  it("keeps story, giveaway feed and talking head from the seed, which the card does not price", () => {
    const seeded = account({ handle: "@northlywindsor", storyRate: 111, gaRate: 222, talkingHeadRate: 333 });
    const rates = resolveAccountRates(seeded);

    expect(rates.story).toBe(111);
    expect(rates.giveawayFeed).toBe(222);
    expect(rates.talkingHead).toBe(333);
  });

  it("falls back to the seed for a page absent from the card", () => {
    const rates = resolveAccountRates(account());
    expect(rates.source).toBe("legacy_seed");
    expect(rates.feed).toBe(800);
    expect(rates.originalContent).toBe(1800);
  });

  it("applies the card's collaborator rule even to pages not on the card", () => {
    expect(resolveAccountRates(account({ baseRate: 800 })).collaborator).toBe(400);
  });

  it("resolves every card page to its card price", () => {
    for (const page of RATE_CARD_PAGES) {
      const rates = resolveAccountRates(account({ handle: page.handle, baseRate: 1 }));
      expect({ handle: page.handle, feed: rates.feed }).toEqual({
        handle: page.handle,
        feed: page.feed,
      });
    }
  });
});

describe("placementRate", () => {
  it("halves the rate for a collaborator placement", () => {
    const acc = account({ handle: "@waverooom" });
    expect(placementRate(acc, false)).toBe(1750);
    expect(placementRate(acc, true)).toBe(875);
  });

  it("is the change that matters: collaborators used to quote at the full feed rate", () => {
    // collaboratorAdjustMode defaulted to "none", so a collaborator was billed
    // 100% of the dedicated rate. The card says 50%.
    const acc = account({ handle: "@waverooom" });
    expect(placementRate(acc, true)).toBe(placementRate(acc, false) / 2);
  });
});

describe("collaboratorRateFromFeed", () => {
  it("halves the feed rate", () => {
    expect(collaboratorRateFromFeed(1750)).toBe(875);
    expect(collaboratorRateFromFeed(0)).toBe(0);
  });
});

describe("coverage of the existing account seed", () => {
  it("reports which seeded accounts the 2026 card governs", () => {
    const covered = ACCOUNTS_SEED.filter((a) => isOnRateCard(a.handle));
    // Documents reality rather than asserting a wish: any seeded page missing
    // from the card still quotes at its legacy rate.
    expect(covered.length).toBeGreaterThan(0);
    expect(covered.length).toBeLessThanOrEqual(ACCOUNTS_SEED.length);
  });

  it("never returns a negative or non-finite rate for any seeded account", () => {
    for (const seed of ACCOUNTS_SEED) {
      const rates = resolveAccountRates(seed);
      for (const value of [rates.feed, rates.collaborator, rates.originalContent]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("unpriced pages", () => {
  it("marks a page the card prices at $0 as not sellable", () => {
    // @mustbevan sits in the card's 0-10,000 follower tier, feed rate $0.
    const rates = resolveAccountRates(account({ handle: "@mustbevan", baseRate: 172 }));
    expect(rates.source).toBe("rate_card_2026");
    expect(rates.feed).toBe(0);
    expect(rates.sellable).toBe(false);
  });

  it("marks a normally priced card page as sellable", () => {
    expect(resolveAccountRates(account({ handle: "@waverooom" })).sellable).toBe(true);
  });

  it("names every seeded account the card would quote for free", () => {
    const unpriced = unpricedHandles(ACCOUNTS_SEED);
    expect(unpriced).toEqual(
      expect.arrayContaining(["@mustbevan", "@mustbehamilton", "@montrealhousingwatch"])
    );
  });

  it("keeps a page sellable when it is absent from the card but priced in the seed", () => {
    expect(resolveAccountRates(account({ handle: "@notonthecard", baseRate: 800 })).sellable).toBe(true);
  });
});
