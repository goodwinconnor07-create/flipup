// What bots say at the table, through the same bubbles as moves and quick messages. Every line is
// fixed here (ids start "b:"), and phones can't send them: only bots say these. A line is said as one
// or more short messages (see chat.ts): a `|` starts a new message right away, a `||` a second thought
// a beat later, and anything longer than a seat's bubble is cut at its sentences on its own.

import { playerStyle, styleOf, type StyleId } from './botStyles';
import { MORE_FRIENDLY, MORE_TRASH, MORE_VOICES, NEW_FRIENDLY, NEW_TRASH } from './botLines';
import { lineBeats, sayAndReadMs } from './chat';
import { LEGEND_VOICES, type LegendId } from './legendTalk';
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
  | 'tank'
  /** Turned over a bluff that worked. */
  | 'showBluff'
  /** Turned over a big hand nobody paid off. */
  | 'showStrong'
  /** Turned over a good hand it folded. */
  | 'showFold'
  /** Won a big pot off the player it had a grudge with. */
  | 'revenge'
  /** On tilt, between hands. */
  | 'tilted'
  /** Someone showed the bluff it folded to. */
  | 'gotBluffed'
  /** Watched a big pot it wasn't in (or had folded out of) end. */
  | 'watched'
  /** A new heads-up game is about to start: a word to the one person across the table, by name ({you}). */
  | 'hello'
  /** A legend meets someone who has already beaten them / only lost to them. */
  | 'rematchWon'
  | 'rematchLost'
  /** The game is over: the legend won, or lost. Said on the finish screen. */
  | 'finishWon'
  | 'finishLost'
  /** A new game with several players is about to start: a word to the table. */
  | 'welcome'
  /** A person said something nice ("Nice hand!", 👏): a bot says thanks. */
  | 'thanks'
  /** A person ribbed the table ("Lucky!", "Oops!", 😂): a bot gives it back. */
  | 'ribbed'
  /** A person wished the table luck. */
  | 'goodLuck'
  /** A person said "GG". */
  | 'gg'
  /** Another bot just won or boasted: the answer from across the table. */
  | 'cheer'
  /** Another bot just lost: the answer from across the table. */
  | 'commiserate'
  /** The first bot has greeted the table: another says hi. */
  | 'greetBack'
  /** Won a pot with its signature hand (see `Craft.pets`). */
  | 'signature';

type Lines = Record<TalkEvent, string[]>;

const TRASH: Lines = {
  thinkHard: ['Hmm…', 'What do we have…', 'Let me think.', 'Sneaky…', 'You sure?'],
  thinkEasy: ['Easy.', 'Too easy.', 'Obviously.', 'Snap.', 'Light work.', 'Free.', 'Please.', 'Calculated.'],
  allin: ['Let’s gamble.', 'All of it.', 'Your move.', 'Shove time.', 'Let’s dance.'],
  raise: ['Pressure.', 'Let’s go.', 'Pay up.', 'Raise. Duh.', 'Try me.', 'Feeling it.', 'Make a choice.', 'Your problem now.'],
  foldBig: ['Fine. Take it.', 'Enjoy it.', 'Next time.', 'Not worth it.', 'Saving chips.', 'You win. Barely.', 'Tell me you have it.', 'Cute.', 'Disgusting.', 'I’ll remember that.'],
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
  showBluff: ['Had nothing 😂', 'Look what you folded to.', 'For the cameras.', 'Pure air.', 'Thanks for the fold.'],
  showStrong: ['Had it all along.', 'You were right to fold.', 'Smart fold.', 'Just so you know.'],
  showFold: ['Big laydown.', 'I folded that.', 'Respect it.', 'You owe me one.'],
  revenge: ['Payback.', 'Told you.', 'Chips back.', 'Remember me?', 'We’re even.'],
  tilted: ['I’m fine.', 'Totally calm.', 'Next hand’s mine.', 'Unreal deck.', 'Just deal.'],
  gotBluffed: ['You had THAT?', 'Noted.', 'I’ll remember that.', 'Enjoy it while it lasts.', 'Cute.'],
  watched: ['Well, well.', 'Brutal.', 'There it is.', 'Wow, okay.', 'Next.'],
  hello: ['Hey {you}. Ready to lose?', 'Sit down, {you}.', '{you}. Let’s see what you’ve got.', 'Nice to meet you, {you}. Nice chips.', 'Evening, {you}.'],
  rematchWon: [],
  rematchLost: [],
  finishWon: [],
  finishLost: [],
  welcome: ['Welcome to the table.', 'Fresh chips. Lovely.', 'Hope you all brought chips.', 'Take a seat, fish.', 'Let’s play.'],
  thanks: [],
  ribbed: [],
  goodLuck: [],
  gg: [],
  cheer: [],
  commiserate: [],
  greetBack: [],
  signature: [],
};

