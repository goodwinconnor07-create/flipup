// How bots play the Hold'em variants. Plain Hold'em uses the full bot brain (botPlay.ts); a variant changes what a
// hand is worth (wild deuces, three rivers, a ghost to beat...), so here a bot plays out the rest of the hand many
// times by the table's own rules to see how often it wins, then bets, calls or folds against the price, in its
// own style. In Imposter the cards don't matter, so it plays to blend in.

import type { BotThought } from './botPlay';
import { playerStyle } from './botStyles';
import { fullDeck, isRed, type Card } from './cards';
import { potTotal } from './holdem';
import { options } from './selectors';
import type { Game, Hand, Seat } from './types';
import { bestHand, holeCount, keepTwo, riverCount, variantOf, type Variant } from './variants';

/** Run-outs played per decision: enough to tell a strong hand from a weak one, quick enough on the server. Fewer at a
 * big table, where each run-out deals more hands. */
const SAMPLES = 150;
const samplesFor = (others: number) => Math.max(50, Math.min(SAMPLES, Math.round((SAMPLES * 3) / (others + 1))));

/** The cards a bot plays with: its best two of three in Crazy Pineapple. */
const myCards = (cards: Card[], board: Card[]) => (cards.length > 2 ? keepTwo(cards, board.slice(0, 3)) : cards);

/** The rest of the board, dealt by the variant's rules. */
function finishBoard(v: Variant, board: Card[], deck: Card[], rng: () => number): Card[] {
  const out = board.slice();
  const target = v === 'pittsburgh' ? 4 + riverCount(v) : 5;
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
export function variantEquity(game: Game, hand: Hand, seat: Seat, rng: () => number, runs?: number): number {
  const v = variantOf(game);
  const others = hand.seats.filter((s) => s.playerId !== seat.playerId && !s.folded).length;
  if (!others) return 1;
  const samples = runs ?? samplesFor(others);
  const known = new Set([...seat.cards, ...hand.board]);
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
    for (let k = 0; k < others; k++) hands.push(Array.from({ length: holeCount(v) }, () => deck.pop()!));
    const ghostHand = ghost ? [deck.pop()!, deck.pop()!] : null;
    const board = finishBoard(v, hand.board, deck, rng);
    const mine = bestHand(v, myCards(seat.cards, board), board).score;
    let best = 0;
    let ties = 0;
    for (const h of hands) {
      const s = bestHand(v, myCards(h, board), board).score;
      if (s > best) [best, ties] = [s, 1];
      else if (s === best) ties++;
    }
    // The ghost has to be beaten outright: tying it keeps the pot in the middle.
    if (ghostHand && bestHand(v, ghostHand, board).score >= mine) continue;
    if (mine > best) won += 1;
    else if (mine === best) won += 1 / (ties + 1);
  }
  return won / samples;
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
  return v === 'imposter' && hand.imposter ? blendIn(game, hand, seat, rng) : byEquity(game, hand, seat, rng);
}

function byEquity(game: Game, hand: Hand, seat: Seat, rng: () => number): BotThought {
  const player = game.players.find((p) => p.id === seat.playerId);
  const style = playerStyle(player);
  const o = options(game, hand, seat);
  const bb = game.settings.bigBlind;
  const pot = potTotal(hand);
  const stack = player?.stack ?? 0;
  const preflop = hand.board.length === 0;
  const eq = variantEquity(game, hand, seat, rng);
  const opponents = hand.seats.filter((s) => s.playerId !== seat.playerId && !s.folded).length;
  // The price: what calling needs to win. Before the flop there's plenty still to win (implied odds), and loose
  // styles call wider; sticky styles call more after the flop.
  const price = o.toCall > 0 ? o.toCall / (pot + o.toCall) : 0;
  const need = preflop ? price * (0.62 - style.pre.loose * 0.25) : price - style.post.sticky * 0.5;
  // Strong enough to bet or raise for value: better than an even share of the pot, more so against a crowd.
  const fair = 1 / (opponents + 1);
  const strong = eq > Math.max(0.55, fair * 1.6) - style.post.value;
  const monster = eq > Math.max(0.75, fair * 2.4);
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
    if (o.canRaise && (strong || rng() < Math.max(0, 0.1 + style.post.bluff) / opponents)) {
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
function blendIn(game: Game, hand: Hand, seat: Seat, rng: () => number): BotThought {
  const player = game.players.find((p) => p.id === seat.playerId);
  const style = playerStyle(player);
  const o = options(game, hand, seat);
  const pot = potTotal(hand);
  const stack = player?.stack ?? 0;
  const thinkMs = think(game, seat, rng, Math.min(1, o.toCall / Math.max(1, stack)));
  // The imposter fidgets a little more: it's trying to look like it belongs.
  const nerves = seat.playerId === hand.imposter ? 0.06 : 0;
  const probe = 0.14 + Math.max(-0.08, style.post.bluff) + nerves;
  const small = hand.currentBet + Math.max(game.settings.bigBlind, pot * 0.33);
  const quiet = o.toCall <= stack * 0.25;
  if (o.canRaise && quiet && rng() < probe) {
    const to = Math.round(Math.max(o.minTo, Math.min(o.maxTo, small)));
    if (to < o.maxTo) return { move: { move: o.word === 'Bet' ? 'bet' : 'raise', to }, thinkMs };
  }
  return { move: o.canCheck ? { move: 'check' } : { move: 'call' }, thinkMs };
}
