import type { Lesson } from '../model';

export const L20: Record<string, Lesson> = {
  'ace-high-fold-river-shove-three-bet-pot': {
    why: 'Fold: ace high isn’t a bluff catcher here. Any pair, any king and any flush beats you, and a straightforward player’s shove is full of those. Their story of K-K, T-T or a flush seems odd, but straightforward players shove what they say they have. You need about 31%, and you beat only a rare ace-high bluff.',
    read: [
      { about: 'preflop', text: 'In a big live game a limper and the cutoff were in; a young, 3-bet-happy pro squeezed from the small blind and everyone called, you with A♥Q♠ on the button.' },
      { about: 'opponent', text: 'A young pro who 3-bets a lot but plays straightforwardly after the flop. Their big moves after the flop are real.' },
      { about: 'players', text: 'Four saw the flop; only you called the squeeze bet. Your river bet was a bluff.' },
      { about: 'board', text: 'K♥6♥6♣ is paired with a heart draw. The 3♦ is a blank, and the T♥ completes the hearts.' },
      { about: 'sizing', text: 'They checked the turn and river, then raised all in over your half-pot bluff. A raise all in over a bet is the strongest line on the river.' },
      { about: 'range', text: 'For value: K-K, T-T, 6-6 and heart flushes; overpairs and kings. Bluffs: rare ace-high hands.' },
    ],
    takeaway: 'When your bluff gets raised all in by a straightforward player, give up: ace high doesn’t catch bluffs.',
  },
  'set-overbet-river-range-full-of-kings': {
    why: 'Overbet: their range is full of kings that won’t fold, plus sevens and small sets. A few club flushes beat you, but not enough to stop you betting. When you have value and they’ll call down, go big: an overbet wins the most from all those kings.',
    read: [
      { about: 'preflop', text: 'In a big live game you opened 9♥9♦ second to act, 200 big blinds deep; both blinds called.' },
      { about: 'opponent', text: 'An unknown with a big stack. Most players call down with a king on a king-high board, whatever you bet.' },
      { about: 'board', text: 'K♦7♦3♣ has a diamond draw. The 9♣ gave you a set and added a club draw, and the 2♣ completes the clubs.' },
      { about: 'sizing', text: 'They called a small flop bet and a big turn bet, then checked. Calling twice on a king-high board means a lot of kings.' },
      { about: 'range', text: 'A king calls any size. Club flushes and K-K beat you. A seven or a small set calls a normal bet. Missed diamond draws fold.' },
    ],
    takeaway: 'When their range is full of top pairs that call down, bet big with a set.',
  },
  'jacks-call-river-shove-face-up-overpair': {
    why: 'Call: against a player who bluffs when they think you’re marginal, their shove holds plenty of big cards and air alongside the overpairs, sets and straights. Your jacks beat every bluff. You need about 35%. Most weak players won’t fire this bluff, so this works against this kind of opponent.',
    read: [
      { about: 'preflop', text: 'A loose, aggressive online pro 3-bet the cutoff over a middle-position open; you cold-called J♣J♦ from the small blind, 100 big blinds deep.' },
      { about: 'opponent', text: 'A loose, aggressive pro looks for players who look marginal and pushes them off with big bets.' },
      { about: 'board', text: '8♠5♦3♣ is low. The 2♥ adds wheel straights, and the 9♦ makes straights for 7-6.' },
      { about: 'sizing', text: 'You check-called twice, which looks like Q-Q, J-J or T-T. Their shove for more than the pot is designed to make that hand fold.' },
      { about: 'range', text: 'For value: A-A, K-K and Q-Q; sets and straights. For bluffs: big cards that missed, air and small pairs.' },
    ],
    takeaway: 'When you look marginal and a loose pro shoves to push you off, call with a hand that beats their bluffs.',
  },
  'trips-fold-river-shove-tight-passive-check-raiser': {
    why: 'Fold: a tight, passive player who check-raises the turn and shoves the river has a jack or better every time. You lose to better kickers, full houses and the new straights, and beat only a wildly overplayed overpair. You need about 31%. Don’t talk yourself into thinking they’re bluffing your splashy bet.',
    read: [
      { about: 'preflop', text: 'A tight, passive player raised the small blind and you called J♠T♣ with 50 big blinds.' },
      { about: 'opponent', text: 'A tight, passive player rarely raises without a strong hand. With nothing they’d fold the turn; with a medium hand they’d call.' },
      { about: 'board', text: 'J♥J♦9♥ gave you trips with a heart draw out. The 6♣ is a blank, and the 8♠ makes straights for Q-T and T-7.' },
      { about: 'sizing', text: 'A confident turn check-raise and an instant river shove. Two strong actions in a row from a passive player is the nuts or close.' },
      { about: 'range', text: 'For value: A-J, K-J and Q-J; J-9, J-8, J-6, 9-9, 8-8 and 6-6; Q-T and T-7. Rarely, an overpair overplayed.' },
    ],
    takeaway: 'When a tight, passive player check-raises and then shoves, they have it: fold trips with a weak kicker.',
  },
  'ace-high-check-river-double-paired-board': {
    why: 'Check: a bet turns your hand into a bluff that only gets called by full houses and straights. The hands that would fold, counterfeited pairs and missed draws, are ones you already beat. A tight player rarely has the hand your bet could make fold. Check, and fold to a bet.',
    read: [
      { about: 'preflop', text: 'In a big live game you opened A♣8♣, an excellent loose, aggressive player 3-bet, a tight, aggressive button called and so did you.' },
      { about: 'opponent', text: 'A tight, aggressive player calls a bet with real hands. They don’t float the turn with nothing.' },
      { about: 'players', text: 'Three saw a flop that checked round. The 3-bettor folded your turn bet, so it’s you against the button.' },
      { about: 'board', text: 'Q♣J♣J♦ is paired with a club draw. The T♦ makes A-K a straight, and the Q♥ double-pairs the board.' },
      { about: 'sizing', text: 'They called your turn bet. They likely don’t have a jack or a straight, but could easily have a queen.' },
      { about: 'range', text: 'A queen or a jack (a full house), A-K, T-T and J-T call. Counterfeited pairs, another ace and a missed club draw fold.' },
    ],
    takeaway: 'When a bet only gets called by better and folds hands you beat, check with your showdown value.',
  },
  'ace-high-fold-river-lead-paired-dry-board': {
    why: 'Fold: they called the flop on a board with no draws, so they arrived with a made hand or big cards, and few worthless hands. Nearly all of those beat ace high now: trip fives, tens and pairs, and K-Q and Q-8 just made straights. You need about 27%, and you have far less.',
    read: [
      { about: 'preflop', text: 'In a small live game you raised a limper on the button with A♦Q♣; the big blind and the limper called.' },
      { about: 'players', text: 'Three saw the flop; the big blind called your bet out of position with a player still behind. That takes a real hand.' },
      { about: 'board', text: 'T♦5♥5♣ is dry and paired. The 9♦ adds straight draws, and the J♣ makes straights for K-Q and Q-8.' },
      { about: 'sizing', text: 'A flop call, a checked turn, then a 60% lead. On a dry board, the river lead is a made hand taking the initiative.' },
      { about: 'range', text: 'For value: trip fives, a ten or a pocket pair, and A-K, K-J, K-Q and Q-8. Bluffs: some hands that missed.' },
    ],
    takeaway: 'On a dry board, a flop call means a real hand: ace high rarely wins when they lead the river.',
  },
  'top-pair-fold-river-shove-after-flop-raise': {
    why: 'Fold: a raise on a dry flop followed by two more big bets is sets, a better queen or two pair. There are no draws on that flop to raise as a semi-bluff. Top pair wins only against a stone-cold bluff, and that’s a long shot. You need about 24%, and you’re far short.',
    read: [
      { about: 'preflop', text: 'In a small live game, as a loose, aggressive player, you opened Q♥J♥ second to act; a tough player called on the button.' },
      { about: 'opponent', text: 'A tough player knows you open loose and bet a lot. They raise to get value from your top pairs.' },
      { about: 'board', text: 'Q♦6♣3♠ is dry: no draws to play hard. The T♦ adds a diamond draw, and the 4♥ makes 7-5 a straight.' },
      { about: 'sizing', text: 'A flop raise, a big turn bet and a river shove. Three strong actions on a dry board are almost always value.' },
      { about: 'range', text: 'For value: sets Q-Q, 6-6, 3-3, T-T and 4-4; A-Q, K-Q and Q-T; 6-4 and 7-5. A few pure bluffs.' },
    ],
    takeaway: 'A raise on a dry flop followed by two more bets is strength, not a draw: fold top pair.',
  },
  'top-pair-fold-small-turn-big-river-pattern': {
    why: 'Fold: a small turn bet followed by a big river bet is a strong pattern in live games. If they’re betting big for value, they probably have you beat with trips, a full house or a straight that got there. The draws bricked, so a bluff is possible, but not often enough. You need about 29%.',
    read: [
      { about: 'preflop', text: 'In a small live game with deep stacks, two players limped; you raised K♦Q♠ two off the button, and the big blind and a limper called.' },
      { about: 'players', text: 'Three saw the flop; only the big blind called your bet.' },
      { about: 'board', text: 'K♣8♦7♦ gave you top pair with a diamond draw out. The 8♥ pairs the board, and the 5♠ makes straights for 9-6 and 6-4.' },
      { about: 'sizing', text: 'A small turn lead, then more than ⅔ pot on the river. The small bet keeps you in; the big one is the value bet.' },
      { about: 'range', text: 'For value: trip eights and full houses; 9-6 and 6-4; some A-K. For bluffs: bricked draws and weaker kings.' },
    ],
    takeaway: 'A small turn bet then a big river bet is a strong pattern in live games: fold top pair.',
  },
  'top-pair-fold-river-bet-monotone-flop-low-stakes': {
    why: 'Fold: you hold the A♥, so they have no nut-flush-draw bluffs, and the straight draws all made a pair of tens. What’s left is flushes, straights, sets and two pair. The average low-stakes player rarely bluffs here, and you need about 26%. Folding should be automatic.',
    read: [
      { about: 'preflop', text: 'In a small live game you raised a limper with A♥J♠; the button and the limper called.' },
      { about: 'opponent', text: 'An average low-stakes player calls with draws and bets made hands. They rarely turn a missed hand into a river bet.' },
      { about: 'board', text: 'J♥8♥3♥ is monotone, and you have top pair with the nut flush draw. The 4♣ is a blank, and the T♠ makes straights for 9-7 and Q-9.' },
      { about: 'sizing', text: 'They called two big bets, then bet half the pot when you checked. Draws on this board would need the A♥, which you hold.' },
      { about: 'range', text: 'For value: heart flushes; 9-7 and Q-9; J-J, T-T, 8-8 and 3-3; J-T, J-8 and T-8. A rare bluff.' },
    ],
    takeaway: 'When you hold the card their bluffs need and their draws turned into pairs, there’s nothing left to catch: fold.',
  },
  'top-pair-fold-pot-river-bet-flush-and-straight': {
    why: 'Fold: both the flush and the J-9 straight have come in. Few hands put this much in on the flop and turn and end up with nothing, so they usually have the big hand they’re representing. They wouldn’t play A-J this way. You need about 34%, and you’re well short.',
    read: [
      { about: 'preflop', text: 'In a small live game with deep stacks you opened A♦Q♠ three off the button; a player behind and both blinds called.' },
      { about: 'players', text: 'Four saw the flop; only the small blind called your bet. Then they took the lead.' },
      { about: 'board', text: 'A♠T♣8♣ has a club draw and straight draws. The 3♣ completes the clubs, and the 7♦ completes J-9’s straight.' },
      { about: 'sizing', text: 'A half-pot lead on the flush card, then a pot-size bet on the river. Leading twice into the preflop raiser is strong.' },
      { about: 'range', text: 'For value: club flushes, J-9, and sets T-T, 8-8, 7-7 and 3-3. Bluffs: Q-J and K-T that missed.' },
    ],
    takeaway: 'When the draws they played arrive and they bet the pot, a bluff catcher folds.',
  },
};
