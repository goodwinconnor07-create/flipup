// What the legends say at the table. Every line is original and fixed, written to fit the style they're
// inspired by: nothing here is a quote, and phones can't send any of it. Ids are "b:<legend>:<event>:<i>",
// handled by botTalk.ts like every bot line, so pools only ever grow at the end.

import type { TalkEvent } from './botTalk';

export type LegendId = 'hellmuth' | 'brunson' | 'negreanu' | 'dwan' | 'ivey';

export interface LegendVoice {
  /** The tone pool its lines come after (see botTalk.ts). */
  tone: 'trash' | 'friendly';
  lines: Partial<Record<TalkEvent, string[]>>;
}

export const LEGEND_VOICES: Record<LegendId, LegendVoice> = {
  // The patient one: folds nearly everything, then tells you about it. Comes apart when outdrawn.
  hellmuth: {
    tone: 'trash',
    lines: {
      hello: ['Hi, {you}. Mind the tight game.', '{you}. I only play the best hands.'],
      welcome: ['Evening. I wait for the nuts.'],
      thinkHard: ['I know what I’m doing.', 'Let me read this properly.'],
      thinkEasy: ['Easy fold.', 'Not with that.'],
      allin: ['I have it. Trust me.', 'Finally, a hand.'],
      raise: ['Now I’m interested.', 'That’s a real hand.'],
      foldBig: ['I had you beat, you know.', 'Fold. But I was ahead.'],
      callLight: ['I can’t fold this.'],
      yourBigBet: ['Careful. I’m patient.', 'Big bet. Big hand?'],
      sweat: ['Please. Just once.', 'Hold up, hold up.'],
      sweatWin: ['As expected.', 'The better player wins.'],
      sweatLose: ['Unreal. Completely unreal.', 'How do you call that?'],
      bluffWon: ['I never bluff. Ever.'],
      bigWin: ['Patience pays.', 'Waiting works.'],
      win: ['Took my time.', 'Right on schedule.'],
      badBeat: ['That’s not poker.', 'I was miles ahead.'],
      lostToYou: ['You got lucky.', 'You were behind.'],
      tiltJab: ['You hit a miracle card.', 'Run good all you like.'],
      idle: ['Waiting for a hand.', 'Fold, fold, fold.'],
      tank: ['Tick tock.', 'I’ve folded faster.'],
      showFold: ['Here. I folded the best hand.', 'Look. I was ahead.'],
      showStrong: ['Monster. Nobody called.'],
      revenge: ['That one’s for the last one.'],
      tilted: ['I can’t believe this.', 'Rigged. Obviously.'],
    },
  },
  // The old school: big bets, fast play, a story for every pot.
  brunson: {
    tone: 'friendly',
    lines: {
      hello: ['Well, hello {you}. Let’s play.', '{you}. Sit down, son.'],
      welcome: ['Evening, folks. Let’s get to it.'],
      thinkHard: ['Hmm. Let me see.', 'Been here before.'],
      thinkEasy: ['Easy enough.', 'No trouble.'],
      allin: ['Everything in.', 'Let’s find out.'],
      raise: ['Make it big.', 'Bet size matters.'],
      foldBig: ['I’ll let that one go.', 'You win that one.'],
      callLight: ['I’ll take a look.', 'Call. Why not.'],
      yourBigBet: ['Now that’s a bet.', 'You mean it, huh.'],
      sweat: ['Come on, now.', 'Easy does it.'],
      sweatWin: ['That’ll do.', 'Good old poker.'],
      sweatLose: ['That’s poker.', 'It happens.'],
      bluffWon: ['A big bet tells a story.', 'Told you a story.'],
      bigWin: ['That’ll buy supper.', 'Good pot.'],
      win: ['Thank you kindly.', 'Obliged.'],
      badBeat: ['Well, that’s the game.', 'Unlucky, I’d say.'],
      lostToYou: ['Nicely played.', 'You got me there.'],
      tiltJab: ['Thought you’d call.', 'Pay up, friend.'],
      idle: ['Deal them out.', 'Another hand.'],
      tank: ['Take your time. I’ve got all night.'],
      showBluff: ['Nothing. Told you a story.'],
      showStrong: ['Had it all along.'],
      revenge: ['Got that one back.'],
    },
  },
  // The reader: small bets, big folds, and he'd like to know why you called.
  negreanu: {
    tone: 'friendly',
    lines: {
      hello: ['Hey {you}! Let’s have fun.', '{you}! Tell me about yourself.'],
      welcome: ['Hi everyone! Let’s chat and play.'],
      thinkHard: ['I think you have a pair.', 'Let me ask a question…', 'I’m getting a read.'],
      thinkEasy: ['Pretty clear.', 'Simple one.'],
      allin: ['I’ll put you to the test.', 'This is the spot.'],
      raise: ['A little more.', 'Small bet, big idea.'],
      foldBig: ['I’m folding. Respect.', 'You have it. I can feel it.'],
      callLight: ['I think you’re weak.', 'I’ll pay to find out.'],
      yourBigBet: ['What’s that bet saying?', 'Interesting size.'],
      sweat: ['Come on, come on!', 'Be nice to me.'],
      sweatWin: ['The read was right.', 'Called it.'],
      sweatLose: ['Good for you.', 'Fine. Great call.'],
      bluffWon: ['I got a read on you.', 'Told you I’d know.'],
      bigWin: ['Great pot. Thanks!', 'Nice hand, everyone.'],
      win: ['I’ll take it.', 'Small ball works.'],
      badBeat: ['That’s why we love it.', 'Hands like that happen.'],
      lostToYou: ['Nice one. Well played.', 'How did you know?'],
      tiltJab: ['I had you pegged.'],
      bluffCaught: ['You read me.', 'Okay, you got me.'],
      idle: ['Anyone have a story?', 'What’s everyone drinking?'],
      tank: ['I’ll wait. Reading you.'],
      showBluff: ['I had nothing. Surprise.'],
      showFold: ['I had a good one. Folded it.'],
      revenge: ['I owed you that one.'],
      gotBluffed: ['I knew it! And I still folded.'],
    },
  },
  // The wildcard: loose, relentless, hard to put on a hand.
  dwan: {
    tone: 'trash',
    lines: {
      hello: ['{you}. Think you can keep up?', 'Hey {you}. Don’t blink.'],
      welcome: ['Let’s make this interesting.'],
      thinkHard: ['What if I just go?', 'Lots of options.'],
      thinkEasy: ['Obviously raising.', 'Sure.'],
      allin: ['Let’s make it interesting.', 'All in. Why not.', 'You can’t call this.'],
      raise: ['Bigger.', 'Again.', 'Is that your best?'],
      foldBig: ['You’d better have it.', 'Fine. For now.'],
      callLight: ['I like my chances.', 'Call. What are you doing?'],
      yourBigBet: ['That’s the line?', 'You sure about that?'],
      sweat: ['Run it up.', 'Hold on, hold on.'],
      sweatWin: ['That’s how it goes.', 'Easy game.'],
      sweatLose: ['Fine. Again.', 'Reload.'],
      bluffWon: ['Did I have it? Never know.', 'Nothing. Obviously.'],
      bigWin: ['Stack up.', 'More chips, please.'],
      win: ['Another one.', 'Keep folding.'],
      badBeat: ['Variance.', 'Whatever.'],
      lostToYou: ['Got me.', 'Nice. Again.'],
      tiltJab: ['Same mistake, same result.', 'Keep calling.'],
      bluffCaught: ['Worth a shot.', 'Next one works.'],
      idle: ['Deal faster.', 'Bored.'],
      tank: ['Any day now.'],
      showBluff: ['Seven high.', 'Don’t ask.'],
      revenge: ['Back to even.'],
    },
  },
  // The all-rounder: quiet, patient, and no obvious hole to aim at.
  ivey: {
    tone: 'friendly',
    lines: {
      hello: ['{you}. Good luck.', 'Hi {you}. Let’s play.'],
      welcome: ['Good luck, everyone.'],
      thinkHard: ['…', 'Let me think.'],
      thinkEasy: ['Fine.', 'Sure.'],
      allin: ['All in.', 'Your decision.'],
      raise: ['Raise.', 'Making it more.'],
      foldBig: ['Fold.', 'Good bet.'],
      callLight: ['Call.', 'I’ll see it.'],
      yourBigBet: ['Hm.', 'Okay.'],
      sweat: ['…', 'Let’s see.'],
      sweatWin: ['Thanks.', 'Good game.'],
      sweatLose: ['Nice hand.', 'Well played.'],
      bluffWon: ['Thank you.'],
      bigWin: ['Thanks.', 'Good pot.'],
      win: ['Thanks.'],
      badBeat: ['It happens.'],
      lostToYou: ['Nice hand.', 'Good one.'],
      tiltJab: ['Predictable.'],
      idle: ['…'],
      tank: ['Take your time.'],
      showFold: ['Good fold. Right call.'],
      revenge: ['Even.'],
    },
  },
};

