// How an AI twin copies the person it was built from: before it moves, it finds the spots the
// person has been in that look like this one (same street, a hand about this strong, facing about
// this much) and takes their mix of folds, calls, bets and raises, weighted by how alike the spots
// are. The more such spots it has seen, the more the twin trusts them over its fitted style.

import { heroNow, parseSpotKey, TWIN_MOVES, type TwinFacing, type TwinPosition, type TwinSpot } from './twin';
import type { TwinBrain } from './twinFit';
import type { Game, Hand, HandRecord, Seat } from './types';

/** For tuning only (scripts/twinLab.ts). `k`: how many matching spots it takes before the memory counts as much as the style (15 gave the closest twins in the lab). `copy` off plays the fitted style alone. */
export const TWIN_TUNING = { k: 15, copy: true };

/** How much a spot facing `b` counts when looking for spots like one facing `a`. */
const FACING_NEAR: Record<TwinFacing, Partial<Record<TwinFacing, number>>> = {
  none: { limp: 0.35 },
  limp: { none: 0.35 },
  small: { big: 0.45, raise: 0.2 },
  big: { small: 0.45, raise: 0.35, allin: 0.3 },
  raise: { big: 0.35, allin: 0.4, small: 0.2 },
  allin: { raise: 0.4, big: 0.3 },
};

const POS_NEAR: Partial<Record<TwinPosition, Partial<Record<TwinPosition, number>>>> = {
  ep: { lp: 0.6, sb: 0.3, bb: 0.3 },
  lp: { ep: 0.6, sb: 0.4, bb: 0.35 },
  sb: { bb: 0.5, lp: 0.4, ep: 0.3 },
  bb: { sb: 0.5, lp: 0.35, ep: 0.3 },
  ip: { oop: 0.55 },
  oop: { ip: 0.55 },
};

/** 0 to 1: how much a remembered spot says about this one. */
function nearness(a: TwinSpot, b: TwinSpot): number {
  if (a.street !== b.street) return 0;
  const d = Math.abs(a.strength - b.strength);
  if (d > 3) return 0;
  const facing = a.facing === b.facing ? 1 : (FACING_NEAR[a.facing][b.facing] ?? 0);
  if (!facing) return 0;
  const pos = a.pos === b.pos ? 1 : (POS_NEAR[a.pos]?.[b.pos] ?? 0.3);
  const players = [1, 0.55, 0.3][Math.min(2, Math.abs(a.players - b.players))];
  const role = a.role === b.role ? 1 : 0.5;
  return 0.5 ** d * facing * pos * players * role;
}

/** What the person did in spots like this one: shares in `TWIN_MOVES` order, and how many spots' worth of evidence that is. */
export function twinMix(brain: TwinBrain, spot: TwinSpot): { p: number[]; n: number } | null {
  const v = TWIN_MOVES.map(() => 0);
  let n = 0;
  const prefix = `${spot.street}|`;
  for (const [key, counts] of Object.entries(brain.spots)) {
    if (!key.startsWith(prefix)) continue;
    const other = parseSpotKey(key);
    if (!other) continue;
    const w = nearness(spot, other);
    if (w <= 0) continue;
    for (let i = 0; i < v.length; i++) {
      v[i] += w * counts[i];
      n += w * counts[i];
    }
  }
  const total = v.reduce((a, b) => a + b, 0);
  return total > 0 ? { p: v.map((x) => x / total), n } : null;
}

/** How much to trust the memory over the fitted style, 0 to 1. */
export const twinWeight = (n: number) => (TWIN_TUNING.copy ? n / (n + TWIN_TUNING.k) : 0);

const at = (p: number[], move: (typeof TWIN_MOVES)[number]) => p[TWIN_MOVES.indexOf(move)];

/** Before the flop a bot has three choices: fold or check, call, raise or move in. */
export function preKinds(p: number[]): number[] {
  return [at(p, 'fold') + at(p, 'check'), at(p, 'call'), at(p, 'betS') + at(p, 'betB') + at(p, 'raise') + at(p, 'allin')];
}

/** After the flop: 0 fold or check, 1 call or a small bet, 2 a big bet, a raise or a move in. A call when checking is free is a check. */
export function postKinds(p: number[], canCheck: boolean): number[] {
  const call = at(p, 'call');
  return [at(p, 'fold') + at(p, 'check') + (canCheck ? call : 0), at(p, 'betS') + (canCheck ? 0 : call), at(p, 'betB') + at(p, 'raise') + at(p, 'allin')];
}

/**
 * Pulls a bot's own odds towards the twin's by `w`. `kinds` says what kind of move each option is
 * (0, 1 or 2); the twin's share for a kind is split between that kind's options the way the bot
 * already liked them. A kind the bot has no option for goes to the nearest kind it does have: a
 * raise it can't make becomes a call, a small bet it has no size for becomes the big one.
 */
export function blendKinds(probs: number[], kinds: number[], target: number[], w: number): number[] {
  const sum = probs.reduce((a, b) => a + b, 0);
  const own = sum > 0 ? probs.map((p) => p / sum) : probs.map(() => 1 / probs.length);
  if (w <= 0) return own;
  const share = [...target];
  const has = (k: number) => kinds.includes(k);
  if (!has(2)) {
    share[has(1) ? 1 : 0] += share[2];
    share[2] = 0;
  }
  if (!has(1)) {
    share[has(2) ? 2 : 0] += share[1];
    share[1] = 0;
  }
  const total = share.reduce((a, b) => a + b, 0);
  if (total <= 0) return own;
  return own.map((p, i) => {
    const group = kinds.map((k, j) => (k === kinds[i] ? own[j] : 0)).reduce((a, b) => a + b, 0);
    const within = group > 0 ? p / group : 1 / kinds.filter((k) => k === kinds[i]).length;
    return (1 - w) * p + w * (share[kinds[i]] / total) * within;
  });
}

/** A hand still being played, as a record with just this seat's cards, so the same code reads live spots and finished hands. */
export function liveRecord(game: Game, hand: Hand, seat: Seat): HandRecord {
  return {
    tableId: game.id,
    number: hand.number,
    at: 0,
    smallBlind: game.settings.smallBlind,
    bigBlind: game.settings.bigBlind,
    buttonId: hand.buttonId,
    players: hand.seats.map((s) => {
      const p = game.players.find((x) => x.id === s.playerId);
      return { id: s.playerId, name: p?.name ?? '', emoji: p?.emoji ?? '', seat: p?.seat ?? 0, stack: hand.startStacks?.[s.playerId] ?? (p?.stack ?? 0) + s.total };
    }),
    actions: hand.actions ?? [],
    board: hand.board,
    holes: { [seat.playerId]: seat.cards },
    won: {},
    showdown: false,
  };
}

/** What the twin's memory says about the seat's move right now, or null when it has nothing (or no memory is attached). */
export function twinLook(game: Game, hand: Hand, seat: Seat): { p: number[]; w: number } | null {
  const brain = game.players.find((p) => p.id === seat.playerId)?.twin;
  if (!brain || !TWIN_TUNING.copy || seat.cards.length !== 2) return null;
  const now = heroNow(liveRecord(game, hand, seat), seat.playerId, hand.street);
  if (!now) return null;
  const mix = twinMix(brain, now.spot);
  return mix ? { p: mix.p, w: twinWeight(mix.n) } : null;
}
