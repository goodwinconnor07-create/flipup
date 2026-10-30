// Blackjack, one of the campaign's floor games: you and one or two bots (and any friends you invite) against
// Vincent, the dealer. Pure like the poker engine: the phone runs it for a table on its own, the server
// (worker/blackjack.ts) for a table with friends, and both only ever change a table through applyBj().
// Rules are in docs/RULES.md (Blackjack). Chips are the players' own campaign bankrolls, so the table
// only says what was staked and what came back; each phone settles its own (bjSettle() in campaign.ts).

import { fullDeck, isCard, shuffle, type Card } from './cards';
import { BOTS } from './botStyles';
import { isEmoji } from './emoji';
import { newId } from './ids';

export const BJ = {
  decks: 6,
  /** The shoe is changed once fewer than this share of its cards are left (the cut card). */
  cut: 0.25,
  seats: 6,
  minBet: 5,
  maxBet: 1e12,
  /** Each card takes this long to slide out of the shoe, so the deal has a rhythm on screen. */
  dealMs: 300,
  /** A bot thinks this long over each move. */
  botMs: 1000,
  /** The dealer turns each card over this far apart. */
  dealerMs: 900,
  /** How long the results stay up before the next round's bets. */
  resultMs: 4200,
  /** With friends: once one person has bet, everyone else has this long. */
  betSeconds: 15,
  /** With friends: each decision has this long, and this long for someone whose phone has dropped. */
  turnSeconds: 20,
  offlineSeconds: 8,
  /** Rounds kept so a phone that missed the end can still settle its stake. */
  history: 12,
} as const;

/** The dealer: a smooth Vegas charmer. */
export const DEALER = { name: 'Vincent', emoji: '🤵🏻‍♂️' } as const;

export type BjPhase = 'betting' | 'playing' | 'dealer' | 'done';
export type BjResult = 'blackjack' | 'win' | 'push' | 'lose' | 'bust';
/** How a bot plays: by the book, careful (stands early, rarely doubles) or wild (hits too much, doubles everything). */
export type BjTemper = 'book' | 'careful' | 'wild';

export interface BjHand {
  cards: Card[];
  bet: number;
  doubled?: boolean;
  /** One of two hands made by splitting a pair: 21 on two cards is not a blackjack. */
  split?: boolean;
  /** No more cards: stood, bust, 21, doubled, or split aces. */
  done?: boolean;
  result?: BjResult;
  /** What came back: the stake plus winnings, nothing for a loss. */
  back?: number;
}

export interface BjSeat {
  id: string;
  name: string;
  emoji: string;
  bot?: boolean;
  temper?: BjTemper;
  /** The phone this person plays from. */
  deviceId?: string;
  /** What they'll bet when the cards are dealt, and whether they're in. */
  bet: number;
  ready: boolean;
  hands: BjHand[];
  /** Not connected right now (tables with friends). */
  offline?: boolean;
  /** Getting up once this round is over. */
  leaving?: boolean;
}

export interface BjTalk {
  key: number;
  /** 'dealer' or a seat id. */
  who: string;
  text: string;
  /** When it's said, so a line about a card waits for the card to land. */
  at: number;
}

export interface BjRound {
  round: number;
  /** For each seat that played: everything staked (doubles and splits included) and what came back. */
  seats: Record<string, { staked: number; back: number; results: BjResult[] }>;
}

export interface Blackjack {
  v: 1;
  kind: 'blackjack';
  id: string;
  /** Tables with friends: the code the server knows it by. */
  code?: string;
  online: boolean;
  hostDeviceId: string;
  phase: BjPhase;
  /** Counts up at each deal. */
  round: number;
  /** The cards left. Never sent to a phone (see redactBj()). */
  shoe: Card[];
  /** How many cards are left, for the shoe on screen. */
  shoeLeft: number;
  dealer: { cards: Card[]; /** The second card is still face down. */ hole: boolean };
  seats: BjSeat[];
  turn: { seat: string; hand: number } | null;
  /** When the person on the clock runs out of time (tables with friends). */
  turnEndsAt: number | null;
  /** The next timed thing (a bot's move, the dealer's next card, the next round). */
  wakeAt: number | null;
  /** When the cards of this round were dealt, so the screen can slide them out in order. */
  dealtAt: number;
  talk: BjTalk[];
  history: BjRound[];
  /** Said hello to these seats already. */
  greeted: string[];
  updatedAt: number;
}