const FRIENDLY: Lines = {
  thinkHard: ['Hmm…', 'Tough one…', 'Ugh, really?', 'Let me think…', 'Oh no…'],
  thinkEasy: ['Okay!', 'Easy peasy.', 'Let’s see…', 'Fine by me.', 'Why not!', 'I like this.'],
  allin: ['Here goes!', 'Wish me luck!', 'Feeling brave.', 'All in!', 'Yolo!'],
  raise: ['I like this.', 'Let’s play!', 'Raise!', 'Gotta try.', 'Feeling good.', 'Here we go.', 'Bit of spice.', 'Let’s make it fun.'],
  foldBig: ['Too rich for me.', 'You have it.', 'Not this time.', 'I’m out.', 'Nope!', 'That’s a lot!', 'Wow, okay.', 'Take it, you earned it.', 'Brave.'],
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
  showBluff: ['Oops, nothing!', 'Sorry, had to.', 'Shh 🤫', 'Got lucky there.', 'Don’t be mad!'],
  showStrong: ['Had it, promise.', 'Good fold!', 'Nice fold.', 'Just showing.'],
  showFold: ['Was this good?', 'Ugh, folded this.', 'Hope that was right.', 'Painful fold.'],
  revenge: ['Got you back!', 'Even now 😄', 'My turn!', 'Ha, finally!'],
  tilted: ['Deep breaths…', 'Not my night.', 'I’m okay. Mostly.', 'Need a break.', 'Can I win one?'],
  gotBluffed: ['No way!', 'You had nothing?!', 'Sneaky!', 'Ugh, I believed you.', 'Well played…'],
  watched: ['Wow!', 'What a hand!', 'Wild one.', 'Oof, nice.', 'Phew, glad that’s over.'],
  hello: ['Hi {you}! Good luck!', 'Hey {you}, let’s have fun!', 'Welcome, {you}! Ready?', 'Good to see you, {you}!', 'Hi {you}! Be gentle 😅'],
  rematchWon: [],
  rematchLost: [],
  finishWon: [],
  finishLost: [],
  welcome: ['Welcome to the table!', 'Hi everyone!', 'Good luck, all!', 'Glad you’re here!', 'Let’s have a good one!'],
  thanks: [],
  ribbed: [],
  goodLuck: [],
  gg: [],
  cheer: [],
  commiserate: [],
  greetBack: [],
  signature: [],
};

