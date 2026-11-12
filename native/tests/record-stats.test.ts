import { describe, expect, it } from 'vitest';

import type { Game } from '../src/engine';
import { allInChance, cleanStats, EMPTY_STATS, startExtremes, startName, startWords, styleOf, tallyGame, tallyHand, TRAIL, type MoreStats } from '../src/state/record-stats';

const NOW = new Date(2026, 10, 12, 20, 0);

interface Spec {
  id?: string;
  number?: number;
  me?: string[];
  them?: string[];
  board?: string[];
  /** Your chips before the hand and after it. */
  start?: number;
  end?: number;
  winner?: 'me' | 'b1';
  showdown?: boolean;
  allIn?: boolean;
  ranOut?: boolean;
  moves?: { street: string; playerId: string; move: string }[];
  variant?: string;
}

function game(s: Spec): Game {
  const start = s.start ?? 1000;
  const end = s.end ?? start;
  const winner = s.winner ?? (end >= start ? 'me' : 'b1');
  const pot = Math.max(20, Math.abs(end - start) * 2);
  return {
    id: s.id ?? 't1',
    status: 'playing',
    settings: { variant: s.variant ?? 'holdem', startingStack: 1000, bigBlind: 10, smallBlind: 5 },
    players: [
      { id: 'me', name: 'Me', stack: end },
      { id: 'b1', name: 'Bot', bot: true, stack: 2000 - end },
    ],
    hand: {
      number: s.number ?? 1,
      variant: s.variant ?? 'holdem',
      board: s.board ?? ['2c', '7d', '9h', 'Js', '3s'],
      ranOut: s.ranOut ?? false,
      startStacks: { me: start, b1: 2000 - start },
      seats: [
        { playerId: 'me', cards: s.me ?? ['Ah', 'Kd'], folded: false, allIn: !!s.allIn, total: pot / 2 },
        { playerId: 'b1', cards: s.them ?? [], folded: false, allIn: !!s.allIn, total: pot / 2 },
      ],
      actions: s.moves ?? [{ street: 'preflop', playerId: 'me', move: 'call' }],
      result: { showdown: s.showdown ?? false, pots: [{ amount: pot, eligible: ['me', 'b1'], winners: [winner] }], won: { [winner]: pot }, names: {} },
    },
  } as unknown as Game;
}

const play = (r: MoreStats, s: Spec, chance: number | null = null) => tallyHand(r, game(s), 'me', NOW, chance);

