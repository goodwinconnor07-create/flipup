// How a cash game plays at different buy-in depths: action, all-ins and swings, six-handed against mixed bots.
//   npx tsx scripts/cashDepthLab.ts [hands]
import { simulateTable } from '../src/game/botSim';

const HANDS = Number(process.argv[2] ?? 1500);
const MIX = ['tag', 'station', 'lag', 'rock', 'maniac', 'pro'] as const;
console.log('depth(bb)  flops  showdown  avgPot(bb)  allIns/100  bigPots/100  me bb/100 (tag)');
for (const depth of [15, 20, 30, 40, 60, 100]) {
  const runs = [1, 2, 3].map((seed) => simulateTable([...MIX], HANDS, seed, depth));
  const avg = (f: (r: (typeof runs)[number]) => number) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
  console.log(
    `${String(depth).padStart(7)}  ${avg((r) => r.table.flops).toFixed(2).padStart(5)}  ${avg((r) => r.table.showdowns).toFixed(2).padStart(8)}  ${avg((r) => r.table.avgPotBb).toFixed(1).padStart(10)}  ${avg((r) => r.table.allIns).toFixed(1).padStart(10)}  ${avg((r) => r.table.bigPots).toFixed(1).padStart(11)}  ${avg((r) => r.seats[0].bbPer100).toFixed(1).padStart(8)}`,
  );
}
