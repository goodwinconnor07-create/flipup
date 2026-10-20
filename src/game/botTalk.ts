// What bots say at the table, now and then, through the same speech bubbles as quick messages.
// Every line is fixed here (ids start "b:"), and phones can't send them: only bots say these.

import { styleOf } from './botStyles';
import type { Game } from './types';

export type TalkEvent =
  /** The bot moved all in. */
  | 'allin'
  /** The bot raised big or re-raised. */
  | 'raise'
  /** The bot folded to a big bet. */
  | 'foldBig'
  /** The bot called a big bet with a so-so hand. */
  | 'callLight'
  /** The bot won a pot without a showdown after betting with nothing. */
  | 'bluffWon'
  /** The bot won a big pot at showdown. */
  | 'bigWin'
  /** The bot lost a big pot with a strong hand. */
  | 'badBeat'
  /** Someone else (a person) won a big pot from the bot. */
  | 'lostToYou';

type Lines = Record<TalkEvent, string[]>;

const TRASH: Lines = {
  allin: ['All of it. Your move.', 'Let’s gamble.', 'You won’t call.', 'Shove o’clock.'],
  raise: ['Too easy.', 'Raise. Obviously.', 'You sure about that?', 'Pressure’s on.'],
  foldBig: ['Fine. Take it.', 'Enjoy that one.', 'I’ll get you later.', 'Saving it for a real pot.'],
  callLight: ['I don’t believe you.', 'Show me.', 'You’re bluffing. Probably.', 'Call. Prove it.'],
  bluffWon: ['Wouldn’t you like to know.', 'Never in doubt.', 'Read me like a book, huh?', 'Folding’s a skill too.'],
  bigWin: ['Ship it!', 'Thanks for the chips.', 'Was there ever any doubt?', 'Stack’s looking healthy.'],
  badBeat: ['Unbelievable.', 'Of course it came.', 'That river…', 'Every time.'],
  lostToYou: ['Lucky.', 'Enjoy it while it lasts.', 'Ok, nice hand. This time.', 'You got there.'],
};

const FRIENDLY: Lines = {
  allin: ['Here goes nothing!', 'All in, wish me luck.', 'Feeling brave.', 'Let’s see a flop!'],
  raise: ['I like this one.', 'Let’s make it interesting.', 'Raise!', 'Got to try.'],
  foldBig: ['Too rich for me.', 'I’ll let that go.', 'You can have it.', 'Not this time.'],
  callLight: ['I had to see it.', 'Curious…', 'Couldn’t fold that.', 'Keep me honest.'],
  bluffWon: ['Phew.', 'I’ll take it!', 'Don’t ask.', 'Sneaky, I know.'],
  bigWin: ['Woohoo!', 'That felt good.', 'Finally!', 'Nice pot!'],
  badBeat: ['Ouch.', 'So close!', 'Oof, the river.', 'That one hurt.'],
  lostToYou: ['Nice hand!', 'Well played.', 'You got me.', 'Good call.'],
};

const id = (tone: string, event: string, i: number) => `b:${tone}:${event}:${i}`;

/** The text for a bot line id, or '' if it isn't one. */
export function botLineText(lineId: string): string {
  const [b, tone, event, i] = lineId.split(':');
  if (b !== 'b') return '';
  const lines = (tone === 'trash' ? TRASH : tone === 'friendly' ? FRIENDLY : null)?.[event as TalkEvent];
  return lines?.[Number(i)] ?? '';
}

/** How often each kind of moment gets a comment, before the bot's own chattiness. */
const CHANCE: Record<TalkEvent, number> = {
  allin: 0.35,
  raise: 0.08,
  foldBig: 0.12,
  callLight: 0.15,
  bluffWon: 0.4,
  bigWin: 0.45,
  badBeat: 0.6,
  lostToYou: 0.5,
};

/**
 * Maybe has a bot say something. At most one bot speaks per hand, so the table never fills with chatter.
 * Returns true if it spoke.
 */
export function botSays(game: Game, playerId: string, event: TalkEvent, rng: () => number): boolean {
  const player = game.players.find((p) => p.id === playerId);
  const hand = game.hand;
  if (!player?.bot || !hand) return false;
  if (game.botChatHand === hand.number) return false;
  const style = styleOf(player.style);
  if (rng() > CHANCE[event] * style.talk.chatty * 0.7) return false;
  const lines = (style.talk.tone === 'trash' ? TRASH : FRIENDLY)[event];
  const i = Math.floor(rng() * lines.length);
  game.reactions = { ...game.reactions, [playerId]: { id: id(style.talk.tone, event, i), n: (game.reactions?.[playerId]?.n ?? 0) + 1 } };
  game.botChatHand = hand.number;
  return true;
}
