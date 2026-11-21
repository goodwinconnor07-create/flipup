// What bots say about the games themselves: a deuce landing in Crazy Deuces, the ghost taking a pot, a bust at Blackjack
// Hold'em, a finger pointed at someone in Imposter, a power played, a mission done. They're fixed lines like the rest of
// the bot talk (botTalk.ts), in the same two tones, and said through the same bubbles: `|` starts the next message right
// away, `||` is a second thought a beat later (chat.ts). Short, so each fits one line of a seat's bubble.
//
// Ids are `b:<tone>:<event>:<index>`: only ever add lines at the end of a list, never reorder.

/** Moments only one game has. `variantTalk()` in botTalk.ts says which bot reacts and when. */
export type GameTalkEvent =
  // Crazy Pineapple
  | 'discardsShown'
  // Crazy Deuces
  | 'deuceLands'
  // Ghost Hold'em
  | 'ghostWins'
  | 'ghostLoses'
  // Pittsburgh
  | 'threeRivers'
  // Die on the River
  | 'dieSix'
  | 'dieSwap'
  // Red River
  | 'redRiver'
  | 'blackRiver'
  // Crucifix and Circle
  | 'crossFlop'
  | 'crossRiver'
  | 'circleFlop'
  | 'circleRiver'
  // Memory Poker
  | 'memoryPeek'
  | 'memoryRecall'
  // Bean Stalk
  | 'stalkGrows'
  // Blackjack Hold'em
  | 'bjHit'
  | 'bjBust'
  // Imposter
  | 'impPoint'
  | 'impAccused'
  | 'impCaught'
  | 'impEscaped'
  | 'impSlipped'
  // Power Cards
  | 'powerMine'
  | 'powerSeen'
  | 'powerOnMe'
  // Secret Missions
  | 'missionDone'
  | 'missionRace';

export const GAME_EVENTS: GameTalkEvent[] = [
  'discardsShown',
  'deuceLands',
  'ghostWins',
  'ghostLoses',
  'threeRivers',
  'dieSix',
  'dieSwap',
  'redRiver',
  'blackRiver',
  'crossFlop',
  'crossRiver',
  'circleFlop',
  'circleRiver',
  'memoryPeek',
  'memoryRecall',
  'stalkGrows',
  'bjHit',
  'bjBust',
  'impPoint',
  'impAccused',
  'impCaught',
  'impEscaped',
  'impSlipped',
  'powerMine',
  'powerSeen',
  'powerOnMe',
  'missionDone',
  'missionRace',
];

/** How often a bot with something to say about it says it (before its chattiness): these are the point of the game, so high. */
export const GAME_CHANCE: Record<GameTalkEvent, number> = {
  discardsShown: 0.55,
  deuceLands: 0.7,
  ghostWins: 0.85,
  ghostLoses: 0.85,
  threeRivers: 0.5,
  dieSix: 0.6,
  dieSwap: 0.6,
  redRiver: 0.7,
  blackRiver: 0.6,
  crossFlop: 0.4,
  crossRiver: 0.45,
  circleFlop: 0.4,
  circleRiver: 0.45,
  memoryPeek: 0.6,
  memoryRecall: 0.5,
  stalkGrows: 0.3,
  bjHit: 0.5,
  bjBust: 0.9,
  impPoint: 0.9,
  impAccused: 0.95,
  impCaught: 0.95,
  impEscaped: 0.95,
  impSlipped: 1,
  powerMine: 0.6,
  powerSeen: 0.75,
  powerOnMe: 1,
  missionDone: 0.9,
  missionRace: 1,
};

