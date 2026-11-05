// Range training's own words in the iPhone app: each hand's concept as a trick you collect (a short name, one plain
// line, a family and an icon), the poker words the screens link to, what each kind of player is like, and the
// seats' names. All copy for the screens: the hands, grades and numbers stay in the shared model (src/train/ranges).
import type { Pos } from '@train/ranges/model';

import type { IconName } from '../icon';

export type Family = 'reads' | 'calls' | 'value' | 'bluffs';

export const FAMILY: Record<Family, { name: string; line: string }> = {
  reads: { name: 'Reading bets', line: 'What a bet, a check or a size says about their cards.' },
  calls: { name: 'Big calls and big folds', line: 'When to pay them off, and when to let it go.' },
  value: { name: 'Getting paid', line: 'Betting so worse hands give you chips.' },
  bluffs: { name: 'Bluffing', line: 'Making better hands fold, and when not to try.' },
};

export interface Trick {
  /** A short, friendly name for the concept. */
  nick: string;
  /** What it means, in one plain line. */
  line: string;
  family: Family;
  icon: IconName;
}

/** Every hand's `concept`, as a trick to collect. tests/range-play.test.ts checks each hand's concept is here. */
export const TRICKS: Record<string, Trick> = {
  'Polarised river bets': { nick: 'The Overbet Puzzle', line: 'A huge river bet is very strong or nothing at all. Count the bluffs.', family: 'reads', icon: 'scope' },
  'Thin value': { nick: 'Thin Value', line: 'A small bet that only worse hands call is free money.', family: 'value', icon: 'dollarsign.circle.fill' },
  'Multiway bluff catching': { nick: 'Two to Beat', line: 'With more than one player in, you have to beat all of them.', family: 'calls', icon: 'person.2.fill' },
  'Check-raise ranges': { nick: 'The Check-Raise', line: 'A check-raise on a wet board is lots of draws, not only monsters.', family: 'calls', icon: 'arrow.uturn.backward' },
  'Reading a check': { nick: 'What a Check Says', line: 'A check usually takes the strongest hands out of their range.', family: 'reads', icon: 'eye.fill' },
  'Bluffing multiway': { nick: 'Too Many Callers', line: 'Bluffing two players is twice as hard as bluffing one.', family: 'bluffs', icon: 'person.3.fill' },
  'Bluff catching': { nick: 'The Bluff Catcher', line: 'Your hand beats only bluffs. Do they have enough of them?', family: 'calls', icon: 'hand.raised.fill' },
  'Capped ranges': { nick: 'Capped', line: 'When they skip a bet, their best hands are often gone. Bet into that.', family: 'reads', icon: 'arrowtriangle.down.fill' },
  'Value betting multiway': { nick: 'Paid Twice', line: 'A strong hand against two players: bet, someone will call.', family: 'value', icon: 'chart.line.uptrend.xyaxis' },
  'Live river raises': { nick: 'The River Raise', line: 'A live player who raises the river nearly always has it.', family: 'calls', icon: 'exclamationmark.triangle.fill' },
  'Pot control': { nick: 'Keep It Small', line: 'Good but not great? Check, and don’t build a pot only better hands pay into.', family: 'value', icon: 'minus.circle.fill' },
  'Protection multiway': { nick: 'Charge the Draws', line: 'With lots of players and draws around, bet big so they pay to chase.', family: 'value', icon: 'shield.fill' },
  Overbetting: { nick: 'The Big Bet', line: 'With the best hand and a strong-looking range against you, bet more than the pot.', family: 'value', icon: 'bolt.fill' },
  'Bluffing a capped range': { nick: 'Push on Weakness', line: 'Their check said they’re weak. A big bet makes them fold.', family: 'bluffs', icon: 'flame.fill' },
  'Multiway river leads': { nick: 'The Lead Into Many', line: 'A quiet player betting into everyone on the river has it.', family: 'calls', icon: 'person.3.fill' },
  Blockers: { nick: 'Blockers', line: 'The cards you hold change what they can have.', family: 'reads', icon: 'hand.raised.slash.fill' },
  'Betting only gets called by better': { nick: 'Who Calls?', line: 'If only better hands call your bet, don’t bet.', family: 'value', icon: 'questionmark.circle.fill' },
  'Squeeze ranges': { nick: 'The Squeeze', line: 'A re-raise over a raise and a call is a strong range.', family: 'reads', icon: 'arrow.down.right.and.arrow.up.left' },
  'Small bets mean weak': { nick: 'The Little Bet', line: 'A tiny bet is often a medium hand hoping to get to showdown cheap.', family: 'reads', icon: 'tag.fill' },
  'Wide ranges': { nick: 'Blind vs Blind', line: 'The blinds play lots of hands, so they show up with lots of air.', family: 'calls', icon: 'circle.grid.3x3.fill' },
  '3-bet pots': { nick: 'The 3-Bet Pot', line: 'Big ranges preflop, big hands later: know who still calls.', family: 'value', icon: 'crown.fill' },
  'Multiway check-raises': { nick: 'Raised Into Two', line: 'A check-raise into two players is almost never a bluff.', family: 'calls', icon: 'exclamationmark.triangle.fill' },
  'Live turn raises': { nick: 'The Turn Raise', line: 'This is the spot where big pairs lose big pots.', family: 'calls', icon: 'arrow.uturn.backward' },
  // The generated hands' concepts (src/train/ranges/generate.ts).
  'Value betting': { nick: 'Get Paid', line: 'Ahead of what calls? Bet, and pick the size their worse hands still pay.', family: 'value', icon: 'dollarsign.circle.fill' },
  'Turn check-raises': { nick: 'Raised on the Turn', line: 'A turn check-raise is two pair or better, plus a few big draws.', family: 'calls', icon: 'arrow.uturn.backward' },
  'Probe bets': { nick: 'The Probe', line: 'They skipped the flop bet: lead the turn into a range that gave up.', family: 'bluffs', icon: 'scope' },
  'Facing a lead': { nick: 'Led Into', line: 'After you check back, a river lead is value or a missed draw. Count both.', family: 'calls', icon: 'hand.raised.fill' },
  'Turn defence': { nick: 'The Second Barrel', line: 'A second bet is much stronger than the first. One pair has to be careful.', family: 'calls', icon: 'exclamationmark.triangle.fill' },
  'Delayed c-bets': { nick: 'Bet It Later', line: 'Checked the flop back? The turn can be the time to bet.', family: 'value', icon: 'bolt.fill' },
  'Facing a probe': { nick: 'Probed', line: 'Your flop check told them you’re weak, so their turn bet is wider.', family: 'calls', icon: 'eye.fill' },
  'Polarised overbets': { nick: 'The Overbet Puzzle', line: 'A bet bigger than the pot is the nuts or nothing. Count the bluffs.', family: 'reads', icon: 'scope' },
  'River bluffs': { nick: 'The Missed Draw', line: 'A hand that can’t win a showdown wins only by betting. Do they fold enough?', family: 'bluffs', icon: 'flame.fill' },
  'Pot odds for draws': { nick: 'The Price of a Draw', line: 'A draw needs the right price. Compare your odds with the bet.', family: 'calls', icon: 'questionmark.circle.fill' },
  'Delayed river bets': { nick: 'The Late Stab', line: 'They gave up on the turn and bet the river: thin value or a bluff.', family: 'reads', icon: 'tag.fill' },
  'Multiway draws': { nick: 'Drawing Into a Crowd', line: 'More players means a better price for your draw, but more of them can have you beat.', family: 'calls', icon: 'person.3.fill' },
  'Limped pots': { nick: 'Limpers', line: 'Loose limpers call too much: value bet, don’t bluff.', family: 'value', icon: 'circle.grid.3x3.fill' },
};

