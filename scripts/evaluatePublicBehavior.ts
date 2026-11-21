import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { simulate } from '../src/bot_engine/simulation';
import { emptyMemory } from '../src/bot_engine/memory';
import { observeBehavior, behaviorSnapshot } from '../src/bot_engine/behaviorMemory';
import { publicBehaviorEvents } from '../src/bot_engine/publicBehavior';
import { PlanningRound, continuationView, continuationIntent } from '../src/bot_engine/multiplayerPlanning';
import { priorResponse } from '../src/bot_engine/guardedResponse';
import { opponentResponse, opponentSizing } from '../src/bot_engine/opponentModel';
import { inferRanges, type OpponentRange } from '../src/bot_engine/ranges';
import { behavioralRanges } from '../src/bot_engine/behavioralProvider';
import { ownHandKind } from '../src/bot_engine/handPlan';
import type { InformationSet } from '../src/bot_engine/information';
const hands = Number(process.argv[2] ?? 300),
  destination = resolve(process.argv[3] ?? '/tmp/public-behavior-accuracy.json'),
  partition = process.argv[4] ?? 'development';
if (!Number.isSafeInteger(hands) || hands < 80 || hands > 1000 || !['development', 'test'].includes(partition))
  throw new Error('Invalid accuracy arguments');
const seeds = partition === 'development' ? [1311011] : [1321019, 1321037];
const files = [
  'behaviorMemory.ts',
  'publicBehavior.ts',
  'opponentModel.ts',
  'behavioralProvider.ts',
  'responseRanges.ts',
  'multiplayerPlanning.ts',
  'memory.ts',
  'simulation.ts',
  'service.ts',
  'guardedResponse.ts',
  'scriptedOpponents.ts',
];
async function fingerprint() {
  const h = createHash('sha256');
  for (const f of files) h.update(f).update(await readFile(resolve('src/bot_engine', f)));
  return h.digest('hex');
}
const sourceFingerprint = await fingerprint();
type Acc = { n: number; loss: number; brier: number };
const acc = (): Acc => ({ n: 0, loss: 0, brier: 0 });
function score(a: Acc, p: number[], label: number) {
  a.n++;
  a.loss -= Math.log(Math.max(1e-12, p[label]));
  a.brier += p.reduce((s, v, k) => s + (v - Number(k === label)) ** 2, 0);
}
const reportScore = (a: Acc) => ({ observations: a.n, logLoss: a.n ? a.loss / a.n : null, brier: a.n ? a.brier / a.n : null });
function group(cards: string[], board: string[]) {
  const n = ownHandKind(cards, board).level;
  return n <= 1 ? 0 : n <= 6 ? 1 : 2;
}
function rangeScores(r: OpponentRange, actual: string[], board: string[]) {
  const actualHolding = r.holdings.find((h) => actual.every((c) => h.cards.includes(c)));
  if (!actualHolding) throw new Error('Actual held-out holding missing from legal combinations');
  const groups = [0, 0, 0];
  for (const h of r.holdings) groups[group(h.cards, board)] += h.weight;
  return {
    loss: -Math.log(Math.max(1e-12, actualHolding.weight)),
    brier: groups.reduce((s, v, k) => s + (v - Number(k === group(actual, board))) ** 2, 0),
  };
}
type Score = ReturnType<typeof reportScore>;
type Phase = {
  conditional: Score[];
  marginal: Score[];
  range: Score[];
  sizing: { observations: number; baselineMse: number | null; adaptedMse: number | null };
};
const sessions: { opponent: string; seed: number; hands: number; phases: Record<string, Phase> }[] = [];
const opponents =
  partition === 'development'
    ? (['competent', 'calling-station', 'river-overfolder', 'tight-passive', 'loose-aggressive', 'changing'] as const)
    : ([
        'competent',
        'calling-station',
        'river-overfolder',
        'tight-passive',
        'loose-aggressive',
        'changing',
        'loose-passive',
        'random',
        'changing-aggression',
      ] as const);
