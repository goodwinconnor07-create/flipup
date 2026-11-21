import { describe, it, expect } from 'vitest';
import { decisionPhilosophy, applySizingPreferences, sharedUnbeatableBoard } from './philosophy';
import { BotService } from './service';
import { BotFactory, validateProfile } from './identity';
import { everydayProfile, EVERYDAY_FOCUSES, everydayThinkMs } from './everyday';
import { tableCast, tableProfile } from './tableCast';
import { observeSessionFeel, sessionFeel, learnPublicSession } from './sessionFeel';
import { emptyMemory, validateMemory } from './memory';
import { observeBehavior } from './behaviorMemory';
import { specifiedWorlds } from './specifiedWorlds';
import { calibrationContexts } from './calibration';
import { legalActions, type InformationSet } from './information';
import { simulate } from './simulation';
import { LEARNING_CONFIG } from './learningConfig';
import { RealismAudit } from './realism';
import type { StrategyPrediction } from './strategy';
import { decisionFixture } from './testFixtures';
import { makeMove } from '../game/holdem';
import { confirmedHandStory, rememberHandStory } from './handStory';

const info = () => structuredClone(specifiedWorlds().find((w) => w.id === 'thin-value')!.information);
const profile = (i: InformationSet, focus: 'patient' | 'pressure' | 'balanced' | 'curious' = 'balanced') =>
  everydayProfile(new BotFactory().generate(i.heroId, 1), 'Test', 'casual', focus);
