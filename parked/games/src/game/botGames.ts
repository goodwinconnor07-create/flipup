// What the bots know about each game on top of the run-outs in botVariants.ts: how to play when nobody can fold and the
// cards don't decide the pot (Imposter), how to chase a secret mission (Missions), how well a person remembers twenty cards
// for nine seconds (Memory Poker). Pure functions of what a bot at that seat can see; nothing here reads a hidden card.

import { hashString, rankOf, seededRng, suitOf, isRed, type Card } from './cards';
import type { Game, Hand, MissionId, Seat } from './types';

const AGGRESSIVE = ['bet', 'raise', 'allin'];

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

// ── Secret Missions ─────────────────────────────────────────────────────────

/** How a mission bends a bot's play: each is a pull, 0 (none) to 1 (as hard as it can). */
export interface MissionPull {
  /** Play more hands before the flop that fit the mission. */
  loose: number;
  /** Bet and bluff more. */
  bet: number;
  /** Call more. */
  call: number;
  /** Never bet or raise (Slow Roll). */
  noBet: boolean;
  /** Check with a good hand, then raise the bet (Trap Door). */
  trap: boolean;
  /** Put it all in with a good hand (Shove and Win). */
  shove: boolean;
}
const NONE: MissionPull = { loose: 0, bet: 0, call: 0, noBet: false, trap: false, shove: false };

const ranks = (cards: Card[]) => cards.map(rankOf).sort((a, b) => b - a);
const isPair = (c: Card[]) => c.length >= 2 && rankOf(c[0]) === rankOf(c[1]);
const connected = (c: Card[]) => {
  const [a, b] = ranks(c);
  return a - b === 1 || (a === 14 && b === 2);
};

/** Does the bot's starting hand suit its mission? (Only the missions that depend on the cards it holds.) */
function fits(mission: MissionId, cards: Card[]): boolean {
  if (cards.length < 2) return false;
  switch (mission) {
    case 'suited':
      return suitOf(cards[0]) === suitOf(cards[1]);
    case 'twins':
      return isPair(cards);
    case 'red':
      return isRed(cards[0]) && isRed(cards[1]);
    case 'royalty':
      return cards.some((c) => rankOf(c) >= 11 && rankOf(c) <= 13);
    case 'lucky7':
      return cards.some((c) => rankOf(c) === 7);
    case 'deuce':
      return cards.some((c) => rankOf(c) === 2);
    case 'connected':
      return connected(cards);
    case 'underdog':
      return ranks(cards)[0] <= 9;
    case 'monster':
      return connected(cards) || suitOf(cards[0]) === suitOf(cards[1]);
    case 'twopair':
      return ranks(cards)[0] >= 8 && !isPair(cards);
    default:
      return false;
  }
}

/**
 * What a bot's own mission asks of it this hand. The reward is paid by every other player, so a bot that holds one goes
 * after it (it's the biggest swing at the table). A bot only knows its own mission, which the table sends to its phone.
 */
export function missionPull(game: Game, hand: Hand, seat: Seat): MissionPull {
  const mission = game.missions?.players[seat.playerId]?.mission;
  if (!mission) return NONE;
  const street = hand.street;
  const late = hand.buttonId === seat.playerId;
  switch (mission) {
    case 'suited':
    case 'twins':
    case 'red':
    case 'royalty':
    case 'lucky7':
    case 'deuce':
    case 'connected':
    case 'underdog':
    case 'monster':
    case 'twopair':
      return fits(mission, seat.cards) ? { ...NONE, loose: 0.55, call: 0.2, bet: 0.1 } : NONE;
    case 'smallball':
      return { ...NONE, loose: 0.2, bet: 0.2, call: 0.1 };
    case 'silent':
      return { ...NONE, bet: street === 'preflop' ? 0 : 0.35, loose: 0.2 };
    case 'slowroll':
      return { ...NONE, noBet: true, call: 0.25, loose: 0.3 };
    case 'herocall':
      return { ...NONE, call: street === 'river' ? 0.5 : 0.2, loose: 0.2 };
    case 'pressure':
      return { ...NONE, bet: street === 'river' ? 0.5 : 0.25 };
    case 'biggame':
      return { ...NONE, bet: 0.25, call: 0.25 };
    case 'relentless':
    case 'bully':
      return { ...NONE, bet: 0.5 };
    case 'trapdoor':
      return { ...NONE, trap: street !== 'preflop', call: 0.1 };
    case 'shove':
      return { ...NONE, shove: street !== 'preflop', bet: 0.1 };
    case 'crowd':
    case 'riverrat':
      return { ...NONE, loose: 0.4, call: 0.3 };
    case 'button':
      return late ? { ...NONE, loose: 0.5, bet: 0.15 } : NONE;
    case 'defender':
      return hand.bbId === seat.playerId ? { ...NONE, loose: 0.5, call: 0.3 } : NONE;
    case 'steal':
      return late || hand.sbId === seat.playerId ? { ...NONE, loose: 0.5, bet: 0.3 } : NONE;
    case 'bluffmaster':
      return { ...NONE, bet: 0.4, call: 0.2 };
    case 'knockout':
      return { ...NONE, bet: 0.2, call: 0.2 };
    case 'chop':
      return { ...NONE, call: 0.2 };
    default:
      return NONE;
  }
}

