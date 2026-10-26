// Offline, bounded dialogue planning: public context → intent → authored clause → voice.
// No model download, network, arbitrary text generation or access to anyone's hole cards.
import { BOTS } from './botStyles';
import type { TalkEvent } from './botTalk';
import type { BotProfile } from './botProfiles';
import type { Game } from './types';

type ContextEvent =
  | 'repeatRaise'
  | 'barrel'
  | 'paired'
  | 'fourFlush'
  | 'short'
  | 'comeback'
  | 'heater'
  | 'rival'
  | 'replyWin'
  | 'replyLoss'
  | 'replyBluff'
  | 'replyGreeting'
  | 'replyLuck'
  | 'replyLaugh'
  | 'replyThanks'
  | 'replyGoodGame';
export type DialogueIntent = TalkEvent | ContextEvent;
// Indexes are a wire format. Append new lines; don't reorder published entries.
export const DIALOGUE: Record<DialogueIntent, readonly string[]> = {
  hello: [
    'Evening, {you}.',
    'Alright, {you}?',
    'Good luck, {you}.',
    'Ready when you are, {you}.',
    'How goes it, {you}?',
    'Your deal, {you}.',
    'Nice to meet you, {you}.',
    'Settle in, {you}.',
  ],
  welcome: [
    'Evening, everyone.',
    'Good luck, lads.',
    'Right, let’s get a game going.',
    'Who’s dealing?',
    'Got room for one more?',
    'Good table this.',
    'All settled? Let’s play.',
    'Good luck, everyone.',
  ],
  thinkHard: [
    'Hang on a second.',
    'That changes things.',
    'Not a quick one this.',
    'Let me work this out.',
    'Interesting spot.',
    'What’s the story here?',
    'Give me a moment.',
    'That’s awkward.',
    'Could go either way.',
    'Just counting.',
  ],
  thinkEasy: [
    'Alright then.',
    'Fair enough.',
    'Righto.',
    'We’ll see.',
    'No messing about.',
    'Let’s get on with it.',
    'Okay, let’s play.',
    'That’ll do.',
  ],
  allin: [
    'Whole stack.',
    'Right. All of it.',
    'No change coming back.',
    'Let’s settle it.',
    'Here we go then.',
    'In for the lot.',
    'Can’t take it with me.',
    'Over to you.',
    'That’s my lot.',
    'Time to find out.',
  ],
  raise: [
    'Let’s build a pot.',
    'A little more.',
    'Not that cheaply.',
    'Up we go.',
    'Make it interesting.',
    'Your decision.',
    'Room for a bit more.',
    'Let’s play for something.',
    'Putting you to work.',
    'Keeping it moving.',
  ],
  foldBig: [
    'Not paying that.',
    'You can have this one.',
    'Pick a better spot.',
    'Too steep for me.',
    'Not today.',
    'I’ll leave you to it.',
    'Plenty of hands left.',
    'I’m staying out of that.',
    'That price? No thanks.',
    'Save it for the next one.',
  ],
  callLight: [
    'I’ll look you up.',
    'Let’s see it then.',
    'Not quite convinced.',
    'Alright. Show me.',
    'Curiosity wins.',
    'Can’t let every one go.',
    'You’ve made me curious.',
    'I want to see this.',
    'Paying to find out.',
    'One way to know.',
  ],
  yourBigBet: [
    'That’s a statement.',
    'Playing a proper pot then.',
    'Straight to business.',
    'You’re not messing around.',
    'Big decision now.',
    'That got my attention.',
    'No small talk then.',
    'Alright, I’m listening.',
  ],
  sweat: [
    'One more card.',
    'Come on, dealer.',
    'Hold up.',
    'Let’s have it.',
    'Just turn it over.',
    'Not looking. Alright, looking.',
    'Steady now.',
    'Long way from home.',
    'Here comes the sweat.',
    'Deep breath.',
  ],
  sweatWatch: [
    'Big pot this.',
    'Good luck, both.',
    'Someone’s doubling.',
    'What a spot.',
    'Here we go.',
    'Glad I’m out of this.',
    'That’s a proper sweat.',
    'Cards will settle it.',
  ],
  sweatWin: [
    'Get in.',
    'And breathe.',
    'I’ll take that.',
    'Still in the game.',
    'Needed that one.',
    'Chips this way.',
    'There we are.',
    'That’ll keep me going.',
    'Come on then.',
    'Had to sweat for it.',
  ],
  sweatLose: [
    'Ah, that’s that.',
    'Well played.',
    'Couldn’t get there.',
    'That stings.',
    'Not my pot.',
    'Good game.',
    'So it goes.',
    'Nothing to do about that.',
    'Right. Fair enough.',
    'Rough one.',
  ],
  bluffWon: [
    'Found a way through.',
    'Got away with one.',
    'Timing’s everything.',
    'That one got through.',
    'Had to try it.',
    'Didn’t fancy a call.',
    'Good time to ask the question.',
    'That was a bit cheeky.',
  ],
  bigWin: [
    'That’s a proper pot.',
    'Worth the wait.',
    'Needed a bit of breathing room.',
    'Nice to get paid.',
    'Stack looks healthier.',
    'That’ll do nicely.',
    'Good pot, that.',
    'Took some work.',
  ],
  win: [
    'I’ll take it.',
    'They all count.',
    'A few more chips.',
    'That’ll do.',
    'Keep them moving.',
    'On we go.',
    'Small steps.',
    'One for me.',
    'Little pot, still a pot.',
    'Cheers.',
  ],
  badBeat: [
    'That’s a tough one.',
    'Hard hand to lose.',
    'That took the wind out of me.',
    'Poker, eh.',
    'Need a minute after that.',
    'Ouch. Next hand.',
    'That’ll stay with me.',
    'Had to happen sometime.',
  ],
  lostToYou: [
    'Nice hand.',
    'You’ve got this one.',
    'Fair play.',
    'Well played, {you}.',
    'Good pot for you.',
    'Can’t win them all.',
    'Right, next one.',
    'That was yours.',
  ],
  reply: [
    'Fair enough.',
    'I hear you.',
    'That’s poker.',
    'We’ll see about that.',
    'Can’t argue with that.',
    'Right then.',
    'Anyway. Next hand.',
    'On we go.',
  ],
  tiltJab: [
    'I’ll keep the chips warm.',
    'My round this time.',
    'Had to win one off you.',
    'You weren’t folding much.',
    'We’ve got a game now.',
    'Not letting you have every pot.',
    'Little change of fortunes.',
    'Back in the contest.',
  ],
  bluffCaught: [
    'Good call.',
    'You caught me.',
    'Can’t get them all through.',
    'That didn’t work.',
    'Picked the wrong customer.',
    'Worth a try.',
    'Alright, you read that one.',
    'Back to the drawing board.',
  ],
  idle: [
    'Cards have gone quiet.',
    'Patience, apparently.',
    'Someone wake the deck up.',
    'Could use a playable hand.',
    'Good game so far.',
    'Anyone found the good cards?',
    'Still here, dealer.',
    'No rush. Well, a little.',
  ],
  tank: [
    'Tricky spot?',
    'Still with us?',
    'Big decision?',
    'I’ll put the kettle on.',
    'Take a breath.',
    'We haven’t gone anywhere.',
    'Let us know if you need a count.',
    'Thinking cap’s on.',
  ],
  showBluff: [
    'Nothing there.',
    'Couldn’t resist showing.',
    'Got that one through.',
    'For the table.',
    'You’ll remember this one.',
    'There’s the bad news.',
    'Had to give you a look.',
    'Not all of them are real.',
  ],
  showStrong: [
    'Had a little something.',
    'Good time to get out.',
    'That’s what I was waiting for.',
    'For once I had it.',
    'Could’ve been a big one.',
    'No mystery this time.',
    'There you go.',
    'Couldn’t get a customer.',
  ],
  showFold: [
    'Let that one go.',
    'Not an easy fold.',
    'Have a look at that.',
    'That’s what went in the muck.',
    'Had a decision there.',
    'Painful one to fold.',
    'Chose to live another hand.',
    'Can’t call them all.',
  ],
  revenge: [
    'Got a few of those back.',
    'Our little battle continues.',
    'Back this side of the table.',
    'My turn in that one.',
    'We’re trading pots now.',
    'Knew we’d meet again.',
    'A bit of payback.',
    'That feels better.',
  ],
  tilted: [
    'Reset. Next hand.',
    'I need to slow down.',
    'Not my best few minutes.',
    'Bit hot under the collar.',
    'Keep it together.',
    'Just play the next hand.',
    'A breath would help.',
    'Cards owe me nothing.',
  ],
  gotBluffed: [
    'You got me there.',
    'Alright. I’ll remember that.',
    'Well sold.',
    'Bought the whole story.',
    'Nice move.',
    'Can’t say I enjoyed that.',
    'Fair play, you got it through.',
    'Something to think about.',
  ],
  watched: [
    'Proper hand, that.',
    'Glad that wasn’t my decision.',
    'Quite a pot.',
    'Bit of everything in that one.',
    'That changed the table.',
    'Good battle.',
    'Poker’s a funny game.',
    'Now that was a hand.',
  ],
  repeatRaise: [
    'Raising again, {you}?',
    'You like that raise button.',
    'Not letting us see a cheap one?',
    'You’ve been busy, {you}.',
    'Every pot’s a project with you.',
    'Another raise. Noted.',
    'Keeping the pressure on then.',
    'We get it. You like raising.',
  ],
  barrel: [
    'Another barrel, {you}?',
    'You’re sticking to that story.',
    'Still firing then.',
    'Same story, bigger price.',
    'Not slowing down, are you?',
    'Making me work for it.',
    'That’s some persistence.',
    'You’ve kept the pressure on.',
  ],
  paired: [
    'Board’s paired now.',
    'That changes the board.',
    'Interesting pair out there.',
    'Not the same board anymore.',
    'That complicates things.',
    'Board’s having a laugh.',
  ],
  fourFlush: [
    'Four of a suit. Lovely.',
    'Not a quiet board now.',
    'That suit keeps coming.',
    'Interesting board to bet into.',
    'Well, that changes things.',
    'Not exactly a blank.',
  ],
  short: [
    'Not many chips to play with.',
    'Still got a seat.',
    'One pot changes it.',
    'Working with a short stack.',
    'A chip and a chair.',
    'Got to pick my spot.',
  ],
  comeback: [
    'Needed that after the last one.',
    'Bit of a recovery.',
    'Back in the conversation.',
    'That settles the nerves.',
    'Slowly getting back into it.',
    'A better chapter.',
  ],
  heater: [
    'Cards have woken up.',
    'Enjoying this little run.',
    'Can’t complain right now.',
    'Nice while it lasts.',
    'Found a bit of momentum.',
    'Good stretch of cards.',
  ],
  rival: [
    'You and me again, {you}.',
    'We keep finding each other.',
    'Another round with you then.',
    'Not finished with our little game.',
    'Back to you, {you}.',
    'We’ve played a few pots now.',
  ],
  replyWin: [
    'Enjoy it while it’s yours.',
    'Good pot, to be fair.',
    'Don’t spend all the chips at once.',
    'Alright, alright. Next hand.',
    'Save some for the rest of us.',
    'Hard-earned chips.',
  ],
  replyLoss: [
    'Rough hand, mate.',
    'Nothing easy about that one.',
    'New hand coming.',
    'Shake it off.',
    'Plenty of poker left.',
    'Hard game sometimes.',
  ],
  replyBluff: [
    'You’re proud of that one.',
    'I’ll file that away.',
    'Now we know.',
    'That’s one way to advertise.',
    'Going to remember that.',
    'Well sold.',
  ],
  replyGreeting: [
    'Good luck to you too.',
    'Let’s have a good game.',
    'Evening.',
    'Right, cards please.',
    'Good luck around the table.',
    'Ready when you are.',
  ],
  replyLuck: [
    'We all need a bit.',
    'I won’t turn down good luck.',
    'Cards get the last word.',
    'Cheers. Same to you.',
    'Can’t hurt.',
    'That’s the plan.',
  ],
  replyThanks: ['Cheers.', 'Thanks, mate.', 'Appreciate it.', 'Good of you to say.', 'Thanks. Good battle.', 'Cheers, well played.'],
  replyGoodGame: [
    'Good game to you too.',
    'Enjoyed playing with you.',
    'Cheers for the game.',
    'Well played tonight.',
    'Good game, mate.',
    'That was a good battle.',
  ],
  replyLaugh: [
    'You enjoyed that then.',
    'Fair enough. I’d laugh too.',
    'Yeah, yeah.',
    'Glad someone’s enjoying it.',
    'I walked into that.',
    'Alright, point taken.',
  ],
};