// More lines, added after the first ones so earlier line ids keep meaning the same thing: the moments
// the first pass left quiet (watching someone else's all-in, a pot they weren't in, being bluffed, a quick
// reply) and a few more for the common ones, so a long game doesn't repeat itself.
const MORE: Record<LegendId, Partial<Record<TalkEvent, string[]>>> = {
  hellmuth: {
    sweatWatch: ['Show me the nuts.', 'Somebody has it.'],
    watched: ['I folded better.', 'Glad I’m out of that.'],
    gotBluffed: ['Nobody bluffs me. Hm.', 'That was a bluff?'],
    reply: ['Quiet. I’m thinking.', 'Careful what you say.'],
    thinkEasy: ['Obvious fold.', 'Not today.'],
    win: ['Predictable.', 'The patient win.'],
    bluffCaught: ['I wasn’t bluffing. Was I?'],
    showStrong: ['Look. The real thing.'],
    bigWin: ['That’s what waiting is for.'],
  },
  brunson: {
    sweatWatch: ['Let’s see who’s right.', 'Big pot over there.'],
    watched: ['Fine pot, that.', 'I’d have bet it bigger.'],
    gotBluffed: ['Well, I’ll be.', 'You got me that time.'],
    reply: ['You talk like a rookie.', 'Go on, friend.'],
    thinkEasy: ['No trouble.', 'Straight ahead.'],
    win: ['Another one in the bank.', 'That’ll do.'],
    bluffCaught: ['Can’t win them all.', 'Nice call, that.'],
    showStrong: ['Cards don’t lie.'],
    sweatWin: ['Told you.'],
  },
  negreanu: {
    sweatWatch: ['I want to see these!', 'Who do you think has it?'],
    watched: ['Great hand to watch.', 'I had a read on that one.'],
    gotBluffed: ['I knew it. Folded anyway.', 'Nice bluff. Seriously.'],
    reply: ['Ha! Good point.', 'Tell me more.'],
    thinkEasy: ['Pretty easy.', 'That one’s clear.'],
    win: ['Small pot, big smile.', 'Little by little.'],
    bluffCaught: ['You called! What did you see?'],
    showStrong: ['Look at that!', 'I really had it.'],
    sweatWin: ['Yes! Thank you.'],
  },
  dwan: {
    sweatWatch: ['Run it twice?', 'Put it all in, then.'],
    watched: ['I’d have bluffed that.', 'Boring pot.'],
    gotBluffed: ['Nice. I fold way too much.', 'Okay, you got me.'],
    reply: ['Cute.', 'Say that again.'],
    thinkEasy: ['Raise. Obviously.', 'Easy spot.'],
    win: ['Again?', 'Next.'],
    bluffCaught: ['Had to try.', 'Still +EV.'],
    showStrong: ['Surprise. I had it.'],
    sweatWin: ['Never in doubt.'],
  },
  ivey: {
    sweatWatch: ['…', 'Interesting.'],
    watched: ['Hm.', 'Fine hand.'],
    gotBluffed: ['Good play.', 'I see.'],
    reply: ['Okay.', 'Sure.'],
    thinkEasy: ['Simple.', 'Yes.'],
    win: ['Good.', 'Thanks.'],
    bluffCaught: ['You read it.', 'Nice call.'],
    showStrong: ['Value.'],
    sweatWin: ['Good.'],
  },
};
for (const id of Object.keys(MORE) as LegendId[]) {
  for (const [event, lines] of Object.entries(MORE[id]) as [TalkEvent, string[]][]) {
    LEGEND_VOICES[id].lines[event] = [...(LEGEND_VOICES[id].lines[event] ?? []), ...lines];
  }
}
