// How bots play the Hold'em variants. Plain Hold'em uses the full bot brain (botPlay.ts); a variant changes what a
// hand is worth (wild deuces, three rivers, a ghost to beat...), so here a bot plays out the rest of the hand many
// times by the table's own rules to see how often it wins, then bets, calls or folds against the price, in its
// own style. In Imposter the cards don't matter, so it plays to blend in.
//
// On top of the run-outs, each bot knows a little about how its game is won (`variantDecide()`): players who bet
// and raise hold better than random cards (`rangeDraws()`), Pot-limit Ghost and its rolling pot, the wild deuces,
// Blackjack Hold'em's bust risk, Crazy Pineapple's draws and Imposter's crowd. `lab.legacy` plays a seat the old way,
// for scripts/variantLab.ts only.

import type { BotThought } from './botPlay';
import { score, toInt } from './botEval';
import { playerStyle } from './botStyles';
import { fullDeck, isRed, type Card } from './cards';
import { potTotal } from './holdem';
import { options } from './selectors';
import type { Game, Hand, Seat } from './types';
import { boardSize, count21, handSets, holeCountAt, isWild, keepTwoQuick, startValue, variantOf, wildHand, type Variant } from './variants';

/** Seats that play the way bots did before the game-mode upgrade (the lab compares the two). */
export const lab = { legacy: new Set<string>() };

/** Run-outs played per decision: enough to tell a strong hand from a weak one, quick enough on the server. Fewer at a
 * big table, where each run-out deals more hands. */
const SAMPLES = 150;
const samplesFor = (others: number) => Math.max(50, Math.min(SAMPLES, Math.round((SAMPLES * 3) / (others + 1))));

/** The cards a bot plays with: its best two of three in Crazy Pineapple. */
const myCards = (v: Variant, cards: Card[], board: Card[]) => (v === 'pineapple' && cards.length > 2 ? keepTwoQuick(cards, board.slice(0, 3)) : cards);

/** The same number bestHand() scores, without naming the hand: the bots' fast evaluator, wild deuces aside. */
export function variantScore(v: Variant, hole: Card[], board: Card[]): number {
  let best = 0;
  for (const cards of handSets(v, hole, board)) {
    const value = v === 'deuces' && cards.some(isWild) ? wildHand(cards).score : score(cards.map(toInt));
    if (value > best) best = value;
  }
  return best;
}

/** The rest of the board, dealt by the variant's rules. */
export function finishBoard(v: Variant, board: Card[], deck: Card[], rng: () => number): Card[] {
  const out = board.slice();
  const target = boardSize(v);
  const hadRiver = out.length >= 5;
  while (out.length < target && deck.length) out.push(deck.pop()!);
  if (!hadRiver && v === 'dice') {
    const roll = 1 + Math.floor(rng() * 6);
    if (roll <= 5 && deck.length) out[roll - 1] = deck.pop()!;
  }
  if (v === 'redriver') while (isRed(out[out.length - 1]) && deck.length) out.push(deck.pop()!);
  return out;
}

/**
 * How often this hand wins against the other players still in (and the ghost, in Ghost Hold'em), playing the rest
 * out by the table's rules. Ties count as a share. Only what this seat can see is used: its cards and the board.
 */
export function variantEquity(game: Game, hand: Hand, seat: Seat, rng: () => number, runs?: number, ranges = false): number {
  const v = variantOf(game);
  const rivals = hand.seats.filter((s) => s.playerId !== seat.playerId && !s.folded);
  const others = rivals.length;
  if (!others) return 1;
  if (v === 'bjholdem') return blackjackEquity(game, hand, seat, rng, runs ?? samplesFor(others));
  // Wild deuces take longest to score, so a rougher estimate there.
  const samples = runs ?? Math.round(samplesFor(others) * (v === 'deuces' ? 0.5 : 1));
  // Memory Poker: the bots remember every card that was taken out.
  const known = new Set([...seat.cards, ...hand.board, ...(hand.removed ?? [])]);
  // Bean Stalk: the cards everyone still gets on the streets to come.
  const full = holeCountAt(v, 5);
  const more = v === 'beanstalk' ? full - seat.cards.length : 0;
  const pool = fullDeck().filter((c) => !known.has(c));
  const ghost = v === 'ghost';
  let won = 0;
  for (let n = 0; n < samples; n++) {
    // A partial shuffle: just the cards this run-out needs, taken from the end.
    const deck = pool.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const hands: Card[][] = [];
    const size = v === 'beanstalk' ? full : holeCountAt(v, 0);
    for (const r of rivals) {
      // A player who has bet or raised holds the best of a few random hands; a caller a little better than random.
      const tries = ranges ? draws(hand, r.playerId, rng) : 1;
      let pick = Array.from({ length: size }, () => deck.pop()!);
      for (let t = 1; t < tries && deck.length > size + 12; t++) {
        const other = Array.from({ length: size }, () => deck.pop()!);
        const [keep, back] = proxy(v, other, hand.board) > proxy(v, pick, hand.board) ? [other, pick] : [pick, other];
        pick = keep;
        deck.unshift(...back);
      }
      hands.push(pick);
    }
    const own = more > 0 ? [...seat.cards, ...Array.from({ length: more }, () => deck.pop()!)] : seat.cards;
    const ghostHand = ghost ? [deck.pop()!, deck.pop()!] : null;
    const board = finishBoard(v, hand.board, deck, rng);
    const mine = variantScore(v, myCards(v, own, board), board);
    let best = 0;
    let ties = 0;
    for (const h of hands) {
      const s = variantScore(v, myCards(v, h, board), board);
      if (s > best) [best, ties] = [s, 1];
      else if (s === best) ties++;
    }
    // The ghost has to be beaten outright: tying it keeps the pot in the middle.
    if (ghostHand && variantScore(v, ghostHand, board) >= mine) continue;
    if (mine > best) won += 1;
    else if (mine === best) won += 1 / (ties + 1);
  }
  return won / samples;
}

