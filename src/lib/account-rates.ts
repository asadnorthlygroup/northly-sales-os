/**
 * Northly Group — Account Rate Resolution
 *
 * Decides which price an account actually quotes at.
 *
 * The 2026 rate card is the source of truth for the three formats it prices:
 * feed post, collaborator and original content. Anything the card does not
 * price — story, giveaway feed, talking head — keeps its existing value, so
 * no format an AE can quote today disappears.
 *
 * Pages absent from the card fall back to their seed rates, with the card's
 * collaborator rule (half the feed rate) applied so collaborator pricing is
 * consistent network-wide.
 */

import { pageByHandle } from "./rate-card-2026";

export type RateSource = "rate_card_2026" | "legacy_seed";

/** The subset of an account this module needs. Keeps the seed shape at arm's length. */
export interface RatedAccount {
  handle: string;
  /** BA Feed Post (Dedicated) rate from the legacy seed. */
  baseRate: number;
  storyRate: number;
  gaRate: number;
  ocRate: number;
  talkingHeadRate: number;
}

export interface ResolvedAccountRates {
  source: RateSource;
  feed: number;
  collaborator: number;
  originalContent: number;
  story: number;
  giveawayFeed: number;
  talkingHead: number;
  /**
   * False when the resolved feed rate is zero. The card's 0-10,000 follower
   * tier prices a feed post at $0, which is a data gap rather than a decision
   * to work for free. Quoting must refuse these rather than emit a $0 line.
   */
  sellable: boolean;
}

/** Collaborator placements are half the feed rate, per the 2026 card. */
export const COLLABORATOR_SHARE = 0.5;

export function collaboratorRateFromFeed(feed: number): number {
  return feed * COLLABORATOR_SHARE;
}

/**
 * Resolves every rate for an account, preferring the 2026 card where it
 * prices the format.
 */
export function resolveAccountRates(account: RatedAccount): ResolvedAccountRates {
  const card = pageByHandle(account.handle);

  if (card) {
    return {
      source: "rate_card_2026",
      feed: card.feed,
      collaborator: card.collaborator,
      originalContent: card.originalContent,
      story: account.storyRate,
      giveawayFeed: account.gaRate,
      talkingHead: account.talkingHeadRate,
      sellable: card.feed > 0,
    };
  }

  return {
    source: "legacy_seed",
    feed: account.baseRate,
    collaborator: collaboratorRateFromFeed(account.baseRate),
    originalContent: account.ocRate,
    story: account.storyRate,
    giveawayFeed: account.gaRate,
    talkingHead: account.talkingHeadRate,
    sellable: account.baseRate > 0,
  };
}

/** Handles the card leaves at $0, which must not be quoted as free placements. */
export function unpricedHandles(accounts: readonly RatedAccount[]): string[] {
  return accounts.filter((a) => !resolveAccountRates(a).sellable).map((a) => a.handle);
}

/**
 * The rate a placement quotes at, before markup and any AE adjustment.
 * A collaborator placement is half a dedicated feed placement.
 */
export function placementRate(account: RatedAccount, isCollaborator: boolean): number {
  const rates = resolveAccountRates(account);
  return isCollaborator ? rates.collaborator : rates.feed;
}

/** True when the 2026 card governs this handle. Useful for surfacing provenance in the UI. */
export function isOnRateCard(handle: string): boolean {
  return pageByHandle(handle) !== undefined;
}