// Each voice uses its own cadence. Complete clauses avoid word-salad generation.
const CADENCE = [
  ['', 'Right. ', 'Well, ', ''],
  ['', '', 'Hmm. ', ''],
  ['', 'Alright. ', '', ''],
  ['', 'Well, ', '', ''],
  ['', '', 'Interesting. ', ''],
  ['', 'Ah, ', 'Well, ', ''],
  ['', 'Go on. ', '', ''],
  ['', '', '', ''],
  ['', 'Come on. ', '', ''],
  ['', 'Hmm. ', '', ''],
  ['', 'Right. ', '', ''],
  ['', '', 'Well, ', ''],
];
const SIGNATURES = [
  ['Cheers.', 'On we go.', 'Next one.'],
  ['Naturally.', 'Of course.', 'Funny game.'],
  ['Your move.', 'Game on.', 'Let’s play.'],
  ['That’s poker.', 'Deal on.', 'No bother.'],
  ['Noted.', 'Interesting.', 'Fair enough.'],
  ['Good game.', 'All good.', 'Cheers.'],
  ['Had to ask.', 'Go on then.', 'Could be worse.'],
  ['Right.', 'Okay.', 'Next.'],
  ['Still in it.', 'Keep going.', 'All good.'],
  ['We’ll see.', 'For now.', 'Apparently.'],
  ['Let’s go.', 'Next hand.', 'Deal on.'],
  ['Fair play.', 'That’ll do.', 'On we go.'],
];
// Voice-specific clauses add real differences in vocabulary, not just prefixes.
// Columns: pressure, won, lost, greeting, waiting, answer. Entries are append-only.
const VOICE_CLAUSES = [
  [
    ['Putting me to a decision.', 'Not giving much away.', 'That’s a proper bet.'],
    ['A few chips to work with.', 'Keeps the evening going.', 'Nice to win a pot.'],
    ['You played that well.', 'Could’ve gone better.', 'Right, back to work.'],
    ['Evening. Good luck.', 'Alright everyone?', 'Good to get a game in.'],
    ['Bit quiet over here.', 'Could do with some cards.', 'Still waiting for a hand.'],
    ['Fair point.', 'Can’t argue.', 'That’s about right.'],
  ],
  [
    ['Very subtle.', 'A quiet little pot, then.', 'That got expensive quickly.'],
    ['Almost looks like I know how.', 'A rare success.', 'Well, that’s unusual.'],
    ['Lovely. In the worst way.', 'I’ve had better plans.', 'Not putting that on the highlights.'],
    ['Evening. I brought patience.', 'Let’s see how this goes.', 'Another quiet night of poker.'],
    ['Exciting stuff. Eventually.', 'Deck’s on a tea break.', 'Must be saving the good cards.'],
    ['Naturally.', 'If you say so.', 'I’ll alert the press.'],
  ],
  [
    ['Now we’ve got a contest.', 'Making me earn it.', 'Not backing down easily.'],
    ['There’s a start.', 'That’s a bit more like it.', 'Staying in the fight.'],
    ['You won that round.', 'I’ll regroup.', 'Back to work next hand.'],
    ['Ready for a proper game.', 'Good luck. Let’s play.', 'Everyone ready?'],
    ['Let’s get some action.', 'Waiting for my spot.', 'Plenty of game left.'],
    ['Fair challenge.', 'We’ve got a game.', 'I’m still here.'],
  ],
  [
    ['That’s a fair old bet.', 'Not a small ask.', 'Proper poker now.'],
    ['Steady does it.', 'Chips in the right direction.', 'That’s kept me going.'],
    ['Can’t argue with the cards.', 'Been there before.', 'Take it on the chin.'],
    ['Evening, all.', 'Good luck round the table.', 'Right, shuffle up.'],
    ['Patience pays. So they tell me.', 'Cards will come round.', 'Dealer’s keeping us waiting.'],
    ['You’re not wrong.', 'Happens to us all.', 'Funny old game.'],
  ],
  [
    ['Interesting sizing.', 'Need to think this through.', 'Quite a decision tree.'],
    ['That worked out.', 'Good result.', 'Useful pot.'],
    ['Time to reassess.', 'Something to think about.', 'Good decision from you.'],
    ['Good luck, everyone.', 'Ready to get started.', 'Let’s see some hands.'],
    ['Still gathering information.', 'Quiet orbit.', 'Waiting for a better spot.'],
    ['That makes sense.', 'Fair assessment.', 'Interesting point.'],
  ],
  [
    ['Making this a lively table.', 'You don’t do small pots.', 'Good action tonight.'],
    ['Cheers for the game.', 'Good little battle.', 'Enjoyed that one.'],
    ['Good hand, mate.', 'You earned that pot.', 'Can’t begrudge you that.'],
    ['Good company already.', 'Glad to get a seat.', 'Good luck, everyone.'],
    ['Anyone else card dead?', 'Nice table this.', 'Could stay for a few hands.'],
    ['I hear that.', 'Good company, tough cards.', 'Fair play to you.'],
  ],
  [
    ['You charging admission?', 'Bit pricey in here.', 'That bet’s got ambition.'],
    ['I’ll mind these for you.', 'No receipt, I’m afraid.', 'Chips look better over here.'],
    ['I’ll pretend that was the plan.', 'Not my finest sales pitch.', 'You weren’t meant to do that.'],
    ['Try to leave me a few chips.', 'I brought my best bad ideas.', 'Evening. Be gentle with the stack.'],
    ['Anyone taking requests?', 'Must’ve offended the deck.', 'Waiting for the plot twist.'],
    ['You would say that.', 'There’s a story in that.', 'Don’t encourage me.'],
  ],
  [
    ['Noted.', 'Right.', 'I see.'],
    ['Good.', 'That’ll do.', 'Okay.'],
    ['Nice hand.', 'Fair.', 'Next one.'],
    ['Evening.', 'Good luck.', 'Ready.'],
    ['Still here.', 'Waiting.', 'Cards will come.'],
    ['Fair enough.', 'Right.', 'Okay then.'],
  ],
  [
    ['Could be an interesting one.', 'A bit of a challenge.', 'Let’s find out.'],
    ['Back in business.', 'Bit of good fortune.', 'Nice to see some chips.'],
    ['Next hand’s a fresh start.', 'Still plenty to play.', 'Can turn it round.'],
    ['Good luck. Good game ahead.', 'Nice to be playing.', 'Let’s have a good one.'],
    ['Good hand must be coming.', 'Still enjoying the game.', 'Only need one good spot.'],
    ['Could be worse.', 'Keep it going.', 'That’s the spirit.'],
  ],
  [
    ['That’s the story, is it?', 'You seem keen.', 'Quite a price for a look.'],
    ['I’ll believe it when they’re stacked.', 'For now, they’re mine.', 'About time that worked.'],
    ['Yeah. That figures.', 'Should’ve seen that coming.', 'I had my doubts.'],
    ['Let’s see what the deck brings.', 'Evening. We’ll see.', 'Here for a game.'],
    ['Cards are keeping their distance.', 'Not much to work with.', 'Patient by necessity.'],
    ['So you say.', 'I’m not entirely convinced.', 'Maybe. Maybe.'],
  ],
  [
    ['We’re getting somewhere.', 'No quiet pots tonight.', 'Straight into it then.'],
    ['That’s more like it.', 'Keep the game moving.', 'Back for another.'],
    ['Right. Next.', 'Done with that hand.', 'Moving on quickly.'],
    ['Ready. Let’s deal.', 'Let’s get going.', 'Who’s up first?'],
    ['Let’s see a flop sometime.', 'Need a bit of action.', 'Cards, please.'],
    ['On with it then.', 'Right, deal on.', 'We going again?'],
  ],
  [
    ['That’s a bit of a decision.', 'Quietly getting expensive.', 'Fair question.'],
    ['A little improvement.', 'Can’t complain.', 'That helps.'],
    ['Not ideal.', 'Ah well.', 'Fair enough, nice hand.'],
    ['Hello, all.', 'Good luck tonight.', 'Nice to join you.'],
    ['No rush here.', 'Still waiting for a spot.', 'Quiet few hands.'],
    ['Fair comment.', 'That’s one way to see it.', 'Quite right.'],
  ],
];
function voiceGroup(intent: DialogueIntent): number | undefined {
  if (['thinkHard', 'yourBigBet', 'callLight'].includes(intent)) return 0;
  if (['win', 'bigWin', 'sweatWin'].includes(intent)) return 1;
  if (['badBeat', 'sweatLose', 'lostToYou'].includes(intent)) return 2;
  if (['hello', 'welcome'].includes(intent)) return 3;
  if (intent === 'idle') return 4;
  if (intent === 'reply') return 5;
  return undefined;
}
function linesFor(intent: DialogueIntent, voice: number): readonly string[] {
  const group = voiceGroup(intent);
  if (group === undefined) return DIALOGUE[intent];
  const personal = VOICE_CLAUSES[voice][group].map((line) => intent === 'hello' ? `Hi {you}. ${line}` : line);
  return [...DIALOGUE[intent], ...personal];
}

