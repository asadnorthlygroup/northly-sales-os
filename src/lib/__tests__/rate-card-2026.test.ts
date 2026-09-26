import {
  ORIGINAL_CONTENT_UPLIFT,
  pageByHandle,
  RATE_CARD_PAGES,
  RATE_TIERS,
  tierForFollowers,
} from "@/lib/rate-card-2026";

describe("rate tiers", () => {
  it("covers 14 tiers from zero to open-ended", () => {
    expect(RATE_TIERS).toHaveLength(14);
    expect(RATE_TIERS[0].lowerBound).toBe(0);
    expect(RATE_TIERS[RATE_TIERS.length - 1].upperBound).toBeNull();
  });

  it("leaves no gap or overlap between consecutive tiers", () => {
    for (let i = 1; i < RATE_TIERS.length; i += 1) {
      expect(RATE_TIERS[i].lowerBound).toBe(RATE_TIERS[i - 1].upperBound! + 1);
    }
  });

  it("increases the feed rate monotonically as followers rise", () => {
    for (let i = 1; i < RATE_TIERS.length; i += 1) {
      expect(RATE_TIERS[i].feed).toBeGreaterThan(RATE_TIERS[i - 1].feed);
    }
  });

  it("prices collaborator at half the feed rate in every tier", () => {
    for (const tier of RATE_TIERS) {
      expect(tier.collaborator).toBe(tier.feed / 2);
    }
  });

  it("prices original content at the feed rate plus the uplift in every tier", () => {
    for (const tier of RATE_TIERS) {
      expect(tier.originalContent).toBe(tier.feed + ORIGINAL_CONTENT_UPLIFT);
    }
  });
});

describe("tierForFollowers", () => {
  it("places a page at its exact lower and upper bounds", () => {
    expect(tierForFollowers(10_001).feed).toBe(300);
    expect(tierForFollowers(25_000).feed).toBe(300);
  });

  it("prices the smallest pages at zero for feed but still charges for original content", () => {
    const tier = tierForFollowers(0);
    expect(tier.feed).toBe(0);
    expect(tier.collaborator).toBe(0);
    expect(tier.originalContent).toBe(650);
  });

  it("puts anything above 300,000 in the open-ended top tier", () => {
    expect(tierForFollowers(300_001).feed).toBe(1750);
    expect(tierForFollowers(5_000_000).feed).toBe(1750);
  });

  it("rejects a negative follower count", () => {
    expect(() => tierForFollowers(-1)).toThrow(/zero or more/);
  });
});

describe("rate card pages", () => {
  it("carries 74 pages after collapsing the multi-market duplicate", () => {
    expect(RATE_CARD_PAGES).toHaveLength(74);
  });

  it("has no duplicate handles", () => {
    const handles = RATE_CARD_PAGES.map((p) => p.handle.toLowerCase());
    expect(new Set(handles).size).toBe(handles.length);
  });

  it("prices every page consistently with its own follower tier", () => {
    for (const page of RATE_CARD_PAGES) {
      const tier = tierForFollowers(page.followers);
      expect({ handle: page.handle, feed: page.feed }).toEqual({
        handle: page.handle,
        feed: tier.feed,
      });
    }
  });

  it("obeys the card rules on every page", () => {
    for (const page of RATE_CARD_PAGES) {
      expect(page.collaborator).toBe(page.feed / 2);
      expect(page.originalContent).toBe(page.feed + ORIGINAL_CONTENT_UPLIFT);
    }
  });

  it("prices the pages that appear on issued agreements", () => {
    // @northlywindsor and @northlyottawa both appear on the Oakberry deal.
    expect(pageByHandle("@northlywindsor")).toBeDefined();
    expect(pageByHandle("@northlyottawa")).toBeDefined();
    expect(pageByHandle("@waverooom")!.feed).toBe(1750);
  });

  it("looks handles up case-insensitively and ignores padding", () => {
    expect(pageByHandle("  @NorthlyWindsor ")?.handle).toBe("@northlywindsor");
  });

  it("returns undefined for a handle that is not on the card", () => {
    expect(pageByHandle("@notarealpage")).toBeUndefined();
  });
});

describe("multi-market pages", () => {
  it("lists @waverooom once, serving both National and Ontario", () => {
    // The sheet has it on two rows with follower counts 400 apart. Two rows
    // would let one campaign sell the same page twice.
    const page = pageByHandle("@waverooom")!;
    expect(page.markets).toEqual(
      expect.arrayContaining(["National - Canada", "Ontario"])
    );
    expect(page.followers).toBe(636_400);
  });

  it("gives every page at least one market", () => {
    for (const page of RATE_CARD_PAGES) {
      expect(page.markets.length).toBeGreaterThan(0);
    }
  });

  it("counts each page's followers only once across the network", () => {
    const total = RATE_CARD_PAGES.reduce((sum, p) => sum + p.followers, 0);
    expect(total).toBe(5_363_861);
  });
});
