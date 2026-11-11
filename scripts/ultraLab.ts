// ULTRA bots against the regulars: big blinds per 100 hands for one seat played as a regular shark and then as
// ULTRA, over several seeds (all-in luck taken out). npx tsx scripts/ultraLab.ts [hands] [seeds]
import { simulateTable, type Agent } from '../src/game/botSim';

const hands = Number(process.argv[2] ?? 3000);
const seeds = Number(process.argv[3] ?? 3);
const tables: { name: string; agents: Agent[]; seat: number }[] = [
  { name: '6-max mixed', agents: ['pro', 'shark', 'tag', 'lag', 'station', 'gambler'], seat: 1 },
  { name: 'vs bluffer', agents: ['shark', 'bluffBot', 'abc'], seat: 0 },
  { name: 'vs folder', agents: ['shark', 'foldBot', 'abc'], seat: 0 },
  { name: 'vs caller', agents: ['shark', 'callBot', 'abc'], seat: 0 },
];
for (const t of tables) {
  const out: string[] = [];
  for (const ultra of [false, true]) {
    let sum = 0;
    for (let s = 1; s <= seeds; s++) sum += simulateTable(t.agents, hands, s * 11, 100, {}, { ultra: ultra ? [t.seat] : [], evAdjust: true }).seats[t.seat].bbPer100;
    out.push(`${ultra ? 'ULTRA' : 'shark'} ${(sum / seeds).toFixed(1)}`);
  }
  console.log(t.name.padEnd(14), out.join('   '));
}
