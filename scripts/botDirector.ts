import { simulate } from '../src/bot_engine/simulation';
import { FeelCollector } from '../src/bot_engine/feel';

// npm run bot:director [hands per seed]
// The same deals with no director, with the director reading the table, and with the lift held at its maximum, so
// the director's reach is visible and bounded. Casual, six bots, three seeds.
const hands = Number(process.argv[2] ?? 300);
const seeds = [11, 22, 33];
const runs: { name: string; director?: boolean | number }[] = [
  { name: 'no director', director: undefined },
  { name: 'director on', director: true },
  { name: 'lift held at 1', director: 1 },
];
console.log(`\nTable director: casual, 6 bots, ${hands * seeds.length} hands each\n`);
console.log('                 flops   showdowns  checked-down   pot(bb)   mean lift  lifted   checked-to bet   trash all-in/100');
for (const run of runs) {
  const feel = new FeelCollector();
  const t = { hands: 0, flops: 0, showdowns: 0, dead: 0, potBb: 0, liftSum: 0, lifted: 0 };
  for (const seed of seeds) {
    const r = simulate(hands, seed, 6, {
      agents: Array(6).fill('bot'),
      everyday: 'casual',
      experience: true,
      pairedDecks: true,
      director: run.director,
      onAction: (i, a) => feel.observe(i, a),
    });
    for (const k of Object.keys(t) as (keyof typeof t)[]) t[k] += r.liveliness[k];
  }
  const m = Object.fromEntries(feel.report().map((x) => [x.id, x.value]));
  const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`.padStart(8);
  console.log(
    `${run.name.padEnd(15)} ${pct(t.flops, t.hands)} ${pct(t.showdowns, t.hands)} ${pct(t.dead, t.flops)}    ${(t.potBb / t.hands).toFixed(1).padStart(6)}   ${(t.liftSum / t.hands).toFixed(2).padStart(8)}  ${pct(t.lifted, t.hands)}   ${(m.checkedToHU ?? NaN).toFixed(1).padStart(10)}%   ${(m.trashAllIn ?? NaN).toFixed(2).padStart(12)}`,
  );
}
