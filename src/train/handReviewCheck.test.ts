// How far the mistake review can be trusted, measured against the Range training hands: real hands from published
// breakdowns, each with the expert's answer and the expert's read of every opponent's range (docs/RANGE_SOURCES.md).
// Each hand is dealt through the engine as it was played, then the review grades the expert's answer and the other
// choice. Two numbers come out:
//   - agreement: on fold-or-call spots, how often the review lets the expert's answer stand and flags the other;
//   - equity error: how far the review's estimated chance to win is from the chance against the expert's ranges.
// The floors below are what it measured when this was written (19 Nov 2026, docs/BOTS.md "Mistake review"); a change
// to the review or the bots' range model must not drop under them. `REVIEW_REPORT=1` prints every hand.

import { describe, expect, it } from 'vitest';

import numbers from '../../native/src/data/range-numbers.json';
import { fullDeck, seededRng, type Card } from '../game/cards';
import { dealNextStreet, makeMove, startHand } from '../game/holdem';
import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import type { Move } from '../game/types';
import { reviewHand, type ReviewHand, type ReviewedMove } from './handReview';
import { replay, seatsOf, type Pos, type Scenario } from './ranges/model';
import { SCENARIOS } from './ranges/scenarios';

const BB = 100;
const chipsOf = (bbs: number) => Math.round(bbs * BB);

/** The scenario as an engine hand, up to the decision, or null if the engine can't play it the same way. */
export function asHand(s: Scenario): Omit<ReviewHand, 'actions'> & { actions: ReviewHand['actions'] } | null {
  const seats = seatsOf(s);
  const n = seats.length;
  const inHand = new Set<Pos>([s.hero.pos, ...s.opponents.map((o) => o.pos)]);
  const id = (p: Pos) => p.toLowerCase();
  const rng = seededRng(1);
  const ctx = { now: 0, deviceId: 'check', rng };
  const game = createTable({ hostDeviceId: 'check', name: 'You', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0, smallBlind: BB / 2, bigBlind: BB }, bots: n - 1, code: null, now: 0, rng });
  const stackOf = (p: Pos) => chipsOf(inHand.has(p) ? (s.stacks?.[p] ?? s.stack) : 100) + (p === 'BB' ? chipsOf(s.ante ?? 0) : 0);
  seats.forEach((p, k) => {
    const pl = game.players[k];
    pl.id = id(p);
    pl.stack = stackOf(p);
    pl.bot = p !== s.hero.pos;
    pl.seat = k;
  });
  game.buttonSeat = (seats.indexOf('BTN') - 1 + n) % n;
  startHand(game, ctx);
  const h = game.hand!;
  if (h.buttonId !== 'btn') return null;
  if (s.ante) {
    const bb = h.seats.find((x) => x.playerId === 'bb')!;
    game.players.find((p) => p.id === 'bb')!.stack -= chipsOf(s.ante);
    bb.total += chipsOf(s.ante);
  }
  const known = new Set<Card>([...s.board, ...s.hero.cards]);
  const spare = fullDeck().filter((c) => !known.has(c));
  for (const seat of h.seats) seat.cards = seat.playerId === id(s.hero.pos) ? [...s.hero.cards] : spare.splice(0, 2);
  const [b1, b2, b3, ...rest] = spare;
  h.deck = [b1, ...s.board.slice(0, 3), b2, ...s.board.slice(3, 4), b3, ...s.board.slice(4, 5), ...rest];
  const foldOthers = () => {
    while (h.toAct && !inHand.has(h.toAct.toUpperCase() as Pos)) makeMove(game, 'fold', undefined, ctx);
  };
  for (const step of s.actions) {
    foldOthers();
    while (!h.toAct && !h.result) dealNextStreet(game, ctx);
    foldOthers();
    if (h.street !== step.street || h.toAct !== id(step.who)) return null;
    const move: Move = step.move;
    const to = step.to !== undefined ? chipsOf(step.to) : undefined;
    if (makeMove(game, move, move === 'bet' || move === 'raise' ? to : undefined, ctx)) return null;
  }
  foldOthers();
  while (!h.toAct && !h.result && h.board.length < s.board.length) {
    dealNextStreet(game, ctx);
    foldOthers();
  }
  if (h.toAct !== id(s.hero.pos) || h.board.length !== s.board.length) return null;
  return {
    variant: 'holdem',
    smallBlind: BB / 2,
    bigBlind: BB,
    buttonId: 'btn',
    bbId: 'bb',
    me: id(s.hero.pos),
    players: seats.map((p) => ({ id: id(p), stack: stackOf(p) })),
    actions: [...h.actions!],
    board: s.board,
    holes: { [id(s.hero.pos)]: [...s.hero.cards] },
    ...(s.ante ? { bbAnte: chipsOf(s.ante) } : {}),
    street: h.street,
  } as never;
}