// Each style adds its own lines on top of its tone's pool, so the four bots of a style sound alike
// and a table of ten styles sounds like ten people. Pools only ever grow at the end: ids are indexes.
const VOICES: Record<StyleId, Partial<Lines>> = {
  // The Menace: cocky, loves rubbing it in.
  shark: {
    hello: ['Hello, {you}. I’ve read you already.', '{you}. Nice stack. Mine soon.'],
    welcome: ['Welcome. Sit. Lose.'],
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
    showBluff: ['Read that.', 'Scared money.'],
    revenge: ['Owned.', 'Back in my pocket.'],
    tilted: ['Whatever.'],
  },
  lag: {
    hello: ['{you}! Buckle up.', 'Hey {you}. No brakes tonight.'],
    welcome: ['Welcome! Hold on to your chips.'],
    allin: ['Chaos time.', 'No mercy.'],
    raise: ['Get cooked.', 'Big plans.'],
    bluffWon: ['That worked?!', 'Cinema 🎬', 'Absolutely robbed.'],
    bigWin: ['Printing 💸', 'Cha-ching.', 'Payday.'],
    win: ['Cry more.', 'Another victim.'],
    badBeat: ['Rigged.', 'Disgusting.'],
    tiltJab: ['Again, bro?', 'Keep donating.', 'Too emotional.'],
    bluffCaught: ['Worth it.', 'We move.'],
    tank: ['Windows update.', 'We have jobs.'],
    showBluff: ['Cinema 🎬', 'Nothing. Again.'],
    revenge: ['Run it back?'],
  },
  // The Troll: ridiculous, bluffs constantly, blames the deck.
  maniac: {
    hello: ['{you}!! LET’S GO!', 'Hi {you}. I’m all in already.'],
    welcome: ['WELCOME! Chaos time!'],
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
    showBluff: ['7-2, baby.', 'Never had it.', '🫵😂'],
    tilted: ['Rigged.', 'Scripted 🎬', 'I’m reporting.'],
    revenge: ['Generational.'],
  },
  gambler: {
    hello: ['{you}! Feeling lucky?', 'Hey {you}. I’ve got a good feeling.'],
    welcome: ['Welcome! Who’s feeling lucky?'],
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
    showBluff: ['Hehehe.', 'Worth it.'],
    tilted: ['One time.', 'Redemption arc.', 'I hate poker.'],
  },
  tag: {
    hello: ['Hello, {you}. Good luck.', '{you}. Let’s play it straight.'],
    welcome: ['Welcome. Let’s play tight.'],
    thinkEasy: ['Clean.', 'Standard.'],
    bluffWon: ['Respectfully, no.', 'Good boy.'],
    bigWin: ['Beautiful.', 'Thank you.', 'Easy game.'],
    lostToYou: ['Well played.', 'Fair play.', 'Not bad.'],
    badBeat: ['Brutal.', 'Unlucky.'],
    tiltJab: ['Character building.', 'Hold that.'],
    idle: ['Stay sharp.', 'Lock in.'],
    tank: ['Need assistance?', 'It’s one hand.'],
    showStrong: ['Standard.', 'Always have it.'],
    showFold: ['Disciplined.'],
  },
  // The Silent Killer: rarely speaks, and it hurts when they do.
  pro: {
    hello: ['Hello, {you}. Good game.', '{you}. Let’s get to it.'],
    welcome: ['Welcome, everyone. Good luck.'],
    thinkEasy: ['Noted.', 'Calculated.'],
    yourBigBet: ['I know you.', 'Noted.', 'I’m watching.'],
    bluffWon: ['Read you.', 'Mental warfare.'],
    bigWin: ['Goodnight 😴', 'Told you.', 'Too clean.'],
    win: ['Noted.'],
    lostToYou: ['Revenge loading…', 'I’ll remember.', 'Noted forever.'],
    tiltJab: ['I’ve studied you.', 'I expected that.', 'Never change.'],
    idle: ['Respectfully…'],
    tank: ['Bro is thinking.'],
    showStrong: ['Noted.'],
    revenge: ['Noted forever.'],
  },
  rock: {
    hello: ['…{you}.', 'Hello, {you}. I’ll wait.'],
    welcome: ['Hello. Deal.'],
    foldBig: ['Fine.', 'Noted.'],
    yourBigBet: ['Hmm.', 'Very interesting.', 'I smell fear.'],
    bigWin: ['Goodnight 😴', 'Hold that.', 'Never worried.'],
    badBeat: ['Hm.', 'Noted.'],
    lostToYou: ['Run it back.', 'Enjoy that.'],
    tiltJab: ['Same mistake.', 'You always do.'],
    idle: ['Quiet night.'],
    tank: ['…'],
    showStrong: ['I always have it.', 'Told you.'],
    showFold: ['Good fold. Probably.', 'Next time.'],
  },
  trapper: {
    hello: ['Come in, {you}. Sit down.', 'Hi {you}. Nothing to see here.'],
    welcome: ['Welcome. Don’t mind me.'],
    thinkHard: ['Please call.', 'Come here.', 'I’m waiting.'],
    thinkEasy: ['Trap sprung.', 'Easy decision.', 'Got something.'],
    raise: ['Feeling lucky?', 'I dare you.', 'Don’t fold.'],
    yourBigBet: ['Oh, buddy.', 'All yours 😉', 'This is fun.'],
    bigWin: ['Sweet dreams.', 'Trap sprung.', 'Goodnight 😴'],
    tiltJab: ['I’ve studied you.', 'You’re transparent.'],
    idle: ['🤫🤫', 'Surely call.'],
    tank: ['Take your time 😉'],
    showStrong: ['Trap sprung.', 'Sweet dreams.'],
    revenge: ['Trap sprung.'],
  },
  // The Choker: panics under pressure, complains about everything.
  nervous: {
    hello: ['Oh, hi {you}… be nice?', '{you}! I’m so nervous.'],
    welcome: ['Hi everyone… I’m nervous.'],
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
    showFold: ['Was I right?!', 'I panicked 😭'],
    tilted: ['Why me?', 'I’m sweating.', 'I’m sick.'],
  },
  station: {
    hello: ['Hey {you}. I’ll call.', '{you}. Don’t bluff, I’ll call.'],
    welcome: ['Welcome. I’ll call anything.'],
    callLight: ['Show me.', 'I’ll pay.', 'Just looking.'],
    thinkHard: ['I’m calling anyway.', 'Hmm.'],
    sweatLose: ['Rigged.', 'Of course.', 'Naturally.'],
    badBeat: ['No way.', 'You’re joking.', 'Again?!'],
    lostToYou: ['Whatever.', 'You got me.', 'Fair enough.'],
    bigWin: ['I knew.', 'Told you.', 'Never worried.'],
    bluffCaught: ['I meant that.', 'Fair enough.'],
    idle: ['Coffee break? ☕', 'Bored already.'],
    tank: ['Just call.', 'Bro is thinking.'],
    showFold: ['First fold today.'],
    tilted: ['Of course.', 'Naturally.'],
  },
};

