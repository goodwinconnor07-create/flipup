import { simulate } from '../src/bot_engine/simulation';
import { FeelCollector } from '../src/bot_engine/feel';
import type { BotDifficulty } from '../src/bot_engine/everyday';

// npm run bot:feel [hands per seed] [casual|challenge] [seats]
// Plays six everyday bots against each other and prints how the table feels against the bands in src/bot_engine/feel.ts.
const hands = Number(process.argv[2] ?? 500);
const level = (process.argv[3] ?? 'casual') as BotDifficulty;
const seats = Number(process.argv[4] ?? 6);
const seeds = [11, 22, 33];
const feel = new FeelCollector();
for (const seed of seeds)
  simulate(hands, seed, seats, {
    agents: Array(seats).fill('bot'),
    everyday: level,
    experience: true,
    onAction: (info, action) => feel.observe(info, action),
  });
console.log(`\nTable feel: ${level}, ${seats} bots, ${hands * seeds.length} hands\n`);
let failed = 0;
for (const m of feel.report()) {
  const v = m.value === null ? '   n/a' : m.value.toFixed(1).padStart(6) + (m.id === 'trashAllIn' ? '' : '%');
  const mark = m.pass === null ? '·' : m.pass ? '✓' : '✗';
  if (m.pass === false) failed++;
  console.log(`${mark} ${m.label.padEnd(50)} ${v}  band ${m.band[0]}–${m.band[1]}  n=${String(m.n).padStart(5)}  (${m.source})`);
}
console.log(failed ? `\n${failed} outside their band.` : '\nAll inside their bands.');
process.exitCode = failed ? 1 : 0;
