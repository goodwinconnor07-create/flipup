import type { Lesson } from '../model';

export const L4: Record<string, Lesson> = {
  'two-pair-vs-maniac': {
    why: 'Call: you beat almost everything a maniac bets for value here. Only K-Q, 8-7 and A-J are ahead; A-9, T-9, A-6 and one-pair aces all lose to you, and a range this wide still holds odd bluffs. A half-pot bet asks you to be right one time in four, and you’re right far more often. Raising earlier would have been even better, because he pays with worse.',
    streets: [
      { street: 'preflop', text: 'The cutoff opens, a maniac who plays about 80% of hands calls on the button, and you defend A♥T♦ from the big blind. Against nearly any two cards, medium-strong hands gain a lot of value.', range: 'The maniac: nearly any two cards.' },
      { street: 'flop', text: 'You flop top two pair on A♠T♥9♣. The cutoff bets half the pot, the maniac calls, and you call. Raising would have been better: the maniac has plenty of worse aces and two pairs that pay, and the board is wet.', range: 'Any ace, any ten or nine, two pairs, straight draws like K-Q, Q-J, J-8 and 8-7, and floats.' },
      { street: 'turn', text: 'The 6♠ gives 8-7 a straight. The cutoff checks, the maniac bets, you call and the cutoff folds. A raise was good here too: he calls with weaker aces and draws.', range: 'Aces, two pairs, 8-7, straight and spade draws, and air that keeps firing.' },
      { street: 'river', text: 'The J♥ makes broadway for K-Q and a better two pair for A-J. The maniac bets half the pot, which from him is just a normal bet: value, marginal hands and air alike.', range: 'Ahead of you: K-Q, 8-7 and A-J. Behind you: A-9, T-9, A-6, A-K, A-Q and weaker aces, plus odd bluffs.' },
    ],
    takeaway: 'Against a maniac, widen what you call with: two pair is an easy call when they bet so many worse hands.',
  },
  'middle-pair-thin-value': {
    why: 'Bet small: your sixes are ahead of nearly everything that checks here. They’d have bet every ten and most nines, so the check leaves sixes, fours, small pairs and overcards. A third-pot bet gets called by the sixes, fours and some small pairs, and only 7-7 and 8-8 beat you. Checking wins nothing more.',
    streets: [
      { street: 'preflop', text: 'You open A♣6♣ from the cutoff and the small blind flats. Its best hands would usually 3-bet, so the flat is a middling range.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'On 4♦T♣6♠ you c-bet small with middle pair and they call. A small bet keeps everything worse in.', range: 'Tens, sixes and fours, small pairs, straight draws like 8-7 and 5-3, overcards.' },
      { street: 'turn', text: 'The 9♦ adds draws and doesn’t help you. They check and you check behind to get to a showdown, which also keeps your checks from being only weak hands.', range: 'Tens, nines, sixes, fours, small pairs, and draws.' },
      { street: 'river', text: 'The T♥ pairs the board and they check again. After you checked the turn, a ten or a strong nine would usually bet, so their range is capped at a medium pair.', range: 'Sixes like 7-6 and 6-5, fours like A-4 and 5-4, A-6 (split), small pairs, 7-7 and 8-8, overcards.' },
    ],
    takeaway: 'When a capped range checks to you and you’re ahead of most of it, a small bet gets paid by weaker pairs.',
  },
  'two-pair-turn-shove': {
    why: 'Call: you need only 23%, and your hand is near the top of your range. They shove K-J, J-J and A-3 for value, but also worse kings like K-Q and K-T and every club and straight draw. Against all of that you win more than enough. Betting small and then folding to a shove would be the real mistake.',
    streets: [
      { street: 'preflop', text: 'You open A♦K♠ under the gun, 52 big blinds deep; the hijack and both blinds call. The hijack’s best hands would 3-bet.', range: 'Pairs, suited aces, broadways like K-Q, K-J and Q-T, suited connectors.' },
      { street: 'flop', text: 'You flop top pair, top kicker on K♣J♥3♣. You bet 10 into 16 and only the hijack calls, which keeps kings, jacks, two pairs and draws.', range: 'Kings, jacks, K-J and sets, club draws, straight draws like Q-T.' },
      { street: 'turn', text: 'The 3♦ gives A-3 trips and J-J a full house. You bet 12 into 36 and the hijack shoves for 38. With most of your stack already in, you only need to call 26 more.', range: 'Value: K-J, J-J and A-3. Also shoving: K-Q, K-T, club draws and Q-T.' },
    ],
    takeaway: 'When your stack is short and the price is good, don’t bet small and fold: a strong hand calls the shove.',
  },
  'big-draw-multiway-turn': {
    why: 'Call: you’re getting about 8.5 to 1 with around 15 outs, and a raise is unlikely to fold three players. Some outs aren’t clean: the T♣ and 5♣ also make club flushes, and a higher heart draw can beat yours. Even counting fewer, the price is easily good enough, and calling keeps everyone in to pay you when you hit.',
    streets: [
      { street: 'preflop', text: 'Four players limp, you with 9♥6♥; the button raises and three of you call. Everyone is wide and full of suited, connected hands.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'On K♥8♣7♣ the button bets and everyone calls. You have an open-ended draw, a five or a ten. With four players, the calls come from kings, pairs and draws.', range: 'Kings, eights and sevens, club draws, straight draws, and pairs.' },
      { street: 'turn', text: 'The 3♥ adds a heart draw to your open-ender. The button bets small, 14.5, and two players call before you. A small bet multiway is perfect for a big draw: great price, and someone usually has a made hand that won’t fold.', range: 'Kings, eights and sevens, sets and overpairs, club draws, some higher heart draws.' },
    ],
    takeaway: 'In a multiway pot, call with a big draw at a good price; a raise rarely makes everyone fold.',
  },
  'top-pair-ace-river': {
    why: 'Fold: the ace hit exactly the hands they were betting with. Their aces, overpairs, sets, two pair and K-Q all beat you, and many of their draws now have a pair of aces, so few missed draws are left to bluff. You need 29%, and you win far less often.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens in a tournament and you call on the button with K♥J♥. An early open is strong and tight.', range: 'Big pairs, A-K to A-T, and suited broadways.' },
      { street: 'flop', text: 'You flop top pair on a dry J♦6♥3♠. They c-bet and you call, keeping their whole range in while your top pair does well against it.', range: 'Overpairs, A-J, big aces with overcards, some sets.' },
      { street: 'turn', text: 'The T♥ adds draws and they bet bigger: overpairs keep going, and big cards that picked up a draw bet too. Your king removes some of those draws, so you call.', range: 'Overpairs, A-J, sets, and big cards with a draw like A♥Q♥ and K-Q.' },
      { street: 'river', text: 'The A♠ pairs their big aces, makes broadway for K-Q and gives ace-high draws a pair. They bet again. Three growing bets from a tight player, on a river that hits their range, is value.', range: 'Value: overpairs, A-A to A-T, K-Q, sets and two pair, heart draws with an ace. Bluffs: a few missed draws.' },
    ],
    takeaway: 'When the river improves exactly the hands that were betting, top pair becomes a fold.',
  },
  'passive-overbet-limped': {
    why: 'Fold: ace-seven beats only a bluff, and a passive player who suddenly overbets has almost none. Their bet is a queen they slow-played or a spade draw that got there. With no bluffs to catch, a bluff catcher folds whatever the price.',
    streets: [
      { street: 'preflop', text: 'A weak, passive player limps, a loose button limps, the small blind completes, and you check A♣7♦. Nobody has shown strength, so every range is wide and uncapped.', range: 'Any two cards that wanted a cheap flop.' },
      { street: 'flop', text: 'Q♣6♠3♦ checks round. A passive player checks almost everything here, even some queens, so it tells you little.', range: 'Wide: queens slow-playing, sixes and threes, pairs and air.' },
      { street: 'turn', text: 'The Q♠ pairs the board and adds a spade draw. You bet and only the passive limper calls.', range: 'Queens, sixes and threes, spade draws, ace high.' },
      { street: 'river', text: 'The A♠ completes the spades and gives you a pair of aces. The player who never raised bets 1½ times the pot. That’s very strong or a bluff, and from a passive player it’s almost always strong.', range: 'Value: slow-played queens and spade draws that got there. Bluffs: almost none.' },
    ],
    takeaway: 'When a passive player suddenly overbets, they almost always have it: fold a bluff catcher.',
  },
  'top-pair-all-in-and-call': {
    why: 'Fold: when a shove gets called with you still to act, both hands are strong. The shover has sets, straights and two pair; the caller is mostly a straight, from all the A-3, 5-3, 4-3 and 3-2 a loose limper holds. Top pair is nearly drawing dead. You need 30%, and you’re nowhere near.',
    streets: [
      { street: 'preflop', text: 'Seven players limp at a live table, and you complete A♠T♠ from the small blind. Every range is full of suited aces, small connectors and pairs, the hands that love a low board.', range: 'Everyone: suited aces, small connectors and pairs.' },
      { street: 'flop', text: 'You flop top pair on A♣4♦2♥. Against six players one pair is rarely good for big money, but you bet and two call. Calling into a crowd takes an ace, two pair, a set or a wheel draw.', range: 'Aces, two pairs like A-4 and A-2, sets, wheel draws like 5-3.' },
      { street: 'turn', text: 'The 5♣ makes a straight for any three. You check, under the gun shoves nearly three times the pot, and the button calls. A shove that big is face-up strength, and a cold call of it is stronger still.', range: 'Shover: straights, sets and two pairs. Caller: A-3, 6-3, 5-3, 4-3 and 3-2, sometimes a set.' },
    ],
    takeaway: 'When a shove gets called before you act, both ranges are strong: fold one pair.',
  },
  'kings-turn-overbet-shove': {
    why: 'Call: a 60-big-blind shove is much weaker than a deep stack’s overbet. They shove worse pairs like T-T to Q-Q, eights, and club and straight draws. Kings beat every made hand in there, and the draws usually miss with one card to come. You need 40%, and you’re comfortably above.',
    streets: [
      { street: 'preflop', text: 'You open K♥K♠ from middle position; the hijack and the big blind call. With 60 big blinds, the big blind 3-bets or shoves its best hands and flats a wider range.', range: 'The big blind: pairs, suited hands and connectors, few premium pairs.' },
      { street: 'flop', text: 'On a wet 8♣7♣2♥ you c-bet; the hijack folds and the big blind calls.', range: 'Eights, pairs like T-T to Q-Q, club draws, straight draws like T-9 and 6-5.' },
      { street: 'turn', text: 'The 3♥ changes little, and the big blind shoves 49.5 into 25. That’s just their whole stack: one pair and draws that want to end the hand now.', range: 'T-T, J-J, Q-Q; eights like A-8, K-8, 9-8, 8-6 and 8-5; club draws; T-9 and 6-5.' },
    ],
    takeaway: 'A short stack’s shove is wider than a deep stack’s overbet: an overpair calls.',
  },
  'turned-nuts-river-check-raise': {
    why: 'Call: full houses beat you, but his line almost never holds one: A-5, A-4 and A-6 would have played the turn differently. The hands that check-raise the turn like this are pair-plus-draw hands, and everything else that shoves, smaller straights and missed hands, loses to you or splits. You need 36%, and you win most of the time.',
    streets: [
      { street: 'preflop', text: 'You open 8♣7♣ in a big live game; the cutoff and the straddle call. Getting a great price, the straddle defends almost anything.', range: 'The straddle: nearly any two cards.' },
      { street: 'flop', text: 'On A♠5♥4♣ you c-bet small; the cutoff folds and the straddle calls.', range: 'Aces, small pairs, wheel draws like 3-2, straight draws like 7-6 and 8-6.' },
      { street: 'turn', text: 'The 6♠ gives you the nut straight, and the straddle check-raises. On this card the good check-raises are pair-plus-draw hands; a fearless player uses a wide range here.', range: 'Smaller straights (7-3, 3-2), 8-7 (split), pair-plus-draw hands like 8-6 and 7-5, and air.' },
      { street: 'river', text: 'The A♥ pairs the board. You bet and he check-raises all in for over four times the pot. He’s representing a straight or a full house, but the full houses would have played the turn differently.', range: 'Value: a rare full house, 7-3 and 3-2. Split: 8-7. Bluffs: missed 8-6 and 7-5, and air like T-2.' },
    ],
    takeaway: 'Judge a huge bet by the hands that would really take that line, not by its size.',
  },
  'ace-seven-river-give-up': {
    why: 'Check and give up: every hand they have beats ace-seven, and this player doesn’t fold. Their pairs are full houses and their big aces outkick you. A bluff works only if better hands fold, and here they call, so an overbet shove would just burn chips.',
    streets: [
      { street: 'preflop', text: 'You open A♣7♣ from the hijack, a strong cutoff 3-bets, you 4-bet and they call. Folding to the 3-bet was best; the 4-bet put you against big pairs and big aces, with A-A and K-K mostly 5-betting.', range: 'Pairs 9-9 to Q-Q, A-K, suited A-Q and A-J, some A-A and K-K.' },
      { street: 'flop', text: '5♦5♠3♦ checks through. Out of position with no real draw against a strong range, giving up is the plan.', range: 'Unchanged: big pairs and big aces.' },
      { street: 'turn', text: 'The 5♣ checks through too. A third five changes nothing: they still have their pairs and aces, and they know you rarely hold the last five.', range: 'Unchanged: 9-9 to Q-Q, now full houses, and big aces.' },
      { street: 'river', text: 'The 6♠ and you act first. Every hand they hold beats you, and this player doesn’t fold good hands.', range: 'All better than you: 9-9 to Q-Q, some A-A and K-K, A-K, A-Q and A-J.' },
    ],
    takeaway: 'Bluff only when better hands fold; against a range of overpairs that never folds, give up.',
  },
};