function prediction(i: InformationSet, values?: number[]): StrategyPrediction {
  const actions = legalActions(i, true, true);
  return {
    actions,
    probabilities: actions.map(() => 1 / actions.length),
    values: values ?? actions.map(() => 0),
    valueStandardErrors: actions.map(() => 0),
    modelVersion: 'baseline-7',
    source: 'multi-street-lookahead',
    coverage: 'modelled',
    equity: 0.8,
    equityStandardError: 0,
    warnings: [],
  };
}
describe('Live decision philosophy', () => {
  it('preserves a confirmed intention through retries and reload while the next move is pending', () => {
    const i = info(),
      m = emptyMemory(i.heroId, i.tableId);
    m.pendingHandStory = {
      version: 'hand-story-1',
      hand: i.hand,
      actionIndex: 3,
      street: 'flop',
      principle: 'defend-showdown-at-model-price',
      move: 'call',
      facedPrice: 80,
      level: 6,
      draw: 'none',
      nextCard: 'protect-showdown-value',
    };
    expect(confirmedHandStory(m, i)?.nextCard).toBe('protect-showdown-value');
    const service = new BotService({ predict: () => prediction(i) }, 'contextual', LEARNING_CONFIG, { experience: 'human-table-1' });
    const before = service.decide(i, profile(i), m, 3);
    rememberHandStory(m, before);
    const after = service.decide(i, profile(i), JSON.parse(JSON.stringify(m)), 3);
    expect(after.finalDistribution).toEqual(before.finalDistribution);
    expect(after.action).toEqual(before.action);
    expect(after.rationale).toEqual(before.rationale);
    expect(m.handStory?.nextCard).toBe('protect-showdown-value');
    expect(m.pendingHandStory?.actionIndex).toBe(i.actions.length);
    validateMemory(m);
  });
  it('ignores cancelled intentions and closes the story at the next hand', () => {
    const i = info(),
      m = emptyMemory(i.heroId, i.tableId);
    const service = new BotService({ predict: () => prediction(i) }, 'contextual', LEARNING_CONFIG, { experience: 'human-table-1' });
    const t = service.decide(i, profile(i), m, 3);
    rememberHandStory(m, t);
    expect(confirmedHandStory(m, i)).toBeUndefined();
    const cancelled = structuredClone(i);
    cancelled.actions.push({ street: i.street, playerId: i.heroId, move: 'fold', to: 0, outOfTurn: true });
    expect(confirmedHandStory(m, cancelled)).toBeUndefined();
    expect(confirmedHandStory(m, { ...i, hand: i.hand + 1 })).toBeUndefined();
    expect(t.rationale.alternatives.length).toBeGreaterThan(0);
    for (const a of t.rationale.alternatives) expect(a.scoreGapBb!).toBeLessThanOrEqual(t.rationale.closeBandBb + 1e-9);
  });
  it('recognizes locked shared boards without confusing a possible flush or better kicker', () => {
    for (const board of [
      ['Ts', 'Js', 'Qs', 'Ks', 'As'],
      ['Ac', 'Ad', 'Ah', 'As', 'Kd'],
      ['2c', '2d', '2h', '2s', 'Ac'],
      ['Ts', 'Jh', 'Qc', 'Kd', 'As'],
    ])
      expect(sharedUnbeatableBoard(board)).toBe(true);
    for (const board of [
      ['Ts', 'Js', 'Qs', 'Kh', 'Ad'],
      ['Ac', 'Ad', 'Ah', 'As', 'Qd'],
      ['2c', '2d', '2h', '2s', 'Kc'],
    ])
      expect(sharedUnbeatableBoard(board)).toBe(false);
  });
  it('checks or calls a shared unbeatable board instead of inventing value or fold equity', () => {
    for (const facing of [false, true]) {
      const i = facing ? structuredClone(specifiedWorlds().find((w) => w.id === 'losing-call')!.information) : info();
      i.hole = ['2h', '3d'];
      i.board = ['Ts', 'Js', 'Qs', 'Ks', 'As'];
      const p = prediction(
        i,
        legalActions(i, true, true).map((a) => (a.to === undefined ? 0 : 100)),
      );
      const t = new BotService({ predict: () => p }, 'contextual', LEARNING_CONFIG, { experience: 'human-table-1' }).decide(
        i,
        profile(i),
        emptyMemory(i.heroId, i.tableId),
        11,
      );
      expect(t.action.move).toBe(facing ? 'call' : 'check');
      expect(t.rationale.principle).toBe('claim-shared-board-pot');
      expect(t.philosophy.facts.sharedBoard).toBe(true);
    }
  });
  it('uses true checked-to position and own board interaction before selecting an action', () => {
    const i = info(),
      p = prediction(i),
      m = emptyMemory(i.heroId, i.tableId);
    const plan = decisionPhilosophy(i, p, profile(i, 'pressure'), m);
    expect(plan.facts).toMatchObject({ inPosition: true, checkedTo: true, coverage: true });
    const bet = plan.actions.find((a) => a.move === 'bet')!;
    expect(bet.factors).toEqual(expect.arrayContaining(['last-to-act', 'checked-to', 'made-hand-showdown-value', 'thin-value-preference']));
    expect(bet.preference).toBeGreaterThan(0);
    const first = calibrationContexts().find((c) => c.street === 'flop' && c.legal.canCheck)!;
    const early = decisionPhilosophy(first, prediction(first), profile(first), emptyMemory(first.heroId, first.tableId));
    expect(early.facts.inPosition).toBe(false);
    expect(early.facts.checkedTo).toBe(false);
    expect(early.actions.flatMap((a) => a.factors)).not.toContain('last-to-act');
  });
  it('shifts close decisions with personality and slows down when a new board card changes the line', () => {
    const i = info(),
      m = emptyMemory(i.heroId, i.tableId);
    const patient = decisionPhilosophy(i, prediction(i), profile(i, 'patient'), m),
      pressure = decisionPhilosophy(i, prediction(i), profile(i, 'pressure'), m);
    expect(patient.actions.find((a) => a.move === 'check')!.preference).toBeGreaterThan(
      pressure.actions.find((a) => a.move === 'check')!.preference,
    );
    i.street = 'turn';
    i.board = ['Kd', '9c', '4s', 'Ah'];
    i.actions = [
      { street: 'flop', playerId: i.heroId, move: 'bet', to: 80 },
      { street: 'flop', playerId: 'opponent', move: 'call', to: 80 },
      { street: 'turn', playerId: 'opponent', move: 'check', to: 0 },
    ];
    const changed = decisionPhilosophy(i, prediction(i), profile(i), m);
    expect(changed.facts.scareCard).toBe(true);
    expect(changed.actions.find((a) => a.move === 'check')!.factors).toContain('board-became-more-threatening');
    expect(changed.actions.find((a) => a.move === 'bet')!.preference).toBeLessThan(0);
  });
  it('chooses supported actions and supplies a specific explanation for every production decision', () => {
    let n = 0;
    const audit = new RealismAudit();
    const r = simulate(24, 1611011, 3, {
      agents: ['bot', 'loose-passive', 'competent'],
      everyday: 'casual',
      experience: true,
      startingStacksBb: [60, 12, 100],
      onDecision: (t) => {
        n++;
        audit.observe(t);
        expect(t.experienceVersion).toBe('human-table-1');
        expect(t.rationale.principle.length).toBeGreaterThan(0);
        expect(t.rationale.factors.length).toBeGreaterThan(0);
        const k = t.rationale.actionIndex;
        expect(t.prediction.actions[k]).toEqual(t.action);
        expect(t.philosophy.actions[k].plausible).toBe(true);
        expect(t.finalDistribution[k]).toBeGreaterThan(0);
        if (t.information.street !== 'preflop') expect(t.deviation.estimatedValueLoss!).toBeLessThanOrEqual(t.deviation.budget + 1e-7);
        expect(JSON.parse(JSON.stringify(t.philosophy))).toEqual(t.philosophy);
      },
    });
    expect(n).toBeGreaterThan(30);
    expect(r.hands).toBe(24);
    expect(audit.report().flags).toEqual([]);
  }, 20000);
  it('retains an earlier value line through a checked street and revises it after opposing aggression', () => {
    const i = info();
    i.actions = [
      { street: 'preflop', playerId: i.heroId, move: 'raise', to: 20 },
      { street: 'preflop', playerId: 'opponent', move: 'call', to: 20 },
      { street: 'flop', playerId: 'opponent', move: 'check', to: 0 },
      { street: 'flop', playerId: i.heroId, move: 'bet', to: 80 },
      { street: 'flop', playerId: 'opponent', move: 'call', to: 80 },
      { street: 'turn', playerId: 'opponent', move: 'check', to: 0 },
      { street: 'turn', playerId: i.heroId, move: 'check', to: 0 },
      { street: 'river', playerId: 'opponent', move: 'check', to: 0 },
    ];
    const m = emptyMemory(i.heroId, i.tableId),
      p = decisionPhilosophy(i, prediction(i), profile(i), m);
    expect(p.facts.retainedInitiative).toBe(true);
    expect(p.actions.find((a) => a.move === 'bet')!.factors).toContain('resume-value-after-pot-control');
    i.actions[i.actions.length - 1] = { street: 'river', playerId: 'opponent', move: 'bet', to: 100 };
    i.currentBet = 100;
    i.legal = { ...i.legal, toCall: 100, canCheck: false, minTo: 200, word: 'Raise' };
    const opponent = i.players.find((p) => p.id === 'opponent')!;
    opponent.stack -= 100;
    opponent.total += 100;
    opponent.bet = 100;
    const revised = decisionPhilosophy(i, prediction(i), profile(i), m);
    expect(revised.facts.retainedInitiative).toBe(false);
    expect(revised.actions.flatMap((a) => a.factors)).not.toContain('resume-value-after-pot-control');
  });
  it('does not describe a clearly losing call as a random close decision', () => {
    const i = specifiedWorlds().find((w) => w.id === 'losing-call')!.information;
    const p = prediction(
      i,
      legalActions(i, true, true).map((a) => (a.move === 'fold' ? 0 : a.move === 'call' ? -100 : -1000)),
    );
    const t = new BotService({ predict: () => p }, 'contextual', LEARNING_CONFIG, { experience: 'human-table-1' }).decide(
      i,
      profile(i),
      emptyMemory(i.heroId, i.tableId),
      5,
    );
    expect(t.action.move).toBe('fold');
    expect(t.finalDistribution[t.prediction.actions.findIndex((a) => a.move === 'call')]).toBe(0);
    expect(t.rationale.principle).toBe('decline-price');
    expect(t.rationale.mixedCloseChoice).toBe(false);
  });
  it('uses the contestable pot when a short stack faces an uncallable overbet', () => {
    const i = structuredClone(specifiedWorlds().find((w) => w.id === 'losing-call')!.information);
    i.currentBet = 10000;
    i.legal = { ...i.legal, toCall: 900, callIsAllIn: true, canRaise: false, minTo: 900, maxTo: 900 };
    const opponent = i.players.find((p) => p.id === 'opponent')!;
    opponent.stack = 900;
    opponent.bet = 10000;
    opponent.total = 10100;
    i.actions[i.actions.length - 1] = { street: 'river', playerId: 'opponent', move: 'bet', to: 10000 };
    const p = prediction(i, [0, -500]),
      ph = decisionPhilosophy(i, p, profile(i), emptyMemory(i.heroId, i.tableId));
    expect(ph.closeBandBb).toBe(12);
    expect(ph.actions.find((a) => a.move === 'call')!.plausible).toBe(false);
  });
  it('uses established caller evidence to change sizes while preserving aggressive mass', () => {
    const i = info();
    i.hand = 61;
    const p = prediction(i),
      m = emptyMemory(i.heroId, i.tableId);
    const plain = decisionPhilosophy(i, p, profile(i), m);
    for (let hand = 1; hand <= 60; hand++)
      for (const [actionIndex, size] of ['small', 'medium', 'large'].entries())
        observeBehavior(m, {
          observerId: i.heroId,
          tableId: i.tableId,
          targetId: 'opponent',
          hand,
          actionIndex,
          context: `river|HU|facing|${size}`,
          label: 1,
        });
    const learned = decisionPhilosophy(i, p, profile(i), m);
    const distribution = p.probabilities,
      base = applySizingPreferences(distribution, plain),
      adjusted = applySizingPreferences(distribution, learned);
    const bets = p.actions.map((a, k) => ({ a, k })).filter((x) => x.a.to !== undefined && x.a.to! <= 250);
    const small = bets[0].k,
      big = bets.at(-1)!.k;
    expect(learned.actions[big].factors).toContain('established-calling-tendency');
    expect(adjusted[big] / adjusted[small]).toBeGreaterThan(base[big] / base[small]);
    const mass = (d: number[]) => d.reduce((s, v, k) => s + (p.actions[k].to !== undefined ? v : 0), 0);
    expect(mass(adjusted)).toBeCloseTo(mass(distribution), 12);
    expect(adjusted[p.actions.findIndex((a) => a.move === 'check')]).toBe(distribution[p.actions.findIndex((a) => a.move === 'check')]);
  });
  it('keeps table casts balanced, stable on reload and stable for existing players after joins', () => {
    const players = Array.from({ length: 8 }, (_, n) => ({ id: `bot${n}`, name: `Name${n}` }));
    const cast = tableCast('tableA', players);
    expect(EVERYDAY_FOCUSES.map((f) => Object.values(cast.focuses).filter((x) => x === f).length)).toEqual([2, 2, 2, 2]);
    expect(tableCast('tableA', players, JSON.parse(JSON.stringify(cast)))).toEqual(cast);
    const partial = tableCast('tableA', players.slice(0, 3)),
      joined = tableCast('tableA', players, partial);
    for (const p of players.slice(0, 3)) expect(joined.focuses[p.id]).toBe(partial.focuses[p.id]);
    const base = new BotFactory().generate('bot0', 3);
    const a = tableProfile(base, 'Name0', 'casual', 'tableA', cast.focuses.bot0),
      b = tableProfile(base, 'Name0', 'casual', 'tableB', cast.focuses.bot0);
    validateProfile(a);
    validateProfile(b);
    expect(a.seed).not.toBe(b.seed);
    expect(a).toEqual(tableProfile(base, 'Name0', 'casual', 'tableA', cast.focuses.bot0));
  });
  it('keeps temporary public-result feelings bounded, deduplicated and short-lived', () => {
    const m = emptyMemory('bot', 'table');
    observeSessionFeel(m, { hand: 1, netBb: -40, opposingRaises: 4 });
    const after = structuredClone(m);
    observeSessionFeel(m, { hand: 1, netBb: 100, opposingRaises: 0 });
    expect(m).toEqual(after);
    expect(sessionFeel(m, 2).caution).toBe(0.35);
    expect(sessionFeel(m, 10).caution).toBeLessThan(0.03);
    expect(() => sessionFeel(m, 1)).toThrow();
    validateMemory(m);
    for (let hand = 2; hand <= 12; hand++) observeSessionFeel(m, { hand, netBb: -100, opposingRaises: 10 });
    expect(sessionFeel(m, 13).caution).toBeLessThanOrEqual(1);
  });
  it('derives session reactions without reading any hidden hand or deck', () => {
    const { game, ctx } = decisionFixture([60, 100]);
    const id = game.hand!.toAct!,
      m = emptyMemory(id, game.id);
    expect(makeMove(game, 'fold', undefined, ctx)).toBeNull();
    expect(game.hand!.result).not.toBeNull();
    learnPublicSession(game, [m]);
    const first = structuredClone(m);
    game.hand!.deck.reverse();
    for (const s of game.hand!.seats) s.cards = ['As', 'Ah'];
    learnPublicSession(game, [m]);
    expect(m).toEqual(first);
  });
  it('sets the clock from public complexity rather than the chosen move or private strength', () => {
    const i = info(),
      p = profile(i),
      seed = 11;
    expect(everydayThinkMs(i, p, seed)).toBe(everydayThinkMs({ ...i, hole: ['8h', '6h'] }, p, seed));
    const simple = everydayThinkMs(i, p, seed),
      hard = everydayThinkMs({ ...i, legal: { ...i.legal, toCall: 200 } }, p, seed);
    expect(hard).toBeGreaterThan(simple);
    expect(hard).toBeLessThanOrEqual(1900);
  });
});