/** A trick for any concept (a new hand whose concept isn't listed yet still shows). */
export const trickOf = (concept: string): Trick => TRICKS[concept] ?? { nick: concept, line: '', family: 'reads', icon: 'sparkles' };

/** What each kind of player is like, in a few words. Keyed by the hands' `type`. */
export const VIBE: Record<string, string> = {
  'Solid regular': 'Plays it straight.',
  'Aggressive regular': 'Loves to bet.',
  'Loose live player': 'Plays lots of hands.',
  'Loose-passive live player': 'Calls a lot, rarely bets.',
  'Passive live player': 'Rarely bets without it.',
  'Tight regular': 'Only plays good hands.',
  'Tight-passive live player': 'Careful. A bet means a hand.',
  'Typical live player': 'A normal live player.',
  'Typical regular': 'A normal online regular.',
};
export const vibeOf = (type: string): string => VIBE[type] ?? type;

/** Seats in plain words. */
export const SEAT_NAME: Record<Pos, string> = {
  UTG: 'first to act',
  UTG1: 'second to act',
  MP: 'in the middle',
  LJ: 'in the lojack',
  HJ: 'in the hijack',
  CO: 'in the cutoff',
  BTN: 'on the button',
  SB: 'in the small blind',
  BB: 'in the big blind',
};

