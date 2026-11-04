// Prints the longest a bot line takes: said, read, and how long its bubble is up. Used by the chat lab's numbers.
import { allLines } from '../src/game/botTalk';
import { holdMs, lineBeats, sayAndReadMs, spokenMs } from '../src/game/chat';
export function longest() {
  let say = 0, up = 0, wait = 0, n = 0, chars = 0, worst = '';
  for (const { text } of allLines()) {
    const beats = lineBeats(text, 'Connor');
    const s = sayAndReadMs(beats);
    n++;
    chars += beats[0].text.length;
    if (s > say) { say = s; worst = beats[0].text; }
    up = Math.max(up, spokenMs(beats) + holdMs(beats[0].text));
    wait = Math.max(wait, spokenMs(beats));
  }
  return { lines: n, avgChars: Math.round(chars / n), longestSayAndRead: say, longestUp: up, longestToLand: wait, worst };
}
if (process.argv[1]?.endsWith('chatLongest.ts')) console.log(longest());
