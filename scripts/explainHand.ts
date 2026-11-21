import { readFileSync } from 'node:fs';
import { explainHand, explainText } from '../src/bot_engine/explainHand';

// npm run bot:explain <file.json>
// Prints what each bot was weighing at every move of a saved hand (Saved hands in the app, long press, Copy hand data;
// paste it into a file). See src/bot_engine/explainHand.ts.
const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run bot:explain <file.json>  (a saved hand: Saved hands, long press, Copy hand data)');
  process.exit(1);
}
console.log(explainText(explainHand(JSON.parse(readFileSync(file, 'utf8')))));
