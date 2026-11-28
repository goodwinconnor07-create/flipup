import type { Lesson } from '../model';

export const L4: Record<string, Lesson> = {
  'two-pair-vs-maniac': {
    why: 'Call: you beat almost everything a maniac bets for value here. Only K-Q, 8-7 and A-J are ahead; A-9, T-9, A-6 and one-pair aces all lose to you, and a range this wide still holds the odd strange bluff. A half-pot bet asks you to be right about one time in four, and against this player you’re right far more often. Raising earlier would have been even better, because he pays with worse.',
    streets: [
      { street: 'preflop', text: 'The cutoff opens, a maniac who plays about 80% of hands calls on the button, and you defend A♥T♦ from the big blind. The maniac’s range is close to any two cards, which changes every later decision: medium-strong hands gain value against him.', range: 'The maniac: nearly any two cards.' },
      { street: 'flop', text: 'You flop top two pair on A♠T♥9♣. The cutoff bets half the pot, the maniac calls, and you call. Raising would have been better: the maniac’s range is full of worse aces and two pairs that would pay, and it’s a wet board where you want money in now.', range: 'Any ace, any ten or nine, two pairs like A-9, T-9 and A-6 later, straight draws like K-Q, Q-J, J-8 and 8-7, and floats.' },
      { street: 'turn', text: 'The 6♠ gives 8-7 a straight and adds a spade draw. The cutoff checks, the maniac bets, you call and the cutoff folds. Against this player, raising the turn is also good: he calls with weaker aces and draws. The pot is now heads-up with the maniac.', range: 'Aces, two pairs, 8-7 (a straight), straight and spade draws, and air that keeps firing.' },
      { street: 'river', text: 'The J♥ completes K-Q’s broadway and makes A-J a better two pair. The maniac bets half the pot. From him, a half-pot bet is just a normal bet: he does it with value hands, with marginal hands and with air.', range: 'Ahead of you: K-Q, 8-7 and A-J. Behind you: A-9, T-9, A-6, A-K, A-Q and weaker aces, plus strange bluffs.' },
    ],
    takeaway: 'Against a maniac, widen what you call with: two pair is an easy call when they bet so many worse hands.',
  },
  'middle-pair-thin-value': {
    why: 'Bet small: your pair of sixes is ahead of nearly everything that checks here. They’d have bet every ten and most nines on the river, so their check leaves sixes, fours, small pairs and overcards. A third-pot bet gets called by the sixes, fours and some small pairs, while only 7-7 and 8-8 beat you. Thin value like this adds up, and checking would win nothing more.',
    streets: [
      { street: 'preflop', text: 'You open A♣6♣ from the cutoff and the small blind flats. A flat from the small blind is pairs, suited aces, broadways and suited connectors; its best hands would usually 3-bet.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'The flop is 4♦T♣6♠. You c-bet small with middle pair and they call with pairs, straight draws and overcards. A small bet keeps everything worse in.', range: 'Tens, sixes and fours, small pairs, straight draws like 8-7 and 5-3, and overcards.' },
      { street: 'turn', text: 'The 9♦ adds straight and diamond draws and doesn’t help you. They check and you check behind: it keeps your checking range from being only weak hands and gets you to a showdown.', range: 'Tens, nines, sixes, fours, small pairs, and draws.' },
      { street: 'river', text: 'The T♥ pairs the board and they check again. A player with a ten or a strong nine would usually bet after you checked the turn, so their range is capped at a medium pair.', range: 'Sixes like 7-6 and 6-5, fours like A-4 and 5-4, A-6 (a split), small pairs, 7-7 and 8-8, and overcards.' },
    ],
    takeaway: 'When a capped range checks to you and you’re ahead of most of it, a small bet gets paid by weaker pairs.',
  },
  'big-draw-multiway-turn': {
    why: 'Call: you’re getting about 8.5 to 1 with around 15 outs, and a raise is unlikely to fold out three players. Some outs aren’t clean: the T♣ and 5♣ also fill club flushes, and a higher heart draw can beat yours. Even counting fewer outs, the price is easily good enough. Calling keeps everyone in, so you get paid when you hit.',
    streets: [
      { street: 'preflop', text: 'Four players limp, including you with 9♥6♥; the button raises and three of you call. Everyone’s range is wide and full of suited and connected hands.', range: 'Wide everywhere: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'The flop is K♥8♣7♣. It checks to the button, who bets, and everyone calls. With four players, calls come from kings, pairs, straight draws and club draws. You have an open-ended draw: a five or a ten.', range: 'Kings, eights and sevens, club draws, straight draws, and pairs.' },
      { street: 'turn', text: 'The 3♥ gives you a heart flush draw to go with your open-ender. The button bets small, 14.5, and two players call before you. Small bets in multiway pots are perfect for big draws: the price is great, and with four players someone usually has a made hand that won’t fold to a raise.', range: 'Kings, eights and sevens, sets and overpairs, club draws, and some heart draws higher than yours.' },
    ],
    takeaway: 'In a multiway pot, call with a big draw at a good price; a raise rarely makes everyone fold.',
  },
  'top-pair-ace-river': {
    why: 'Fold: the ace hit exactly the hands they were betting with. You lose to their aces, overpairs, sets, two pair and K-Q, and many of their draws now have a pair of aces. Few missed draws are left to bluff. You need 29%, and you win far less often than that.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens in a tournament and you call on the button with K♥J♥. An under-the-gun open is strong and tight: big pairs, A-K down to A-T, and suited broadways.', range: 'Big pairs, A-K to A-T, and suited broadways.' },
      { street: 'flop', text: 'You flop top pair on J♦6♥3♠, a dry board. They c-bet and you call, which keeps their whole range in while your top pair does well against it.', range: 'Their whole range: overpairs, A-J, big aces with overcards, and some sets.' },
      { street: 'turn', text: 'The T♥ adds a heart draw and straight draws. They bet bigger. Overpairs keep betting, and so do big cards that picked up a draw. Your king blocks some of those draws, and you call again.', range: 'Overpairs, A-J, sets, and big cards with a draw like A♥Q♥ and K-Q.' },
      { street: 'river', text: 'The A♠ is the worst card for you: it pairs all their big aces, makes broadway for K-Q, and pairs the heart draws that held an ace. They bet again. Three growing bets from a tight player, with the river hitting their range, is value.', range: 'Value: overpairs, A-A, A-K, A-Q, A-J and A-T, K-Q, sets and two pair, and heart draws with an ace. Bluffs: a few missed draws.' },
    ],
    takeaway: 'When the river improves exactly the hands that were betting, top pair becomes a fold.',
  },
  'passive-overbet-limped': {
    why: 'Fold: ace-seven only beats a bluff, and a passive player who suddenly overbets has almost none. Their bet is a queen they slow-played or a spade draw that got there. With no bluffs to catch, a bluff catcher has to fold, whatever the price.',
    streets: [
      { street: 'preflop', text: 'A weak, passive player limps, a loose button limps, the small blind completes, and you check your option with A♣7♦. Nobody has shown strength, so every range is wide and uncapped.', range: 'Anything: any two cards that wanted to see a cheap flop.' },
      { street: 'flop', text: 'The flop is Q♣6♠3♦ and it checks around. A passive player checks almost everything here, even some queens, so the check tells you little.', range: 'Wide: queens slow-playing, sixes and threes, pairs and air.' },
      { street: 'turn', text: 'The Q♠ pairs the board and adds a spade draw. You bet, and only the passive limper calls. Their range: a queen, a spade draw, a six or a three, or ace high.', range: 'Queens, sixes and threes, spade draws, and ace high.' },
      { street: 'river', text: 'The A♠ completes the spades and gives you a pair of aces. Then the passive player, who never raised, bets 1½ times the pot. A bet that big from a passive player is polarised and leans to value: trips or a flush, with very few bluffs.', range: 'Value: queens that slow-played and spade draws that got there. Bluffs: almost none.' },
    ],
    takeaway: 'When a passive player suddenly overbets, they almost always have it: fold a bluff catcher.',
  },
  'top-pair-all-in-and-call': {
    why: 'Fold: when a shove gets called with you still to act, both hands are strong. The shover has sets, straights and two pair; the caller is mostly a straight, with all the A-3, 5-3, 4-3 and 3-2 a loose limper holds. Top pair is drawing nearly dead most of the time. You need 30%, and you’re nowhere near.',
    streets: [
      { street: 'preflop', text: 'Seven players limp at a live table, you complete A♠T♠ from the small blind. Every range is wide: suited aces, small connectors and any pair, exactly the hands that love a low board.', range: 'Everyone: suited aces, small connectors and pairs.' },
      { street: 'flop', text: 'You flop top pair on A♣4♦2♥. Against six players, one pair is rarely good for big money, but you bet and two call. Calling into a seven-way pot takes an ace, two pair, a set or a wheel draw.', range: 'Aces, two pairs like A-4 and A-2, sets, and wheel draws like 5-3 and 5-x.' },
      { street: 'turn', text: 'The 5♣ makes a straight for any 3 and adds two pairs and sets. You check, under the gun shoves nearly three times the pot, and the button calls. A shove that big is face-up strength, and a cold call of it is even stronger.', range: 'The shover: straights with a 3, sets and two pairs. The caller: straights with A-3, 6-3, 5-3, 4-3 and 3-2, and sometimes a set.' },
    ],
    takeaway: 'When a shove gets called before you act, both ranges are strong: fold one pair.',
  },
  'kings-turn-overbet-shove': {
    why: 'Call: a 60-big-blind shove is much weaker than an overbet from a deep stack. They shove worse pairs like T-T to Q-Q, eights, and the club and straight draws. Kings beat every one of those made hands; only the draws can catch up, and with one card to come they usually miss. You need 40%, and you’re comfortably above.',
    streets: [
      { street: 'preflop', text: 'You open K♥K♠ from middle position; the hijack and the big blind call. The big blind has only 60 big blinds, so they’d 3-bet or shove their best hands and flat a wider range.', range: 'The big blind: pairs, suited hands and connectors, few premium pairs.' },
      { street: 'flop', text: 'The flop is 8♣7♣2♥, wet with straight and flush draws. Kings are still well ahead against two players, so you c-bet; the hijack folds and the big blind calls with eights, pairs and draws.', range: 'Eights, pairs like T-T to Q-Q, club draws, and straight draws like T-9 and 6-5.' },
      { street: 'turn', text: 'The 3♥ changes little, and the big blind shoves 49.5 into 25, almost twice the pot. With 60 big blinds, that’s just their whole stack: they shove one-pair hands and draws that want to end the hand now.', range: 'Pairs below yours (T-T, J-J, Q-Q), eights (A-8, K-8, 9-8, 8-6, 8-5), club draws, and T-9 and 6-5.' },
    ],
    takeaway: 'A short stack’s shove is wider than a deep stack’s overbet: an overpair calls.',
  },
  'turned-nuts-river-check-raise': {
    why: 'Call: full houses beat you, but his line almost never holds one. A-5, A-4 and A-6 would have played the turn differently, and the hands that check-raise the turn like this are pair-plus-draw hands. Everything else that shoves, smaller straights and missed draws, loses to you or splits. You need 36%, and despite the size you win most of the time.',
    streets: [
      { street: 'preflop', text: 'You open 8♣7♣ in a big live game; the cutoff and the straddle call. Getting a great price, the straddle defends almost anything.', range: 'The straddle: very wide, nearly any two cards.' },
      { street: 'flop', text: 'The flop is A♠5♥4♣. You c-bet small, the cutoff folds and the straddle calls with aces, small pairs, wheel draws and straight draws.', range: 'Aces, small pairs, wheel draws like 3-2, and straight draws like 7-6 and 8-6.' },
      { street: 'turn', text: 'The 6♠ gives you the nut straight. The straddle check-raises. On this card, good check-raises are pair-plus-draw hands like 8-6 or 7-5; a fearless player who should check his range here is using a wide range.', range: 'Smaller straights (7-3, 3-2), 8-7 (a split), and pair-plus-draw hands like 8-6 and 7-5, plus air.' },
      { street: 'river', text: 'The A♥ pairs the board. You bet, and he check-raises all in for more than four times the pot. He’s representing exactly a straight or a full house, but full houses would have played the turn differently; a fearless player makes big bluffs with hands that missed.', range: 'Value: a rare full house, 7-3 and 3-2 (smaller straights), 8-7 (a split). Bluffs: 8-6 and 7-5 that missed, and air like T-2.' },
    ],
    takeaway: 'Judge a huge bet by the hands that would really take that line, not by its size.',
  },
  'ace-seven-river-give-up': {
    why: 'Check and give up: every hand they have beats ace-seven, and this player doesn’t fold. Their pairs make full houses and their big aces outkick you. A bluff only works if better hands fold, and against 9-9 to Q-Q and A-K, A-Q and A-J that call, it won’t. An overbet shove here would just burn chips.',
    streets: [
      { street: 'preflop', text: 'You open A♣7♣ from the hijack, a strong cutoff 3-bets, and you 4-bet; they call. Calling a 4-bet, they hold big pairs and big aces; A-A and K-K mostly 5-bet. Folding A-7 suited to the 3-bet was best; the 4-bet put you in a tough spot.', range: 'Pairs 9-9 to Q-Q, A-K, A-Q and A-J suited, and some A-A and K-K that just called.' },
      { street: 'flop', text: 'The flop is 5♦5♠3♦ and it checks through. Out of position with no real draw against a strong range, giving up is the plan.', range: 'Unchanged: big pairs and big aces.' },
      { street: 'turn', text: 'The 5♣ puts trips on the board, the worst card for you. You check, and they check behind. A third five can’t change who is ahead: they still have their pairs and big aces, and you still have ace high. It also gives you nothing to represent, since they know you rarely hold the last five.', range: 'Unchanged: 9-9 to Q-Q (now full houses), and big aces.' },
      { street: 'river', text: 'The 6♠ and you’re first to act. Every hand they hold beats ace-seven: pairs make full houses and big aces outkick you. And this player doesn’t fold good hands.', range: 'All better than you: 9-9 to Q-Q, some A-A and K-K, and A-K, A-Q and A-J.' },
    ],
    takeaway: 'Bluff only when better hands fold; against a range of overpairs that never folds, give up.',
  },
};
