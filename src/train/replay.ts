// Turns a saved hand into frames you can step through. Pure data in, pure data out: the replay screen
// only draws them. A frame is the whole table at one moment (stacks, bets, who has folded, the board).

import { blindFor, type HandRecord, type Street } from '../game';
import type { Decision } from '../gto/types';

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
const BOARD_AT: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

export interface Frame {
  kind: 'deal' | 'action' | 'street' | 'result';
  /** Index into the record's actions (action frames only). */
  action: number | null;
  street: Street;
  /** How many board cards are showing. */
  boardCount: number;
  /** Chips behind, per player. */
  stacks: Record<string, number>;
  /** Chips in front of each player on this street. */
  bets: Record<string, number>;
  /** Everything in the middle, including this street's bets. */
  pot: number;
  folded: string[];
  allIn: string[];
  /** Who just acted. */
  actor: string | null;
  /** What each player last did on this street, as a short label ("Raise 60"). */
  says: Record<string, string>;
  /** One plain sentence for what just happened. */
  text: string;
  /** Result frame: chips each player got back, and whose cards turn face up. */
  won: Record<string, number>;
  reveal: string[];
}

export const boardAt = (street: Street) => BOARD_AT[street];

const nameOf = (r: HandRecord, id: string) => r.players.find((p) => p.id === id)?.name ?? 'Someone';

/** "Fold", "Check", "Call 20", "Bet 40", "Raise 120", "All in 300". */
export function moveLabel(move: string, to: number): string {
  switch (move) {
    case 'fold':
      return 'Fold';
    case 'check':
      return 'Check';
    case 'call':
      return `Call ${to}`;
    case 'bet':
      return `Bet ${to}`;
    case 'allin':
      return `All in ${to}`;
    default:
      return `Raise ${to}`;
  }
}

function sentence(who: string, move: string, to: number, out?: boolean): string {
  if (out) return `${who} left the table and folded.`;
  switch (move) {
    case 'fold':
      return `${who} folded.`;
    case 'check':
      return `${who} checked.`;
    case 'call':
      return `${who} called ${to}.`;
    case 'bet':
      return `${who} bet ${to}.`;
    case 'allin':
      return `${who} went all in for ${to}.`;
    default:
      return `${who} raised to ${to}.`;
  }
}