export const GAME_TRASH: Record<GameTalkEvent, string[]> = {
  discardsShown: ['Look at those|throwaways.', 'Bad discard,|that one.', 'Somebody|threw a good one.', 'Fine. Two cards.|Plenty.', 'Interesting|discards.', 'Pineapple.|Pick wisely.'],
  deuceLands: ['A deuce.|Of course.', 'Wild card.|Somebody’s happy.', 'There’s a 2.|Here we go.', 'Deuces are wild.|Pay attention.', 'Another 2?|Rigged.', 'Wild again.|Great.'],
  ghostWins: ['The ghost|says thanks.', 'Beaten by a ghost.|Pathetic.', 'Ghost takes it.|Ha.', 'Nobody beat it.|Weak.', 'The ghost ate that.', 'Spooky.|Pay the ghost.'],
  ghostLoses: ['The ghost lost.|Shame.', 'Beat the ghost.|Barely.', 'Ghost down.|Pot’s real.', 'Finally.|Someone beat it.', 'Even ghosts fold.', 'Boo.|Not today.'],
  threeRivers: ['Three rivers.|Pick one.', 'Choose your river.|Mine’s best.', 'Three cards.|One matters.', 'Drowning in|rivers.', 'Plenty of rivers.|Still lose?', 'Three chances.|Use one.'],
  dieSix: ['A six.|Board stays.', 'Six. Boring.', 'Nothing changes.|Six.', 'Six.|Dull die.', 'The die|did nothing.'],
  dieSwap: ['The die|changed it.', 'New card.|Thanks, die.', 'Swapped.|Good luck.', 'Die says|no.', 'That card|got rolled.', 'Plot twist.'],
  redRiver: ['Red again.|Keep dealing.', 'Another red.|Oh no.', 'Red river.|Round two.', 'More cards.|Fine.', 'Heart or diamond.|Again.', 'Still red.|Brutal.'],
  blackRiver: ['Black.|It’s over.', 'Finally.|A black card.', 'River closed.|Bet up.', 'Black river.|Pay up.', 'Spade or club.|Done.'],
  crossFlop: ['A cross.|Pick a line.', 'Five cards.|Across or down.', 'The cross.|Whose line?', 'Two lines.|One hand.', 'Cross is out.|Count it.'],
  crossRiver: ['Cross done.|Count your line.', 'Down or across?|Decide.', 'Full cross.|Show me.', 'Last arms.|Two lines.', 'Cross complete.|Bet it.'],
  circleFlop: ['Circle opens.|Two cards.', 'Round we go.|Clock’s ticking.', 'Circle.|No three yet.', 'Two on the clock.|Easy.', 'Twelve and six.|Fine.'],
  circleRiver: ['Circle’s full.|Three in a row.', 'Round table.|Count three.', 'Clock’s done.|Who’s got it?', 'All six.|Find your three.', 'Three in a row.|Show me.'],
  memoryPeek: ['Twenty cards.|Memorise.', 'Remember those.|I will.', 'Eyes up.|Twenty gone.', 'Don’t blink.|Memory time.', 'Those are out.|Remember.', 'Burn them|into your head.'],
  memoryRecall: ['I remembered that.|Did you?', 'Told you it|was out.', 'Counted that card.|Ha.', 'That king was gone.|I knew.', 'Memory pays.', 'Remembered.|Like a boss.'],
  stalkGrows: ['Another card.|Greedy.', 'Stalk grows.|So do pots.', 'More cards.|More lies.', 'Up it goes.', 'Fresh beans.', 'Beans for all.|Count them.'],
  bjHit: ['Hit me.|I’m brave.', 'Another one.|Why not.', 'Hit.|Let’s see.', 'Card.|Now.', 'One more.|Easy.', 'Dare I?|I dare.'],
  bjBust: ['Bust.|Greedy.', 'Over 21.|Ouch.', 'Too many cards.|Rookie.', 'Busted!|Ha.', 'Went over.|Cute.', 'Twenty-what?|Bust.'],
  impPoint: ['That’s the imposter.|Watch {you}.', 'I see you,|{you}.', 'Something’s off|about {you}.', '{you}.|Explain yourself.', 'Pointing at {you}.|Sus.', 'Funny betting,|{you}.'],
  impAccused: ['Me?|Please.', 'Wrong guess.|Try again.', 'You’re wrong.|Look closer.', 'Not me.|Obviously.', 'Cute accusation.|Wrong.', 'Pointing at me?|Bold.'],
  impCaught: ['Got you.|Told you.', 'Caught.|Easy.', 'The imposter.|Finally.', 'Knew it all along.', 'Busted.|Hand it over.', 'Never in doubt.'],
  impEscaped: ['Who was it?!|Nobody got it.', 'You lot|are hopeless.', 'Missed it.|All of you.', 'Wrong again.|Impressive.', 'The imposter won.|Embarrassing.'],
  impSlipped: ['Nobody even|noticed me.', 'Easy.|You all voted wrong.', 'Hid in plain sight.', 'Thanks for|the pot.', 'Sus? Me?|Never.'],
  powerMine: ['Power time.', 'Using it.|Watch.', 'Here goes.|My power.', 'Played it.|Deal with it.', 'Power up.', 'Surprise.'],
  powerSeen: ['A power.|Of course.', 'Careful.|Power on the table.', 'Sneaky.|I saw that.', 'Oh, a power.|Cute.', 'Powers.|Here we go.', 'Noted.|Power played.'],
  powerOnMe: ['Hey!|Aimed at me?', 'Targeting me?|Rude.', 'Not me!|Pick someone else.', 'Seriously.|Me?', 'That’s personal.', 'Bold move.|At me.'],
  missionDone: ['Mission done.|Pay up.', 'Someone’s on|a mission.', 'There’s the reward.|Ugh.', 'A mission.|Again.', 'Guess it was|a mission.', 'Paid.|Fine.'],
  missionRace: ['Race over.|Chips shuffled.', 'The race is run.', 'Standings changed.|Wow.', 'Race settled.|Ouch.', 'New race.|Here we go.'],
};