// The second pass of lines, added after the first so earlier ids keep their meaning.
const grow = (pools: Lines, more: Partial<Lines>) => {
  for (const [event, lines] of Object.entries(more) as [TalkEvent, string[]][]) pools[event].push(...lines);
};
grow(TRASH, NEW_TRASH);
grow(FRIENDLY, NEW_FRIENDLY);
grow(TRASH, MORE_TRASH);
grow(FRIENDLY, MORE_FRIENDLY);
for (const [style, more] of Object.entries(MORE_VOICES) as [StyleId, Partial<Lines>][]) {
  for (const [event, lines] of Object.entries(more) as [TalkEvent, string[]][]) VOICES[style][event] = [...(VOICES[style][event] ?? []), ...lines];
}

const id = (voice: string, event: string, i: number) => `b:${voice}:${event}:${i}`;

/** The text for a bot line id, or '' if it isn't one. */
export function botLineText(lineId: string): string {
  const [b, tone, event, i] = lineId.split(':');
  if (b !== 'b') return '';
  return pool(tone, event as TalkEvent)[Number(i)] ?? '';
}

/** A line a legend says when the game is over (null for anyone else). `name` is who they played. */
export function finishLine(legend: string, event: 'finishWon' | 'finishLost', name: string, pick: number): string | null {
  if (!(legend in LEGEND_VOICES)) return null;
  const lines = LEGEND_VOICES[legend as LegendId].lines[event] ?? [];
  return lines.length ? lines[pick % lines.length].replace('{you}', name) : null;
}

/** Every line a voice can say for an event: its tone's pool, then the style's own lines. Old ids name just the tone. */
function pool(voice: string, event: TalkEvent): string[] {
  if (voice === 'trash') return TRASH[event] ?? [];
  if (voice === 'friendly') return FRIENDLY[event] ?? [];
  // A legend: its tone's pool, then its own lines.
  if (voice in LEGEND_VOICES) {
    const legend = LEGEND_VOICES[voice as LegendId];
    return [...((legend.tone === 'trash' ? TRASH : FRIENDLY)[event] ?? []), ...(legend.lines[event] ?? [])];
  }
  const style = voice in VOICES ? styleOf(voice as StyleId) : null;
  if (!style) return [];
  return [...(style.talk.tone === 'trash' ? TRASH : FRIENDLY)[event], ...(VOICES[style.id][event] ?? [])];
}

