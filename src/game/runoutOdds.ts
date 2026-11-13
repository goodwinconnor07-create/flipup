// Win chances during an all-in run-out, for every game. Shown only once every live hand is face up, so they never
// give anything away (see docs/RULES.md). Plain Hold'em counts every run-out exactly (`equity()`); the mini games
// play the rest of the hand out by their own rules, the way the bots do (`finishBoard()`, `variantScore()`): wild
// deuces, three rivers, the die, red rivers that keep coming, the cross and the clock, Bean Stalk's extra cards,
// Hit Me's half pot for 21. Imposter has no odds: a vote decides its pot.
import { finishBoard, variantScore } from './botVariants';
import { fullDeck, hashString, isRed, seededRng, type Card } from './cards';
import { equity, type Equity } from './equity';
import { boardSize, count21, holeCountAt, keepTwoQuick, type Variant } from './variants';

/** How many run-outs to play for a mini game; wild deuces take longest to score. */
const samplesFor = (v: Variant) => (v === 'deuces' ? 700 : 1500);

/**
 * Each face-up hand's chance to win (and to split) from here, in the order given. `toCome` (Power Cards) is how many
 * board cards are still to come, when the board can be longer than usual. `ghost` is the Ghost's two cards
 * once they're turned over at the showdown: until then the odds leave the ghost out (the owner's call), and once
 * it shows, a hand that doesn't beat it outright has no chance.
 */
export function runoutOdds(v: Variant, hands: Card[][], board: Card[], ghost?: Card[], toCome?: number): Equity {
  if (v === 'holdem') return equity(hands, board);
  const used = new Set([...hands.flat(), ...board, ...(ghost ?? [])]);
  const pool = fullDeck().filter((c) => !used.has(c));
  // Seeded from the cards, so every phone at the table shows the same numbers.
  const rng = seededRng(hashString(`${v}${hands.flat().join('')}${board.join('')}`));
  const full = holeCountAt(v, 5);
  // Nothing left to come: one look is the answer.
  const done = (toCome !== undefined ? toCome === 0 : board.length >= boardSize(v)) && !(v === 'redriver' && isRed(board[board.length - 1])) && hands.every((h) => v !== 'beanstalk' || h.length >= full);
  const samples = done ? 1 : samplesFor(v);
  const win = new Array<number>(hands.length).fill(0);
  const tie = new Array<number>(hands.length).fill(0);
  for (let n = 0; n < samples; n++) {
    const deck = pool.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // Bean Stalk: everyone still in gets a card of their own on each street to come.
    const cards = hands.map((h) => (v === 'beanstalk' && h.length < full ? [...h, ...deck.splice(-(full - h.length))] : h));
    const out = finishBoard(v, board, deck, rng, toCome);
    const play = (h: Card[]) => (v === 'pineapple' && h.length > 2 ? keepTwoQuick(h, out.slice(0, 3)) : h);
    const scores = cards.map((h) => variantScore(v, play(h), out));
    if (v === 'bjholdem') {
      // Half the pot to the best hand, half to closest to 21 (its ties go to the best hand among them).
      const best = Math.max(...scores);
      const pokers = scores.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0);
      const counts = cards.map(count21).map((c) => (c > 21 ? -1 : c));
      const top = Math.max(...counts);
      const near = counts.map((c, i) => (c === top ? i : -1)).filter((i) => i >= 0);
      const nearBest = Math.max(...near.map((i) => scores[i]));
      const blackjacks = near.filter((i) => scores[i] === nearBest);
      for (const i of pokers) win[i] += 0.5 / pokers.length;
      for (const i of blackjacks) win[i] += 0.5 / blackjacks.length;
      continue;
    }
    const ghostScore = ghost ? variantScore(v, ghost, out) : -1;
    const best = Math.max(...scores);
    const top = scores.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0);
    // The ghost has to be beaten outright: a hand that ties or loses to it takes nothing.
    if (best <= ghostScore) continue;
    if (top.length === 1) win[top[0]]++;
    else for (const i of top) tie[i]++;
  }
  return { win: win.map((w) => w / samples), tie: tie.map((t) => t / samples) };
}
