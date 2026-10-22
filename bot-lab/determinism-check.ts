// Re-running the same sessions after the counters were extended must give the same play (nets, VPIP...).
// Usage: npx tsx bot-lab/determinism-check.ts <old.jsonl> <new.jsonl>
import { load } from './analyze';

const [a, b] = process.argv.slice(2);
const old = new Map(load(a).map((s) => [s.config.id, s]));
let same = 0;
let diff = 0;
for (const s of load(b)) {
  const o = old.get(s.config.id);
  if (!o) continue;
  const ok = o.seats.every((x, i) => x.c.net === s.seats[i].c.net && x.c.vpip === s.seats[i].c.vpip && x.c.bets === s.seats[i].c.bets && x.c.folds === s.seats[i].c.folds) && o.handsPlayed === s.handsPlayed;
  if (ok) same++;
  else diff++;
}
console.log(`${same} sessions identical, ${diff} different`);