export type BjAction =
  | { type: 'sit'; name: string; emoji: string }
  | { type: 'bet'; amount: number }
  | { type: 'hit' }
  | { type: 'stand' }
  | { type: 'double' }
  | { type: 'split' }
  | { type: 'leave' }
  /** Internal: the clock. Never accepted from a phone. */
  | { type: 'tick' }
  /** Internal: which phones are connected. Never accepted from a phone. */
  | { type: 'presence'; online: string[] };

export interface BjContext {
  deviceId: string;
  now: number;
  rng: () => number;
}

export type BjOutcome = { ok: true; game: Blackjack; changed: boolean } | { ok: false; error: string };

// ── Cards and totals ─────────────────────────────────────────────────────────

/** What a card counts: aces 1 (handValue() makes one 11 when it fits), faces 10. */
export function cardPoints(card: Card): number {
  const r = card[0];
  if (r === 'A') return 1;
  if (r === 'T' || r === 'J' || r === 'Q' || r === 'K') return 10;
  return Number(r);
}

/** The best total of a hand, and whether an ace is counting as 11 in it. */
export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardPoints(c);
    if (c[0] === 'A') aces++;
  }
  if (aces > 0 && total + 10 <= 21) return { total: total + 10, soft: true };
  return { total, soft: false };
}

export const isBlackjack = (hand: { cards: Card[]; split?: boolean }): boolean => !hand.split && hand.cards.length === 2 && handValue(hand.cards).total === 21;

export const isBust = (cards: Card[]): boolean => handValue(cards).total > 21;

/** "Soft 17", "20", "Blackjack", "Bust": what a hand shows under it. */
export function totalLabel(hand: { cards: Card[]; split?: boolean }): string {
  if (hand.cards.length === 0) return '';
  if (isBlackjack(hand)) return 'Blackjack';
  const { total, soft } = handValue(hand.cards);
  if (total > 21) return 'Bust';
  return soft && total < 21 ? `${total - 10}/${total}` : String(total);
}

export function newShoe(rng: () => number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < BJ.decks; i++) cards.push(...fullDeck());
  return shuffle(cards, rng);
}

const shoeLow = (shoe: Card[]): boolean => shoe.length < BJ.decks * 52 * BJ.cut;

// ── Making a table ───────────────────────────────────────────────────────────

const TEMPER: Record<string, BjTemper> = { rock: 'careful', nervous: 'careful', maniac: 'wild', gambler: 'wild', lag: 'wild' };

/** One or two bots, picked at random from the poker bots (their names and faces), none twice. */
export function pickBjBots(rng: () => number, count = 1 + Math.floor(rng() * 2)): BjSeat[] {
  const pool = shuffle(BOTS, rng).slice(0, count);
  return pool.map((b) => ({ id: `b-${newId(8)}`, name: b.name, emoji: b.emoji, bot: true, temper: TEMPER[b.style] ?? 'book', bet: 0, ready: false, hands: [] }));
}

export function createBlackjack(opts: {
  id?: string;
  code?: string;
  online: boolean;
  host: { deviceId: string; name: string; emoji: string };
  now: number;
  rng: () => number;
  bots?: BjSeat[];
}): Blackjack {
  const you: BjSeat = { id: `p-${newId(8)}`, name: opts.host.name, emoji: opts.host.emoji, deviceId: opts.host.deviceId, bet: 0, ready: false, hands: [] };
  const shoe = newShoe(opts.rng);
  const game: Blackjack = {
    v: 1,
    kind: 'blackjack',
    id: opts.id ?? newId(),
    ...(opts.code ? { code: opts.code } : {}),
    online: opts.online,
    hostDeviceId: opts.host.deviceId,
    phase: 'betting',
    round: 0,
    shoe,
    shoeLeft: shoe.length,
    dealer: { cards: [], hole: false },
    seats: [you, ...(opts.bots ?? pickBjBots(opts.rng))],
    turn: null,
    turnEndsAt: null,
    wakeAt: null,
    dealtAt: 0,
    talk: [],
    history: [],
    greeted: [],
    updatedAt: opts.now,
  };
  greet(game, you, opts.now, opts.rng);
  botsBet(game, opts.rng);
  return game;
}

// ── What the dealer and the bots say ─────────────────────────────────────────

