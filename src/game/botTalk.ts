// What bots say at the table, through the same bubbles as moves and quick messages. Every line is
// fixed here (ids start "b:"), and phones can't send them: only bots say these. Lines are short so
// they fit on one line in a seat's bubble.

import { styleOf } from './botStyles';
import type { Game } from './types';

export type TalkEvent =
  /** Thinking out loud before a hard decision. */
  | 'thinkHard'
  /** Thinking out loud before an easy one. */
  | 'thinkEasy'
  /** About to move all in. */
  | 'allin'
  /** About to bet or raise big. */
  | 'raise'
  /** About to fold to a big bet. */
  | 'foldBig'
  /** About to call a big bet with a so-so hand. */
  | 'callLight'
  /** A person just bet big or went all in. */
  | 'yourBigBet'
  /** All in, waiting for the next card. */
  | 'sweat'
  /** Watching someone else's all-in. */
  | 'sweatWatch'
  /** Won the all-in. */
  | 'sweatWin'
  /** Lost the all-in. */
  | 'sweatLose'
  /** Won a pot after betting with nothing. */
  | 'bluffWon'
  /** Won a big pot at showdown. */
  | 'bigWin'
  /** Won a small pot. */
  | 'win'
  /** Lost a big pot with a strong hand. */
  | 'badBeat'
  /** A person won a pot from the bot. */
  | 'lostToYou'
  /** Another bot answering what was just said. */
  | 'reply';

type Lines = Record<TalkEvent, string[]>;

const TRASH: Lines = {
  thinkHard: ['Hmm…', 'What do we have…', 'Let me think.', 'Sneaky…', 'You sure?'],
  thinkEasy: ['Easy.', 'Too easy.', 'Obviously.', 'Snap.', 'Next.'],
  allin: ['Let’s gamble.', 'All of it.', 'Your move.', 'Shove time.', 'Let’s dance.'],
  raise: ['Pressure.', 'Let’s go.', 'Pay up.', 'Raise. Duh.', 'Try me.'],
  foldBig: ['Fine. Take it.', 'Enjoy it.', 'Next time.', 'Not worth it.', 'Saving chips.'],
  callLight: ['Don’t buy it.', 'Show me.', 'Prove it.', 'Bluffing again?', 'Nope. Call.'],
  yourBigBet: ['Oh, serious?', 'Smells fishy.', 'Bold.', 'Is that it?', 'Scary. Not.'],
  sweat: ['C’mon, c’mon!', 'Hold!', 'Brick! Brick!', 'Don’t you dare.', 'Gimme one!'],
  sweatWatch: ['Here we go!', 'Sweat it.', 'Popcorn time.', 'Who’s got it?', 'Big flip!'],
  sweatWin: ['LET’S GO!', 'Never in doubt.', 'Ship it!', 'Yes!', 'Too good.'],
  sweatLose: ['Damn!', 'Unreal.', 'Every time!', 'Of course.', 'Rigged.'],
  bluffWon: ['Read me, huh?', 'Never in doubt.', 'Too easy.', 'Wanna know?'],
  bigWin: ['Ship it!', 'Thanks for that.', 'Stack’s happy.', 'All day.'],
  win: ['Mine.', 'I’ll take that.', 'Thank you.', 'Easy money.'],
  badBeat: ['Unbelievable.', 'That river…', 'Every time.', 'You kidding?'],
  lostToYou: ['Lucky.', 'Enjoy it.', 'Ok. This time.', 'You got there.'],
  reply: ['Lucky.', 'Sure you did.', 'Skill, obviously.', 'Cry about it.', 'Pfft.', 'Whatever.'],
};