/** Every line a bot can say, with who says it and for what: for the chat lab and the tests that check how lines read. */
export function allLines(): { voice: string; event: TalkEvent; text: string }[] {
  const out: { voice: string; event: TalkEvent; text: string }[] = [];
  const events = Object.keys(CHANCE) as TalkEvent[];
  const voices = ['trash', 'friendly', ...(Object.keys(VOICES) as StyleId[]), ...(Object.keys(LEGEND_VOICES) as LegendId[])];
  for (const voice of voices) for (const event of events) for (const text of pool(voice, event)) out.push({ voice, event, text });
  return out;
}

/** How likely each kind of moment gets a word, before the bot's own chattiness. */
const CHANCE: Record<TalkEvent, number> = {
  thinkHard: 0.15,
  thinkEasy: 0.06,
  allin: 0.55,
  raise: 0.14,
  foldBig: 0.18,
  callLight: 0.35,
  yourBigBet: 0.25,
  sweat: 0.6,
  sweatWatch: 0.3,
  sweatWin: 1,
  sweatLose: 1,
  bluffWon: 0.6,
  bigWin: 0.45,
  win: 0.25,
  badBeat: 0.8,
  lostToYou: 0.5,
  reply: 0.7,
  tiltJab: 0.35,
  bluffCaught: 0.6,
  idle: 0.08,
  tank: 0.8,
  showBluff: 0.9,
  showStrong: 0.7,
  showFold: 0.7,
  revenge: 0.8,
  tilted: 0.6,
  gotBluffed: 0.9,
  watched: 1,
  hello: 1,
  rematchWon: 1,
  rematchLost: 1,
  finishWon: 1,
  finishLost: 1,
  welcome: 1,
  // Answering a person or another bot is what makes it a conversation: a bot nearly always does when asked to.
  thanks: 0.9,
  ribbed: 0.9,
  goodLuck: 0.9,
  gg: 0.9,
  cheer: 0.8,
  commiserate: 0.8,
  greetBack: 1,
  signature: 1,
};

/** A bot never speaks again within this long, so one seat can't chatter non-stop. */
const COOLDOWN = 2200;

/**
 * Maybe has a bot say something. Returns how long it takes to say and read (ms), or 0 if it stayed quiet.
 * `now` is the table clock, for the cooldown.
 * `owed` is for a reaction the table is waiting for (a bot that cried "c'mon!" and then saw the pot
 * go): it speaks whatever the dice and the cooldown say, so it never goes quiet at the moment it should react.
 */
export function botSays(game: Game, playerId: string, event: TalkEvent, rng: () => number, now: number, owed = false, to?: string): number {
  const player = game.players.find((p) => p.id === playerId);
  if (!player?.bot) return 0;
  // Scroll cards are quiet, so nothing muddies the lesson.
  if (game.card) return 0;
  const last = game.talkAt?.[playerId] ?? -Infinity;
  if (!owed && now - last < COOLDOWN) return 0;
  const style = playerStyle(player);
  // A legend speaks in its own voice; everyone else in their style's.
  const voice = player.legend ?? style.id;
  if (!owed && rng() > Math.min(1, CHANCE[event] * (0.35 + style.talk.chatty))) return 0;
  const lines = pool(voice, event);
  if (!lines.length) return 0;
  const i = Math.floor(rng() * lines.length);
  game.reactions = { ...game.reactions, [playerId]: { id: id(voice, event, i), n: (game.reactions?.[playerId]?.n ?? 0) + 1, ...(to ? { to } : {}) } };
  game.talkAt = { ...game.talkAt, [playerId]: now };
  const ms = sayAndReadMs(lineBeats(lines[i], game.players.find((p) => p.id === to)?.name));
  game.talkDone = { ...game.talkDone, [playerId]: now + ms };
  return ms;
}