export const GAME_FRIENDLY: Record<GameTalkEvent, string[]> = {
  discardsShown: ['Tough discards!', 'Ooh,|look at those.', 'Hard to throw|a card away.', 'Nice choices.', 'Pineapple time!', 'Interesting|throws.'],
  deuceLands: ['A deuce!|Wild!', 'There’s a 2!|Nice.', 'Wild card!|Fun.', 'Deuces wild.|Love it.', 'Another 2!|Wow.', 'A wild one!'],
  ghostWins: ['The ghost|got it!', 'Ghost takes it.|Oh no.', 'Spooky!', 'Nobody beat it.', 'Ghost wins.|Good one.', 'Boo!|It stays.'],
  ghostLoses: ['We beat the ghost!', 'Ghost down!', 'Nice, beat it!', 'The ghost lost!', 'Phew.|Beat it.', 'Ghost busted!'],
  threeRivers: ['Three rivers!|Fun.', 'Lots of cards!', 'Take your pick!', 'Three rivers.|Wow.', 'Pick the best one!', 'So many rivers.'],
  dieSix: ['A six!|Board stays.', 'Six.|No change.', 'Safe.|Six.', 'Six.|Phew.', 'Nothing changes!'],
  dieSwap: ['The die|swapped it!', 'New card!|Ooh.', 'Die says|swap!', 'That changed|things.', 'Whoa,|new board!', 'Die decides!'],
  redRiver: ['Red again!', 'More cards!', 'Red river!|Ooh.', 'Keep going!', 'Heart or diamond.|Again!', 'Still red!'],
  blackRiver: ['Black!|Done.', 'River’s over!', 'Finally, black!', 'Black river.|Bet up!', 'That’s the end.'],
  crossFlop: ['The cross!|Nice.', 'Five cards!', 'Down or across?', 'Two lines!', 'Cross is out.'],
  crossRiver: ['Cross is full!', 'Which line?', 'All nine!|Count up.', 'Down or across?', 'Show your line!'],
  circleFlop: ['The circle!|Fun.', 'Round we go!', 'Two on the clock.', 'Circle’s open.', 'Clock starts!'],
  circleRiver: ['Circle’s full!', 'Three in a row?', 'All six!', 'Round the clock!', 'Count your three!'],
  memoryPeek: ['Memorise those!', 'Twenty cards!|Remember!', 'Look closely!', 'Eyes up!', 'Take them in!', 'Don’t forget!'],
  memoryRecall: ['I remembered!', 'That card was out!', 'Memory paid off!', 'Knew it!', 'Remembered that one!'],
  stalkGrows: ['It grows!', 'More cards!', 'Another bean!', 'Up we go!', 'Stalk’s growing!'],
  bjHit: ['Hit me!', 'One more!', 'Feeling brave.', 'Another card!', 'Let’s see!', 'Why not!'],
  bjBust: ['Bust!|Oh no.', 'Over 21!', 'Ouch, bust.', 'Too many!', 'Went over!', 'So close!'],
  impPoint: ['I’m pointing|at {you}.', '{you}?|Something’s off.', 'Sorry {you}.|Suspicious.', 'I think it’s {you}.', 'Hmm, {you}.', 'Watching {you}.'],
  impAccused: ['Me? Nope!', 'Not me, I swear!', 'It’s not me!', 'Wrong person!', 'Why me?!', 'Come on!|Not me.'],
  impCaught: ['Got them!', 'Caught!|Nice work.', 'There they are!', 'We did it!', 'Knew it!', 'Great teamwork!'],
  impEscaped: ['Who was it?!', 'We missed them!', 'Argh,|wrong vote.', 'They got away!', 'Sneaky!', 'Next time!'],
  impSlipped: ['Ha, you missed me!', 'Sorry, it was me!', 'Hid well.|Thanks!', 'Nobody guessed!', 'It was me!'],
  powerMine: ['Using my power!', 'Here goes!', 'Power time!', 'Let’s try this.', 'Ooh, my power.'],
  powerSeen: ['Ooh, a power!', 'Nice one!', 'Sneaky!', 'A power!|Fun.', 'Watch out!', 'Powers!'],
  powerOnMe: ['Hey, me?!', 'Aimed at me!', 'Not me!', 'Aw, me?', 'Ha, targeted!', 'Really?|Me?'],
  missionDone: ['Mission done!', 'Nice, a mission!', 'Reward time!', 'Well played!', 'Someone’s mission!', 'Paying up.'],
  missionRace: ['Race over!', 'The race is done!', 'Chips moved!', 'New race!', 'Wow, standings!'],
};