/** The review's verdict on one move the hero could make. */
function verdictFor(base: NonNullable<ReturnType<typeof asHand>>, move: Move): ReviewedMove | null {
  const street = (base as unknown as { street: ReviewedMove['street'] }).street;
  const moves = reviewHand({ ...base, actions: [...base.actions, { street, playerId: base.me, move, to: 0 }] });
  return moves?.at(-1) ?? null;
}

interface Row {
  id: string;
  best: string;
  ours: number;
  theirs: number;
  price: number;
  onBest: string;
  onOther: string;
}

function measure() {
  const rows: Row[] = [];
  let skipped = 0;
  for (const s of SCENARIOS) {
    const r = replay(s);
    if (!r.toCall || (s.best !== 'fold' && s.best !== 'call')) continue;
    const base = asHand(s);
    if (!base) {
      skipped++;
      continue;
    }
    const best = verdictFor(base, s.best);
    const other = verdictFor(base, s.best === 'fold' ? 'call' : 'fold');
    if (!best || !other) {
      skipped++;
      continue;
    }
    const ref = (numbers as Record<string, { equity: number; price?: number }>)[s.id];
    rows.push({ id: s.id, best: s.best, ours: best.equity, theirs: ref.equity, price: ref.price ?? 0, onBest: best.verdict, onOther: other.verdict });
  }
  return { rows, skipped };
}

describe('the mistake review against published hands', () => {
  it('stays at least as close to the experts as it was measured (it is an estimate, often wrong: see the floors)', () => {
    const { rows, skipped } = measure();
    const agree = rows.filter((x) => !['mistake'].includes(x.onBest) && ['mistake', 'close'].includes(x.onOther)).length;
    const wrongFlag = rows.filter((x) => x.onBest === 'mistake').length;
    const missed = rows.filter((x) => !['mistake', 'close'].includes(x.onOther)).length;
    const err = rows.map((x) => Math.abs(x.ours - x.theirs)).sort((a, b) => a - b);
    const mean = err.reduce((a, b) => a + b, 0) / err.length;
    const median = err[Math.floor(err.length / 2)];
    const within10 = err.filter((e) => e <= 0.1).length / err.length;
    const report = {
      hands: rows.length,
      skipped,
      agree: `${agree} (${Math.round((agree / rows.length) * 100)}%)`,
      expertAnswerFlagged: wrongFlag,
      otherAnswerNotFlagged: missed,
      equityErrorMean: Math.round(mean * 1000) / 10,
      equityErrorMedian: Math.round(median * 1000) / 10,
      within10Points: `${Math.round(within10 * 100)}%`,
    };
    console.log('Mistake review vs published hands:', report);
    if (process.env.REVIEW_REPORT)
      for (const x of rows) console.log(`${x.id.padEnd(34)} best ${x.best.padEnd(5)} ours ${(x.ours * 100).toFixed(0).padStart(3)}% theirs ${(x.theirs * 100).toFixed(0).padStart(3)}% price ${(x.price * 100).toFixed(0).padStart(3)}% | on best: ${x.onBest.padEnd(7)} on other: ${x.onOther}`);
    expect(rows.length).toBeGreaterThan(100);
    expect(check(agree / rows.length, wrongFlag / rows.length, mean)).toBe(true);
  }, 120_000);
});

/** The floors (see the top of the file). */
function check(agreement: number, wrongFlags: number, meanError: number): boolean {
  return agreement >= FLOORS.agreement && wrongFlags <= FLOORS.wrongFlags && meanError <= FLOORS.meanError;
}
/**
 * Measured 19 Nov 2026 over 144 fold-or-call hands: 56% agreement, the expert's answer flagged in 34% of hands, the
 * chance to win off by 24 points on average (median 20). Pot odds against the experts' own ranges get all 144 right,
 * so the gap is the range model's guess at what opponents hold (it can't know a player's type the way the experts do).
 * These floors only stop it getting worse; they are not a claim that it's good.
 */
const FLOORS = { agreement: 0.53, wrongFlags: 0.37, meanError: 0.26 };