/**
 * How many random hands a player's cards are the best of, from what they've done this hand: every bet, raise or
 * all-in counts one, every call about half (calls are a range too). Capped at four.
 */
export function draws(hand: Hand, playerId: string, rng: () => number): number {
  let weight = 0;
  for (const a of hand.actions ?? []) {
    if (a.playerId !== playerId) continue;
    if (a.move === 'bet' || a.move === 'raise' || a.move === 'allin') weight += 1;
    else if (a.move === 'call') weight += 0.45;
  }
  weight = Math.min(3, weight);
  return 1 + Math.floor(weight) + (rng() < weight % 1 ? 1 : 0);
}

/** A quick read of how good some cards are now: on the flop or later the made hand, before it the start. */
function proxy(v: Variant, cards: Card[], board: Card[]): number {
  const two = myCards(v, cards, board.slice(0, 3)).slice(0, 2);
  const wilds = v === 'deuces' ? cards.filter(isWild).length : 0;
  if (board.length < 3) return startValue(two[0], two[1]) + wilds * 300;
  const five = [...two, ...board.slice(0, 3)];
  return v === 'deuces' && five.some(isWild) ? wildHand(five).score : score(five.map(toInt));
}

/** How the bots expect a player to hit when they can: take cards up to 12, stand from 13. */
const STAND_ON = 13;
const hitUp = (cards: Card[], deck: Card[]) => {
  while (count21(cards) < STAND_ON && deck.length) cards.push(deck.pop()!);
  return cards;
};

/**
 * Blackjack Hold'em: half of each pot goes to the best poker hand and half to whoever is closest to 21 (a tie on the
 * count goes to the best poker hand among them). Each run-out deals the others their cards (and as many hits as
 * they've taken, or would take if the flop is still to come), plays it out and counts what this hand would win.
 */
function blackjackEquity(game: Game, hand: Hand, seat: Seat, rng: () => number, samples: number): number {
  const v = variantOf(game);
  const others = hand.seats.filter((s) => s.playerId !== seat.playerId && !s.folded);
  const known = new Set([...seat.cards, ...hand.board]);
  const pool = fullDeck().filter((c) => !known.has(c));
  // The hitting is still to come before (and during) the flop betting; after it, everyone's cards are set.
  const stillHitting = hand.street === 'preflop' || hand.street === 'flop';
  let won = 0;
  for (let n = 0; n < samples; n++) {
    const deck = pool.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const own = hand.street === 'preflop' ? hitUp([...seat.cards], deck) : seat.cards;
    const theirs: Card[][] = [];
    for (const s of others) {
      const cards = [deck.pop()!, deck.pop()!];
      for (let k = 0; k < (hand.hits?.[s.playerId] ?? 0); k++) cards.push(deck.pop()!);
      if (stillHitting && !hand.hits?.[s.playerId]) hitUp(cards, deck);
      // Over 21 they'd have busted and folded.
      if (count21(cards) <= 21) theirs.push(cards);
    }
    const board = finishBoard(v, hand.board, deck, rng);
    const mine = { poker: variantScore(v, own, board), count: count21(own) };
    const field = theirs.map((h) => ({ poker: variantScore(v, h, board), count: count21(h) }));
    const all = [mine, ...field];
    const bestPoker = Math.max(...all.map((x) => x.poker));
    const pokerWinners = all.filter((x) => x.poker === bestPoker);
    const closest = Math.max(...all.map((x) => x.count));
    const tied = all.filter((x) => x.count === closest);
    const tiedBest = Math.max(...tied.map((x) => x.poker));
    const countWinners = tied.filter((x) => x.poker === tiedBest);
    if (pokerWinners.includes(mine)) won += 0.5 / pokerWinners.length;
    if (countWinners.includes(mine)) won += 0.5 / countWinners.length;
  }
  return won / samples;
}