/** Vincent's lines. `{you}` is the player he's talking to. */
export const DEALER_LINES = {
  hello: ['Evening, {you}. Welcome to my table.', 'Ah, {you}. Pull up a chair, the cards are warm.', 'Welcome, {you}. Chips down whenever you’re ready.', 'Good to see you, {you}. Let’s make some memories.'],
  helloFriend: ['{you} has joined us. The more the merrier.', 'A new face! Welcome, {you}.', 'Make room, everyone. {you} is here.'],
  shuffle: ['Fresh shoe, fresh luck.', 'Let me shuffle these up. Six decks, all on your side tonight.', 'New shoe. I’ve got a good feeling about this one.'],
  bigBet: ['Ooh, {you} came to play.', 'Now that’s a bet. I like your style, {you}.', 'Big money on the felt. Easy now, {you}.'],
  blackjack: ['Blackjack! Pays three to two, {you}.', 'Well, look at that. Blackjack for {you}.', 'Ace and a face. Beautiful, {you}.'],
  bust: ['Ouch. Too many, {you}.', 'The cards giveth, the cards taketh away.', 'So close, {you}. So very close.', 'That one got away from you, {you}.'],
  twentyOne: ['Twenty-one! Lovely, {you}.', 'Twenty-one on the nose. Smooth, {you}.'],
  double: ['Doubling down? Brave. I respect it.', 'One card, coming right up, {you}.', 'Double it is. Fortune favours the bold.'],
  split: ['Two hands, twice the fun.', 'Splitting them up. Bold move, {you}.', 'Two for the price of two. Let’s go.'],
  dealerBlackjack: ['Sorry, folks. The house has blackjack.', 'Blackjack for the house. I almost feel bad. Almost.'],
  dealerBust: ['I’m over! Everybody still standing gets paid.', 'Too many for me. Pay the people!', 'And the dealer busts. Drinks are on me.'],
  houseWins: ['House takes this one. It’s a long night.', 'Not your round, my friends. Next one.', 'The house thanks you. Kindly.'],
  playersWin: ['You got me that time.', 'Nicely played. Collect your chips.', 'Well done. Don’t spend it all at once.'],
  push: ['A push. Nobody wins, nobody cries.', 'Same total. We’ll call that one even.'],
  bets: ['Place your bets, folks.', 'Bets in, my friends.', 'Whenever you’re ready.'],
  bye: ['Come back soon, {you}.', 'Take care, {you}. The table will miss you.'],
} as const;

/** Short lines the bots say about their own hands. */
export const BOT_LINES = {
  blackjack: ['Blackjack, baby!', 'Yes! Ace and a face!', 'Never in doubt.'],
  bust: ['Ugh.', 'Of course.', 'Why did I hit that?', 'Nope.'],
  win: ['Easy money.', 'Told you.', 'I’ll take it.'],
  dealerBust: ['Thank you, Vincent!', 'Ha! Pay up.', 'Love to see it.'],
  double: ['Double. Feeling lucky.', 'Let’s go big.'],
} as const;

const pick = <T>(list: readonly T[], rng: () => number): T => list[Math.floor(rng() * list.length) % list.length];

function say(game: Blackjack, who: string, text: string, at: number): void {
  const key = (game.talk[game.talk.length - 1]?.key ?? 0) + 1;
  game.talk = [...game.talk, { key, who, text, at }].slice(-8);
}

function dealerSays(game: Blackjack, kind: keyof typeof DEALER_LINES, at: number, rng: () => number, you?: string): void {
  say(game, 'dealer', pick(DEALER_LINES[kind], rng).replace('{you}', you ?? 'friend'), at);
}

function greet(game: Blackjack, seat: BjSeat, now: number, rng: () => number): void {
  if (seat.bot || game.greeted.includes(seat.id)) return;
  game.greeted = [...game.greeted, seat.id].slice(-20);
  dealerSays(game, game.greeted.length > 1 ? 'helloFriend' : 'hello', now + 400, rng, seat.name);
}

// ── Bots ─────────────────────────────────────────────────────────────────────

const CHIPS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

