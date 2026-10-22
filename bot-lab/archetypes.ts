// Scripted test opponents for the bot lab. They are test policies, not models of real people:
// each one has a simple, readable leak so we can see whether the bots punish it or fall for it.
// A script sees only its own cards, the board and the public betting (same as a player in its seat).

import { strengthVsRandom } from '../src/game/equity';
import { potTotal } from '../src/game/holdem';
import { options } from '../src/game/selectors';
import type { Game, Hand, Move, Seat } from '../src/game/types';

export const ARCHETYPES = ['casual', 'station', 'tightPassive', 'bluffer', 'valueBettor', 'timid', 'aggressive'] as const;
/** Not one of the seven reported archetypes: a clean 3-bettor used only by the 3-bet probe tables. */
export const PROBE_SCRIPTS = ['threeBettor'] as const;
export type Archetype = (typeof ARCHETYPES)[number] | (typeof PROBE_SCRIPTS)[number];
export const isArchetype = (a: string): a is Archetype => (ARCHETYPES as readonly string[]).includes(a) || (PROBE_SCRIPTS as readonly string[]).includes(a);

export const ARCHETYPE_ABOUT: Record<Archetype, string> = {
  casual: 'Loose and imperfect: plays about 45% of hands, calls a lot, bets good hands, sometimes bluffs and sometimes calls with nothing.',
  station: 'Calling station: plays most hands, calls any bet with a pair or a draw, never raises, rarely bets.',
  tightPassive: 'Tight and passive: plays the top ~25% of hands, mostly calls, only bets or raises very strong hands.',
  bluffer: 'Frequent bluffer: raises most hands before the flop and bets two thirds of the pot every street, gives up to a raise without a pair.',
  valueBettor: 'Straightforward value bettor: bets two thirds of the pot with a good hand and checks the rest, calls only with a good hand.',
  timid: 'Excessively timid: folds to almost any bet, limps small hands, only raises with the nuts.',
  threeBettor: 'Probe only: opens about half its hands, re-raises 3.5x with strong hands and a third of its medium ones, and folds to a 4-bet unless it has a premium.',
  aggressive: 'Aggressive raiser: opens and re-raises a wide range, bets two thirds of the pot most streets, folds to a raise with a weak hand.',
};

type Rng = () => number;
export interface ScriptMove {
  move: Move;
  to?: number;
}

/** 0 to 1, a quick preflop ranking (pairs and high cards up, suited and connected a little). */
export function preflopStrength(cards: string[]): number {
  const r = cards.map((c) => '23456789TJQKA'.indexOf(c[0]) + 2).sort((a, b) => b - a);
  const suited = cards[0][1] === cards[1][1];
  let s = r[0] === r[1] ? 0.55 + (r[0] - 2) * 0.037 : (r[0] + r[1] - 5) / 25 + (suited ? 0.06 : 0) - Math.max(0, r[0] - r[1] - 1) * 0.025;
  if (r[0] === 14 && r[0] !== r[1]) s += 0.08;
  return Math.max(0, Math.min(1, s));
}