/**
 * Blackjack Hold'em: whether a bot takes another card on the flop. Always under 12 (it can't bust), never from 17.
 * In between it works out its real chance of busting from the cards it can't see, and a bust folds the whole hand, so
 * the better its poker hand already is (half the pot rides on that), the less it will risk.
 */
export function botHits(game: Game, seat: Seat, rng: () => number): boolean {
  const total = count21(seat.cards);
  if (total <= 11) return true;
  if (total >= 17) return false;
  const style = playerStyle(game.players.find((p) => p.id === seat.playerId));
  const bold = Math.max(-0.15, Math.min(0.2, style.post.bluff));
  if (lab.legacy.has(seat.playerId)) return rng() < ((17 - total) / 6) * (0.55 + bold);
  const hand = game.hand;
  const seen = new Set([...seat.cards, ...(hand?.board ?? [])]);
  const unseen = fullDeck().filter((c) => !seen.has(c));
  const bust = unseen.filter((c) => count21([...seat.cards, c]) > 21).length / Math.max(1, unseen.length);
  // How much poker hand it would put at risk: nothing, a pair, or two pair and better.
  const board = hand?.board.slice(0, 3) ?? [];
  const made = board.length >= 3 ? Math.floor(score([...seat.cards.slice(0, 2), ...board].map(toInt)) / 1048576) : 0;
  const risk = made >= 2 ? 0.2 : made === 1 ? 0.33 : 0.45;
  return bust < risk + bold * 0.4 + (rng() - 0.5) * 0.08;
}

/** Thinking time in the bot's own tempo: longer for big decisions. */
function think(game: Game, seat: Seat, rng: () => number, stakes: number): number {
  const style = playerStyle(game.players.find((p) => p.id === seat.playerId));
  const ms = (1100 + rng() * 1300 + stakes * 2200) * style.tempo.speed;
  return Math.round(Math.max(450, Math.min(6500, ms)));
}

/** A move for a bot at a variant table, or null at a plain Hold'em table (the usual bot brain plays those). */
export function variantDecide(game: Game, hand: Hand, seat: Seat, rng: () => number): BotThought | null {
  const v = variantOf(game);
  if (v === 'holdem') return null;
  const legacy = lab.legacy.has(seat.playerId);
  if (v === 'imposter' && hand.imposter) return blendIn(game, hand, seat, rng, !legacy);
  return byEquity(game, hand, seat, rng, !legacy);
}

/**
 * What each game asks of a bot on top of the run-outs (`smart` only):
 * - `value`: how much better than an even share it wants before betting for value. Games where big hands are common
 *   (wild deuces, three rivers, the cross, Bean Stalk's extra cards) need more; the second-best hand pays there.
 * - `bluff`: how often it bets with nothing. Less where someone usually has it, none against the ghost.
 * - `draw`: cards to come that can change everything (the die, red rivers, Bean Stalk) make calls a little cheaper.
 */
const SENSE: Partial<Record<Variant, { value: number; bluff: number; draw: number }>> = {
  pineapple: { value: 0.04, bluff: 0.8, draw: 0 },
  deuces: { value: 0.08, bluff: 0.5, draw: 0 },
  ghost: { value: 0.03, bluff: 0.3, draw: 0 },
  pittsburgh: { value: 0.06, bluff: 0.6, draw: 0.02 },
  dice: { value: 0, bluff: 1.1, draw: 0.04 },
  redriver: { value: 0.02, bluff: 0.9, draw: 0.04 },
  crucifix: { value: 0.07, bluff: 0.6, draw: 0 },
  circle: { value: 0.03, bluff: 0.8, draw: 0.02 },
  memory: { value: 0, bluff: 1, draw: 0 },
  beanstalk: { value: 0.08, bluff: 0.5, draw: 0.03 },
  bjholdem: { value: 0.02, bluff: 0.6, draw: 0 },
};