/** Bots bet about what the people at the table bet last time: a little less or a lot more. */
function botsBet(game: Blackjack, rng: () => number): void {
  const people = game.seats.filter((s) => !s.bot && s.bet > 0).map((s) => s.bet);
  const base = people.length ? people.reduce((a, b) => a + b, 0) / people.length : 25;
  for (const s of game.seats) {
    if (!s.bot) continue;
    const want = base * pick([0.5, 1, 1, 1, 2, 2, 3, 5], rng);
    s.bet = CHIPS.reduce((best, c) => (Math.abs(c - want) < Math.abs(best - want) ? c : best), CHIPS[0]);
    s.ready = true;
  }
}

/** The textbook play for six decks, dealer standing on soft 17, double after split. */
export function basicMove(hand: BjHand, up: Card, can: { double: boolean; split: boolean }): 'hit' | 'stand' | 'double' | 'split' {
  const d = cardPoints(up) === 1 ? 11 : cardPoints(up);
  const { total, soft } = handValue(hand.cards);
  if (can.split && hand.cards.length === 2 && cardPoints(hand.cards[0]) === cardPoints(hand.cards[1])) {
    const p = cardPoints(hand.cards[0]);
    if (p === 1 || p === 8) return 'split';
    if ((p === 2 || p === 3 || p === 7) && d <= 7) return 'split';
    if (p === 6 && d <= 6) return 'split';
    if (p === 4 && (d === 5 || d === 6)) return 'split';
    if (p === 9 && d !== 7 && d !== 10 && d !== 11) return 'split';
  }
  if (soft) {
    if (total >= 20) return 'stand';
    if (total === 19) return can.double && d === 6 ? 'double' : 'stand';
    if (total === 18) {
      if (can.double && d >= 2 && d <= 6) return 'double';
      return d >= 9 ? 'hit' : 'stand';
    }
    const from = total === 17 ? 3 : total >= 15 ? 4 : 5;
    return can.double && d >= from && d <= 6 ? 'double' : 'hit';
  }
  if (total >= 17) return 'stand';
  if (total >= 13) return d <= 6 ? 'stand' : 'hit';
  if (total === 12) return d >= 4 && d <= 6 ? 'stand' : 'hit';
  if (total === 11) return can.double ? 'double' : 'hit';
  if (total === 10) return can.double && d <= 9 ? 'double' : 'hit';
  if (total === 9) return can.double && d >= 3 && d <= 6 ? 'double' : 'hit';
  return 'hit';
}

/** A bot's move: the book, bent by its temper. */
export function bjBotMove(seat: BjSeat, hand: BjHand, up: Card, can: { double: boolean; split: boolean }, rng: () => number): 'hit' | 'stand' | 'double' | 'split' {
  const book = basicMove(hand, up, can);
  const { total, soft } = handValue(hand.cards);
  if (seat.temper === 'careful') {
    if (book === 'hit' && !soft && total >= 12 && rng() < 0.6) return 'stand';
    if (book === 'double' && rng() < 0.5) return 'hit';
  }
  if (seat.temper === 'wild') {
    if (book === 'stand' && !soft && total <= 17 && rng() < 0.25) return 'hit';
    if (book === 'hit' && can.double && total >= 8 && total <= 12 && rng() < 0.4) return 'double';
  }
  return book;
}

// ── Moves ────────────────────────────────────────────────────────────────────

const seatOf = (game: Blackjack, deviceId: string): BjSeat | undefined => game.seats.find((s) => !s.bot && s.deviceId === deviceId);

export const handInPlay = (game: Blackjack): BjHand | undefined => {
  if (!game.turn) return undefined;
  return game.seats.find((s) => s.id === game.turn!.seat)?.hands[game.turn.hand];
};

/** What the hand on the clock may do. */
export function canMove(game: Blackjack): { double: boolean; split: boolean } {
  const seat = game.turn && game.seats.find((s) => s.id === game.turn!.seat);
  const hand = handInPlay(game);
  if (!seat || !hand || game.phase !== 'playing') return { double: false, split: false };
  const two = hand.cards.length === 2;
  return {
    double: two && !hand.doubled,
    split: two && seat.hands.length < 2 && cardPoints(hand.cards[0]) === cardPoints(hand.cards[1]),
  };
}

/** Everything staked on a seat's hands this round (doubles and splits included). */
export const stakedBy = (seat: BjSeat): number => seat.hands.reduce((sum, h) => sum + h.bet, 0);

function draw(game: Blackjack): Card {
  const card = game.shoe.pop()!;
  game.shoeLeft = game.shoe.length;
  return card;
}