// ── Imposter ────────────────────────────────────────────────────────────────

/** 0 for a check, 1 for a call, 2.5 for a bet or raise, 3 for all in. */
const actionClass = (move: string): number => (move === 'check' ? 0 : move === 'call' ? 1 : move === 'allin' ? 3 : AGGRESSIVE.includes(move) ? 2.5 : 0);

/**
 * How differently each player has acted from the rest of the table, street by street. Everyone who isn't the imposter holds
 * the same two cards, so they meet the same board with the same hand and should act alike; the imposter's different cards
 * make them act differently. A player who bets where everyone else checks (or checks where everyone bets) stands out.
 */
export function crowdDeviation(hand: Hand): Map<string, number> {
  const out = new Map<string, number>(hand.seats.map((s) => [s.playerId, 0]));
  const counts = new Map<string, number>();
  for (const street of ['preflop', 'flop', 'turn', 'river'] as const) {
    const moves = (hand.actions ?? []).filter((a) => a.street === street && !a.outOfTurn);
    // The strongest tell: everyone before checked, then someone bets. Players who hold the same cards read the board the
    // same way, so they check together or bet together; the one who bets into a string of checks is holding something
    // different (and the checkers each get a small share, in case it was one of them who was out of step).
    const first = moves.findIndex((a) => AGGRESSIVE.includes(a.move));
    if (street !== 'preflop' && first > 0 && moves.slice(0, first).every((a) => a.move === 'check')) {
      const checkers = new Set(moves.slice(0, first).map((a) => a.playerId));
      checkers.delete(moves[first].playerId);
      out.set(moves[first].playerId, (out.get(moves[first].playerId) ?? 0) + 1.5 * Math.min(4, checkers.size));
      for (const c of checkers) out.set(c, (out.get(c) ?? 0) + 0.25);
    }
    const per = new Map<string, number[]>();
    for (const a of moves) per.set(a.playerId, [...(per.get(a.playerId) ?? []), actionClass(a.move)]);
    if (per.size < 3) continue;
    const mean = new Map([...per].map(([id, xs]) => [id, xs.reduce((sum, x) => sum + x, 0) / xs.length]));
    for (const [id, m] of mean) {
      const rest = [...mean].filter(([x]) => x !== id).map(([, v]) => v).sort((x, y) => x - y);
      const median = rest[Math.floor(rest.length / 2)];
      // The player who opened a bet that everyone then called is not odd for opening it: a bet has to start somewhere.
      const opener = moves.find((a) => AGGRESSIVE.includes(a.move))?.playerId === id && median >= 1;
      if (!opener) {
        out.set(id, (out.get(id) ?? 0) + Math.abs(m - median) * 0.5);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return out;
}

/** What the rest of the table has been doing this hand: the share of its moves that were bets or raises. */
export function crowdAggression(hand: Hand, botId: string): number {
  const moves = (hand.actions ?? []).filter((a) => a.playerId !== botId && !a.outOfTurn && a.move !== 'fold');
  if (!moves.length) return 0.2;
  return moves.filter((a) => AGGRESSIVE.includes(a.move)).length / moves.length;
}