function byEquity(game: Game, hand: Hand, seat: Seat, rng: () => number, smart = false): BotThought {
  const v = variantOf(game);
  const sense = smart ? (SENSE[v] ?? { value: 0, bluff: 1, draw: 0 }) : { value: 0, bluff: 1, draw: 0 };
  const player = game.players.find((p) => p.id === seat.playerId);
  const style = playerStyle(player);
  const o = options(game, hand, seat);
  const bb = game.settings.bigBlind;
  const pot = potTotal(hand);
  const stack = player?.stack ?? 0;
  const preflop = hand.board.length === 0;
  const eq = variantEquity(game, hand, seat, rng, undefined, smart);
  const opponents = hand.seats.filter((s) => s.playerId !== seat.playerId && !s.folded).length;
  // The price: what calling needs to win. Before the flop there's plenty still to win (implied odds), and loose
  // styles call wider; sticky styles call more after the flop.
  const price = o.toCall > 0 ? o.toCall / (pot + o.toCall) : 0;
  // Cards still to come that can turn a hand over (the die, red rivers, Bean Stalk) make a call a little cheaper.
  const need = preflop ? price * (0.62 - style.pre.loose * 0.25) : price - style.post.sticky * 0.5 - sense.draw;
  // Strong enough to bet or raise for value: better than an even share of the pot, more so against a crowd.
  const fair = 1 / (opponents + 1);
  const strong = eq > Math.max(0.55, fair * 1.6) + sense.value - style.post.value;
  const monster = eq > Math.max(0.75, fair * 2.4) + sense.value;
  const stakes = Math.min(1, (o.toCall || pot * 0.5) / Math.max(1, stack));
  const done = (move: BotThought['move']): BotThought => ({ move, thinkMs: think(game, seat, rng, stakes) });
  const raiseTo = (to: number) => {
    const t = Math.round(Math.max(o.minTo, Math.min(o.maxTo, to)));
    return done(t >= o.maxTo ? { move: 'allin' } : { move: o.word === 'Bet' ? 'bet' : 'raise', to: t });
  };
  const size = style.post.sizes[Math.floor(rng() * style.post.sizes.length)] ?? 0.66;

  // Short-stacked before the flop: all in with a good hand, otherwise out.
  if (preflop && stack <= bb * 12) {
    if (eq > fair * 1.25 - style.pre.shove * 0.05) return done({ move: 'allin' });
    return done(o.canCheck ? { move: 'check' } : { move: 'fold' });
  }

  if (o.canCheck) {
    // Ghost: the ghost never folds, so a bluff can't win the pot on its own.
    const bluffs = Math.max(0, 0.1 + style.post.bluff) * sense.bluff * (smart && v === 'ghost' && hand.ghost ? 0 : 1);
    if (o.canRaise && (strong || rng() < bluffs / opponents)) {
      const to = preflop ? Math.max(bb * style.pre.open, hand.currentBet * 3) : hand.currentBet + pot * (monster ? Math.max(size, 0.75) : size);
      return raiseTo(to);
    }
    return done({ move: 'check' });
  }
  if (eq < need) return done(o.canFold ? { move: 'fold' } : { move: 'call' });
  if (o.canRaise && (monster || (strong && rng() < 0.35 + style.pre.aggro * 0.3))) {
    const to = preflop ? hand.currentBet * 3 : hand.currentBet + (pot + o.toCall) * Math.max(size, 0.6);
    return raiseTo(to);
  }
  return done({ move: 'call' });
}

/**
 * Imposter: the cards don't decide the pot and nobody can fold. Innocent or not, the bot mostly checks and calls
 * like the crowd, now and then makes a small probing bet, and never builds a huge pot on its own.
 */
function blendIn(game: Game, hand: Hand, seat: Seat, rng: () => number, smart = false): BotThought {
  const player = game.players.find((p) => p.id === seat.playerId);
  const style = playerStyle(player);
  const o = options(game, hand, seat);
  const pot = potTotal(hand);
  const stack = player?.stack ?? 0;
  const thinkMs = think(game, seat, rng, Math.min(1, o.toCall / Math.max(1, stack)));
  // The imposter fidgets a little more: it's trying to look like it belongs.
  // A smart imposter does the opposite: it never bets or raises, only checks and calls like the quietest player at
  // the table. Building a pot it then gets voted out of is the worst thing it can do (the lab showed it).
  const imposter = seat.playerId === hand.imposter;
  if (smart && imposter) return { move: o.canCheck ? { move: 'check' } : { move: 'call' }, thinkMs };
  const nerves = imposter ? 0.06 : 0;
  const probe = 0.14 + Math.max(-0.08, style.post.bluff) + nerves;
  const small = hand.currentBet + Math.max(game.settings.bigBlind, pot * 0.33);
  const quiet = quietOk(o.toCall, stack);
  if (o.canRaise && quiet && rng() < probe) {
    const to = Math.round(Math.max(o.minTo, Math.min(o.maxTo, small)));
    if (to < o.maxTo) return { move: { move: o.word === 'Bet' ? 'bet' : 'raise', to }, thinkMs };
  }
  return { move: o.canCheck ? { move: 'check' } : { move: 'call' }, thinkMs };
}

/** A bet small enough next to the stack that probing with it doesn't build a huge pot. */
const quietOk = (toCall: number, stack: number) => toCall <= stack * 0.25;