export interface Word {
  key: string;
  word: string;
  /** What it means, in plain words. */
  says: string;
  /** Other spellings the screens link to this word. */
  also?: string[];
}

/** The poker words the screens link (a tap opens the `range-glossary` sheet). Order is the sheet's order. */
export const WORDS: Word[] = [
  { key: 'range', word: 'Range', says: 'Every hand a player could have, given how they’ve played. You never know their exact cards, so you think about all of them.', also: ['ranges'] },
  { key: 'bb', word: 'bb (big blinds)', says: 'Chips are counted in big blinds, the bigger forced bet. 10bb is ten big blinds.', also: ['big blind', 'big blinds'] },
  { key: 'equity', word: 'Your chance to win', says: 'How often your hand would win if all the cards came out now, against everything they could have. Pros call it equity.', also: ['equity'] },
  { key: 'price', word: 'The price', says: 'What you pay against what you can win. Pay 10 to win 30 and you need to win at least a quarter of the time.', also: ['pot odds'] },
  { key: 'value', word: 'Value bet', says: 'A bet you want called, because worse hands will pay you.', also: ['value'] },
  { key: 'bluff', word: 'Bluff', says: 'A bet with a hand that would lose, to make better hands fold.', also: ['bluffs', 'bluffing'] },
  { key: 'bluffcatcher', word: 'Bluff catcher', says: 'A hand that beats their bluffs and nothing else. Calling with one is right only when they bluff enough.', also: ['bluff catcher', 'bluff catchers'] },
  { key: 'polarised', word: 'Polarised', says: 'A range made of very strong hands and bluffs, with nothing in the middle. Big bets are usually polarised.', also: ['polarised bet', 'polarized'] },
  { key: 'capped', word: 'Capped', says: 'A range that has lost its strongest hands, usually because they didn’t bet or raise when they would have.', also: ['capped range'] },
  { key: 'thin', word: 'Thin value', says: 'A value bet with a hand that’s only a bit better than what calls. Small, but it adds up.' },
  { key: 'checkraise', word: 'Check-raise', says: 'Checking, then raising when someone bets. A strong move, or a big bluff.', also: ['check-raise', 'check-raises', 'check-raised'] },
  { key: 'threebet', word: '3-bet', says: 'A re-raise before the flop. The first raise is the 2-bet, the re-raise is the 3-bet.', also: ['3-bet', '3-bets', 're-raise'] },
  { key: 'squeeze', word: 'Squeeze', says: 'A 3-bet after someone raised and someone else called.' },
  { key: 'blocker', word: 'Blocker', says: 'A card in your hand that makes some of their hands impossible. Hold the ace of spades and nobody else has it.', also: ['blocks', 'blockers'] },
  { key: 'overbet', word: 'Overbet', says: 'A bet bigger than the pot.' },
  { key: 'multiway', word: 'Multiway', says: 'A pot with three or more players still in.', also: ['multiway pot'] },
  { key: 'position', word: 'Position', says: 'Where you sit. The button acts last after the flop, which is the best seat. The blinds act first.', also: ['button', 'cutoff', 'in position', 'out of position'] },
  { key: 'draw', word: 'Draw', says: 'A hand that isn’t made yet: four to a flush or a straight, waiting for the card.', also: ['draws', 'flush draw', 'straight draw', 'missed draws'] },
  { key: 'ev', word: 'Wins on average', says: 'What a play earns over many tries, counting the times it loses. Pros call it EV.', also: ['ev', 'expected value'] },
  { key: 'showdown', word: 'Showdown', says: 'When the betting is over and the hands are turned up to see who wins.' },
  { key: 'combo', word: 'Combos', says: 'The ways to be dealt a hand. There are six ways to hold a pair of aces, and sixteen ways to hold ace-king.', also: ['combos', 'combinations'] },
];

export const wordOf = (key: string): Word | undefined => WORDS.find((w) => w.key === key);