for (const opponent of opponents)
  for (const seed of seeds) {
    const memory = emptyMemory('audit', `simulation-${seed}`),
      holes = new Map<string, string[]>();
    let currentHand = -1;
    const phases = Object.fromEntries(
      ['before', 'transition', 'settled'].map((p) => [
        p,
        { conditional: [acc(), acc()], marginal: [acc(), acc()], range: [acc(), acc()], sizing: { n: 0, base: 0, adapted: 0 } },
      ]),
    );
    simulate(hands, seed, 2, {
      agents: ['bot', opponent],
      everyday: 'casual',
      pairedDecks: true,
      onAction: (i, a) => {
        if (i.hand !== currentHand) {
          currentHand = i.hand;
          holes.clear();
        }
        holes.set(i.heroId, [...i.hole]);
        const primary = i.players[0].id;
        if (i.heroId === primary) return;
        const actor = i.players.find((p) => p.id === i.heroId)!;
        const action = {
          street: i.street,
          playerId: i.heroId,
          move: a.move,
          to: a.to ?? (a.move === 'call' ? actor.bet + i.legal.toCall : 0),
        };
        if (i.street !== 'preflop') {
          const phase = i.hand <= hands / 2 ? 'before' : i.hand <= hands * 0.75 ? 'transition' : 'settled',
            metrics = phases[phase];
          const round = new PlanningRound(i),
            at = round.seats.findIndex((s) => s.playerId === i.heroId),
            v = continuationView(round, at, i.hole);
          const snapshot = behaviorSnapshot(memory, i.hand, [i.heroId]);
          const label = a.to !== undefined ? 2 : a.move === 'fold' ? 0 : 1;
          score(metrics.conditional[0], priorResponse(v), label);
          score(metrics.conditional[1], opponentResponse(v, snapshot, i.heroId), label);
          if (a.to !== undefined && a.to > i.legal.minTo && a.to < i.legal.maxTo) {
            const fraction = (a.to - i.currentBet) / Math.max(i.bigBlind, v.eligiblePot + v.toCall),
              base = continuationIntent(v).fraction;
            metrics.sizing.n++;
            metrics.sizing.base += (fraction - base) ** 2;
            metrics.sizing.adapted += (fraction - opponentSizing(v, snapshot, i.heroId, base)) ** 2;
          }
          // Fixed sampling rule limits expensive combination integration; no action/outcome selection.
          if (i.hand % 5 === 0 && holes.has(primary)) {
            const observer: InformationSet = { ...i, heroId: primary, hole: [...holes.get(primary)!] };
            const before = inferRanges(observer, 'public-range-v2').find((r) => r.playerId === i.heroId)!;
            const adaptedBefore = behavioralRanges(observer, [before], snapshot)[0];
            const integrate = (r: OpponentRange, adapted: boolean) => {
              const p = [0, 0, 0];
              for (const h of r.holdings) {
                const q = adapted ? opponentResponse({ ...v, hole: h.cards }, snapshot, i.heroId) : priorResponse({ ...v, hole: h.cards });
                for (let k = 0; k < 3; k++) p[k] += q[k] * h.weight;
              }
              return p;
            };
            score(metrics.marginal[0], integrate(before, false), label);
            score(metrics.marginal[1], integrate(adaptedBefore, true), label);
            if (a.move !== 'fold') {
              const cost = a.to !== undefined ? a.to - actor.bet : a.move === 'call' ? i.legal.toCall : 0;
              const after = {
                ...observer,
                actions: [...i.actions, action],
                players: i.players.map((p) =>
                  p.id === i.heroId
                    ? { ...p, stack: p.stack - cost, total: p.total + cost, bet: p.bet + cost, allIn: p.stack === cost }
                    : p,
                ),
              };
              const base = inferRanges(after, 'public-range-v2').find((r) => r.playerId === i.heroId)!;
              const adapted = behavioralRanges(after, [base], snapshot)[0];
              for (const [k, r] of [base, adapted].entries()) {
                const result = rangeScores(r, i.hole, i.board),
                  target = metrics.range[k];
                target.n++;
                target.loss += result.loss;
                target.brier += result.brier;
              }
            }
          }
        }
        const updated = { ...i, actions: [...i.actions, action] };
        const e = publicBehaviorEvents(updated, i.hand).find((e) => e.actionIndex === i.actions.length);
        if (e) observeBehavior(memory, { ...e, observerId: memory.botId, tableId: memory.tableId });
      },
    });
    const result = {
      opponent,
      seed,
      hands,
      phases: Object.fromEntries(
        Object.entries(phases).map(([phase, m]) => [
          phase,
          {
            conditional: m.conditional.map(reportScore),
            marginal: m.marginal.map(reportScore),
            range: m.range.map(reportScore),
            sizing: {
              observations: m.sizing.n,
              baselineMse: m.sizing.n ? m.sizing.base / m.sizing.n : null,
              adaptedMse: m.sizing.n ? m.sizing.adapted / m.sizing.n : null,
            },
          },
        ]),
      ),
    };
    sessions.push(result);
    console.log(JSON.stringify(result));
  }
