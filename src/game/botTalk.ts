// What bots say at the table, through the same bubbles as moves and quick messages. Every line is
// fixed here (ids start "b:"), and phones can't send them: only bots say these. Lines are short so
// they fit on one line in a seat's bubble.

import { styleOf, type StyleId } from './botStyles';
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
  | 'reply'
  /** Won a big pot off a person at showdown: the moment to rub it in. */
  | 'tiltJab'
  /** Bluffed, got called and lost. */
  | 'bluffCaught'
  /** Nothing much happening; a new hand is dealt. */
  | 'idle'
  /** A person has sat on their turn for ages. */
  | 'tank';

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
  tiltJab: ['Rent free 🧠', 'Stay tilted.', 'Keep donating.', 'Again, bro?', 'You’re predictable.'],
  bluffCaught: ['Worth it.', 'Still profitable.', 'Nice call.', 'Delete that.', 'Don’t tell anyone.'],
  idle: ['Hello, fish.', 'Lock in.', 'Chaos time.', 'No mercy.', 'Wake up.'],
  tank: ['Need a map?', 'Clock’s ticking.', 'Any day now.', 'Fold already.', 'It’s not chess.'],
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
  tiltJab: ['Sorry!', 'Deep breaths.', 'You’ll recover.', 'Need a hug?', 'Tough break.'],
  bluffCaught: ['Oops, caught!', 'Nice call!', 'Worth a shot.', 'I panicked 😭', 'Good read.'],
  idle: ['Poker time 🃏', 'Coffee break? ☕', 'Let’s dance.', 'Anyone home?', 'Stay sharp.'],
  tank: ['Take your time 😂', 'Still there?', 'Tough decision?', 'Hello?', 'Decisions, decisions.'],
};