/** Deals the round to everyone who's in: a card each, the dealer's, a second each, and the dealer's face down. */
function deal(game: Blackjack, now: number, rng: () => number): void {
  if (shoeLow(game.shoe)) {
    game.shoe = newShoe(rng);
    game.shoeLeft = game.shoe.length;
    dealerSays(game, 'shuffle', now, rng);
  }
  const playing = game.seats.filter((s) => s.ready && s.bet > 0 && !s.leaving && !(s.offline && !s.bot));
  for (const s of game.seats) s.hands = [];
  for (const s of playing) s.hands = [{ cards: [], bet: s.bet }];
  game.dealer = { cards: [], hole: true };
  for (let i = 0; i < 2; i++) {
    for (const s of playing) s.hands[0].cards.push(draw(game));
    game.dealer.cards.push(draw(game));
  }
  game.round += 1;
  game.phase = 'playing';
  game.dealtAt = now;
  for (const s of game.seats) s.ready = false;
  const landed = now + (playing.length + 1) * 2 * BJ.dealMs;

  const up = game.dealer.cards[0];
  // The dealer peeks under a ten or an ace: a blackjack there ends the round before anyone plays.
  if ((cardPoints(up) === 10 || cardPoints(up) === 1) && isBlackjack({ cards: game.dealer.cards })) {
    game.dealer.hole = false;
    dealerSays(game, 'dealerBlackjack', landed, rng);
    settle(game, landed, rng, true);
    return;
  }
  for (const s of playing) {
    const h = s.hands[0];
    if (isBlackjack(h)) {
      h.done = true;
      if (s.bot) say(game, s.id, pick(BOT_LINES.blackjack, rng), landed);
      else dealerSays(game, 'blackjack', landed, rng, s.name);
    }
    if (!s.bot && s.bet >= 1000 && s.bet >= 4 * (game.history[0]?.seats[s.id]?.staked ?? s.bet)) dealerSays(game, 'bigBet', now + 200, rng, s.name);
  }
  game.turn = null;
  advance(game, landed);
}

/** Moves the clock to the next hand that still needs a decision, or to the dealer once there are none. */
function advance(game: Blackjack, now: number): void {
  const order: { seat: string; hand: number }[] = [];
  for (const s of game.seats) s.hands.forEach((_, i) => order.push({ seat: s.id, hand: i }));
  const from = game.turn ? order.findIndex((t) => t.seat === game.turn!.seat && t.hand === game.turn!.hand) : -1;
  for (let i = Math.max(0, from); i < order.length; i++) {
    const t = order[i];
    const hand = game.seats.find((s) => s.id === t.seat)!.hands[t.hand];
    if (hand.done) continue;
    game.turn = t;
    const seat = game.seats.find((s) => s.id === t.seat)!;
    if (seat.bot) {
      game.turnEndsAt = null;
      game.wakeAt = now + BJ.botMs;
    } else if (game.online) {
      game.turnEndsAt = now + (seat.offline || seat.leaving ? BJ.offlineSeconds : BJ.turnSeconds) * 1000;
      game.wakeAt = game.turnEndsAt;
    } else {
      game.turnEndsAt = null;
      game.wakeAt = null;
    }
    return;
  }
  game.turn = null;
  game.turnEndsAt = null;
  game.phase = 'dealer';
  game.wakeAt = now + BJ.dealerMs;
}