if ((await fingerprint()) !== sourceFingerprint) throw new Error('Policy changed during accuracy evaluation');
const all = sessions.flatMap((s) => Object.values(s.phases));
const pooled = (metric: 'conditional' | 'marginal' | 'range') =>
  [0, 1].map((k) => {
    const a = acc();
    for (const row of all) {
      const r = row[metric][k];
      a.n += r.observations;
      a.loss += (r.logLoss ?? 0) * r.observations;
      a.brier += (r.brier ?? 0) * r.observations;
    }
    return reportScore(a);
  });
const summary = { conditional: pooled('conditional'), marginal: pooled('marginal'), range: pooled('range') };
const sizeCount = all.reduce((s, r) => s + r.sizing.observations, 0);
const sizing = {
  observations: sizeCount,
  baselineMse: sizeCount ? all.reduce((s, r) => s + (r.sizing.baselineMse ?? 0) * r.sizing.observations, 0) / sizeCount : null,
  adaptedMse: sizeCount ? all.reduce((s, r) => s + (r.sizing.adaptedMse ?? 0) * r.sizing.observations, 0) / sizeCount : null,
};
const gates = {
  conditionalResponse:
    summary.conditional[1].logLoss! < summary.conditional[0].logLoss! && summary.conditional[1].brier! < summary.conditional[0].brier!,
  marginalResponse: summary.marginal[1].logLoss! < summary.marginal[0].logLoss! && summary.marginal[1].brier! < summary.marginal[0].brier!,
  rangeAccuracy: summary.range[1].logLoss! <= summary.range[0].logLoss! && summary.range[1].brier! <= summary.range[0].brier!,
  sizingCoverage: sizeCount >= 20,
  sizingAccuracy: sizing.adaptedMse !== null && sizing.adaptedMse <= sizing.baselineMse!,
};
const passed = Object.values(gates).every(Boolean);
await mkdir(dirname(destination), { recursive: true });
await writeFile(
  destination,
  JSON.stringify(
    {
      protocol: 'public-behavior-accuracy-1',
      partition,
      seeds,
      handsPerSession: hands,
      totalHands: sessions.length * hands,
      sourceFingerprint,
      summary,
      sizing,
      gates,
      passed,
      sessions,
      modelOrder: ['frozen-v7', 'public-behavior-1'],
      limitations: [
        'Response conditional scores use the actor’s actual own cards only as offline labels/hypothesis evaluation. Marginal predictions integrate legal holdings with only the observer’s actual own cards and public context.',
        'True opposing cards score ranges only after prediction; they never enter the provider, public-event processor, memory or adaptation.',
        'Range checks occur on a fixed one-in-five hand sample, after non-fold actions. Exact combination log-loss and three hand-group Brier error are not playing-strength or human-realism certificates.',
        'Changing switches from river overfolding to calling at halfway. Before/transition/settled refer to hand position; only completed-hand evidence affects forecasts.',
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify({ summary, sizing, gates, passed, report: destination }));
if (!passed) process.exitCode = 1;
