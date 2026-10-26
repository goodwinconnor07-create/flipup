/** Reproducible backend smoke simulation. Optional baseline: a directory containing src/game files.
 * npm exec --package=tsx -- tsx scripts/verifyBotUpgrade.ts [baseline-game-directory]
 * Writes JSON evidence outside the repository unless BOT_REPORT selects another path.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEngine, runSession, type Engine, type SessionConfig } from '../bot-lab/sim';

const current = await loadEngine('current');
const engines: [string, Engine][] = [['current', current]];
if (process.argv[2]) {
  const dir = pathToFileURL(resolve(process.argv[2]) + '/').href;
  const [reducer, play, holdem, styles] = await Promise.all(
    ['reducer', 'botPlay', 'holdem', 'botStyles'].map((name) => import(`${dir}${name}.ts`)),
  );
  engines.unshift(['before', { ...reducer, ...play, ...holdem, BOTS: styles.BOTS }]);
}
const plans: SessionConfig[] = [];
const seeds = (process.env.BOT_SEEDS ?? '731041,731209,731503').split(',').map(Number);
const hands = Number(process.env.BOT_HANDS ?? 100);
const only = process.env.BOT_ONLY;
for (const seed of seeds) {
  for (const opponent of ['bluffer', 'valueBettor', 'timid', 'station']) {
    if (!only || only === opponent)
      plans.push({
        id: `${seed}-${opponent}`,
        scenario: 'hu-script',
        seed,
        decisionSeed: seed + 17,
        hands,
        stack: 1000,
        smallBlind: 5,
        bigBlind: 10,
        seats: ['brain:Kai', opponent],
      });
  }
  if (!only)
    for (const count of [6, 9])
      plans.push({
        id: `${seed}-mixed${count}`,
        scenario: 'mixed',
        seed,
        decisionSeed: seed + 17,
        hands,
        stack: 1000,
        smallBlind: 5,
        bigBlind: 10,
        seats: ['brain:Kai', 'Emma', 'Theo', 'Max', 'Anna', 'Luna', 'Remi', 'Zoe', 'Ivy'].slice(0, count),
      });
}
const results = [];
let failed = false;
for (const [name, engine] of engines) {
  for (const plan of plans) {
    const r = runSession(engine, name, plan, { samplesPerKind: 1 });
    failed ||= r.chipLeaks > 0 || r.illegal > 0 || r.stuck || r.handsPlayed !== plan.hands;
    results.push(r);
  }
  console.log(`${name}: ${plans.reduce((n, p) => n + p.hands, 0)} hands completed`);
}
// Exercise actual new identities across short and deep tables, not only old style labels.
if (!only)
  for (const [i, bb] of [10, 50, 100].entries()) {
    const plan: SessionConfig = {
      id: `profiles-${bb}`,
      scenario: 'profiles9',
      seed: 742003 + i,
      decisionSeed: 742017 + i,
      hands,
      stack: 1000,
      smallBlind: bb / 2,
      bigBlind: bb,
      seats: ['brain:Dave B', ...current.BOTS.slice(10 + i * 97, 18 + i * 97).map((b) => b.name)],
    };
    const r = runSession(current, 'current', plan, { samplesPerKind: 1 });
    failed ||= r.chipLeaks > 0 || r.illegal > 0 || r.stuck || r.handsPlayed !== plan.hands;
    results.push(r);
  }
const report = process.env.BOT_REPORT ?? '/tmp/flipup-bot-upgrade.json';
writeFileSync(report, JSON.stringify(results, null, 2));
for (const [name] of engines) {
  const rows = results.filter((r) => r.engine === name);
  const net = (scenario: string) => {
    const sessions = rows.filter((r) => r.config.scenario === 'hu-script' && r.config.seats[1] === scenario);
    return (
      (sessions.reduce((s, r) => s + r.seats[0].c.net, 0) * 100) /
      Math.max(
        1,
        sessions.reduce((s, r) => s + r.handsPlayed, 0),
      )
    );
  };
  console.log(
    JSON.stringify({
      engine: name,
      hands: rows.reduce((s, r) => s + r.handsPlayed, 0),
      chipLeaks: rows.reduce((s, r) => s + r.chipLeaks, 0),
      illegal: rows.reduce((s, r) => s + r.illegal, 0),
      stuck: rows.filter((r) => r.stuck).length,
      wallMs: Math.round(rows.reduce((s, r) => s + r.wallMs, 0)),
      exploratoryBb100: Object.fromEntries(['bluffer', 'valueBettor', 'timid', 'station'].map((o) => [o, +net(o).toFixed(1)])),
    }),
  );
}
console.log(`Report: ${report}. Win-rate samples are exploratory, not proof of strength.`);
if (failed) process.exitCode = 1;
