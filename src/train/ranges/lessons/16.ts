import type { Lesson } from '../model';

export const L16: Record<string, Lesson> = {
  'king-high-fold-river-aggressive-big-blind': {
    why: 'Fold: king high beats only queen high and worse. Their value is every jack, nine and deuce, plus underpairs and ace high they overvalue, and that’s far more than their missed draws. You need about 30%, and you have much less. Only if they bet every turn after a checked flop would calling get close.',
    read: [
      { about: 'preflop', text: 'You opened K♦4♦ from the hijack in a small live game; the button and an aggressive player in the big blind called.' },
      { about: 'opponent', text: 'An aggressive young player bets when checked to, with value and with draws. They also value-bet weak made hands like underpairs.' },
      { about: 'players', text: 'Three saw a flop that checked round. The button folded the turn, so it’s you against the big blind.' },
      { about: 'board', text: 'J♠2♦2♥ is paired and dry. The 9♥ adds a heart draw and straight draws, and the 3♦ misses them.' },
      { about: 'sizing', text: 'A bet of over half the pot on the turn and ¾ pot on the river. They’re betting for value with any pair that thinks it’s good.' },
      { about: 'range', text: 'For value: a jack, a nine or a deuce, and sometimes an underpair or ace high. For bluffs: missed Q-T, T-8 and heart draws.' },
    ],
    takeaway: 'King high only beats the worst bluffs: fold when their value bets include weak made hands.',
  },
  'king-high-straight-fold-river-shove-flush-board': {
    why: 'Fold: a raise all in on a board with three clubs is a flush the vast majority of the time. Very few players in a small live game shove a bluff here often enough to matter. Your straight beats only the odd set and splits with K-J. You need about 32%, and you have far less.',
    read: [
      { about: 'preflop', text: 'You limped K♠J♥ behind one limper in a small live game; an unknown player raised the button and you both called.' },
      { about: 'players', text: 'Three saw the flop; the limper folded to the button’s bet. It’s now you against the raiser.' },
      { about: 'board', text: 'Q♣9♦2♣ has a club draw. The 3♣ puts three clubs out, and the T♥ gives you a straight.' },
      { about: 'sizing', text: 'They called your turn lead, then raised all in over your river bet. A huge raise on a three-flush board is the classic flush line.' },
      { about: 'range', text: 'For value: club flushes. K-J splits with you. A set might shove as a bluff, rarely.' },
    ],
    takeaway: 'At low stakes, an all-in raise on a three-flush board is a flush nearly every time: fold even a straight.',
  },
  'nines-straight-fold-river-overbet-flush': {
    why: 'Fold: an overbet all in on the flush card is a flush or a higher straight almost every time. There are very few hands that make sense as a bluff here; A♦ with a jack is about the only one. You need about 39%, and you have far less.',
    read: [
      { about: 'preflop', text: 'In a small live game a tight player raised, a reasonable player called in the hijack, and you called 9-9 from the small blind.' },
      { about: 'position', text: 'You’re out of position. You led the turn, then checked the river to them.' },
      { about: 'board', text: 'T♣8♦5♦ has a diamond draw and straight draws. The 7♣ gave you an open-ender, and the 6♦ made your straight but put three diamonds out.' },
      { about: 'sizing', text: 'An all in for almost twice the pot. An overbet this big wants a call from a straight; it’s a flush or a better straight.' },
      { about: 'range', text: 'For value: diamond flushes and J-9, a higher straight. For bluffs: A♦ with a jack.' },
    ],
    takeaway: 'An overbet shove on the card that completes the flush, with almost no natural bluffs, is a fold.',
  },
  'fours-fold-river-big-blind-lead': {
    why: 'Fold: your fours beat only missed heart draws and air. Every queen, jack and deuce, bigger pairs and anything with a five beats you, and those value hands outnumber the bluffs. Your 4♥ also removes some of their heart draws. You need about 26%, and you’re short.',
    read: [
      { about: 'preflop', text: 'You opened 4♥4♠ from the button with 24 big blinds, and the big blind defended with a wide range.' },
      { about: 'opponent', text: 'A player who likes to bluff, but more likely to bet twice with a missed flush draw than with pure air.' },
      { about: 'board', text: 'Q♦J♥2♣ checked through. The 2♥ adds a heart draw, and the 5♦ misses it.' },
      { about: 'sizing', text: 'A turn bet of most of the pot and a river bet of just over half. Any queen, jack or deuce bets for value here.' },
      { about: 'range', text: 'For value: a queen, a jack, a deuce or a pair of fives. For bluffs: missed heart draws.' },
    ],
    takeaway: 'When their value bets include every pair above yours, a small pair folds, even against a bluffer.',
  },
  'top-pair-fold-river-overbet-solver': {
    why: 'Fold: an overbet this big comes from sets, straights, two pair and the best top pairs, plus missed spade draws. Your king with an 8 kicker beats only the bluffs, and an elite player is a little more likely to be value-betting here than bluffing. You need about 37%, and you’re short.',
    read: [
      { about: 'preflop', text: 'An elite player opened the lojack; you defended K♠8♠ from the big blind, both over 300 big blinds deep.' },
      { about: 'opponent', text: 'An elite player sizes up with the top of their range when they expect a call. Deep stacks give them room to overbet.' },
      { about: 'board', text: '9♠7♠6♣ is very connected. The K♥ gave you top pair, and the 3♥ missed your spade and straight draws.' },
      { about: 'sizing', text: 'A ⅔-pot flop bet, a big turn bet, then 140% of the pot. Three growing bets is a strong line, and the overbet is polarised.' },
      { about: 'range', text: 'For value: sets 9-9, 7-7, 6-6 and K-K; T-8; K-9 and 7-6; some top pairs with a better kicker. For bluffs: missed spade draws.' },
    ],
    takeaway: 'A huge overbet from an elite player leans toward value: fold a weak top pair.',
  },
  'ace-nine-fold-turn-jam-after-min-raise': {
    why: 'Fold: against a flush, a straight, a set or two pair your big draw wins only about a quarter of the time, and some of your straight cards pair the board or improve them. Calling 53 more needs about 31%. When someone bets twice and then shoves over a raise, it’s a strong hand. Calling the turn bet instead of raising would have avoided this spot.',
    read: [
      { about: 'preflop', text: 'In a small live game the first player raised, three called, you called A♥9♦ from the small blind, and the big blind came along.' },
      { about: 'players', text: 'Six saw the flop; only you called the middle-position player’s bet. A bet into five players is usually a real hand.' },
      { about: 'board', text: '8♥7♥4♣ is connected with a heart draw. The T♥ gave you the nut flush draw and an open-ended straight draw.' },
      { about: 'sizing', text: 'They bet the flop, bet the turn, then shoved over your min-raise. Three strong actions in a row mean a made hand.' },
      { about: 'range', text: 'Flushes; J-9 and 6-5 straights; sets T-T, 8-8, 7-7 and 4-4; T-8 and 8-7 two pair.' },
    ],
    takeaway: 'Against made hands that include flushes and straights, a big draw needs a better price: don’t raise into a shove you can’t call.',
  },
  'king-high-straight-value-bet-river-in-position': {
    why: 'Overbet: almost everything that called the turn is worse than you, and plenty of it, two pair, sets, A-A and A♣K♣, calls a big bet. Checking wins nothing more. Two pair and sets call even an overbet, which wins the most; three-quarters of the pot is nearly as good.',
    read: [
      { about: 'preflop', text: 'A strong player opened under the gun, and you called K♦T♦ on the button.' },
      { about: 'position', text: 'You’re in position. They checked to you every street, then check-called.' },
      { about: 'board', text: 'Q♣J♦9♦ gave you an open-ended straight draw and a flush draw. The 7♣ is a blank, and the K♠ gives you a king-high straight. Only A-T beats it.' },
      { about: 'sizing', text: 'They called a pot-size turn bet. A strong player doesn’t call that with weak hands like A-T without a draw.' },
      { about: 'range', text: 'K-Q, K-J, Q-Q, J-J and 9-9 call any size. A-A and A♣K♣ call a normal bet. Q-T, J-T, T-9 and K-T split. A-Q and A-J call only small, and missed draws fold.' },
    ],
    takeaway: 'When their calling hands are two pair and sets that won’t fold, bet big with a near-nut hand.',
  },
  'top-pair-value-bet-river-checked-to': {
    why: 'Bet small: their range is queens, eights and busted club draws, and the queens and eights are worse than you. Some of them call a modest bet. The busted draws fold whatever you do, and the few hands that beat you would have played faster. A third to half of the pot gets called by the most worse hands.',
    read: [
      { about: 'preflop', text: 'You opened A♥9♥ from the cutoff; both blinds called.' },
      { about: 'position', text: 'You’re in position. You checked back the turn, then they checked the river to you again.' },
      { about: 'board', text: 'Q♣8♠3♣ has a club draw. The A♦ gave you top pair, and the 5♦ misses the clubs.' },
      { about: 'sizing', text: 'They called your flop bet and checked twice. That’s a medium pair or a draw, not a strong ace.' },
      { about: 'range', text: 'K-Q calls a normal bet. Q-J, Q-T, 9-8 and 8-7 call only small. Busted club draws fold. A few better aces and sets call.' },
    ],
    takeaway: 'When their range is weak pairs that checked twice, a small value bet gets called by the most worse hands.',
  },
  'two-pair-call-flush-turn-splashy-button': {
    why: 'Call: raising makes no sense, because they fold the hands you beat and continue with the flushes. Their big bet includes plenty of aces going for thin value and junk that a splashy player bets, and you’re way ahead of those. You need about 32%, and you have the river to come with full-house outs against the flushes.',
    read: [
      { about: 'preflop', text: 'A loose, splashy player with 300 big blinds raised the button, and you defended T♣7♦ from the big blind.' },
      { about: 'opponent', text: 'A splashy player bets big with all sorts of hands, value, thin value and junk, so their big bets aren’t always strong.' },
      { about: 'board', text: 'A♠T♠3♦ gave you second pair with a spade draw out. The 7♠ gives you two pair and completes the flush.' },
      { about: 'sizing', text: 'A small flop bet, then nearly the pot on the turn. A big bet is polarised: a flush or better, or thin value and bluffs.' },
      { about: 'range', text: 'For value: flushes; A-T, A-3, A-7 and 3-3. Thinner: aces going for value. Bluffs: junk and draws.' },
    ],
    takeaway: 'Against a polarised turn bet, don’t raise a hand that folds out what you beat: call.',
  },
  'top-pair-weak-kicker-call-aggressive-button-limped': {
    why: 'Call: this player bets almost their whole range, so your top pair is in excellent shape. Kings, eights, worse aces, draws and air all bet here; only better aces, two pair and sets beat you. Raising folds out the hands you beat. Call, then check and let them keep bluffing.',
    read: [
      { about: 'preflop', text: 'Two players limped, you limped A♠9♠, an overly aggressive button limped and both blinds came along.' },
      { about: 'opponent', text: 'Overly aggressive players bluff whenever they get the chance, and also bet top pair and better.' },
      { about: 'players', text: 'Six saw the flop; it checked to the button, who bet. Two called on the flop and one folded the turn.' },
      { about: 'board', text: 'A♥8♣2♠ gave you top pair with a marginal kicker. The K♦ adds kings and broadway draws.' },
      { about: 'sizing', text: 'Two small bets when checked to. From this player, small bets are their whole range, not just strong hands.' },
      { about: 'range', text: 'Ahead of you: A-K, A-Q, A-J and A-T; A-8, A-2, K-8, K-2, K-K, 8-8 and 2-2. Behind you: worse aces, a king or an eight, draws and air.' },
    ],
    takeaway: 'Against a player who bets almost every hand, call with top pair and let them keep bluffing.',
  },
};