// Each style adds its own lines on top of its tone's pool, so the four bots of a style sound alike
// and a table of ten styles sounds like ten people. Pools only ever grow at the end: ids are indexes.
const VOICES: Record<StyleId, Partial<Lines>> = {
  // The Menace: cocky, loves rubbing it in.
  shark: {
    thinkEasy: ['Light work.', 'Calculated.'],
    raise: ['Pay me.', 'Sit down.'],
    bluffWon: ['Folded 😂', 'Scared money.', 'Nice fold.'],
    bigWin: ['Free money 💸', 'Delicious pot.', 'Mine now.'],
    win: ['Thanks mate.', 'Owned.'],
    lostToYou: ['Lucky bastard.', 'Read you.'],
    tiltJab: ['I’ve studied you.', 'You’re transparent.', 'Free read.', 'Classic you.'],
    yourBigBet: ['That’s your move?', 'Interesting raise.'],
    idle: ['Hello, fish.', 'Feeling dangerous.'],
    tank: ['He’s buffering…', 'Solver time.'],
  },
  lag: {
    allin: ['Chaos time.', 'No mercy.'],
    raise: ['Get cooked.', 'Big plans.'],
    bluffWon: ['That worked?!', 'Cinema 🎬', 'Absolutely robbed.'],
    bigWin: ['Printing 💸', 'Cha-ching.', 'Payday.'],
    win: ['Cry more.', 'Another victim.'],
    badBeat: ['Rigged.', 'Disgusting.'],
    tiltJab: ['Again, bro?', 'Keep donating.', 'Too emotional.'],
    bluffCaught: ['Worth it.', 'We move.'],
    tank: ['Windows update.', 'We have jobs.'],
  },
  // The Troll: ridiculous, bluffs constantly, blames the deck.
  maniac: {
    allin: ['Trust me.', 'Chaos time.', 'Call the FBI.'],
    raise: ['Believe me?', 'Trust me.'],
    sweatLose: ['Scripted 🎬', 'Rigged.', 'That’s illegal.'],
    bluffWon: ['Never had it.', 'So obvious.', '🫵😂'],
    bigWin: ['Retirement fund.', 'Generational wealth.', 'I’m eating.'],
    badBeat: ['PokerPrime moment.', 'Unreal runout.', 'I’m reporting.'],
    bluffCaught: ['I’m innocent.', 'Fake it.', 'I meant that.', 'Lag moment.'],
    tiltJab: ['Skill issue.', 'Bankrupt soon?'],
    idle: ['We gamble.', 'I need action.', 'Big plans.', 'Trust issues.'],
    tank: ['NASA calculations.', 'Bro disconnected.'],
  },
  gambler: {
    allin: ['We gamble.', 'Why not.', 'Send it.'],
    sweat: ['Please raise.', 'One time.', 'Prayer answered 🙏'],
    sweatWin: ['I’M ALIVE.', 'We are so back.'],
    sweatLose: ['Variance, mate.', 'Of course.', 'This game.'],
    bluffWon: ['Hehehe.', 'Gotcha.'],
    bigWin: ['The drought ends.', 'About time.', 'Christmas came.'],
    badBeat: ['Again?!', 'I’m done.', 'I hate poker.'],
    bluffCaught: ['Information gained.', 'Never again.'],
    idle: ['I need action.', 'Redemption arc.', 'Bored already.'],
    tank: ['Just push already.', '💤💤'],
  },
  tag: {
    thinkEasy: ['Clean.', 'Standard.'],
    bluffWon: ['Respectfully, no.', 'Good boy.'],
    bigWin: ['Beautiful.', 'Thank you.', 'Easy game.'],
    lostToYou: ['Well played.', 'Fair play.', 'Not bad.'],
    badBeat: ['Brutal.', 'Unlucky.'],
    tiltJab: ['Character building.', 'Hold that.'],
    idle: ['Stay sharp.', 'Lock in.'],
    tank: ['Need assistance?', 'It’s one hand.'],
  },
  // The Silent Killer: rarely speaks, and it hurts when they do.
  pro: {
    thinkEasy: ['Noted.', 'Calculated.'],
    yourBigBet: ['I know you.', 'Noted.', 'I’m watching.'],
    bluffWon: ['Read you.', 'Mental warfare.'],
    bigWin: ['Goodnight 😴', 'Told you.', 'Too clean.'],
    win: ['Noted.'],
    lostToYou: ['Revenge loading…', 'I’ll remember.', 'Noted forever.'],
    tiltJab: ['I’ve studied you.', 'I expected that.', 'Never change.'],
    idle: ['Respectfully…'],
    tank: ['Bro is thinking.'],
  },
  rock: {
    foldBig: ['Fine.', 'Noted.'],
    yourBigBet: ['Hmm.', 'Very interesting.', 'I smell fear.'],
    bigWin: ['Goodnight 😴', 'Hold that.', 'Never worried.'],
    badBeat: ['Hm.', 'Noted.'],
    lostToYou: ['Run it back.', 'Enjoy that.'],
    tiltJab: ['Same mistake.', 'You always do.'],
    idle: ['Quiet night.'],
    tank: ['…'],
  },
  trapper: {
    thinkHard: ['Please call.', 'Come here.', 'I’m waiting.'],
    thinkEasy: ['Trap sprung.', 'Easy decision.', 'Got something.'],
    raise: ['Feeling lucky?', 'I dare you.', 'Don’t fold.'],
    yourBigBet: ['Oh, buddy.', 'All yours 😉', 'This is fun.'],
    bigWin: ['Sweet dreams.', 'Trap sprung.', 'Goodnight 😴'],
    tiltJab: ['I’ve studied you.', 'You’re transparent.'],
    idle: ['🤫🤫', 'Surely call.'],
    tank: ['Take your time 😉'],
  },
  // The Choker: panics under pressure, complains about everything.
  nervous: {
    thinkHard: ['Oh no, oh no.', 'I’m sweating.', 'Why me?'],
    allin: ['I’m sick.', 'Please hold.', 'I panicked 😭'],
    foldBig: ['Too scary.', 'I’m out, sorry.'],
    sweat: ['I can’t look.', 'No way.', 'Deep breaths.'],
    sweatLose: ['I’m sick.', 'No shot.', 'Excuse me?!', 'I’m reporting.'],
    badBeat: ['WHAT?!', 'Disgusting river.', 'That’s personal.', 'Uncalled for.'],
    lostToYou: ['You win.', 'I folded.', 'Don’t celebrate.'],
    bluffCaught: ['I panicked 😭', 'Lag moment.', 'Delete that.'],
    idle: ['Nervous already.', 'Anyone home?'],
    tank: ['Hurry, I’m sweating.', 'Please don’t.'],
  },
  station: {
    callLight: ['Show me.', 'I’ll pay.', 'Just looking.'],
    thinkHard: ['I’m calling anyway.', 'Hmm.'],
    sweatLose: ['Rigged.', 'Of course.', 'Naturally.'],
    badBeat: ['No way.', 'You’re joking.', 'Again?!'],
    lostToYou: ['Whatever.', 'You got me.', 'Fair enough.'],
    bigWin: ['I knew.', 'Told you.', 'Never worried.'],
    bluffCaught: ['I meant that.', 'Fair enough.'],
    idle: ['Coffee break? ☕', 'Bored already.'],
    tank: ['Just call.', 'Bro is thinking.'],
  },
};

const id = (voice: string, event: string, i: number) => `b:${voice}:${event}:${i}`;

/** The text for a bot line id, or '' if it isn't one. */
export function botLineText(lineId: string): string {
  const [b, tone, event, i] = lineId.split(':');
  if (b !== 'b') return '';
  return pool(tone, event as TalkEvent)[Number(i)] ?? '';
}

/** Every line a voice can say for an event: its tone's pool, then the style's own lines. Old ids name just the tone. */
function pool(voice: string, event: TalkEvent): string[] {
  if (voice === 'trash') return TRASH[event] ?? [];
  if (voice === 'friendly') return FRIENDLY[event] ?? [];
  const style = voice in VOICES ? styleOf(voice as StyleId) : null;
  if (!style) return [];
  return [...(style.talk.tone === 'trash' ? TRASH : FRIENDLY)[event], ...(VOICES[style.id][event] ?? [])];
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
  tiltJab: 0.35,
  bluffCaught: 0.7,
  idle: 0.06,
  tank: 0.8,
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
  const lines = pool(style.id, event);
  const i = Math.floor(rng() * lines.length);
  game.reactions = { ...game.reactions, [playerId]: { id: id(style.id, event, i), n: (game.reactions?.[playerId]?.n ?? 0) + 1 } };
  game.talkAt = { ...game.talkAt, [playerId]: now };
  return true;
}
