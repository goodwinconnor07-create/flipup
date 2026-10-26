import { describe, expect, it } from 'vitest';
import { emptyTwin } from '../game';
import type { TwinGame } from '../state/twinGames';
import { confidenceWord, planCheck, planLines, scout } from './scout';
import { scoutLines } from './coach';

const twin = (stats: Record<string, number>, hands = 150) => {
  const t = emptyTwin();
  t.hands = hands;
  Object.assign(t.stats, { vpip: Math.round(hands * 0.27), pfr: Math.round(hands * 0.2), ...stats });
  return t;
};

describe('scouting a twin', () => {
  it('turns what stands out into what they do and a plan, biggest first', () => {
    const notes = scout(twin({ betsFaced: 40, foldsToBet: 30, betOpps: 60, bets: 12 }));
    expect(notes.map((n) => n.id)).toEqual(['fold-to-bet', 'bet']);
    expect(notes[0].say).toBe('They fold to 75% of bets after the flop.');
    expect(notes[0].plan).toContain('Bet into them');
    expect(notes[0].kind).toBe('pressure');
    expect(notes[0].numbers).toBe('75% of 40 bets after the flop you fold to. Most players land between 32% and 52%.');
  });

  it('reads the other side of a habit as a different plan', () => {
    const calls = scout(twin({ betsFaced: 40, foldsToBet: 4 }));
    expect(calls[0]).toMatchObject({ id: 'fold-to-bet', kind: 'value' });
    expect(calls[0].plan).toContain("Don't bluff");
    const tight = scout(twin({ vpip: 15, pfr: 12 }));
    expect(tight[0]).toMatchObject({ id: 'hands', kind: 'pressure' });
  });

  it('knows when a player gives their hand away by the size of their bets', () => {
    const t = twin({});
    t.stats.sizeN = [5, 0, 0, 0, 5, 0, 0];
    t.stats.sizeSum = [1.5, 0, 0, 0, 4, 0, 0];
    const notes = scout(t);
    expect(notes[0]).toMatchObject({ id: 'size-tell', kind: 'fold-more' });
    expect(notes[0].say).toContain('bet big with good hands (80% of the pot)');
  });

  it("has nothing to say about someone who plays like most people, or that it hasn't seen enough of", () => {
    expect(scout(twin({ betsFaced: 40, foldsToBet: 16, betOpps: 60, bets: 25 }))).toEqual([]);
    expect(scout(twin({ betsFaced: 6, foldsToBet: 6 }))).toEqual([]);
    expect(confidenceWord(30)).toBe('a rough copy');
    expect(confidenceWord(200)).toBe('a close copy');
  });

  it('introduces the report by how well it knows them', () => {
    expect(scoutLines('Dana', null, 0, '')[0]).toContain("haven't seen Dana play");
    expect(scoutLines('Dana', { hands: 12, ready: false, source: 'seen' }, 0, '').join(' ')).toContain('tables with them');
    expect(scoutLines('Dana', { hands: 120, ready: true, source: 'shared' }, 2, 'a decent copy')[0]).toBe("Here's how Dana plays. This copy is built on 120 hands, so it's a decent copy.");
    expect(scoutLines('Dana', { hands: 120, ready: true, source: 'shared' }, 0, 'x')[1]).toContain('Nothing stands out');
  });
});

describe('how the plan did', () => {
  const f = (end: 'fold-them' | 'fold-me' | 'showdown', lastAgg?: 'me' | 'them') => ({ btn: true, mine: ['Ac', 'Ad'], theirs: ['Kh', '5d'], board: [], sd: end === 'showdown', out: 'flop' as const, end, ...(lastAgg ? { lastAgg } : {}) });
  const game = (hands: [number, ReturnType<typeof f>][]): TwinGame => ({ id: 't', at: 0, bb: 10, knew: 100, friend: 'BCDFG', hands: hands.map(([net, facts], i) => ({ key: `t#${i}`, number: i + 1, net, facts })) });

  it('counts pots your bets won and how you did at showdown', () => {
    const g = game([[30, f('fold-them', 'me')], [20, f('fold-them', 'me')], [-10, f('fold-me', 'them')], [60, f('showdown', 'me')], [-80, f('showdown', 'them')], [15, f('fold-them', 'them')]]);
    expect(planCheck(g)).toEqual({ hands: 6, wonUncontested: 3, madeFold: 2, showdowns: 2, showdownsWon: 1, net: 35 });
    expect(planCheck(game([[30, f('fold-them', 'me')]]))).toBeNull();
  });

  it('says whether the plan worked, by what the plan was', () => {
    const good = { hands: 10, wonUncontested: 4, madeFold: 3, showdowns: 4, showdownsWon: 3, net: 90 };
    expect(planLines(good, 'pressure')).toEqual(['Your bets and raises won the pot 3 times out of 10 hands.', "That's the plan working: they gave up pots you'd have lost at a showdown."]);
    expect(planLines({ ...good, madeFold: 0 }, 'pressure')[1]).toContain('Not many folds');
    expect(planLines(good, 'value')).toEqual(['You won 3 of 4 showdowns.', "Your good hands got paid. That's the plan working."]);
    expect(planLines({ ...good, showdownsWon: 1 }, 'call-down')[1]).toContain("didn't pay");
    expect(planLines({ ...good, showdownsWon: 1 }, 'fold-more')[1]).toContain('Fold the medium hands');
  });
});
