import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { startHand, makeMove, dealNextStreet, runoutStep, showdown } from '../game/holdem';
import { fullDeck, hashString, rankOf, seededRng, shuffle } from '../game/cards';
import { options } from '../game/selectors';
import { redactForDevice } from '../game/redact';
import type { Game, Move, HandAction } from '../game/types';
import { everydayThought, updateEverydayMemory } from '../bot_engine/everydayLive';
import type { DecisionTrace } from '../bot_engine/service';

export const RESEARCH_PROTOCOL = 'bot-research-1' as const;
export const RESEARCH_ENGINE = 'human-table-1/d1ee55e7d787';
export const RESEARCH_DEVICE = 'research-participant';
export type ScenarioId = 'position' | 'crowded' | 'draws' | 'pressure' | 'sidepots' | 'continuous';
export const SCENARIOS: Record<ScenarioId, { title: string; purpose: string }> = {
  position: { title: 'Heads-up position', purpose: 'Checked-to decisions, value sizing and pot control.' },
  crowded: { title: 'Raised multiway pot', purpose: 'Cold calls, squeezes and respect for several opponents.' },
  draws: { title: 'Draw-heavy board', purpose: 'Draw prices, completed draws and missed draws.' },
  pressure: { title: 'Changing board', purpose: 'Whether a plan changes sensibly on a threatening turn or river.' },
  sidepots: { title: 'Unequal stacks', purpose: 'Short stacks, commitment and side-pot decisions.' },
  continuous: { title: 'Continuous table', purpose: 'Natural repetition, individual reads and bot-versus-bot adaptation.' },
};
const TARGETS: ScenarioId[] = ['position', 'crowded', 'draws', 'pressure', 'sidepots'];
export type ResearchFeedback = { odd: boolean; note: string; realism?: number; enjoyment?: number };
export type ResearchDecision = Pick<
  DecisionTrace,
  | 'information'
  | 'profile'
  | 'samplingSeed'
  | 'action'
  | 'finalDistribution'
  | 'deviation'
  | 'philosophy'
  | 'rationale'
  | 'latencyMs'
  | 'adaptation'