const FRIENDLY: Lines = {
  thinkHard: ['Hmm…', 'Tough one…', 'Ugh, really?', 'Let me think…', 'Oh no…'],
  thinkEasy: ['Okay!', 'Sure.', 'Alright.', 'Let’s see…', 'Fine by me.'],
  allin: ['Here goes!', 'Wish me luck!', 'Feeling brave.', 'All in!', 'Yolo!'],
  raise: ['I like this.', 'Let’s play!', 'Raise!', 'Gotta try.', 'Feeling good.'],
  foldBig: ['Too rich for me.', 'You have it.', 'Not this time.', 'I’m out.', 'Nope!'],
  callLight: ['Had to see it.', 'Curious…', 'Can’t fold this.', 'Keep me honest.', 'One look.'],
  yourBigBet: ['Whoa!', 'Big bet!', 'Tough one.', 'Okay, okay…', 'Yikes.'],
  sweat: ['Come on!', 'Please, please…', 'Fingers crossed!', 'Hold on!', 'Oh boy…'],
  sweatWatch: ['Ooh, flip!', 'Here we go!', 'Exciting!', 'Good luck both!', 'Eek!'],
  sweatWin: ['Woohoo!', 'YES!', 'Phew!', 'It held!', 'Lucky me!'],
  sweatLose: ['Noooo!', 'Damn!', 'Oof.', 'So close!', 'Ouch.'],
  bluffWon: ['Phew.', 'I’ll take it!', 'Don’t ask.', 'Sneaky, I know.'],
  bigWin: ['Woohoo!', 'Nice pot!', 'Finally!', 'Felt good.'],
  win: ['Thanks!', 'Ooh, mine.', 'Nice.', 'Little one.'],
  badBeat: ['Ouch.', 'So close!', 'Oof, the river.', 'That hurt.'],
  lostToYou: ['Nice hand!', 'Well played.', 'You got me.', 'Good call.'],
  reply: ['Nice one!', 'Haha!', 'Ouch.', 'Fair enough.', 'Well played!', 'Wow.'],
};

const id = (tone: string, event: string, i: number) => `b:${tone}:${event}:${i}`;

/** The text for a bot line id, or '' if it isn't one. */
export function botLineText(lineId: string): string {
  const [b, tone, event, i] = lineId.split(':');
  if (b !== 'b') return '';
  const lines = (tone === 'trash' ? TRASH : tone === 'friendly' ? FRIENDLY : null)?.[event as TalkEvent];
  return lines?.[Number(i)] ?? '';
}

/** How likely each kind of moment gets a word, before the bot's own chattiness. */
const CHANCE: Record<TalkEvent, number> = {
  thinkHard: 0.45,
  thinkEasy: 0.15,
  allin: 0.8,
  raise: 0.45,
  foldBig: 0.45,
  callLight: 0.55,
  yourBigBet: 0.8,
  sweat: 0.9,
  sweatWatch: 0.5,
  sweatWin: 1,
  sweatLose: 1,
  bluffWon: 0.6,
  bigWin: 0.8,
  win: 0.25,
  badBeat: 1,
  lostToYou: 0.8,
  reply: 0.5,
};

/** A bot never speaks again within this long, so one seat can't chatter non-stop. */
const COOLDOWN = 2500;

/** Maybe has a bot say something. Returns true if it spoke. `now` is the table clock, for the cooldown. */
export function botSays(game: Game, playerId: string, event: TalkEvent, rng: () => number, now: number): boolean {
  const player = game.players.find((p) => p.id === playerId);
  if (!player?.bot) return false;
  const last = game.talkAt?.[playerId] ?? -Infinity;
  if (now - last < COOLDOWN) return false;
  const style = styleOf(player.style);
  if (rng() > Math.min(1, CHANCE[event] * (0.35 + style.talk.chatty))) return false;
  const lines = (style.talk.tone === 'trash' ? TRASH : FRIENDLY)[event];
  const i = Math.floor(rng() * lines.length);
  game.reactions = { ...game.reactions, [playerId]: { id: id(style.talk.tone, event, i), n: (game.reactions?.[playerId]?.n ?? 0) + 1 } };
  game.talkAt = { ...game.talkAt, [playerId]: now };
  return true;
}
