// The Demo's script: for each game, the steps the coach walks you through on the demo hand (src/game/demo.ts). A step
// shows when its moment comes on the table (`when`), lights up parts of the table (`spots`) and either waits for Next or
// for you to tap the one thing it asks for (`tap`). Words that depend on the cards are worked out from the hand itself,
// so they stay true; native/tests/demo-steps.test.ts plays every demo through these steps and fails if one never
// comes up, so a change to a game shows here. Keep to docs/DEMO.md: short, the twist early, show don't explain.
import {
  bestHand,
  count21,
  DEMO_SPECS,
  rankLabel,
  suitOf,
  type Action,
  type Card,
  type Game,
  type Hand,
  type Player,
  type Seat,
  type Street,
  type Variant,
} from '@/engine';

import type { SpotId } from './spots';

/** What a step can see: the table as this phone sees it, and what's open on the screen. */
export interface CoachCtx {
  game: Game;
  me: Player | undefined;
  hand: Hand | null;
  seat: Seat | undefined;
  /** The welcome has been closed and the hand is under way. */
  started: boolean;
  /** Table time (ms). */
  now: number;
  /** Spots on the screen right now (an open panel's are here). */
  open: ReadonlySet<string>;
}

type Text = string | ((c: CoachCtx) => string);

export interface CoachStep {
  id: string;
  /** The step's moment on the table. */
  when: (c: CoachCtx) => boolean;
  /** Parts of the table it lights up. */
  spots?: SpotId[];
  /** What you're asked to tap (lit up too, and the only thing on the screen that takes a tap). Without it, Next. */
  tap?: SpotId;
  /** Other parts that take taps during a tap step (the bet sizes, while Bet is the move asked for). */
  also?: SpotId[];
  /** Shows while its moment plays out and moves on by itself (a die rolling, the twenty on show). */
  watch?: boolean;
  /** Waits this long (ms) once its moment comes, so what it's about is seen first. */
  wait?: number;
  /** The Next button's word (Next unless set). */
  next?: string;
  title: Text;
  text: Text;
}

const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;
/** "K♥". */
export const short = (card: Card | undefined): string => (card ? `${rankLabel(card)}${SUIT[suitOf(card)]}` : '');
const both = (cards: Card[] | undefined) => (cards ?? []).map(short).join(' ');

/** A moment on the board (a card landing, a power on show) is still playing. */
const busy = (c: CoachCtx) => !!c.hand?.moment && c.now < c.hand.moment.until;

/** Your turn (on this street), with the table settled: the cards have landed and nothing is on show. */
export function myTurn(c: CoachCtx, street?: Street): boolean {
  const h = c.hand;
  return !!h && !!c.me && !h.result && h.toAct === c.me.id && h.bettingAt == null && !busy(c) && (!street || h.street === street);
}
const turn = (street: Street, also: (c: CoachCtx) => boolean = () => true) => (c: CoachCtx) => myTurn(c, street) && also(c);
const over = (c: CoachCtx) => !!c.hand?.result;
const intro = (c: CoachCtx) => !c.started;

