import { describe, expect, it } from 'vitest';

import { BOTS } from './botStyles';
import { BUBBLE_STYLES } from './bubbles';
import { CARD_PACKS } from './cardPacks';
import { botsNeedPremium, FREE_BOT_NAMES, freeThisWeek, freeWeekEnds, gamesNeedPremium, isFreeBot, premiumBubble, premiumPack, rangeSetNeedsPremium, withoutPremiumLook } from './premiumGate';
import { VARIANTS } from './variants';

describe('Premium gate', () => {
  it('knows which looks cost', () => {
    expect(premiumBubble('green')).toBe(false);
    expect(premiumBubble(undefined)).toBe(false);
    expect(premiumBubble('galaxy')).toBe(true);
    expect(CARD_PACKS.filter((p) => !p.venue).every((p) => premiumPack(p.id))).toBe(true);
    expect(CARD_PACKS.filter((p) => p.venue).some((p) => premiumPack(p.id))).toBe(false);
    expect(BUBBLE_STYLES.filter((b) => !b.free).every((b) => premiumBubble(b.id))).toBe(true);
  });

  it('takes only the Premium parts out of a look', () => {
    const base = { type: 'setLook', name: 'Ann', emoji: '🙂' } as const;
    expect(withoutPremiumLook({ ...base, bubble: 'galaxy', cardPack: 'gold' })).toEqual(base);
    expect(withoutPremiumLook({ ...base, bubble: 'green' })).toEqual({ ...base, bubble: 'green' });
    expect(withoutPremiumLook({ type: 'next', hand: 1 })).toEqual({ type: 'next', hand: 1 });
  });

  it("asks for Premium for every game but Texas Hold'em", () => {
    const now = Date.UTC(2026, 10, 11);
    const paid = VARIANTS.slice(1).find((v) => v.id !== freeThisWeek(now))!.id;
    expect(gamesNeedPremium([VARIANTS[0].id], now)).toBe(false);
    expect(gamesNeedPremium([paid], now)).toBe(true);
    expect(gamesNeedPremium([VARIANTS[0].id, paid], now)).toBe(true);
    // This week's free game can be hosted without Premium; in a party with another Premium game it still needs it.
    expect(gamesNeedPremium([freeThisWeek(now)], now)).toBe(false);
    expect(gamesNeedPremium([freeThisWeek(now), paid], now)).toBe(true);
  });

  it('keeps free tables to the free bots', () => {
    expect(FREE_BOT_NAMES).toHaveLength(10);
    expect(new Set(FREE_BOT_NAMES.map((n) => BOTS.find((b) => b.name === n)?.style)).size).toBe(10);
    expect(isFreeBot('Kai')).toBe(true);
    expect(isFreeBot('Rex')).toBe(false);
    expect(botsNeedPremium(['Luna', 'Kai'])).toBe(false);
    expect(botsNeedPremium(['Luna', 'Rex'])).toBe(true);
  });

  it('gives a free player one daily range quiz and nothing else', () => {
    expect(rangeSetNeedsPremium(true)).toBe(false);
    expect(rangeSetNeedsPremium(false)).toBe(true);
  });
});

describe('free this week', () => {
  it('is a Premium game, changes on Monday at midnight UTC, and visits every Premium game in turn', () => {
    const monday = Date.UTC(2026, 10, 9);
    expect(freeThisWeek(monday)).toBe(freeThisWeek(monday + 6 * 86_400_000 + 86_399_000));
    expect(freeThisWeek(monday)).not.toBe(freeThisWeek(monday + 7 * 86_400_000));
    expect(freeWeekEnds(monday + 1000)).toBe(monday + 7 * 86_400_000);
    const paid = VARIANTS.slice(1).map((v) => v.id);
    const seen = new Set(paid.map((_, w) => freeThisWeek(monday + w * 7 * 86_400_000)));
    expect([...seen].sort()).toEqual([...paid].sort());
  });
});