export function scriptMove(kind: Archetype, game: Game, hand: Hand, seat: Seat, rng: Rng): ScriptMove {
  const o = options(game, hand, seat);
  const bb = game.settings.bigBlind;
  const pot = potTotal(hand);
  const pre = hand.street === 'preflop';
  const callOrCheck = (): ScriptMove => (o.canCheck ? { move: 'check' } : o.callIsAllIn ? { move: 'allin' } : { move: 'call' });
  const checkOrFold = (): ScriptMove => (o.canCheck ? { move: 'check' } : { move: 'fold' });
  const raise = (to: number): ScriptMove => {
    if (!o.canRaise) return callOrCheck();
    const t = Math.max(o.minTo, Math.min(o.maxTo, Math.round(to)));
    return t >= o.maxTo ? { move: 'allin' } : { move: hand.currentBet > 0 ? 'raise' : 'bet', to: t };
  };
  const live = Math.max(1, hand.seats.filter((s) => !s.folded).length - 1);
  const s = pre ? preflopStrength(seat.cards) : strengthVsRandom(seat.cards, hand.board, live, rng, 150);
  const odds = o.toCall / (pot + o.toCall || 1);
  const facing = o.toCall > 0;
  const raisesBefore = (hand.actions ?? []).filter((a) => a.street === 'preflop' && (a.move === 'raise' || a.move === 'bet' || a.move === 'allin')).length;

  switch (kind) {
    case 'casual': {
      const noisy = s + (rng() - 0.5) * 0.25;
      if (pre) {
        if (noisy > 0.8) return raise(Math.max(hand.currentBet * 3, bb * 3));
        if (!facing) return noisy > 0.4 ? (rng() < 0.2 ? raise(bb * 3) : callOrCheck()) : checkOrFold();
        if (o.toCall <= bb * 4) return noisy > 0.42 ? callOrCheck() : { move: 'fold' };
        return noisy > 0.7 ? callOrCheck() : { move: 'fold' };
      }
      if (!facing) return noisy > 0.68 || rng() < 0.12 ? raise(pot * (0.4 + rng() * 0.4)) : { move: 'check' };
      if (noisy > 0.9) return raise(hand.currentBet * 2.5 + pot * 0.5);
      return noisy > odds + 0.05 || rng() < 0.08 ? callOrCheck() : { move: 'fold' };
    }
    case 'station': {
      if (pre) return s > 0.3 || !facing ? callOrCheck() : o.toCall <= bb * 2 && s > 0.2 ? callOrCheck() : { move: 'fold' };
      if (!facing) return s > 0.85 && rng() < 0.4 ? raise(pot * 0.4) : { move: 'check' };
      return s > 0.38 ? callOrCheck() : { move: 'fold' };
    }
    case 'tightPassive': {
      if (pre) {
        if (s > 0.93) return raise(Math.max(hand.currentBet * 3, bb * 3));
        if (!facing) return s > 0.65 ? callOrCheck() : { move: 'check' };
        return s > 0.7 && o.toCall <= bb * 5 ? callOrCheck() : s > 0.88 ? callOrCheck() : { move: 'fold' };
      }
      if (!facing) return s > 0.9 ? raise(pot * 0.5) : { move: 'check' };
      return s > 0.72 ? callOrCheck() : { move: 'fold' };
    }
    case 'bluffer': {
      if (pre) {
        if (o.toCall > bb * 6) return s > 0.7 ? callOrCheck() : { move: 'fold' };
        if (hand.currentBet <= bb) return rng() < 0.7 ? raise(bb * 3) : callOrCheck();
        return s > 0.35 ? callOrCheck() : { move: 'fold' };
      }
      if (o.canCheck) return raise(pot * 0.66);
      return s > 0.62 ? callOrCheck() : { move: 'fold' };
    }
    case 'valueBettor': {
      if (pre) {
        if (s > 0.8) return raise(Math.max(hand.currentBet * 3, bb * 3));
        if (!facing) return s > 0.55 ? raise(bb * 2.5) : checkOrFold();
        return s > 0.62 && o.toCall <= bb * 6 ? callOrCheck() : { move: 'fold' };
      }
      if (!facing) return s > 0.7 ? raise(pot * 0.66) : { move: 'check' };
      if (s > 0.93) return raise(hand.currentBet * 2.5 + pot * 0.5);
      return s > Math.max(0.68, odds + 0.15) ? callOrCheck() : { move: 'fold' };
    }
    case 'timid': {
      if (pre) {
        if (s > 0.97) return raise(Math.max(hand.currentBet * 3, bb * 3));
        if (!facing) return s > 0.45 ? callOrCheck() : { move: 'check' };
        return s > 0.7 && o.toCall <= bb * 2 ? callOrCheck() : { move: 'fold' };
      }
      if (!facing) return s > 0.97 ? raise(pot * 0.4) : { move: 'check' };
      return s > 0.88 ? callOrCheck() : { move: 'fold' };
    }
    case 'threeBettor': {
      if (pre) {
        if (raisesBefore >= 2) return s > 0.9 ? callOrCheck() : { move: 'fold' };
        if (raisesBefore === 1) return s > 0.78 || (s > 0.3 && rng() < 0.3) ? raise(hand.currentBet * 3.5) : { move: 'fold' };
        return s > 0.5 ? raise(bb * 3) : checkOrFold();
      }
      if (!facing) return rng() < 0.6 ? raise(pot * 0.6) : { move: 'check' };
      return s > 0.65 ? callOrCheck() : { move: 'fold' };
    }
    case 'aggressive': {
      if (pre) {
        if (raisesBefore >= 2) return s > 0.88 ? callOrCheck() : { move: 'fold' };
        if (raisesBefore === 1) return s > 0.7 || (s > 0.35 && rng() < 0.3) ? raise(hand.currentBet * 3) : o.toCall <= bb * 3 && s > 0.45 ? callOrCheck() : { move: 'fold' };
        return s > 0.32 || rng() < 0.15 ? raise(bb * 3) : checkOrFold();
      }
      if (!facing) return s > 0.4 || rng() < 0.45 ? raise(pot * 0.75) : { move: 'check' };
      if (s > 0.75) return raise(hand.currentBet * 2.5 + pot * 0.5);
      return s > odds + 0.1 ? callOrCheck() : { move: 'fold' };
    }
  }
}