/** Every step of the hand, in order: the deal, each move, each new street, then the result. */
export function buildFrames(r: HandRecord, heroId: string): Frame[] {
  const start: Record<string, number> = Object.fromEntries(r.players.map((p) => [p.id, p.stack]));
  const committed: Record<string, number> = Object.fromEntries(r.players.map((p) => [p.id, 0]));
  let bets: Record<string, number> = Object.fromEntries(r.players.map((p) => [p.id, blindFor(r, p.id)]));
  const folded = new Set<string>();
  let says: Record<string, string> = {};
  let street: Street = 'preflop';
  const frames: Frame[] = [];

  const behind = (id: string) => Math.max(0, start[id] - committed[id] - (bets[id] ?? 0));
  const snapshot = (f: Pick<Frame, 'kind' | 'action' | 'actor' | 'text'> & Partial<Frame>): Frame => {
    const stacks = Object.fromEntries(r.players.map((p) => [p.id, behind(p.id)]));
    return {
      street,
      boardCount: BOARD_AT[street],
      stacks,
      bets: { ...bets },
      pot: r.players.reduce((t, p) => t + committed[p.id] + (bets[p.id] ?? 0), 0),
      folded: [...folded],
      allIn: r.players.filter((p) => !folded.has(p.id) && stacks[p.id] === 0 && committed[p.id] + (bets[p.id] ?? 0) > 0).map((p) => p.id),
      says: { ...says },
      won: {},
      reveal: [heroId],
      ...f,
    };
  };

  const closeStreet = () => {
    for (const p of r.players) {
      committed[p.id] += bets[p.id] ?? 0;
      bets[p.id] = 0;
    }
    says = Object.fromEntries([...folded].map((id) => [id, 'Fold']));
  };

  const moveTo = (next: Street) => {
    closeStreet();
    street = next;
    frames.push(snapshot({ kind: 'street', action: null, actor: null, text: next === 'flop' ? 'The flop.' : next === 'turn' ? 'The turn.' : 'The river.' }));
  };

  frames.push(
    snapshot({
      kind: 'deal',
      action: null,
      actor: null,
      text: `Blinds are ${r.smallBlind} and ${r.bigBlind}.`,
    }),
  );

  r.actions.forEach((a, i) => {
    while (STREETS.indexOf(a.street) > STREETS.indexOf(street)) moveTo(STREETS[STREETS.indexOf(street) + 1]);
    if (a.move === 'fold') {
      folded.add(a.playerId);
    } else if (a.move !== 'check') {
      bets[a.playerId] = Math.min(Math.max(a.to, bets[a.playerId] ?? 0), start[a.playerId] - committed[a.playerId]);
    }
    says[a.playerId] = moveLabel(a.move, a.to);
    frames.push(snapshot({ kind: 'action', action: i, actor: a.playerId, text: sentence(nameOf(r, a.playerId), a.move, a.to, a.outOfTurn) }));
  });

  // Cards that came out with nobody left to bet (an all-in run-out).
  while (STREETS.indexOf(street) < 3 && BOARD_AT[STREETS[STREETS.indexOf(street) + 1]] <= r.board.length) moveTo(STREETS[STREETS.indexOf(street) + 1]);

  closeStreet();
  // A bet nobody could match in full goes back to whoever made it, as it does at the table.
  const byAmount = [...r.players].sort((x, y) => committed[y.id] - committed[x.id]);
  if (byAmount.length > 1 && committed[byAmount[0].id] > committed[byAmount[1].id])
    committed[byAmount[0].id] = committed[byAmount[1].id];
  const stacks = Object.fromEntries(r.players.map((p) => [p.id, start[p.id] - committed[p.id] + (r.won[p.id] ?? 0)]));
  const winners = r.players.filter((p) => (r.won[p.id] ?? 0) > 0);
  const gained = (id: string) => (r.won[id] ?? 0);
  const top = [...winners].sort((a, b) => gained(b.id) - gained(a.id))[0];
  frames.push({
    ...snapshot({ kind: 'result', action: null, actor: null, text: '' }),
    stacks,
    bets: Object.fromEntries(r.players.map((p) => [p.id, 0])),
    pot: 0,
    boardCount: r.board.length,
    won: { ...r.won },
    reveal: r.players.filter((p) => p.id === heroId || r.holes[p.id]).map((p) => p.id),
    text: !top
      ? 'The hand ended.'
      : winners.length > 1
        ? `${winners.map((p) => p.name).join(' and ')} split the pot.`
        : r.showdown
          ? `${top.name} won ${gained(top.id)} at showdown.`
          : `${top.name} won ${gained(top.id)}. Everyone else folded.`,
  });
  return frames;
}

/**
 * Pairs each of your moves with the coach's grade for it. The coach grades your decisions street by
 * street in order, so match them up that way; when a street has a different count (a move the coach
 * skipped, such as folding out of turn), match by the kind of move instead.
 */
export function matchDecisions(r: HandRecord, heroId: string, decisions: Decision[]): Map<number, Decision> {
  const out = new Map<number, Decision>();
  for (const s of STREETS) {
    const mine = r.actions.map((a, i) => ({ a, i })).filter(({ a }) => a.playerId === heroId && a.street === s && !a.outOfTurn);
    const graded = decisions.filter((d) => d.street === s && !d.pending);
    if (mine.length === graded.length) {
      mine.forEach(({ i }, k) => out.set(i, graded[k]));
      continue;
    }
    const left = [...graded];
    for (const { a, i } of mine) {
      const at = left.findIndex((d) => !d.action || d.action.move === a.move);
      if (at >= 0) out.set(i, left.splice(at, 1)[0]);
    }
  }
  return out;
}

/** The frame numbers of your moves that weren't the GTO play, in order. */
export function mistakeFrames(frames: Frame[], graded: Map<number, Decision>): number[] {
  return frames.flatMap((f, i) => {
    const d = f.action == null ? undefined : graded.get(f.action);
    return d && (d.colour === 'red' || d.colour === 'yellow') ? [i] : [];
  });
}

/** Replay is switched off for now: every button that opens it checks this. */
export const REPLAY_ON = false;