describe('the bigger stats', () => {
  it('counts chips won, the overall and the biggest loss from your stack', () => {
    let r = play(EMPTY_STATS, { start: 1000, end: 1300 });
    r = play(r, { number: 2, start: 1300, end: 900 });
    expect(r.tracked).toBe(2);
    expect(r.chipsWon).toBe(600);
    expect(r.net).toBe(-100);
    expect(r.biggestLoss).toBe(400);
    expect(r.nets).toEqual([300, -400]);
  });

  it('keeps only the last 100 hands for the chips line', () => {
    let r = EMPTY_STATS;
    for (let i = 0; i < TRAIL + 5; i++) r = play(r, { number: i + 1, start: 1000, end: 1000 + i });
    expect(r.nets.length).toBe(TRAIL);
    expect(r.nets[0]).toBe(5);
  });

  it('counts the hands you play and how hard you play them, and names your style', () => {
    let r = EMPTY_STATS;
    for (let i = 0; i < 20; i++) {
      const moves = i < 5 ? [{ street: 'preflop', playerId: 'me', move: 'raise' }, { street: 'flop', playerId: 'me', move: 'bet' }] : [{ street: 'preflop', playerId: 'me', move: 'fold' }];
      r = play(r, { number: i + 1, moves });
    }
    expect(r.vpip).toBe(5);
    expect(r.aggr).toBe(10);
    expect(r.calls).toBe(0);
    const style = styleOf(r)!;
    expect(style.name).toBe('The Shark');
    expect(style.loose).toBeCloseTo(0.25);
    expect(styleOf({ ...r, tracked: 19 })).toBeNull();
    // Checking your big blind isn't playing a hand.
    expect(play(EMPTY_STATS, { moves: [{ street: 'preflop', playerId: 'me', move: 'check' }] }).vpip).toBe(0);
  });

  it('keeps an all-in record and counts bad beats and suckouts by your chance when the money went in', () => {
    let r = play(EMPTY_STATS, { allIn: true, start: 1000, end: 0 }, 0.82);
    r = play(r, { number: 2, allIn: true, start: 500, end: 1000 }, 0.3);
    r = play(r, { number: 3, allIn: true, start: 1000, end: 2000 }, 0.7);
    expect([r.allIns, r.allInWon, r.allInLost]).toEqual([3, 2, 1]);
    expect(r.badBeats).toBe(1);
    expect(r.worstBeat).toBeCloseTo(0.82);
    expect(r.suckouts).toBe(1);
    expect(r.bestSuckout).toBeCloseTo(0.3);
  });

  it('works out your chance from the cards when every hand was face up', () => {
    const g = game({ me: ['Ah', 'Ad'], them: ['7c', '2s'], board: ['Kd', 'Qh', '4c', '7h', '7d'], ranOut: true, allIn: true, end: 0, moves: [{ street: 'preflop', playerId: 'me', move: 'allin' }, { street: 'preflop', playerId: 'b1', move: 'call' }] });
    const chance = allInChance(g, 'me')!;
    expect(chance).toBeGreaterThan(0.85);
    expect(chance).toBeLessThan(0.92);
    expect(tallyHand(EMPTY_STATS, g, 'me', NOW).badBeats).toBe(1);
    // No run-out, or a game whose board can change, gives no chance.
    expect(allInChance(game({ them: ['7c', '2s'] }), 'me')).toBeNull();
    const dice = game({ me: ['Ah', 'Ad'], them: ['7c', '2s'], ranOut: true, variant: 'dice' });
    expect(allInChance(dice, 'me')).toBeNull();
  });

  it('counts a cooler when you lose a showdown with a full house or better', () => {
    const r = play(EMPTY_STATS, { me: ['9c', '9d'], them: ['Jh', 'Jd'], board: ['9s', 'Jc', '2h', '2d', '5c'], showdown: true, start: 1000, end: 500 });
    expect(r.coolers).toBe(1);
    expect(play(EMPTY_STATS, { me: ['9c', '9d'], showdown: true, start: 1000, end: 500 }).coolers).toBe(0);
  });

  it('tracks winning and dry runs with their records', () => {
    let r = EMPTY_STATS;
    const results = [1, 1, 1, 0, 0, 1, 0, 0, 0, 0];
    results.forEach((w, i) => (r = play(r, { number: i + 1, start: 1000, end: w ? 1100 : 990 })));
    expect(r.bestWinRun).toBe(3);
    expect(r.winRun).toBe(0);
    expect(r.bestDryRun).toBe(4);
    expect(r.dryRun).toBe(4);
  });

  it('adds up chips by starting hand and finds the lucky and nemesis hands', () => {
    let r = play(EMPTY_STATS, { me: ['Ks', 'As'], start: 1000, end: 1500 });
    r = play(r, { number: 2, me: ['Ad', 'Kd'], start: 1500, end: 1700 });
    r = play(r, { number: 3, me: ['7c', '2h'], start: 1700, end: 1600 });
    r = play(r, { number: 4, me: ['2d', '7s'], start: 1600, end: 1400 });
    r = play(r, { number: 5, me: ['Qc', 'Qd'], start: 1400, end: 2000 });
    expect(r.starts.AKs).toMatchObject({ n: 2, net: 700, cards: ['Ad', 'Kd'] });
    const { lucky, nemesis } = startExtremes(r);
    expect(lucky?.[0]).toBe('AKs');
    // Pocket queens won more but only once: a lucky hand needs two.
    expect(nemesis?.[0]).toBe('72o');
    expect(nemesis?.[1].net).toBe(-300);
  });

  it('names starting hands', () => {
    expect(startName(['Ks', 'As'])).toBe('AKs');
    expect(startName(['Qc', 'Qd'])).toBe('QQ');
    expect(startName(['2h', '7c'])).toBe('72o');
    expect(startWords('AKs')).toBe('Ace-King suited');
    expect(startWords('QQ')).toBe('Pocket queens');
    expect(startWords('72o')).toBe('Seven-Two offsuit');
  });

  it('remembers days played and the biggest comeback at a table you won', () => {
    let r = play(EMPTY_STATS, { id: 't9', start: 1000, end: 400 });
    r = play(r, { id: 't9', number: 2, start: 400, end: 150 });
    r = play(r, { id: 't9', number: 3, start: 150, end: 2000 });
    expect(r.days).toEqual(['2026-11-12']);
    const won = tallyGame(r, game({ id: 't9', end: 2000 }), 'me', 1);
    expect(won.comeback).toMatchObject({ low: 150, start: 1000 });
    expect(won.tables).toEqual([]);
    // Losing the table: no comeback.
    expect(tallyGame(r, game({ id: 't9' }), 'me', 2).comeback).toBeNull();
  });

  it('reads broken storage as empty', () => {
    expect(cleanStats(null)).toEqual(EMPTY_STATS);
    expect(cleanStats({ tracked: -3, nets: ['x', 4] as unknown as number[], worstBeat: 7 } as Partial<MoreStats>)).toMatchObject({ tracked: 0, nets: [4], worstBeat: null });
  });
});
