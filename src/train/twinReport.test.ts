import { beforeEach, describe, expect, it } from 'vitest';
import { emptyTwin, type HandRecord, type Move, type Street } from '../game';
import { addTwinHand, beginTwinGame, finishTwinGame, loadTwinGames, type TwinGame } from '../state/twinGames';
import type { PlayedHand } from '../state/training';
import { twinGameLines, twinHabitsIntro } from './coach';
import { habitsOf, lossLine, lossStories, summarize } from './twinReport';

const storage = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) };
beforeEach(() => storage.clear());

/** A heads-up hand: 'me' on the button, 'foe' in the big blind. */
function hand(actions: [Street, 'me' | 'foe', Move, number][], board: string[], holes: Record<string, string[]>, showdown: boolean, won: number): PlayedHand {
  const record: HandRecord = {
    tableId: 't',
    number: 7,
    at: 0,
    smallBlind: 5,
    bigBlind: 10,
    buttonId: 'me',
    players: [
      { id: 'me', name: 'Me', emoji: '🙂', seat: 0, stack: 1000 },
      { id: 'foe', name: 'Me AI', emoji: '🙂', seat: 1, stack: 1000 },
    ],
    actions: actions.map(([street, who, move, to]) => ({ street, playerId: who, move, to })),
    board,
    holes,
    won: { me: won, foe: 0 },
    showdown,
  };
  return { key: 't#7', heroId: 'me', record };
}

const game = (nets: number[]): TwinGame => ({ id: 't', at: 0, bb: 10, knew: 60, hands: nets.map((net, i) => ({ key: `t#${i + 1}`, number: i + 1, net })) });

describe('the twin report', () => {
  it('adds up a game', () => {
    const s = summarize(game([50, -30, -100, 20]));
    expect(s.hands).toBe(4);
    expect(s.net).toBe(-60);
    expect(s.won).toBe(0.5);
    expect(s.bbPer100).toBeCloseTo((-60 / 10 / 4) * 100);
    expect(summarize(game([])).bbPer100).toBe(0);
  });

  it('says in a sentence how you lost a hand', () => {
    const folded = hand([['preflop', 'me', 'call', 10], ['preflop', 'foe', 'check', 10], ['flop', 'foe', 'bet', 20], ['flop', 'me', 'call', 20], ['turn', 'foe', 'bet', 60], ['turn', 'me', 'fold', 0]], ['2c', '7d', '9h', 'Js'], { me: ['As', 'Kd'] }, false, 0);
    expect(lossLine(folded)).toBe('You folded on the turn after putting in 30.');
    const blind = hand([['preflop', 'me', 'fold', 0]], [], { me: ['7s', '2d'] }, false, 0);
    expect(lossLine(blind)).toContain('before the flop');
    const showdown = hand(
      [['preflop', 'me', 'raise', 25], ['preflop', 'foe', 'call', 25], ['flop', 'foe', 'check', 0], ['flop', 'me', 'check', 0], ['turn', 'foe', 'check', 0], ['turn', 'me', 'check', 0], ['river', 'foe', 'bet', 40], ['river', 'me', 'call', 40]],
      ['2c', '7d', '9h', 'Js', '3s'],
      { me: ['Ad', 'Kd'], foe: ['9d', '9s'] },
      true,
      0,
    );
    expect(lossLine(showdown)).toBe('You went to showdown with high cards and lost 65 to a very strong hand.');
  });

  it('picks the hands that cost most, and copes with ones too old to look at', () => {
    const g = game([50, -30, -100, -10, -60]);
    const stories = lossStories(g, () => null, 3);
    expect(stories.map((s) => s.number)).toEqual([3, 5, 2]);
    expect(stories[0].line).toBeNull();
    expect(lossStories(game([10, 20]), () => null)).toEqual([]);
  });

  it('names the habits that stand out, biggest first, and only with enough to go on', () => {
    const t = emptyTwin();
    t.hands = 200;
    Object.assign(t.stats, { betsFaced: 40, foldsToBet: 28, betOpps: 60, bets: 10, vpip: 70, pfr: 50, firstIn: 80, limps: 4 });
    const habits = habitsOf(t);
    expect(habits.map((h) => h.id)).toEqual(['fold-to-bet', 'bet']);
    expect(habits[0].line).toContain('70%');
    expect(habits[0].numbers).toBe('70% of 40 bets after the flop you fold to. Most players land between 32% and 52%.');
    expect(habits[1].line).toContain('17%');
    // Too few chances: nothing said.
    t.stats.betsFaced = 6;
    t.stats.foldsToBet = 6;
    expect(habitsOf(t).map((h) => h.id)).not.toContain('fold-to-bet');
  });

  it('says nothing is wrong when nothing is, and keeps to three habits', () => {
    const t = emptyTwin();
    t.hands = 200;
    Object.assign(t.stats, { vpip: 56, pfr: 40, betsFaced: 40, foldsToBet: 16, betOpps: 60, bets: 25, firstIn: 80, limps: 4 });
    expect(habitsOf(t)).toEqual([]);
    expect(twinHabitsIntro(0)).toContain('tough copy');
    Object.assign(t.stats, { vpip: 120, pfr: 30, limps: 40, betsFaced: 40, foldsToBet: 30, betOpps: 60, bets: 8, cbetOpps: 20, cbets: 3, postAgg: 30, postBluffs: 20 });
    expect(habitsOf(t).length).toBe(3);
  });

  it("is honest when it's still learning you, and when the game was short", () => {
    expect(twinGameLines(summarize(game([-100, -100, -100, 50, 20, 10])), 60).join(' ')).toContain('still learning you');
    expect(twinGameLines(summarize(game([-100, -100, -100, 50, 20, 10])), 500).join(' ')).not.toContain('still learning');
    expect(twinGameLines(summarize(game([1, 2])), 60)[0]).toContain('short one');
    expect(twinGameLines(summarize(game([100, 100, 100, 100, 100])), 500)[0]).toBe('You beat your twin by 500 chips over 5 hands.');
  });
});

describe('twin games kept on this phone', () => {
  it('keeps hands per game once, notes where you finished, and holds the last five games', () => {
    beginTwinGame('a', 10, 55, 1);
    addTwinHand('a', { key: 'a#1', number: 1, net: 20 });
    addTwinHand('a', { key: 'a#1', number: 1, net: 20 });
    addTwinHand('a', { key: 'a#2', number: 2, net: -50 });
    finishTwinGame('a', 2);
    expect(loadTwinGames()).toEqual([{ id: 'a', at: 1, bb: 10, knew: 55, hands: [{ key: 'a#1', number: 1, net: 20 }, { key: 'a#2', number: 2, net: -50 }], place: 2 }]);
    for (const id of ['b', 'c', 'd', 'e', 'f']) beginTwinGame(id, 10, 60);
    expect(loadTwinGames().map((g) => g.id)).toEqual(['b', 'c', 'd', 'e', 'f']);
  });

  it('starts a game on the first hand if it missed the start, and ignores damaged saves', () => {
    addTwinHand('x', { key: 'x#1', number: 1, net: 5 }, 20);
    expect(loadTwinGames()[0]).toMatchObject({ id: 'x', bb: 20, knew: 0 });
    storage.set('flipup.twingames', '[{"id":3},{"id":"ok","at":1,"hands":[{"key":"k"}]}]');
    expect(loadTwinGames()).toEqual([{ id: 'ok', at: 1, bb: 10, knew: 0, hands: [] }]);
  });
});
