// Prints a flagged hand from a results file as text, for findings.md.
// Usage: npx tsx bot-lab/hand.ts <file.jsonl> <session id> <hand number>
import { load } from './analyze';

const [file, id, num] = process.argv.slice(2);
const ses = load(file).find((s) => s.config.id === id);
const sm = ses?.samples.find((x) => x.hand === Number(num));
if (!ses || !sm) {
  console.log('not found');
  process.exit(1);
}
const bb = ses.config.bigBlind;
console.log(`${id}, hand ${sm.hand}, ${ses.config.stack / bb}bb deep, blinds ${ses.config.smallBlind}/${bb}`);
console.log('Seats: ' + sm.names.map((n, i) => `${n} [${ses.seats[i].style}]${sm.holes[i]?.length ? ' ' + sm.holes[i].join(' ') : ''}`).join('; '));
console.log('Board: ' + sm.board.join(' '));
let street = '';
for (const e of sm.events) {
  if (e.street !== street) {
    street = e.street;
    process.stdout.write(`\n${street}: `);
  }
  process.stdout.write(`${sm.names[e.who]} ${e.move}${e.to ? ' to ' + e.to : ''}${e.toCall ? ` (facing ${e.toCall} into ${e.pot})` : e.pot ? ` (pot ${e.pot})` : ''}${e.bucket ? ' [' + e.bucket + ']' : ''}; `);
}
console.log('\nNet (bb): ' + sm.won.map((w, i) => `${sm.names[i]} ${w.toFixed(1)}`).join(', '));