/** What the bot (by name) put in on this street. */
const betBy = (c: CoachCtx, name: string) => {
  const p = c.game.players.find((x) => x.name === name);
  const s = c.hand?.seats.find((x) => x.playerId === p?.id);
  return s?.bet ?? 0;
};
const toCall = (c: CoachCtx) => Math.max(0, (c.hand?.currentBet ?? 0) - (c.seat?.bet ?? 0));
/** Your hand's name, by the game's own rules ("Flush", "Straight"). */
const yourHand = (c: CoachCtx) => (c.seat && c.hand ? bestHand(c.hand.variant ?? 'holdem', c.seat.cards, c.hand.board).name.toLowerCase() : '');
const theirHand = (c: CoachCtx, name: string) => {
  const p = c.game.players.find((x) => x.name === name);
  const s = c.hand?.seats.find((x) => x.playerId === p?.id);
  return s?.cards.length && c.hand ? bestHand(c.hand.variant ?? 'holdem', s.cards, c.hand.board).name.toLowerCase() : '';
};
const a = (word: string) => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`);
/** "beats Luna’s two pair", or "wins" when they didn't show. */
const beats = (c: CoachCtx, name: string) => {
  const theirs = theirHand(c, name);
  return theirs ? `beats ${name}’s ${theirs}` : 'wins';
};
/** " Max had four of a kind." when they showed (with where, if given), else nothing. */
const had = (c: CoachCtx, name: string, where = '') => {
  const theirs = theirHand(c, name);
  return theirs ? ` ${name} had ${a(theirs)}${where}.` : '';
};

// ── Steps used by most games ────────────────────────────────────────────────

const welcome = (title: string, text: string): CoachStep => ({ id: 'welcome', when: intro, title, text, next: 'Deal me in' });
const callToPlay = (text = 'Match the big blind, 20 chips, to see the flop.'): CoachStep => ({
  id: 'call',
  when: turn('preflop'),
  tap: 'act.call',
  title: 'Call to play',
  text,
});
const showdown = (text: Text, wait = 1400): CoachStep => ({ id: 'showdown', when: over, wait, spots: ['felt'], title: 'Showdown', text });

/** Every game's steps. The first is the welcome; the last comes after the showdown, then the finish card. */
export const DEMO_STEPS: Record<Variant, CoachStep[]> = {
  holdem: [
    welcome("Texas Hold'em", 'A quick hand against Luna and Max. We’ll show you what to tap.'),
    { id: 'cards', when: turn('preflop'), spots: ['mine'], title: 'Your two cards', text: (c) => `${both(c.seat?.cards)}. Only you can see them. Poker face on.` },
    { id: 'seats', when: turn('preflop'), spots: ['seats'], title: 'Luna and Max', text: 'They posted the blinds, 10 and 20. Everyone acts in turn: fold, check, call or raise.' },
    callToPlay(),
    { id: 'flop', when: turn('flop'), spots: ['board'], title: 'The flop', text: 'Three cards everyone shares. With your two hearts that’s four: one more makes a flush.' },
    { id: 'flop-call', when: turn('flop'), tap: 'act.call', title: (c) => `Luna bets ${betBy(c, 'Luna')}`, text: 'Call to see the next card.' },
    { id: 'turn', when: turn('turn'), spots: ['board'], tap: 'act.check', title: 'The turn', text: 'Card number four. No heart. Nobody has bet, so check: it’s free.' },
    { id: 'river', when: turn('river'), spots: ['board', 'mine'], title: 'The river', text: (c) => `The ${short(c.hand?.board[4])}: you’ve made ${a(yourHand(c))}. Now get paid for it.` },
    { id: 'bet', when: turn('river', (c) => !c.open.has('raise.go')), tap: 'act.raise', title: 'Bet', text: 'Tap Bet to choose how much.' },
    { id: 'size', when: turn('river', (c) => c.open.has('raise.go')), spots: ['raise.panel'], also: ['raise.size'], tap: 'raise.go', title: 'Pick a size', text: 'Sizes and the slider set your bet. Tap Bet to put it in.' },
    showdown((c) => `Cards up. The best five cards win: your ${yourHand(c)} ${beats(c, 'Luna')}.`),
  ],

  pineapple: [
    welcome('Crazy Pineapple', 'Hold’em with three cards, and a twist after the flop. A quick hand against Luna and Max.'),
    { id: 'cards', when: turn('preflop'), spots: ['mine'], title: 'Three cards', text: (c) => `${both(c.seat?.cards)}. One more than Hold’em, so big hands come round more often.` },
    callToPlay(),
    { id: 'flop', when: turn('flop'), spots: ['board', 'mine'], tap: 'act.check', title: 'Three of a kind', text: 'A king! Bet with all three cards still in your hand. For now, check.' },
    {
      id: 'discard',
      when: (c) => !!c.hand?.discarding && (c.seat?.cards.length ?? 0) > 2,
      spots: ['discard'],
      // Named from the demo hand, so the step and the hand can't disagree.
      tap: `discard:${discardOf('pineapple')}`,
      title: 'Throw one away',
      text: () => `After the flop betting everyone throws a card away. Keep your kings: tap the ${short(discardOf('pineapple'))}.`,
    },
    { id: 'turn', when: turn('turn'), spots: ['mine'], tap: 'act.call', title: 'Back to two', text: (c) => `It’s Hold’em from here. Max bets ${betBy(c, 'Max')}: call.` },
    { id: 'river', when: turn('river'), tap: 'act.check', title: 'The river', text: 'Your kings are still strong. Check, and see their cards.' },
    showdown((c) => `The best five from your two and the board: your ${yourHand(c)} takes it.`),
  ],

  deuces: [
    welcome('Crazy Deuces', 'Every 2 is wild. A quick hand against Luna and Max.'),
    { id: 'cards', when: turn('preflop'), spots: ['mine'], title: 'Every 2 is wild', text: (c) => `Your ${short(c.seat?.cards.find((x) => x[0] === '2'))} shines gold: it becomes whatever card helps you most.` },
    callToPlay(),
    { id: 'flop', when: turn('flop'), spots: ['board'], tap: 'act.call', title: 'A 2 on the board', text: (c) => `It’s wild for everyone. You’ve ${yourHand(c)} already. Max bets ${betBy(c, 'Max')}: call.` },
    { id: 'turn', when: turn('turn'), tap: 'act.call', title: 'Max keeps betting', text: 'Wild cards make big hands, so bets get bold. Call.' },
    { id: 'river', when: turn('river'), spots: ['board', 'mine'], tap: 'act.call', title: 'Another king', text: (c) => `Three kings and two wild 2s: ${yourHand(c)}! Call.` },
    showdown((c) => `Five of a kind beats everything, even a royal flush.${had(c, 'Max')}`),
  ],

  ghost: [
    welcome('Haunted Pot', 'A ghost sits in with a hand of its own. A quick hand against Luna, Max and the ghost.'),
    { id: 'ghost', when: turn('preflop'), spots: ['ghost'], title: 'The ghost', text: (c) => `It gets two cards and never bets. It kept ${c.hand?.carry ?? 0} chips from earlier hands, now in the pot.` },
    callToPlay('Beat the table and the ghost to take it all. Call to play.'),
    { id: 'flop', when: turn('flop'), spots: ['board', 'mine'], tap: 'act.check', title: 'The flop', text: 'An ace on the board pairs yours. Check, and see what comes.' },
    { id: 'turn', when: turn('turn'), tap: 'act.call', title: 'Pot limit', text: (c) => `No bet can be bigger than the pot here. Max bets ${betBy(c, 'Max')}: call.` },
    { id: 'river', when: turn('river'), spots: ['ghost'], tap: 'act.check', title: 'Good enough?', text: 'Your aces beat Luna and Max. But can they beat the ghost? Check to find out.' },
    { id: 'showdown', when: over, wait: 2400, spots: ['ghost', 'felt'], title: 'You beat the ghost', text: (c) => `Its ${c.hand?.result?.ghost?.name.toLowerCase() ?? 'hand'} loses to your aces, so its bounty is yours too. Had it won, it would keep the pot.` },
  ],

  pittsburgh: [
    welcome('Pittsburgh', 'Hold’em with three rivers. A quick hand against Luna and Max.'),
    { ...callToPlay('Same start as Hold’em. Call to play.'), spots: ['mine'], title: 'Your two cards' },
    { id: 'flop', when: turn('flop'), spots: ['board'], tap: 'act.call', title: 'The flop', text: (c) => `One card from a straight. Luna bets ${betBy(c, 'Luna')}: call.` },
    { id: 'turn', when: turn('turn'), tap: 'act.check', title: 'The turn', text: 'No straight yet. Check: the surprise comes next.' },
    { id: 'rivers', when: turn('river'), spots: ['board'], title: 'Three rivers', text: 'Three river cards land at once: three chances to hit.' },
    { id: 'river', when: turn('river'), spots: ['board', 'mine'], tap: 'act.check', title: 'Pick your river', text: (c) => `Your hand uses whichever river suits it best. That’s ${a(yourHand(c))}. Check.` },
    showdown((c) => `Your ${yourHand(c)} ${beats(c, 'Luna')}.`),
  ],

  dice: [
    welcome('Die on the River', 'Hold’em, until a die rolls on the river. A quick hand against Luna and Max.'),
    { ...callToPlay('It plays like Hold’em. Call to play.'), spots: ['mine'], title: 'Your two cards' },
    { id: 'flop', when: turn('flop'), spots: ['board'], tap: 'act.call', title: 'The flop', text: (c) => `One card from a straight. Luna bets ${betBy(c, 'Luna')}: call.` },
    { id: 'turn', when: turn('turn'), tap: 'act.check', title: 'Feeling safe?', text: 'After the river card a die rolls: a 1 to 5 swaps that card on the board for a new one. Check.' },
    {
      id: 'river',
      when: turn('river'),
      spots: ['board'],
      tap: 'act.call',
      title: (c) => `Rolled a ${c.hand?.dice?.roll ?? ''}!`,
      text: (c) => {
        const d = c.hand?.dice;
        return d?.in ? `The ${short(d.out)} went and the ${short(d.in)} came in: ${a(yourHand(c))}! Call Luna’s ${toCall(c)}.` : `The board stays. Call.`;
      },
    },
    showdown('Luna was ahead until the die. One roll changed the winner.'),
  ],

  redriver: [
    welcome('Red River', 'Plain Hold’em, until the river. Then watch its colour. A quick hand against Luna and Max.'),
    { ...callToPlay('Plain Hold’em to start. Call to play.'), spots: ['mine'], title: 'Your two cards' },
    { id: 'flop', when: turn('flop'), spots: ['board'], tap: 'act.call', title: 'The flop', text: (c) => `A ten and a nine. Luna bets ${betBy(c, 'Luna')}: call.` },
    { id: 'turn', when: turn('turn'), tap: 'act.check', title: 'Watch the river', text: 'If the river is red, another card comes, and another, until a black one lands. Check.' },
    {
      id: 'river',
      when: turn('river'),
      spots: ['board'],
      tap: 'act.check',
      title: 'Red keeps coming',
      text: (c) => {
        const extra = (c.hand?.board ?? []).slice(4);
        return `${extra.map(short).join(', then ')}: red, red, black. That made ${a(yourHand(c))}. Check.`;
      },
    },
    showdown('Every card counts: best five from your two and the whole board, however long it got.'),
  ],

  crucifix: [
    welcome('Crucifix', 'The board is a cross of nine cards. A quick hand against Luna and Max.'),
    { ...callToPlay('Dealt like Hold’em. Call to play.'), spots: ['mine'], title: 'Your two cards' },
    { id: 'flop', when: turn('flop'), spots: ['board'], tap: 'act.check', title: 'A cross', text: 'The flop is five cards: the middle and one on each arm. Check.' },
    { id: 'turn', when: turn('turn'), spots: ['board'], tap: 'act.check', title: 'Pick a line', text: 'Your hand is your two cards plus one line, across or down. Never mix them. Check.' },
    { id: 'river', when: turn('river'), spots: ['board', 'mine'], tap: 'act.call', title: 'Down the cross', text: (c) => `Down the middle, with your two: ${a(yourHand(c))}! Luna bets ${betBy(c, 'Luna')}: call.` },
    showdown((c) => `Your ${yourHand(c)} runs down the cross and wins.${had(c, 'Luna', ' across')}`),
  ],

  circle: [
    welcome('Round the Clock', 'Six board cards round a clock. A quick hand against Luna and Max.'),
    { ...callToPlay('Both your cards always play here, so start strong. Call.'), spots: ['mine'], title: 'Both cards play' },
    { id: 'flop', when: turn('flop'), spots: ['board'], tap: 'act.check', title: 'Round the clock', text: 'The flop lands at 12 and 6 o’clock. Check.' },
    { id: 'turn', when: turn('turn'), spots: ['board'], tap: 'act.check', title: 'The turn', text: 'Two more, at 2 and 8. Check.' },
    { id: 'river', when: turn('river'), spots: ['board', 'mine'], tap: 'act.call', title: 'Three in a row', text: (c) => `Your two plus three side by side: 12, 2 and 4 make ${a(yourHand(c))}. Call.` },
    showdown((c) => `Your ${yourHand(c)} ${beats(c, 'Luna')}.`),
  ],

  memory: [
    welcome('Memory Poker', 'Twenty cards leave the deck before every hand. Remember them. A quick hand against Luna and Max.'),
    { id: 'peek', when: (c) => !!c.game.memory, watch: true, spots: ['felt'], title: 'Remember these', text: 'These twenty leave the deck for this hand. Look for the aces.' },
    { ...callToPlay('Dealt from what’s left: none of those twenty can turn up. Call.'), spots: ['mine'], title: 'Your two cards' },
    { id: 'flop', when: turn('flop'), spots: ['board'], tap: 'act.call', title: 'Use your memory', text: (c) => `A king: top pair. Could Luna have an ace? No, all four left the deck. Call the ${betBy(c, 'Luna')}.` },
    { id: 'turn', when: turn('turn'), tap: 'act.check', title: 'Trust it', text: 'With no aces left, your kings are the best pair there can be. Check.' },
    { id: 'river', when: turn('river'), tap: 'act.check', title: 'The river', text: 'Last card. Check.' },
    showdown('A good memory makes for better reads.'),
  ],

  beanstalk: [
    welcome('Bean Stalk', 'Your hand grows on every street. A quick hand against Luna and Max.'),
    { ...callToPlay('Just like Hold’em. Don’t get used to it. Call.'), spots: ['mine'], title: 'Two to start' },
    { id: 'flop', when: turn('flop'), spots: ['mine'], tap: 'act.call', title: 'Your hand grows', text: (c) => `With the flop, everyone still in gets a card. Yours, the ${short(c.seat?.cards[2])}, makes ${a(yourHand(c))}! Call.` },
    { id: 'turn', when: turn('turn'), spots: ['mine'], tap: 'act.check', title: 'And grows', text: 'Another card each with the turn. Check.' },
    { id: 'river', when: turn('river'), spots: ['mine', 'board'], tap: 'act.check', title: 'Five each', text: 'Five in your hand and five on the board. Check.' },
    showdown((c) => `The best five from all ten. Big hands show up a lot: your ${yourHand(c)} ${beats(c, 'Max')}.`),
  ],

  bjholdem: [
    welcome('Hit Me', 'Count your cards like blackjack, play them like poker. A quick hand against Luna and Max.'),
    { id: 'count', when: turn('preflop'), spots: ['mine'], title: 'Count to 21', text: (c) => `${both(c.seat?.cards)} count ${count(c)}. Picture cards count 10, aces 1 or 11.` },
    callToPlay(),
    { id: 'luna', when: turn('flop', (c) => !hit(c)), spots: ['seat:Luna'], title: 'Hit or stand', text: 'On the flop anyone can take more cards, face down. Luna took one.' },
    { id: 'hit', when: turn('flop', (c) => !hit(c)), tap: 'act.hit', title: 'Hit me', text: (c) => `You’re on ${count(c)}. Tap Hit for another card. Over 21 and you’re out.` },
    { id: 'hit-done', when: turn('flop', hit), spots: ['mine'], tap: 'act.check', title: (c) => `${count(c)}!`, text: (c) => `The ${short(c.seat?.cards[2])} takes you to ${count(c)}, and it plays in your poker hand too. Check.` },
    { id: 'turn', when: turn('turn'), spots: ['board'], tap: 'act.check', title: 'The turn', text: 'One card from a straight. Check.' },
    { id: 'river', when: turn('river'), spots: ['board', 'mine'], tap: 'act.check', title: 'The river', text: (c) => `That’s ${a(yourHand(c))}. Check.` },
    showdown('Two winners: half the pot to the best hand, your straight, and half to the closest to 21, Luna’s 21.', 1800),
  ],

  power: [
    welcome('Power Cards', 'Every hand, everyone gets a secret power. A quick hand against Luna and Max.'),
    { id: 'power', when: turn('preflop'), spots: ['power.card'], title: 'Your power', text: 'This hand it’s Peek: see the next board card before anyone. Only you know you have it.' },
    callToPlay('Save your power for later. Call to play.'),
    { id: 'use', when: turn('flop', (c) => !peeked(c) && !c.open.has('power.go')), spots: ['board'], tap: 'power.card', title: 'Use it', text: 'One card from a straight. Tap your power to see what comes next.' },
    { id: 'play', when: turn('flop', (c) => !peeked(c) && c.open.has('power.go')), spots: ['power.panel'], tap: 'power.go', title: 'Play Peek', text: 'Play it on your turn, before your move. Everyone sees that you played it, not what you saw.' },
    { id: 'seen', when: turn('flop', peeked), spots: ['board'], tap: 'act.call', title: (c) => `The turn is the ${short(peekOf(c))}`, text: (c) => `That makes ${a(handWith(c, peekOf(c)))}, and only you know it. Call the ${betBy(c, 'Luna')}.` },
    { id: 'turn', when: turn('turn'), tap: 'act.call', title: 'As you saw', text: (c) => `Luna bets ${betBy(c, 'Luna')} into your ${yourHand(c)}. Call.` },
    { id: 'river', when: turn('river'), tap: 'act.check', title: 'The river', text: 'Check, and see Luna’s cards.' },
    { ...showdown('Best five still wins. After the hand, everyone’s power shows on their seat.'), spots: ['seats', 'felt'] },
  ],
};

/** Crazy Pineapple: the card the demo has you throw away. */
function discardOf(v: Variant): Card | undefined {
  for (const p of DEMO_SPECS[v].plays) if (typeof p === 'object' && 'discard' in p) return p.discard;
  return undefined;
}
/** Hit Me: your cards counted like blackjack, by the engine's own count. */
function count(c: CoachCtx): number {
  return count21(c.seat?.cards ?? []);
}
/** Your hand's name once this card is on the board too. */
function handWith(c: CoachCtx, card: Card | undefined): string {
  return c.seat && c.hand && card ? bestHand(c.hand.variant ?? 'holdem', c.seat.cards, [...c.hand.board, card]).name.toLowerCase() : 'your hand';
}
function hit(c: CoachCtx): boolean {
  return !!c.me && (c.hand?.hits?.[c.me.id] ?? 0) > 0;
}
function peeked(c: CoachCtx): boolean {
  return !!c.hand?.powerUses?.some((u) => u.by === c.me?.id);
}
function peekOf(c: CoachCtx): Card | undefined {
  return c.hand?.powerUses?.find((u) => u.by === c.me?.id)?.seen?.[0];
}

export const textOf = (t: Text, c: CoachCtx): string => (typeof t === 'string' ? t : t(c));

/**
 * What tapping a spot does, as a move on the table (or a panel to open): the coach offers it to VoiceOver as an
 * action on the step, and the tests use it to play the demo through.
 */
export function actionFor(spot: SpotId, c: CoachCtx): Action | 'raisePanel' | 'powerPanel' | null {
  const h = c.hand;
  if (!h) return null;
  if (spot === 'act.call') return { type: 'act', hand: h.number, seq: h.seq, move: 'call' };
  if (spot === 'act.check') return { type: 'act', hand: h.number, seq: h.seq, move: 'check' };
  if (spot === 'act.fold') return { type: 'act', hand: h.number, seq: h.seq, move: 'fold' };
  if (spot === 'act.hit') return { type: 'hit', hand: h.number, seq: h.seq };
  if (spot === 'act.raise') return 'raisePanel';
  if (spot === 'power.card') return 'powerPanel';
  if (spot === 'power.go') return { type: 'power', hand: h.number, seq: h.seq };
  if (spot === 'raise.go') {
    // The panel opens at the smallest bet.
    const to = Math.max(c.game.settings.bigBlind, h.currentBet + h.minRaise);
    return { type: 'act', hand: h.number, seq: h.seq, move: h.currentBet > 0 ? 'raise' : 'bet', to };
  }
  if (spot.startsWith('discard:')) return { type: 'discard', hand: h.number, card: spot.slice('discard:'.length) };
  return null;
}
