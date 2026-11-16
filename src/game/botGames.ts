// What the bots know about each game on top of the run-outs in botVariants.ts: how well a person remembers twenty cards
// for nine seconds (Memory Poker). Pure functions of what a bot at that seat can see; nothing here reads a hidden card.

import { hashString, seededRng, type Card } from './cards';

// ── Memory Poker ────────────────────────────────────────────────────────────

/**
 * The cards a bot still remembers from the twenty it was shown. A person doesn't keep all twenty: each bot recalls
 * between about three in four and nineteen in twenty of them, always the same ones for that bot and hand (so a decision
 * can be repeated), and a bot says "I think the king was out" about a card it kept.
 */
export function recalledRemoved(removed: Card[] | undefined, botId: string, handNo: number): Card[] {
  if (!removed?.length) return [];
  const sharp = 0.75 + (hashString(`memory:${botId}`) % 21) / 100;
  const rng = seededRng(hashString(`recall:${botId}:${handNo}`));
  return removed.filter(() => rng() < sharp);
}