/** One move by whoever is on the clock. */
function move(game: Blackjack, kind: 'hit' | 'stand' | 'double' | 'split', now: number, rng: () => number): string | null {
  const seat = game.seats.find((s) => s.id === game.turn?.seat);
  const hand = handInPlay(game);
  if (!seat || !hand || game.phase !== 'playing') return 'It’s not your turn.';
  const can = canMove(game);
  const you = seat.name;
  if (kind === 'stand') {
    hand.done = true;
  } else if (kind === 'hit') {
    hand.cards.push(draw(game));
    const { total } = handValue(hand.cards);
    if (total > 21) {
      hand.done = true;
      if (seat.bot) {
        if (rng() < 0.5) say(game, seat.id, pick(BOT_LINES.bust, rng), now + BJ.dealMs);
      } else if (rng() < 0.7) dealerSays(game, 'bust', now + BJ.dealMs, rng, you);
    } else if (total === 21) {
      hand.done = true;
      if (!seat.bot && rng() < 0.6) dealerSays(game, 'twentyOne', now + BJ.dealMs, rng, you);
    }
  } else if (kind === 'double') {
    if (!can.double) return 'You can only double on your first two cards.';
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(draw(game));
    hand.done = true;
    if (seat.bot) {
      if (rng() < 0.4) say(game, seat.id, pick(BOT_LINES.double, rng), now);
    } else if (rng() < 0.5) dealerSays(game, 'double', now, rng, you);
  } else {
    if (!can.split) return 'Only a pair can be split, once.';
    const aces = hand.cards[0][0] === 'A';
    const second: BjHand = { cards: [hand.cards[1]], bet: hand.bet, split: true };
    hand.cards = [hand.cards[0]];
    hand.split = true;
    hand.cards.push(draw(game));
    second.cards.push(draw(game));
    seat.hands.splice(game.turn!.hand + 1, 0, second);
    // Split aces take one card each. A hand that reaches 21 has nothing left to decide.
    for (const h of [hand, second]) if (aces || handValue(h.cards).total === 21) h.done = true;
    if (!seat.bot && rng() < 0.7) dealerSays(game, 'split', now, rng, you);
  }
  advance(game, kind === 'stand' ? now : now + BJ.dealMs);
  return null;
}

/** The dealer's turn, one card per tick: turn the hole card over, then draw to 17 (standing on soft 17). */
function dealerStep(game: Blackjack, now: number, rng: () => number): void {
  if (game.dealer.hole) {
    game.dealer.hole = false;
    game.wakeAt = now + BJ.dealerMs;
    return;
  }
  const live = game.seats.some((s) => s.hands.some((h) => !isBust(h.cards) && !isBlackjack(h)));
  const { total } = handValue(game.dealer.cards);
  if (live && total < 17) {
    game.dealer.cards.push(draw(game));
    game.wakeAt = now + BJ.dealerMs;
    return;
  }
  settle(game, now, rng, false);
}

/** Pays every hand, records the round for the phones to settle, and says something about it. */
function settle(game: Blackjack, now: number, rng: () => number, peeked: boolean): void {
  const dealer = handValue(game.dealer.cards).total;
  const dealerBj = isBlackjack({ cards: game.dealer.cards });
  const dealerBust = dealer > 21;
  const round: BjRound = { round: game.round, seats: {} };
  let won = 0;
  let lost = 0;
  let pushed = 0;
  for (const s of game.seats) {
    if (s.hands.length === 0) continue;
    for (const h of s.hands) {
      h.done = true;
      const mine = handValue(h.cards).total;
      if (mine > 21) [h.result, h.back] = ['bust', 0];
      else if (isBlackjack(h)) [h.result, h.back] = dealerBj ? ['push', h.bet] : ['blackjack', h.bet + Math.floor((h.bet * 3) / 2)];
      else if (dealerBj) [h.result, h.back] = ['lose', 0];
      else if (dealerBust || mine > dealer) [h.result, h.back] = ['win', h.bet * 2];
      else if (mine === dealer) [h.result, h.back] = ['push', h.bet];
      else [h.result, h.back] = ['lose', 0];
      if (h.result === 'win' || h.result === 'blackjack') won++;
      else if (h.result === 'push') pushed++;
      else lost++;
    }
    round.seats[s.id] = { staked: stakedBy(s), back: s.hands.reduce((sum, h) => sum + (h.back ?? 0), 0), results: s.hands.map((h) => h.result!) };
  }
  game.history = [round, ...game.history].slice(0, BJ.history);
  game.phase = 'done';
  game.turn = null;
  game.turnEndsAt = null;
  game.wakeAt = now + BJ.resultMs;
  if (peeked) return;
  if (dealerBust) {
    dealerSays(game, 'dealerBust', now, rng);
    const bot = game.seats.find((s) => s.bot && s.hands.some((h) => h.result === 'win'));
    if (bot && rng() < 0.5) say(game, bot.id, pick(BOT_LINES.dealerBust, rng), now + 1200);
  } else if (won + lost + pushed > 0) {
    // Only when nothing has been said this round already.
    const quiet = !game.talk.some((t) => t.who === 'dealer' && t.at >= game.dealtAt);
    if (quiet && won > lost) dealerSays(game, 'playersWin', now, rng);
    else if (quiet && lost > won && rng() < 0.6) dealerSays(game, 'houseWins', now, rng);
    else if (pushed > 0 && won === 0 && lost === 0) dealerSays(game, 'push', now, rng);
    const bot = game.seats.find((s) => s.bot && s.hands.some((h) => h.result === 'win'));
    if (bot && rng() < 0.3) say(game, bot.id, pick(BOT_LINES.win, rng), now + 900);
  }
}

