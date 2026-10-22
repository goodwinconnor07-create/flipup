// Pilot checks: the simulator is deterministic, paired sessions deal the same cards, and the baseline
// engine and the working tree agree while they are the same code.
// Usage: npx tsx bot-lab/pilot-checks.ts
import { buildPlan } from './plan';
import { loadEngine, runSession, type SessionResult } from './sim';

const strip = (r: SessionResult) => JSON.stringify({ ...r, wallMs: 0, seats: r.seats.map((s) => ({ ...s, c: { ...s.c, latSumMs: 0, latMaxMs: 0, latBins: [] } })) });
const cfg = buildPlan('pilot').find((c) => c.id === 'pilot-six-bots-1')!;
const base = await loadEngine('baseline');
const cur = await loadEngine('current');
const a = runSession(base, 'baseline', cfg);
const b = runSession(base, 'baseline', cfg);
console.log('1. same engine twice, identical results:', strip(a) === strip(b));
const c = runSession(cur, 'current', cfg);
console.log('2. baseline vs working tree (same code today), identical results:', strip(a) === strip(c.seats ? { ...c, engine: 'baseline' } : c));
const d = runSession(base, 'baseline', { ...cfg, decisionSeed: cfg.decisionSeed + 1 });
const same = a.firstCards.filter((x, i) => x === d.firstCards[i]).length;
const total = Math.min(a.firstCards.length, d.firstCards.length);
console.log(`3. different decision seed, same chance seed: seat 0 got the same cards in ${same} of ${total} hands`);
const moves = a.seats.map((s, i) => s.c.net === d.seats[i].c.net).filter(Boolean).length;
console.log(`   (and the results differ in ${a.seats.length - moves} of ${a.seats.length} seats, so the decisions really did change)`);
console.log('4. chip leaks:', a.chipLeaks, ' illegal moves:', a.illegal, ' stuck:', a.stuck);