> & {
  model: string;
  source: string;
  actions: DecisionTrace['prediction']['actions'];
  scores?: number[] | null;
};
export interface ResearchEvent {
  kind: 'setup' | 'human' | 'bot';
  action: HandAction;
  elapsedMs: number;
}
export interface ResearchHand {
  protocol: typeof RESEARCH_PROTOCOL;
  engine: string;
  index: number;
  scenario: ScenarioId;
  seed: number;
  /** Private replay checkpoint, uploaded only after this hand finishes. Never rendered. */
  initial: Game;
  events: ResearchEvent[];
  decisions: ResearchDecision[];
  result: NonNullable<Game['hand']>['result'];
  board: string[];
  holes: Record<string, string[]>;
  endingStacks: Record<string, number>;
  feedback: ResearchFeedback;
  durationMs: number;
}
export interface ResearchRun {
  protocol: typeof RESEARCH_PROTOCOL;
  engine: string;
  id: string;
  seed: number;
  limit: number;
  startedAt: number;
  index: number;
  recorded: boolean;
  checkpointRevision: number;
  paused: boolean;
  elapsedMs: number;
  handElapsedMs: number;
  scenario: ScenarioId;
  game: Game;
  initial: Game;
  events: ResearchEvent[];
  decisions: ResearchDecision[];
  feedback: ResearchFeedback;
  error?: string;
}
export function scenarioAt(index: number, limit: number): ScenarioId {
  const targeted = Math.floor(limit / 2),
    per = Math.max(1, Math.floor(targeted / TARGETS.length));
  return index < per * TARGETS.length ? TARGETS[Math.floor(index / per)] : 'continuous';
}
function context(run: ResearchRun) {
  return {
    now: run.startedAt + run.elapsedMs,
    deviceId: RESEARCH_DEVICE,
    rng: seededRng(hashString(`${run.seed}:${run.index}:${run.game.hand?.seq ?? 0}`)),
  };
}
function plainSnapshot(game: Game): Game {
  const g = structuredClone(game);
  g.logs = [];
  if (g.botTable) g.botTable.traces = [];
  return g;
}
function createResearchGame(run: Pick<ResearchRun, 'id' | 'seed' | 'index' | 'startedAt' | 'scenario'>): Game {
  const seats =
    run.scenario === 'position' ? 2 : run.scenario === 'crowded' || run.scenario === 'continuous' ? 6 : run.scenario === 'sidepots' ? 4 : 3;
  const game = createTable({
    hostDeviceId: RESEARCH_DEVICE,
    name: 'You',
    emoji: '🙂',
    bots: seats - 1,
    code: null,
    now: run.startedAt,
    settings: { ...DEFAULT_SETTINGS, variant: 'holdem', startingStack: 1000, smallBlind: 5, bigBlind: 10, turnSeconds: 0, rebuys: true },
    rng: seededRng(hashString(`${run.seed}:${run.index}:roster`)),
  });
  game.id = `research:${run.id}:${run.scenario === 'continuous' ? 'continuous' : run.index}`;
  game.status = 'playing';
  game.buttonSeat = run.scenario === 'crowded' ? 5 : run.index % seats;
  const stacks =
    run.scenario === 'crowded' ? [100, 60, 25, 140, 80, 40] : run.scenario === 'sidepots' ? [100, 12, 40, 160] : Array(seats).fill(100);
  for (const [n, p] of game.players.entries()) {
    p.id = `seat-${n}`;
    p.deviceId = n === 0 ? RESEARCH_DEVICE : null;
    p.stack = p.bought = stacks[n] * 10;
  }
  return game;
}
function setStudyDeal(run: ResearchRun): void {
  if (run.scenario === 'continuous' || run.scenario === 'sidepots') return;
  const boards =
    run.scenario === 'draws'
      ? [
          ['Jh', 'Th', '4c', '2s', 'Ah'],
          ['9s', '8s', '2d', 'Kc', '3h'],
          ['Qd', 'Jc', '5d', 'Td', '2c'],
        ]
      : run.scenario === 'pressure'
        ? [
            ['Kd', '9c', '4s', 'Ah', '2h'],
            ['Qs', '7h', '2s', '9s', 'Js'],
            ['8h', '6d', '3c', '8s', 'Ac'],
          ]
        : [
            ['Kh', '9d', '4s', '2c', '7h'],
            ['Qc', '8d', '3s', 'As', '6h'],
            ['7c', '7d', '2h', 'Js', '9s'],
          ];
  const rng = seededRng(hashString(`${run.seed}:${run.index}:study-deal`));
  const suits = shuffle(['s', 'h', 'd', 'c'], rng);
  const flop = boards[Math.floor(rng() * boards.length)].slice(0, 3).map((c) => c[0] + suits[['s', 'h', 'd', 'c'].indexOf(c[1])]);
  const available = shuffle(
    fullDeck().filter((c) => !flop.includes(c)),
    rng,
  );
  // Select a board category without a repeated, learnable turn/river sequence. No holding conditions the runout.
  const twoSuit = flop.find((c) => flop.filter((d) => d[1] === c[1]).length === 2)?.[1];
  const scary = available.filter((c) => (twoSuit && c[1] === twoSuit) || rankOf(c) > Math.max(...flop.map(rankOf)));
  const turn = run.scenario === 'pressure' && scary.length ? scary[Math.floor(rng() * scary.length)] : available[0];
  available.splice(available.indexOf(turn), 1);
  const river = available.shift()!;
  const board = [...flop, turn, river];
  const deck = available;
  for (const seat of run.game.hand!.seats) seat.cards = [deck.shift()!, deck.shift()!];
  const burns = [deck.shift()!, deck.shift()!, deck.shift()!];
  run.game.hand!.deck = [burns[0], ...board.slice(0, 3), burns[1], board[3], burns[2], board[4], ...deck];
}
function apply(run: ResearchRun, kind: ResearchEvent['kind'], move: Move, to?: number): void {
  const h = run.game.hand!,
    before = h.actions!.length;
  const error = makeMove(run.game, move, to, context(run));
  if (error) throw new Error(error);
  if (h.actions!.length !== before + 1) throw new Error('Research action was not recorded');
  run.events.push({ kind, action: structuredClone(h.actions!.at(-1)!), elapsedMs: run.handElapsedMs });
  updateEverydayMemory(run.game);
}
function beginHand(run: ResearchRun): void {
  run.recorded = false;
  run.handElapsedMs = 0;
  run.events = [];
  run.decisions = [];
  run.feedback = { odd: false, note: '' };
  // Explicit rebuys preserve the continuous table's identities and memories.
  for (const p of run.game.players)
    if (p.stack < run.game.settings.bigBlind) {
      p.bought += 1000;
      p.stack += 1000;
    }
  run.game.logs = [];
  startHand(run.game, context(run));
  setStudyDeal(run);
  if (run.scenario === 'crowded') {
    // Open + two cold calls; the participant on the button chooses freely from here.
    apply(run, 'setup', 'raise', 30);
    apply(run, 'setup', 'call');
    apply(run, 'setup', 'call');
  } else if (['position', 'draws', 'pressure'].includes(run.scenario)) {
    // Only preflop is scripted. Every postflop decision is made by the participant or live bot engine.
    apply(run, 'setup', 'raise', 30);
    for (let guard = 0; !run.game.hand!.nextStreetAt && guard < 12; guard++) apply(run, 'setup', 'call');
    if (!run.game.hand!.nextStreetAt) throw new Error('Study preflop setup did not finish');
    dealNextStreet(run.game, context(run));
  }
  updateEverydayMemory(run.game);
  run.initial = plainSnapshot(run.game);
}
export function startResearch(id: string, seed: number, limit = 60, startedAt = Date.now()): ResearchRun {
  if (![12, 60, 120].includes(limit) || !Number.isSafeInteger(seed)) throw new Error('Invalid research configuration');
  const scenario = scenarioAt(0, limit);
  const run = {
    protocol: RESEARCH_PROTOCOL,
    engine: RESEARCH_ENGINE,
    id,
    seed,
    limit,
    startedAt,
    index: 0,
    recorded: false,
    checkpointRevision: 0,
    paused: false,
    elapsedMs: 0,
    handElapsedMs: 0,
    scenario,
    game: null!,
    initial: null!,
    events: [],
    decisions: [],
    feedback: { odd: false, note: '' },
  } as ResearchRun;
  run.game = createResearchGame(run);
  beginHand(run);
  return run;
}
export function researchHero(game: Game) {
  return game.players.find((p) => p.deviceId === RESEARCH_DEVICE)!;
}
export function researchView(run: ResearchRun) {
  return redactForDevice(run.game, RESEARCH_DEVICE);
}
/** One atomic legal action or street advance. Caller persists the result before scheduling another. */
export function stepResearch(run: ResearchRun, action?: { move: Move; to?: number }): void {
  if (run.paused || run.game.hand!.result) throw new Error('Research hand is paused or finished');
  const h = run.game.hand!,
    actor = run.game.players.find((p) => p.id === h.toAct);
  if (action) {
    if (actor?.bot !== false) throw new Error('Wait for your turn');
    apply(run, 'human', action.move, action.to);
    return;
  }
  if (h.showdownAt != null) {
    h.showdownAt = null;
    showdown(run.game, context(run));
    updateEverydayMemory(run.game);
    return;
  }
  if (h.runout) {
    runoutStep(run.game, context(run));
    updateEverydayMemory(run.game);
    return;
  }
  if (h.nextStreetAt !== null && h.nextStreetAt !== undefined) {
    dealNextStreet(run.game, context(run));
    return;
  }
  if (!actor?.bot) return;
  const thought = everydayThought(run.game, actor.id);
  if (!thought) throw new Error('Research bot did not produce a decision');
  const trace = run.game.botTable!.traces.at(-1)!;
  const {
    information,
    profile,
    samplingSeed,
    action: selected,
    finalDistribution,
    deviation,
    philosophy,
    rationale,
    latencyMs,
    adaptation,
  } = trace;
  run.decisions.push(
    structuredClone({
      information,
      profile,
      samplingSeed,
      action: selected,
      finalDistribution,
      deviation,
      philosophy,
      rationale,
      latencyMs,
      adaptation,
      model: trace.prediction.modelVersion,
      source: trace.prediction.source,
      actions: trace.prediction.actions,
      scores: trace.prediction.values,
    }),
  );
  apply(run, 'bot', thought.move.move, thought.move.to);
}
export function completeResearchHand(run: ResearchRun): ResearchHand {
  const h = run.game.hand!;
  if (!h.result) throw new Error('Only completed hands can be uploaded');
  run.recorded = true;
  return {
    protocol: run.protocol,
    engine: run.engine,
    index: run.index,
    scenario: run.scenario,
    seed: run.seed,
    initial: run.initial,
    events: structuredClone(run.events),
    decisions: structuredClone(run.decisions),
    result: structuredClone(h.result),
    board: [...h.board],
    holes: Object.fromEntries(h.seats.map((s) => [s.playerId, [...s.cards]])),
    endingStacks: Object.fromEntries(run.game.players.map((p) => [p.id, p.stack])),
    feedback: structuredClone(run.feedback),
    durationMs: run.handElapsedMs,
  };
}
export function nextResearchHand(run: ResearchRun): void {
  if (!run.recorded || run.index + 1 >= run.limit) throw new Error('No next research hand');
  const old = run.scenario;
  run.index++;
  run.scenario = scenarioAt(run.index, run.limit);
  if (run.scenario !== 'continuous' || old !== 'continuous') run.game = createResearchGame(run);
  beginHand(run);
}
export function researchOptions(run: ResearchRun) {
  const h = run.game.hand!,
    hero = researchHero(run.game),
    seat = h.seats.find((s) => s.playerId === hero.id)!;
  return options(run.game, h, seat);
}