/** After the results: clear the felt, let anyone leaving go, and open the bets. */
function nextRound(game: Blackjack, now: number, rng: () => number): void {
  for (const s of game.seats) if (s.leaving) dealerSays(game, 'bye', now, rng, s.name);
  game.seats = game.seats.filter((s) => !s.leaving);
  for (const s of game.seats) {
    s.hands = [];
    s.ready = false;
  }
  game.dealer = { cards: [], hole: false };
  game.phase = 'betting';
  game.turn = null;
  game.turnEndsAt = null;
  game.wakeAt = null;
  botsBet(game, rng);
  if (game.online && game.round % 4 === 0 && rng() < 0.5) dealerSays(game, 'bets', now, rng);
}

/** Everyone in for the next deal has bet: the people at the table who are connected. */
const allIn = (game: Blackjack): boolean => {
  const people = game.seats.filter((s) => !s.bot && !s.offline && !s.leaving);
  return people.length > 0 && people.every((s) => s.ready);
};

const anyIn = (game: Blackjack): boolean => game.seats.some((s) => !s.bot && s.ready && s.bet > 0);

// ── The reducer ──────────────────────────────────────────────────────────────

/** The only way a table changes. Returns a new table (the old one is never touched), or why not. */
export function applyBj(prev: Blackjack, action: BjAction, ctx: BjContext): BjOutcome {
  const game: Blackjack = structuredClone(prev);
  const { now, rng } = ctx;
  const internal = ctx.deviceId === 'server';
  const me = seatOf(game, ctx.deviceId);

  switch (action.type) {
    case 'tick': {
      if (!internal) return { ok: false, error: 'Not allowed.' };
      if (game.wakeAt === null || now < game.wakeAt - 20) return { ok: true, game: prev, changed: false };
      game.wakeAt = null;
      if (game.phase === 'betting') {
        if (anyIn(game)) deal(game, now, rng);
      } else if (game.phase === 'playing') {
        const seat = game.seats.find((s) => s.id === game.turn?.seat);
        const hand = handInPlay(game);
        if (seat && hand) {
          const kind = seat.bot ? bjBotMove(seat, hand, game.dealer.cards[0], canMove(game), rng) : 'stand';
          move(game, kind, now, rng);
        } else advance(game, now);
      } else if (game.phase === 'dealer') dealerStep(game, now, rng);
      else nextRound(game, now, rng);
      break;
    }
    case 'presence': {
      if (!internal) return { ok: false, error: 'Not allowed.' };
      const online = new Set(action.online);
      let changed = false;
      for (const s of game.seats) {
        if (s.bot) continue;
        const off = !online.has(s.deviceId ?? '');
        if (!!s.offline !== off) {
          changed = true;
          if (off) s.offline = true;
          else delete s.offline;
        }
      }
      if (!changed) return { ok: true, game: prev, changed: false };
      if (game.phase === 'betting' && anyIn(game) && allIn(game)) game.wakeAt = now + 600;
      break;
    }
    case 'sit': {
      if (me) {
        if (me.name === action.name && me.emoji === action.emoji) return { ok: true, game: prev, changed: false };
        me.name = action.name;
        me.emoji = action.emoji;
        break;
      }
      if (!game.online) return { ok: false, error: 'This table is just for you.' };
      if (game.seats.length >= BJ.seats) {
        // A bot gives up its seat for a friend, as soon as the round allows.
        const bot = [...game.seats].reverse().find((s) => s.bot && s.hands.length === 0);
        if (!bot) return { ok: false, error: 'The table is full.' };
        game.seats = game.seats.filter((s) => s !== bot);
      }
      const seat: BjSeat = { id: `p-${newId(8)}`, name: uniqueBjName(game, action.name), emoji: action.emoji, deviceId: ctx.deviceId, bet: 0, ready: false, hands: [] };
      game.seats.push(seat);
      greet(game, seat, now, rng);
      break;
    }
    case 'bet': {
      if (!me) return { ok: false, error: 'Take a seat first.' };
      if (game.phase !== 'betting') return { ok: false, error: 'Wait for the next round.' };
      const amount = action.amount;
      if (amount !== 0 && (amount < BJ.minBet || amount > BJ.maxBet)) return { ok: false, error: `Bets start at ${BJ.minBet}.` };
      me.bet = amount;
      me.ready = amount > 0;
      if (!game.online) {
        // On your own, the cards come as soon as you bet.
        if (me.ready) game.wakeAt = now;
      } else if (allIn(game) && anyIn(game)) game.wakeAt = now + 400;
      else if (me.ready && game.wakeAt === null) game.wakeAt = now + BJ.betSeconds * 1000;
      else if (!anyIn(game)) game.wakeAt = null;
      break;
    }
    case 'hit':
    case 'stand':
    case 'double':
    case 'split': {
      if (!me || game.turn?.seat !== me.id) return { ok: false, error: 'It’s not your turn.' };
      const error = move(game, action.type, now, rng);
      if (error) return { ok: false, error };
      break;
    }
    case 'leave': {
      if (!me) return { ok: true, game: prev, changed: false };
      if (me.hands.length > 0 && game.phase !== 'done') {
        // Your hands play out standing; the seat goes when the round does.
        me.leaving = true;
        for (const h of me.hands) h.done = true;
        if (game.turn?.seat === me.id) advance(game, now);
      } else {
        dealerSays(game, 'bye', now, rng, me.name);
        game.seats = game.seats.filter((s) => s !== me);
        if (game.phase === 'betting' && anyIn(game) && allIn(game)) game.wakeAt = now + 400;
      }
      break;
    }
  }
  game.updatedAt = now;
  return { ok: true, game, changed: true };
}