const PROFILES = new Map(BOTS.map((b) => [b.profile.id, b.profile]));
const BY_NAME = new Map(BOTS.map((b) => [b.name, b.profile]));
export function dialogueProfile(id?: string): BotProfile | undefined {
  return id ? PROFILES.get(id) : undefined;
}

export function dialogueText(id: string): string {
  const bits = id.split(':');
  if (bits.length !== 6 || bits[0] !== 'b' || bits[1] !== 'local') return '';
  const [, , intent, index, voice, frame] = bits;
  if (![index, voice, frame].every((x) => /^(0|[1-9]\d{0,3})$/.test(x))) return '';
  if (!Object.hasOwn(DIALOGUE, intent) || Number(voice) >= CADENCE.length || Number(frame) > 6) return '';
  const line = linesFor(intent as DialogueIntent, Number(voice))[Number(index)];
  if (!line) return '';
  const f = Number(frame),
    v = Number(voice);
  const prefix = CADENCE[v][Math.min(f, 3)];
  const clause = prefix.endsWith(', ') && !/^I[’' ]/.test(line) ? line[0].toLowerCase() + line.slice(1) : line;
  const text = f < 4 ? prefix + clause : `${line} ${SIGNATURES[v][f - 4]}`;
  return text.replaceAll('{you}', '1234567890').length <= 52 ? text : line;
}

function replyIntent(game: Game, to?: string): DialogueIntent {
  const id = to ? game.reactions?.[to]?.id : undefined;
  if (!id) return 'reply';
  if (id === 'gl' || id === 'lucky') return 'replyLuck';
  if (id === 'gg') return 'replyGoodGame';
  if (id === 'laugh') return 'replyLaugh';
  if (id === 'nice' || id === 'clap') return 'replyThanks';
  const event = id.split(':')[2];
  if (['showBluff', 'bluffWon'].includes(event)) return 'replyBluff';
  if (['hello', 'welcome', 'replyGreeting'].includes(event)) return 'replyGreeting';
  if (['badBeat', 'sweatLose', 'lostToYou', 'tilted', 'bluffCaught'].includes(event)) return 'replyLoss';
  if (['win', 'bigWin', 'sweatWin', 'revenge', 'tiltJab', 'heater', 'comeback'].includes(event)) return 'replyWin';
  return 'reply';
}

/** Context needs facts, not the bot's guess at anyone else's hand. */
export function dialogueIntent(game: Game, id: string, event: TalkEvent, to: string | undefined, rng: () => number): DialogueIntent {
  const hand = game.hand,
    mind = game.minds?.[id];
  const seat = hand?.seats.find((s) => s.playerId === id);
  // Private bluff knowledge must not be announced unless this bot has actually exposed its cards.
  if (event === 'bluffWon' && !seat?.shown) return 'win';
  if (event === 'bluffCaught' && !seat?.shown) return 'lostToYou';
  if (event === 'reply') return replyIntent(game, to);
  if (rng() > 0.65) return event;
  if (['win', 'bigWin', 'sweatWin'].includes(event)) {
    if ((mind?.winStreak ?? 0) >= 3) return 'heater';
    if ((mind?.previousLosses ?? 0) >= 2) return 'comeback';
  }
  if (!hand || hand.result || !['yourBigBet', 'thinkHard', 'callLight', 'raise'].includes(event)) return event;
  const target = to ?? hand.aggressorId;
  const acts = (hand.actions ?? []).filter((a) => a.playerId === target && !a.outOfTurn && ['bet', 'raise', 'allin'].includes(a.move));
  if (target && target !== id) {
    if (new Set(acts.filter((a) => a.street !== 'preflop').map((a) => a.street)).size >= 2) return 'barrel';
    const recent = game.reads?.[target]?.recent;
    if (
      acts.filter((a) => a.street === hand.street).length >= 2 ||
      ((recent?.hands ?? 0) >= 2 && (recent?.pfr ?? 0) / recent!.hands > 0.65)
    )
      return 'repeatRaise';
    if ((mind?.grudges?.[target] ?? 0) > 0.35) return 'rival';
  }
  if (hand.board.length >= 4 && ['s', 'h', 'd', 'c'].some((suit) => hand.board.filter((c) => c.endsWith(suit)).length >= 4))
    return 'fourFlush';
  if (new Set(hand.board.map((c) => c.slice(0, -1))).size < hand.board.length) return 'paired';
  const player = game.players.find((p) => p.id === id);
  if (player && player.stack > 0 && player.stack < game.settings.bigBlind * 10) return 'short';
  return event;
}

/** Select without repeating a recent clause, even with a different framing or speaker. */
export function composeDialogue(game: Game, playerId: string, event: TalkEvent, rng: () => number, to?: string): string {
  const player = game.players.find((p) => p.id === playerId)!;
  const p = dialogueProfile(player.botProfile) ?? BY_NAME.get(player.name);
  const voice = p?.voice ?? 0;
  const intent = dialogueIntent(game, playerId, event, to, rng);
  const lines = linesFor(intent, voice);
  const active = new Set(game.players.map((p) => p.id));
  const history = Object.fromEntries(Object.entries(game.dialogue ?? {}).filter(([id]) => active.has(id)));
  const memory = history[playerId];
  const recent = [...(memory?.recent ?? []), ...Object.values(history).flatMap((m) => m.recent.slice(-3))];
  const available = lines.map((_, i) => i).filter((i) => !recent.includes(lines[i]));
  const oldest = lines.map((line, i) => ({ i, at: memory?.recent.lastIndexOf(line) ?? -1 })).sort((a, b) => a.at - b.at)[0].i;
  const choices = available.length ? available : [oldest];
  // An identity's favourite wording nudges selection, with enough variation to avoid a catchphrase loop.
  const offset = p?.signature ?? 0;
  const index = choices[(Math.min(choices.length - 1, Math.floor(rng() * choices.length)) + offset) % choices.length] ?? 0;
  // Most speech is a plain sentence; distinctive extra cadence is occasional, not a catchphrase on every line.
  let frame = rng() < 0.7 ? 0 : 1 + (((p?.signature ?? 0) + Math.floor(rng() * 6)) % 6);
  if (frame >= 4 && ['sweatLose', 'badBeat', 'lostToYou', 'bluffCaught', 'tilted', 'short', 'sweat', 'replyLoss'].includes(intent))
    frame = 0;
  game.dialogue = { ...history, [playerId]: { recent: [...(memory?.recent ?? []), lines[index]].slice(-24), lastIntent: intent } };
  return `b:local:${intent}:${index}:${voice}:${frame}`;
}
