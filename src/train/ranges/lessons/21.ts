import type { Lesson } from '../model';

export const L21: Record<string, Lesson> = {
  'trips-call-half-pot-river-bet-limped-pot': {
    why: 'Call: an experienced pro attacks when the first bettor shows weakness, and their bets in that spot include plenty of draws. On this board those draws are spades and straight draws, and the river missed most of them. You lose to better sixes, full houses and T-9, but you beat 8-7, A-7 and 6-5, which bet for value, and every missed draw. A half-pot bet sets the price at about 26%, and your trips are ahead far more often.',
    streets: [
      { street: 'preflop', text: 'In a big live game everyone limps, you with 9♣6♣ on the button, and the big blind checks. In a limped pot every range is wide, and big pairs are rare: they would usually raise.', range: 'Everyone: wide, with suited hands, connectors, small pairs and weak aces.' },
      { street: 'flop', text: 'The flop is 7♠6♠6♥, paired with a spade draw and straight draws. The big blind bets 4 into about 5.5; the cutoff calls and so do you, with trip sixes and a weak kicker. The cutoff’s call keeps sixes, sevens, spade draws and straight draws like 9-8, 8-5 and 5-4.', range: 'The cutoff: sixes, sevens, spade draws, straight draws like 9-8, 8-5, 5-4 and T-9, and pairs.' },
      { street: 'turn', text: 'The 8♦ gives you an open-ended straight draw too. The big blind checks, which is almost certainly weak, the cutoff bets 15 into about 17.5, you call and the big blind folds. An experienced pro takes over the betting when the first bettor gives up, with value and with plenty of draws.', range: 'Better sixes, 8-7, A-7 and 6-5; 9-5 and T-9 straights or draws; spade draws; straight draws like 5-4 and T-9.' },
      { street: 'river', text: 'The J♣ makes straights for T-9 and misses the spades. The cutoff bets 25 into about 47.5, about half the pot, with 10 big blinds left behind. A half-pot bet from a player who took over the betting with draws still contains many of the draws that just missed.', range: 'Ahead of you: some better sixes, full houses and straights. Behind you: 8-7, A-7 and 6-5, missed spade draws and missed straight draws.' },
    ],
    takeaway: 'When a good player takes over the betting after someone shows weakness, their range has draws: call the river with trips.',
  },
  'ace-jack-check-back-no-bluff': {
    why: 'Check: a tight-aggressive regular who called a flop raise and a turn bet usually has a king, and kings call any river bet. The only hands that fold, Q-J that missed, are hands your ace high already beats. A bluff that only gets worse hands to fold, and better hands to call, wins nothing. Check and take the showdown.',
    streets: [
      { street: 'preflop', text: 'A tight-aggressive regular opens from middle position to 3, and you call in the cutoff with A♣J♣. A tight middle-position open is strong: big pairs, strong aces and suited broadways.', range: 'Pairs, A-K down to A-T, K-Q and K-J, and suited broadways.' },
      { street: 'flop', text: 'The flop is K♦T♣3♥, and you have a gutshot to the nut straight. They bet 4 into about 7.5, and you raise to 12 as a semi-bluff; they call. A tight player calls a raise here with a king, and with Q-J, which has an open-ended draw. Most other hands fold.', range: 'A king (A-K, K-Q, K-J, K-T), Q-J, and the odd set slow-playing.' },
      { street: 'turn', text: 'The 5♣ adds a club draw for you. They check, you bet 21 into about 31.5, and they call again. A tight player calling twice is a king almost every time, plus Q-J that still has a draw. Your bet has given up its fold equity against kings.', range: 'A king (A-K, K-Q, K-J, K-T) and Q-J drawing.' },
      { street: 'river', text: 'The 8♦ misses your draws and theirs. They check. Their kings call any bet you make. Q-J missed and folds, but your ace high beats it anyway.', range: 'Calls any bet: a king (A-K, K-Q, K-J, K-T). Folds: Q-J that missed, which you beat anyway.' },
    ],
    takeaway: 'Bluff only when better hands can fold: if only worse hands fold, check and take the showdown.',
  },
  'nines-eight-take-free-showdown': {
    why: 'Check: they bet the flop and turn, then checked the river. What’s left is a king, a high pair, an ace that just paired, or a barrel that gave up. The made hands all call a bet, so a value bet gets called only by better. A bluff doesn’t work either: the only hands that fold, the barrels that gave up, are worse than your second pair already. Take the free showdown.',
    streets: [
      { street: 'preflop', text: 'A tight-aggressive regular opens from middle position to 3, and you call on the button with 9♠8♠. A tight middle-position open is strong: pairs, strong aces, and suited broadways.', range: 'Pairs, A-K down to A-T, K-Q and K-J, suited broadways and some suited connectors.' },
      { street: 'flop', text: 'You flop second pair on K♠8♦3♥. They bet 4.5 into about 7.5, and you call. A tight player c-bets this king-high board with most of their range: kings, high pairs, and aces and broadways that missed.', range: 'Kings, high pairs Q-Q to 9-9, ace high like A-Q and A-J, and broadways.' },
      { street: 'turn', text: 'The 4♠ gives you a flush draw. They bet again, 11 into about 16.5, and you call. A second bet narrows them to kings and high pairs, and to ace-high hands still barrelling. Your second pair with a flush draw is happy to call.', range: 'Kings, high pairs Q-Q to 9-9, and A-Q, A-J and other barrels.' },
      { street: 'river', text: 'The A♦ misses your flush and pairs their aces. They check. A king or a high pair checks to keep the pot small, an ace that just paired checks to get to showdown, and a barrel that gave up checks too.', range: 'Calls a bet: a king (A-K, K-Q, K-J, K-T), high pairs Q-Q to 9-9, and aces that backed into a pair. Folds: a double barrel that gave up, which you beat.' },
    ],
    takeaway: 'With a medium hand on the river, take the free showdown when better hands call and worse hands fold.',
  },
  'king-ten-check-back-passive-big-blind': {
    why: 'Check: a passive regular never check-raises as a bluff and doesn’t call with worse, so their calls are honest. They called two bets of about ¾ pot, which folded the weak pairs and most junk along the way. Now their range is a better king, queens with a diamond draw that missed, and 7♦6♦, which just made a straight. Your top pair beats only the queens, and they won’t call a third bet with those.',
    streets: [
      { street: 'preflop', text: 'It folds to you on the button in a six-handed game. You raise K♥T♥ to 3, and a passive regular calls from the big blind. A passive player defends a fair range and rarely 3-bets, so strong hands like A-K and K-Q are still in.', range: 'Pairs, suited hands, broadways like A-K, K-Q and Q-J, suited connectors like 7♦6♦, and weak aces.' },
      { street: 'flop', text: 'The flop is 4♥5♦K♦, and you flop top pair with a diamond draw on the board. You bet 4.8 into about 6.5, and they call. A passive player calls with kings, fives, fours, diamond draws and straight draws like 7-6 and 6-3.', range: 'Kings, fives, fours, diamond draws like Q♦J♦ and Q♦T♦, straight draws like 7-6, and pairs.' },
      { street: 'turn', text: 'The 8♠ adds straight draws. You bet 12 into about 16, and they call again. A second ¾-pot call from a player who doesn’t call with worse narrows them to better kings and draws with real equity. The weak pairs and junk are gone.', range: 'A better king like A-K and K-Q suited, diamond draws with the Q♦, and 7♦6♦ with a straight draw.' },
      { street: 'river', text: 'The 9♠ makes 7-6 a straight and misses the diamonds. They check. A-K and K-Q suited beat you and call any bet; 7♦6♦ would raise. The queens that missed the flush are the only hands you beat, and they won’t call.', range: 'Ahead of you: A-K and K-Q suited, and 7♦6♦, which raises. Behind you: queens with the Q♦.' },
    ],
    takeaway: 'Against a player whose calls are honest, top pair with a weak kicker checks the river: only better calls.',
  },
  'king-high-straight-check-back-vs-ace-jack': {
    why: 'Check: they bet the flop, then checked twice. Without a jack they won’t call a bet: two pairs, sets, tens and nines fold to any size on a four-straight board. With a jack they might check-raise, and A-J has the nut straight. K-J, Q-J, J-9 and J-8 only split. Betting gets called or raised by hands that tie or beat you, so check.',
    streets: [
      { street: 'preflop', text: 'In a big live game with a straddle, a strong, slightly aggressive pro opens the hijack to 4, you call J♥T♥ on the button, and the straddle calls. The pro opens a fairly wide hijack range, with big aces and broadways.', range: 'Pairs, A-K down to A-T, broadways like K-Q, K-J and Q-J, suited connectors.' },
      { street: 'flop', text: 'You flop top pair and an open-ended straight draw on T♣9♦4♥. The straddle checks, the pro bets 9, you call and the straddle folds. A c-bet here is most of their range: tens, nines, overpairs, straight draws like Q-J, K-J and J-8, and big cards.', range: 'Tens, nines, overpairs, sets, straight draws like Q-J, K-J and J-8, and big cards like A-K and A-Q.' },
      { street: 'turn', text: 'The Q♦ keeps your draw open. The pro checks, and you check behind. A strong player checks this card with medium hands and with some straights to trap; A-J now has a straight draw, and K-J has the straight. Your check keeps the pot small.', range: 'Two pairs and sets, overpairs, a ten or a nine, K-J, A-J, A-K, Q-J and J-9.' },
      { street: 'river', text: 'The K♠ gives you a king-high straight. They check again. A-J has the nut straight. K-J, Q-J, J-9 and J-8 split with you. Without a jack, they won’t call a bet on a four-straight board.', range: 'Raises: A-J (the nuts). Splits and may raise: K-J, Q-J, J-9 and J-8. Folds: two pairs, sets, a ten or a nine.' },
    ],
    takeaway: 'When a bet only gets called by hands that tie or beat you, check the second-nut straight.',
  },
  'nine-high-flush-fold-turn-raise-recreational': {
    why: 'Fold: a recreational player who is passive with big bets has finally raised big, and that means a strong hand. On a three-diamond board with a pair, the only lower flushes, 5♦2♦ and 4♦2♦, are unlikely in a raised pot, and straights and overpairs don’t raise here. What raises is a higher flush, and now and then the bare A♦ as a bluff. A price of 25% needs far more than that.',
    streets: [
      { street: 'preflop', text: 'In a big live game you open 9♦8♦ under the gun to 3.5, 200 big blinds deep; a pro and a recreational player call. A recreational player cold-calls an early raise with all sorts of suited hands, broadways and pairs.', range: 'The recreational player: pairs, suited aces, suited broadways like K♦Q♦ and Q♦J♦, suited connectors, and A-K and A-Q.' },
      { street: 'flop', text: 'You flop a flush with a straight-flush draw on 7♦6♦3♦. You bet 8 into about 12, and both call. A three-diamond flop gets calls from flushes, single big diamonds, sets, overpairs and straight draws like 5-4 and 9-8.', range: 'Flushes, single high diamonds like A♦x and K♦x, overpairs, sets, and straight draws like 5-4 and 8-5.' },
      { street: 'turn', text: 'The 3♣ pairs the board. You bet 22 into about 36, the pro folds, and the recreational player raises to 62.5. A player who is passive with big bets doesn’t raise one pair, a set worried about the board, or a straight on a three-flush board. A raise this size is a higher flush, a full house, or rarely the A♦ trying to make you fold.', range: 'Value: higher flushes, and a full house with 3-3 or a set that filled up. Bluffs: rarely, the bare A♦.' },
    ],
    takeaway: 'When a passive player suddenly raises big on a flush board, a low flush is a fold.',
  },
  'top-pair-fold-river-jam-after-check-raise': {
    why: 'Fold: a flop check-raise, a pot-size turn bet and a river jam are three strong actions in a row, and a straightforward player rarely builds a line like this as a bluff. Their value is sets, two pair and the 5-3 straight that just got there. The only bluffs are some busted 7-5 and 8-7. The price is about 34%, and top pair with an eight kicker wins far less often.',
    streets: [
      { street: 'preflop', text: 'You open Q♥8♥ on the button to 3, 100 big blinds deep, and a straightforward player calls from the big blind. They defend wide against a button open.', range: 'Wide: pairs, suited hands, connectors like 7-5, 8-7 and 5-3, broadways and any ace.' },
      { street: 'flop', text: 'You flop top pair on Q♣6♦4♥. You bet small, 2 into about 6.5, and they check-raise to 7.2; you call. A straightforward player check-raises with sets and two pair, and with straight draws like 7-5, 8-7 and 5-3 that want to build the pot. Weak queens mostly just call.', range: 'Sets 6-6 and 4-4, two pairs like Q-6 and 6-4, strong queens, and straight draws like 7-5, 8-7 and 5-3.' },
      { street: 'turn', text: 'The 9♠ adds a spade draw. They bet the pot, 20.9, and you call. A pot-size second barrel after a check-raise keeps their strong hands and some of their draws, and 9-9 just made a set.', range: 'Sets 9-9, 6-6 and 4-4; two pairs; strong queens; and straight draws like 7-5, 8-7 and 5-3.' },
      { street: 'river', text: 'The 2♠ makes 5-3 a straight and gives 2-2 a set. They jam 68.9 into about 62.7, a little more than the pot. Three strong actions in a row from a player who rarely bluffs is value: the hands that check-raised the flop and kept going have made something.', range: 'Value: sets 9-9, 6-6, 4-4 and 2-2; two pair; 5-3. Bluffs: some busted 7-5 and 8-7.' },
    ],
    takeaway: 'Against a straightforward player, a check-raise, a pot-size barrel and a river jam are value: fold top pair.',
  },
  'middle-pair-fold-river-after-turn-pot-lead': {
    why: 'Fold: a straightforward player bets draws on the turn but gives up on the river when they miss. The turn lead could have been a club or straight draw, but the river missed both, and they bet again. Betting again after the draws missed is value: J-T, sets and two pair. Middle pair with an eight kicker beats only the few missed draws that bet anyway. The price is about 27%, and you win far less often.',
    streets: [
      { street: 'preflop', text: 'You open Q♥8♥ on the button to 3, 100 big blinds deep, and a straightforward player calls from the big blind. They defend wide, with every suited and connected hand.', range: 'Wide: pairs, suited hands, broadways like J-T, connectors and any ace.' },
      { street: 'flop', text: 'The flop is K♣Q♣9♦, with club and straight draws. They check, and you check back middle pair, a fine way to keep the pot small with a hand that has showdown value. Their check keeps all of it in, including kings, sets and J-T that check to you.', range: 'Wide: kings, queens, nines, J-T, club draws, straight draws like J-8 and T-8, and pairs.' },
      { street: 'turn', text: 'The 3♥ is a blank. They lead the pot, 6.5, and you call. A straightforward player bets draws here, and strong made hands too: J-T, sets, two pair, kings, and club and straight draws.', range: 'J-T, sets 9-9 and 3-3, two pairs, kings, and club and straight draws.' },
      { street: 'river', text: 'The 4♠ misses the club and straight draws. They bet 11.7 into about 19.5, 60% of the pot. This player gives up on the river when their draw misses, so a second bet after the draws missed is a hand that wants a call.', range: 'Value: J-T, sets 9-9, 4-4 and 3-3, and two pair. Bluffs: a few missed club and straight draws.' },
    ],
    takeaway: 'When a straightforward player keeps betting after their draws miss, they have a made hand: fold middle pair.',
  },
  'kings-check-river-paired-flush-board': {
    why: 'Check: a long think before calling a big turn bet means a real hand that considered folding or raising. The river 9♣ pairs the board and completes the backdoor clubs, so much of that real hand just beat you: trip nines, club flushes, the 5-4 straight and sets. T-T and J-J, the hands you beat, fold to a bet. A bet only gets called by better, so check.',
    streets: [
      { street: 'preflop', text: 'In a big live game, 300 big blinds deep, a player limps and you raise K♠K♣ to 4.5; four players call. A typical $5-$10 player in middle position calls a raise over a limper with pairs, suited broadways and suited connectors.', range: 'Middle position: pairs, suited broadways, suited aces and suited connectors like 5-4.' },
      { street: 'flop', text: 'The flop is 9♥3♠2♣, dry. You bet 12.5 into about 23; middle position and the big blind call. On a dry board, a call is a pair, a set, or a hand with a straight draw like 5-4.', range: 'Nines, sets 9-9, 3-3 and 2-2, pairs like T-T and J-J, 5-4, and backdoor draws.' },
      { street: 'turn', text: 'The 6♣ adds a club draw and gives 5-4 a straight. You bet 37.5 into about 60.5, the middle player calls after a long think, and the big blind folds. A long think means a real hand that considered folding or raising: a nine, a set, a straight or a pair like T-T worried about kings.', range: 'Nines like A-9 and 9-8, sets, 5-4, T-T and J-J, and club draws.' },
      { street: 'river', text: 'The 9♣ pairs the board and puts three clubs out. Any nine is now trips, and every club draw filled. You act first. The hands that beat you call a bet; the ones you beat, T-T and J-J, fold.', range: 'Calls a bet: trip nines, backdoor club flushes, the 5-4 straight and sets. Folds: T-T and J-J.' },
    ],
    takeaway: 'When the river helps the hands that thought hard on the turn, check an overpair.',
  },
  'aces-small-river-bet-flush-completes': {
    why: 'Bet small: the 7♣ completed the clubs, and your A♣ means they can’t have the nut flush. They called two big bets with kings like K-Q and K-J, and with club draws. Kings call a small bet but fold to a big one, and a club flush raises whatever you bet. A small bet gets paid by the kings and loses little to the flushes.',
    streets: [
      { street: 'preflop', text: 'In a small live game you raise A♣A♥ to 5 in early position, and the button calls. A $1-$2 player calls on the button with pairs, broadways, suited hands and connectors.', range: 'The button: pairs, broadways like K-Q and K-J, suited hands with clubs, suited connectors and any ace.' },
      { street: 'flop', text: 'The flop is K♣5♦2♣, with a club draw. You bet 10 into about 11.5, and they call. A low-stakes player calls a big bet here with any king, any club draw and some pairs, and would often raise a set.', range: 'Kings like K-Q, K-J and K-T, club draws, fives, and pairs.' },
      { street: 'turn', text: 'The T♠ is a blank, though it gives K-T two pair. You bet 25 into about 31.5, and they call again. A second big call narrows them to kings and club draws: small pairs and fives give up to two big bets.', range: 'Kings like K-Q, K-J and K-T, and club draws.' },
      { street: 'river', text: 'The 7♣ completes the clubs. Your A♣ blocks the nut flush, so any flush they have is a lower one. You act first. Their kings call a small bet but fold to a big one, afraid of the flush; a club flush raises whatever you bet.', range: 'Calls small, folds to big: K-Q and K-J. Raises: a club flush.' },
    ],
    takeaway: 'When the flush comes and their range is kings and draws, bet small: the kings pay, and the flushes raise whatever you bet.',
  },
};