function uniqueBjName(game: Blackjack, name: string): string {
  const taken = new Set(game.seats.map((s) => s.name));
  if (!taken.has(name)) return name;
  for (let i = 2; ; i++) {
    const n = `${name.slice(0, 10 - String(i).length - 1)} ${i}`;
    if (!taken.has(n)) return n;
  }
}

/** What a phone may see: no shoe, and the dealer's hole card stays face down until it's turned. */
export function redactBj(game: Blackjack): Blackjack {
  return { ...game, shoe: [], dealer: game.dealer.hole ? { cards: game.dealer.cards.slice(0, 1), hole: true } : game.dealer };
}

/** The table's chips across every seat this round, for the chip-accounting test. */
export const bjChipsOut = (game: Blackjack): number => game.seats.reduce((sum, s) => sum + stakedBy(s), 0);

/** Anything a phone sends, checked. Never `tick` or `presence`. */
export function parseBjAction(raw: unknown): BjAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  switch (a.type) {
    case 'hit':
    case 'stand':
    case 'double':
    case 'split':
    case 'leave':
      return { type: a.type };
    case 'bet':
      return typeof a.amount === 'number' && Number.isSafeInteger(a.amount) && a.amount >= 0 && a.amount <= BJ.maxBet ? { type: 'bet', amount: a.amount } : null;
    case 'sit': {
      const name = typeof a.name === 'string' ? a.name.replace(/\s+/g, ' ').trim().slice(0, 10) : '';
      return name && isEmoji(a.emoji) ? { type: 'sit', name, emoji: a.emoji } : null;
    }
  }
  return null;
}

/** A saved table from this phone, or null if it isn't one. */
export function isBlackjackTable(raw: unknown): raw is Blackjack {
  const g = raw as Blackjack | null;
  return !!g && g.kind === 'blackjack' && g.v === 1 && Array.isArray(g.seats) && Array.isArray(g.shoe) && g.shoe.every(isCard);
}

/** A friend asking you to their blackjack table, kept on your friend card for a few minutes. */
export interface BjInvite {
  /** Their friend code. */
  from: string;
  name: string;
  emoji: string;
  /** The table's code. */
  table: string;
  at: number;
}

export interface CreateBjResponse {
  code: string;
}

export type BjServerMessage = { t: 'state'; game: Blackjack; ack?: string } | { t: 'reject'; id?: string; error: string } | { t: 'pong' };
export type BjClientMessage = { t: 'act'; id: string; a: BjAction } | { t: 'sync' } | { t: 'ping' };
