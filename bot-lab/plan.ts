// Session plans: which tables get played, with which seeds. A plan is a list of SessionConfig.
// Seed ranges are disjoint per phase, so the confirmation set is never touched while tuning:
//   pilot   500_000+     development   1_000+     3-bet probe   300_000+     confirmation   900_000+

import { seededRng } from '../src/game/cards';
import { BOTS } from '../src/game/botStyles';
import { ARCHETYPES } from './archetypes';
import type { SessionConfig } from './sim';

export type Phase = 'pilot' | 'dev' | 'confirm' | 'probe';

export const STACKS = {
  deep: { stack: 1000, smallBlind: 5, bigBlind: 10 }, // 100bb
  medium: { stack: 2000, smallBlind: 25, bigBlind: 50 }, // 40bb
  short: { stack: 1000, smallBlind: 25, bigBlind: 50 }, // 20bb
  highBlind: { stack: 1000, smallBlind: 50, bigBlind: 100 }, // 10bb
} as const;
export type StackName = keyof typeof STACKS;

interface Scenario {
  id: string;
  kind: 'bots' | 'arch' | 'two-arch' | 'hu-bots' | 'hu-arch' | 'probe3';
  players: number;
  stack: StackName;
  sessions: number;
  hands: number;
}

/** The development / baseline plan: 20,000 hands. */
const SCENARIOS: Scenario[] = [
  { id: 'full9-bots', kind: 'bots', players: 9, stack: 'deep', sessions: 6, hands: 500 },
  { id: 'full9-one-archetype', kind: 'arch', players: 9, stack: 'deep', sessions: 7, hands: 400 },
  { id: 'six-bots', kind: 'bots', players: 6, stack: 'deep', sessions: 4, hands: 500 },
  { id: 'six-medium-stack', kind: 'bots', players: 6, stack: 'medium', sessions: 3, hands: 500 },
  { id: 'six-two-archetypes', kind: 'two-arch', players: 6, stack: 'deep', sessions: 7, hands: 300 },
  { id: 'full9-short-stack', kind: 'bots', players: 9, stack: 'short', sessions: 3, hands: 400 },
  { id: 'six-high-blind', kind: 'bots', players: 6, stack: 'highBlind', sessions: 3, hands: 400 },
  { id: 'hu-bots', kind: 'hu-bots', players: 2, stack: 'deep', sessions: 10, hands: 200 },
  { id: 'hu-archetype', kind: 'hu-arch', players: 2, stack: 'deep', sessions: 70, hands: 60 },
];

/** The 3-bet probe: a clean 3-bettor among bots, six and nine handed (4,000 hands). */
const PROBES: Scenario[] = [
  { id: 'probe-3bet-9', kind: 'probe3', players: 9, stack: 'deep', sessions: 10, hands: 200 },
  { id: 'probe-3bet-6', kind: 'probe3', players: 6, stack: 'deep', sessions: 10, hands: 200 },
];

/** Cycles through all 40 bots in a shuffled order, so every bot gets about the same number of seats. */
function botDeck(rng: () => number) {
  let pool: string[] = [];
  return (avoid: Set<string>) => {
    for (let tries = 0; tries < 200; tries++) {
      if (!pool.length) pool = BOTS.map((b) => b.name).sort(() => rng() - 0.5);
      const i = pool.findIndex((n) => !avoid.has(n));
      if (i >= 0) return pool.splice(i, 1)[0];
      pool = BOTS.map((b) => b.name).sort(() => rng() - 0.5);
    }
    throw new Error('no bot left');
  };
}

export function buildPlan(phase: Phase, scale = 1): SessionConfig[] {
  const base = phase === 'pilot' ? 500_000 : phase === 'confirm' ? 900_000 : phase === 'probe' ? 300_000 : 1_000;
  const rng = seededRng(base + 7);
  const next = botDeck(rng);
  const plan: SessionConfig[] = [];
  let n = 0;
  const scenarios = phase === 'probe' ? PROBES : phase === 'confirm' ? SCENARIOS.map((s) => ({ ...s, sessions: Math.max(1, Math.round(s.sessions * 0.75)) })) : SCENARIOS;
  for (const sc of scenarios) {
    const sessions = phase === 'pilot' ? Math.min(3, sc.sessions) : sc.sessions;
    const hands = phase === 'pilot' ? Math.max(30, Math.round(sc.hands / 5)) : Math.max(20, Math.round(sc.hands * scale));
    for (let i = 0; i < sessions; i++) {
      const used = new Set<string>();
      const draw = () => {
        const name = next(used);
        used.add(name);
        return name;
      };
      const arch = ARCHETYPES[(i + n) % ARCHETYPES.length];
      const arch2 = ARCHETYPES[(i + n + 3) % ARCHETYPES.length];
      let seats: string[];
      switch (sc.kind) {
        case 'probe3':
          seats = ['threeBettor', ...Array.from({ length: sc.players - 1 }, draw)];
          break;
        case 'bots':
          seats = [`brain:${draw()}`, ...Array.from({ length: sc.players - 1 }, draw)];
          break;
        case 'arch':
          seats = [arch, ...Array.from({ length: sc.players - 1 }, draw)];
          break;
        case 'two-arch':
          seats = [arch, ...Array.from({ length: sc.players - 3 }, draw), arch2];
          break;
        case 'hu-bots':
          seats = [`brain:${draw()}`, draw()];
          break;
        case 'hu-arch': {
          // 7 archetypes x 10 styles, one named bot per style, rotating through the four names of each style.
          const style = ['pro', 'shark', 'tag', 'lag', 'maniac', 'rock', 'station', 'gambler', 'trapper', 'nervous'][i % 10];
          const names = BOTS.filter((b) => b.style === style).map((b) => b.name);
          seats = [ARCHETYPES[Math.floor(i / 10) % ARCHETYPES.length], names[Math.floor(i / 10 + i) % names.length]];
          break;
        }
      }
      const seed = base + 100 * (n + 1) + i;
      plan.push({
        id: `${phase}-${sc.id}-${i + 1}`,
        scenario: sc.id,
        seed,
        decisionSeed: seed + 5_000_000,
        hands,
        ...STACKS[sc.stack],
        seats,
      });
    }
    n++;
  }
  return plan;
}

export const handsIn = (plan: SessionConfig[]) => plan.reduce((a, c) => a + c.hands, 0);
