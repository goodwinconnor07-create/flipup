// What the Range training table shows, worked out from the model's replay without drawing anything: the hand as a
// list of events (a street's cards, then each move), the table at any step of it (board, pot, bets, stacks, who has
// folded, who is acting), and where each seat sits round the felt. The screens only draw what these return.
import { bb, seatsOf, type Pos, type Replay, type Scenario, type Street } from '@train/ranges/model';

export type Action = 'fold' | 'check' | 'call' | 'bet' | 'raise';

export type HandEvent =
  | { kind: 'deal'; street: Street }
  | { kind: 'move'; street: Street; who: Pos; action: Action; /** Total put in on the street after this move. */ amount?: number; allIn: boolean; text: string; left?: number };

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];

/** The streets this hand plays through up to the decision. */
export const streetsOf = (s: Scenario): Street[] => STREETS.slice(0, s.board.length - 1);

/** The board as it stands on a street. */
export function boardAt(s: Scenario, street: Street): string[] {
  return street === 'preflop' ? [] : s.board.slice(0, street === 'flop' ? 3 : street === 'turn' ? 4 : 5);
}

const ACTION = /\b(fold|check|call|limp|complete|bet|raise)/;
const AMOUNT = /(\d+(?:\.\d+)?)bb/;

/** The hand as events in order: each street's cards (after preflop), then the moves made on it. */
export function eventsOf(s: Scenario, r: Replay): HandEvent[] {
  const out: HandEvent[] = [];
  for (const street of streetsOf(s)) {
    if (street !== 'preflop') out.push({ kind: 'deal', street });
    for (const l of r.lines.filter((x) => x.street === street)) {
      const who = (l.who ?? l.text.split(' ')[0]) as Pos;
      const found = ACTION.exec(l.text)?.[1];
      if (!found) continue;
      // A limp, or the small blind completing, is a call of the big blind.
      const limp = found === 'limp' || found === 'complete';
      const word = (limp ? 'call' : found) as Action;
      const amount = AMOUNT.exec(l.text);
      out.push({ kind: 'move', street, who, action: word, amount: limp ? 1 : amount ? Number(amount[1]) : undefined, allIn: l.text.includes('all in'), text: l.text, left: l.left });
    }
  }
  return out;
}

export interface BoardView {
  street: Street;
  board: string[];
  pot: number;
  /** What each seat has put in on the current street. */
  bets: Partial<Record<Pos, number>>;
  stacks: Partial<Record<Pos, number>>;
  /** Players who played the hand and have folded. */
  folded: Pos[];
  acting: Pos | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The table after `step` events (0 is before anything), or at your decision when `step` is null. Pots are counted
 * as they build: the blinds and any ante, then every bet and call as it is made.
 */
export function viewAt(s: Scenario, r: Replay, events: HandEvent[], step: number | null): BoardView {
  const hero = s.hero.pos;
  const inHand: Pos[] = [hero, ...s.opponents.map((o) => o.pos)];
  if (step === null) {
    return {
      street: s.board.length === 4 ? 'turn' : 'river',
      board: s.board,
      pot: r.pot,
      bets: r.bets,
      stacks: r.stacks,
      folded: inHand.filter((p) => p !== hero && !r.live.includes(p)),
      acting: null,
    };
  }
  let street: Street = 'preflop';
  let pot = 1.5 + (s.ante ?? 0);
  let bets: Partial<Record<Pos, number>> = { SB: 0.5, BB: 1 };
  const stacks: Partial<Record<Pos, number>> = { ...r.start };
  const folded = new Set<Pos>();
  let acting: Pos | null = null;
  for (const e of events.slice(0, step)) {
    if (e.kind === 'deal') {
      street = e.street;
      bets = {};
      acting = null;
      continue;
    }
    acting = e.who;
    if (e.action === 'fold') folded.add(e.who);
    if (e.amount !== undefined && (e.action === 'call' || e.action === 'bet' || e.action === 'raise')) {
      pot += e.amount - (bets[e.who] ?? 0);
      bets[e.who] = e.amount;
    }
    if (e.left !== undefined) stacks[e.who] = e.left;
  }
  return {
    street,
    board: boardAt(s, street),
    // The text the log is read from rounds to a tenth, so the last step takes the model's exact pot.
    pot: step >= events.length ? r.pot : round1(pot),
    bets,
    stacks,
    folded: [...folded].filter((p) => inHand.includes(p)),
    acting,
  };
}

/** Seats round the felt with you at the bottom, the rest clockwise on screen. Positions are the seat's centre. */
export function seatPositions(s: Scenario, width: number, height: number): { pos: Pos; x: number; y: number; hero: boolean }[] {
  const seats = seatsOf(s);
  const n = seats.length;
  const at = seats.indexOf(s.hero.pos);
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2 - (n > 6 ? 30 : 32);
  const ry = height / 2 - 22;
  return seats.map((pos, i) => {
    const theta = (((i - at + n) % n) * 2 * Math.PI) / n;
    return { pos, x: cx - rx * Math.sin(theta), y: cy + ry * Math.cos(theta), hero: pos === s.hero.pos };
  });
}

/** "UTG1" reads as UTG+1. */
export const seatName = (p: Pos): string => (p === 'UTG1' ? 'UTG+1' : p);

/** A sentence of a longer explanation, counting from 0 (null when there isn't one). */
export function sentenceAt(text: string, n: number): string | null {
  const parts = text.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts[n] ?? null;
}

/** The first sentence of a longer explanation. */
export function firstSentence(text: string): string {
  const m = /^.*?[.!?](?=\s|$)/s.exec(text.trim());
  return (m ? m[0] : text).trim();
}

export { bb };
