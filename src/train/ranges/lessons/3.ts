import type { Lesson } from '../model';

export const L3: Record<string, Lesson> = {
  'top-two-four-straight': {
    why: 'Check: a bet only gets called by hands that beat you. Any jack has broadway, and A-K and sets are ahead too, while the weaker two pairs and one-pair hands you’d want to pay you will fold. Nothing better folds either, so a bet has no bluff value. Checking keeps the pot small and lets you see a showdown; if a live player then shoves, believe them and fold.',
    streets: [
      { street: 'preflop', text: 'You open A♠Q♦ under the gun at a live table, and the hijack calls. Cold-calling an under-the-gun raise with six players behind, a live player keeps the hands that play well after the flop and 3-bets only their very best. That puts a lot of broadways and jacks in their range.', range: 'Pocket pairs, suited aces, broadways like K-J, Q-J and J-T, and suited connectors.' },
      { street: 'flop', text: 'You flop top two pair on A♣Q♠T♦, a wet broadway board where every jack has a straight draw and K-J already has a straight. You bet 6 and the hijack calls. A call here keeps aces, queens, two pairs, sets and every jack in the range; the small pairs and suited connectors fold.', range: 'Aces (A-K, A-J, A-T, A-9), queens, two pairs like A-T, Q-T and K-T, sets, K-J (a straight), and jacks with a straight draw.' },
      { street: 'turn', text: 'The 8♣ adds a club draw and gives J-9 a straight. You bet 14 into 21.5 and they call again. A second call on a board this wet is a hand that’s happy to keep going: a straight, a set, two pair, a strong ace, or a draw.', range: 'K-J and J-9 (straights), jacks drawing, sets, A-K, two pairs, and club draws.' },
      { street: 'river', text: 'The K♠ puts four to a straight on the board: now any jack makes broadway, A-K makes a better two pair, and the club draws missed. You’re first to act. Think about who calls a bet here: every jack, A-K and sets call or raise, while the weaker two pairs and A-9 or Q-9 fold.', range: 'Ahead of you: any jack, A-K and sets. Behind you: A-T, Q-T, K-T, A-8, A-9 and Q-9, which fold to a bet.' },
    ],
    takeaway: 'Bet only when worse hands will call: on a four-straight board, take two pair to a cheap showdown.',
  },
  'second-nuts-capped-range': {
    why: 'Bet about ¾ pot: their range is capped at two pair, so size for the hands that can pay. A player who led the flop and the turn and then checks the river rarely holds a straight; that hand would keep betting or check-raise. Two pair and the best top pairs call a solid bet but fold to an overbet. A third of the pot also works, just a little less profitably.',
    streets: [
      { street: 'preflop', text: 'You open A♦Q♠ from the lojack in a tournament and the big blind defends. With an ante in the pot the big blind gets a great price and defends wide, including plenty of connected hands like J-T, T-9 and 9-8.', range: 'Very wide: suited aces and kings, broadways, pairs and lots of connectors.' },
      { street: 'flop', text: 'The flop is J♥T♣8♣, about as connected as a board gets, and the big blind leads into you. A lead from out of position here is pairs, two pairs and lots of draws. You have two overcards and a double-gutshot (a nine or a king gives you a straight), so calling is clearly right.', range: 'Jacks, tens and eights, two pairs like J-T, T-8 and J-8, straight draws, and club draws.' },
      { street: 'turn', text: 'The 4♦ is a blank. The big blind leads again, about two-thirds of the pot. You’re ahead of their draws like A-9 and the flush draws, and a raise wouldn’t represent much, so calling is the only good option.', range: 'Two pairs, top pairs like A-J and K-J, tens and eights, club draws and straight draws.' },
      { street: 'river', text: 'The 9♦ gives you Q-J-T-9-8, the second-best straight; only K-Q beats you. The big blind checks. Lead, lead, check is a capped line: a straight would bet again or check-raise, so the check says one pair or two pair, with the draws now missed.', range: 'Two pairs (J-T, J-9, T-9, J-8, T-8), top pairs like A-J, K-J and J-6, tens and eights, missed club draws, and rarely a straight trapping.' },
    ],
    takeaway: 'Against a capped range, choose a value bet their best one-pair and two-pair hands can still call.',
  },
  'top-pair-river-shove': {
    why: 'Shove: worse tens, eights and pairs with a diamond will call, and your stack is only about the size of the pot. Checking would often win the pot, but it wins less: those hands won’t bet themselves. With so little behind, a smaller bet just leaves chips on the table. A-T and the odd slow-played flush or set beat you, but the hands you beat that call are far more common.',
    streets: [
      { street: 'preflop', text: 'You open K♣T♣ from the lojack in a tournament with about 28 big blinds. The cutoff and the big blind call. Both have ranges of pairs, suited broadways, suited aces and connectors; their best hands would usually 3-bet.', range: 'Pairs, suited broadways, suited aces and connectors.' },
      { street: 'flop', text: 'The flop is T♥8♦5♦, wet, and it checks around three ways. You check top pair to keep the pot small in a multiway pot. Nobody showed strength, so most strong hands are still possible but nobody’s committed.', range: 'Wide: tens, eights and fives, diamond draws, straight draws and overcards, with some sets and two pair taking it slow.' },
      { street: 'turn', text: 'The 3♦ completes the diamonds. The big blind checks, you bet about half the pot, the cutoff calls and the big blind folds. Most tournament players raise a flush or a set on a board this wet, so a plain call is mostly one pair, often with a diamond for the flush.', range: 'One pair: A-T, Q-T, J-T, T-9, eights, smaller pairs, many with a diamond; rarely a slow-played flush or set.' },
      { street: 'river', text: 'The 4♥ changes nothing for the hands that matter. You’re first to act with about a pot left behind. The cutoff’s range is mostly worse tens, eights and smaller pairs, and there are few bluffs to catch if you check, because those hands won’t bet.', range: 'Ahead of you: A-T, and the odd flush or set. Behind you and calling: Q-T, J-T, T-9, 9-8, 8-7 and some smaller pairs. Big cards with no pair fold.' },
    ],
    takeaway: 'When your stack is about the size of the pot and worse hands will call, shove.',
  },
  'trips-sizing-river': {
    why: 'Bet about ¾ pot: betting is clearly best, but size it for the hands that pay. Pocket pairs call a medium bet and fold to an overbet, and the missed draws fold to anything. Their better kings call any size, so a huge bet gains nothing from them. When their range is mostly missed draws and medium hands, a medium bet earns the most.',
    streets: [
      { street: 'preflop', text: 'You open K♣J♣ from second position in a tournament, and both blinds call. The small blind flatting out of position has pairs, suited aces, suited broadways and connectors; its best hands would usually 3-bet.', range: 'Pairs, suited aces, suited broadways and suited connectors.' },
      { street: 'flop', text: 'The flop is 5♣4♣2♦, low and full of draws. With a king-high flush draw that can stand a check-raise, you bet small into two players, and both call. Small bets work in multiway pots: they get called by more worse hands.', range: 'Pairs, A-5 and A-4, club draws, straight draws like 8-7, 6-3 and A-3, and some sets.' },
      { street: 'turn', text: 'The K♦ gives you top pair to go with your flush draw. You bet small again; the small blind calls and the big blind folds. The small blind’s check-calls are medium pairs that want a showdown, and draws.', range: 'Pocket pairs, A-5 and A-4, kings like A-K, K-Q and K-T, club draws, straight draws, and slow-played sets.' },
      { street: 'river', text: 'The K♥ gives you trips, and the small blind checks. Every draw missed. Their range splits into hands that call a medium bet (pocket pairs, worse kings), hands that call anything (better kings), and missed draws that fold to any bet.', range: 'Pocket pairs call a medium bet but fold to a big one; A-5 and A-4 call only small; A-K and K-Q beat you; K-T calls; missed club and straight draws fold.' },
    ],
    takeaway: 'Size for the hands that pay: when their callers are medium pairs, a medium bet wins more than an overbet.',
  },
  'trips-check-fold': {
    why: 'Check: a bet gets called by every hand that beats you and folded by the pairs you beat. The A♥ completed broadway for K-J and filled up A-Q, exactly the hands that kept calling. A tight player also won’t bluff into a hand that check-raised the flop, so a bet from them is real. Check, and fold to a big bet.',
    streets: [
      { street: 'preflop', text: 'A tight button who’s been opening only strong hands raises, and you defend the big blind with Q♠J♣. A tight button’s range is broadways, pairs and strong aces, which is exactly the kind of range that connects with high boards.', range: 'Broadways like K-Q, K-J, Q-T and J-T, pairs, and strong aces.' },
      { street: 'flop', text: 'You flop trips on Q♥Q♣T♦ and check-raise the button’s c-bet; they call. A tight player doesn’t call a check-raise on a paired broadway board with nothing: they have a queen, a ten, or a strong draw like K-J or J-9.', range: 'Queens like K-Q, Q-T and Q-9, tens like T-T, A-T and J-T, A-Q, and straight draws K-J and J-9.' },
      { street: 'turn', text: 'The 8♠ gives J-9 a straight. You bet again and they call. The range is still queens, full houses, tens and broadway draws; nothing weak calls a check-raise and then another bet.', range: 'J-9 (a straight), queens and full houses, tens, and K-J drawing to broadway.' },
      { street: 'river', text: 'The A♥ completes broadway for K-J and gives A-Q a full house. You’re first to act. Hands below you, like A-K, A-J and kings, won’t put in more, and nothing better will fold.', range: 'Ahead of you: K-J and J-9, A-Q, Q-T, T-T and Q-8, aces full, and K-Q. Q-J splits. Behind you: Q-9, A-K, A-J, kings, jacks and A-T, which fold to a bet except Q-9.' },
    ],
    takeaway: 'Ask who calls: if only better hands do, check, and believe a tight player who then bets.',
  },
  'nines-full-check-raise': {
    why: 'Fold: almost everything that check-raises all in here beats you. Every king has quads, and A-A, Q-Q, J-J and T-T are bigger full houses; 9-9 splits. You beat only 2-2 and a rare bluff. You need 29%, and you’re far short. Folding a full house feels wrong, but the board made better hands easy to hold, and the line is the strongest there is.',
    streets: [
      { street: 'preflop', text: 'The hijack opens in a tournament and you call in the cutoff with A♣9♣. Their range is pairs, suited aces and broadways, including all the big pairs.', range: 'Pairs (including A-A to T-T), suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'The flop is K♣K♦2♠, paired and dry, and it checks through. On this board a preflop raiser often checks kings and big pairs, to trap or keep the pot small, so their check isn’t weakness.', range: 'Big pairs and kings taking it slow, plus the hands that missed.' },
      { street: 'turn', text: 'The 9♥ gives you two pair, and the hijack leads two-thirds of the pot. You call. Leading the turn after checking the flop is often a hand that wants value now.', range: 'Kings, big pairs, 9-9 and some bluffs.' },
      { street: 'river', text: 'The K♥ gives you kings full of nines. They check, you bet, and they check-raise all in. Now any king is quads and any pair above nines is a bigger full house. A river check-raise all in is almost never a bluff: a bluff would just bet or give up.', range: 'Value: any king (quads), A-A, Q-Q, J-J and T-T (bigger full houses), 9-9 (a split), 2-2 (smaller, sometimes). Bluffs: rare.' },
    ],
    takeaway: 'A river check-raise all in is value almost every time; when the board makes better hands easy, even a full house can fold.',
  },
  'ak-hearts-river-raise': {
    why: 'Fold: your two hearts are exactly the cards their bluffs need. The raise is full houses, quads and K-Q’s straight for value, and missed heart draws for bluffs. Holding the A♥ and K♥ removes the best of those draws, so you block their bluffs and none of their value. You need 33% and you’re short; the same A-K without hearts would be a call.',
    streets: [
      { street: 'preflop', text: 'You open A♥K♥ from second position in a tournament; the cutoff and the big blind call. Their ranges are pairs, suited broadways, suited aces, A-J and better, and K-Q.', range: 'Pairs, suited broadways, suited aces, A-J and better, and K-Q.' },
      { street: 'flop', text: 'You flop top pair, top kicker on A♠J♥T♦, a broadway board with a gutshot to K-Q. In a three-way pot a small c-bet works; the big blind folds and the cutoff calls with aces, K-Q, sets, two pair and draws.', range: 'Aces, K-Q (a straight), sets, two pairs like A-J and J-T, and straight draws.' },
      { street: 'turn', text: 'The 5♥ adds a heart draw. You bet small again, and the cutoff calls. Heart draws join the range, but notice: you hold the A♥ and K♥, the two best cards for a heart draw.', range: 'Aces, K-Q, sets, two pairs, and heart draws without the ace or king.' },
      { street: 'river', text: 'The J♠ pairs the board, so T-T, J-T and A-J are now full houses. You bet small and the cutoff raises big. A big raise over a small river bet is polarised: very strong or a bluff. A strong regular knows they need bluffs here, and missed heart draws are the natural choice.', range: 'Value: T-T, J-T and A-J (full houses), J-J (quads), K-Q (a straight). Bluffs: missed heart draws, and your A♥K♥ blocks most of them.' },
    ],
    takeaway: 'Check which bluffs your cards remove: holding the cards their bluffs need makes a call worse.',
  },
  'aq-overbet-shove': {
    why: 'Call: against a shove for more than the pot you have to keep about 45% of your range, and A-Q is near the top of it. Their value is Q-9, and your queen blocks some of it. Their bluffs are every missed diamond draw plus J-T, K-J and K-T, and you block none of those. You need 36%, and you’re well above that.',
    streets: [
      { street: 'preflop', text: 'You open A♥Q♠ from the small blind and the big blind defends. Blind against blind, both ranges are very wide: the big blind defends suited hands, connectors and broadways.', range: 'Very wide: suited hands, connectors, broadways and pairs.' },
      { street: 'flop', text: 'The flop is 9♠Q♦4♦, and you c-bet; the aggressive big blind check-raises. You’re out of position all hand, which makes it easier for an aggressive player to keep firing. Their check-raise is Q-9 for value, plus diamond draws and straight draws like J-T and K-J.', range: 'Q-9 (two pair), sets, diamond draws, and straight draws like J-T, K-J and K-T.' },
      { street: 'turn', text: 'The 5♠ changes little. You check and they bet again, about ¾ pot. Same range: value, and draws still betting.', range: 'Q-9 and sets, diamond draws, and J-T, K-J and K-T.' },
      { street: 'river', text: 'The 5♥ pairs the board and misses every draw. You check, and they shove 75 into 61, more than the pot. A shove this big is polarised: medium hands like a queen would check. It’s value or a missed draw, and on a river that bricks everything, an aggressive regular has plenty of the second.', range: 'Value: Q-9 (fewer, because of your queen). Bluffs: missed diamond draws, and some J-T, K-J and K-T.' },
    ],
    takeaway: 'Against a polarised overbet, keep enough strong hands in to stop them bluffing profitably; top pair top kicker is one of them.',
  },
  'ak-four-straight-call': {
    why: 'Call: they hold the straights, but they also bet two pair below yours, and your hand is too high in your range to fold. A ¾-pot lead gives you a price of 30%. If their range were mostly straights, a good player would overbet to make you pay; a normal size says it’s mixed with weaker two pairs that think they’re good.',
    streets: [
      { street: 'preflop', text: 'The hijack opens and you 3-bet A♦K♦ on the button; they call. Calling a 3-bet out of position, they hold pairs, suited broadways, A-Q and suited aces; A-A, K-K and most A-K would 4-bet, so their range is capped.', range: 'Pairs, suited broadways like K-Q, Q-J and J-T, A-Q and suited aces; few A-K.' },
      { street: 'flop', text: 'The flop is J♣3♠Q♦, hitting broadways. They check, you c-bet about half the pot, and they call with queens, jacks and straight draws. Your ace and king remove some of their best one-pair hands.', range: 'Queens (A-Q, K-Q, Q-J), jacks (A-J, K-J, J-T), Q-T with a draw, and pairs like T-T.' },
      { street: 'turn', text: 'The A♣ gives you top pair, top kicker, and both check. Checking keeps their weaker hands in and stops you building a big pot with one pair.', range: 'Queens and jacks, aces like A-Q and A-J (now two pair), Q-T and J-T drawing to a ten.' },
      { street: 'river', text: 'The K♥ gives you two pair, aces and kings, but puts four to a straight on board: any ten has broadway. They lead about ¾ pot. Q-T and J-T got there, but A-Q, K-Q, A-J and K-J also have two pair now and will bet it.', range: 'Value: Q-T and J-T (straights). Thinner: A-Q, K-Q, A-J and K-J (two pairs below yours).' },
    ],
    takeaway: 'When the river completes a straight, ask how often they really hold it and whether their bet size looks like the nuts.',
  },
  'aces-multiway-shove': {
    why: 'Call: you need only 18%. Calling 70 into a pot of 315.5 needs very little, and their range still holds plenty of missed draws and weaker made hands that you beat. Sets, two pair, J-T and Q-Q are ahead, but a loose player raises the turn with much more than that. At this price, folding would be a big mistake.',
    streets: [
      { street: 'preflop', text: 'You open A♥A♣ from second position at a loose live table; middle position and the big blind call. At a loose table, cold-callers have wide ranges full of suited hands, pairs and connectors.', range: 'Wide: suited hands, pairs, connectors and broadways.' },
      { street: 'flop', text: 'The flop is 9♦8♦3♠, wet: flush draws, open-enders and gutshots. You bet and both call. With two players calling, many draws and pairs continue.', range: 'Draws (flush, straight), pairs like 9-x and 8-x, two pairs and sets.' },
      { street: 'turn', text: 'The 2♣ is a blank. You bet big and middle position raises; the big blind folds. A loose player raises sets and two pair, but also big draws and weaker hands like A-9 or T-T. You call: with only 70 left behind, the rest goes in on the river anyway.', range: 'Sets and two pair, big draws, and weaker made hands like A-9, T-T and J-J.' },
      { street: 'river', text: 'The Q♥ misses every draw except J-T, which makes a straight. You check, and they shove 70 into 245. That small shove offers a huge price. Value: sets, two pair, J-T and Q-Q. Bluffs: missed flush and straight draws.', range: 'Value: sets, two pair, J-T, Q-Q. Worse: A-9, T-T, J-J and kings. Bluffs: missed flush draws and 7-6.' },
    ],
    takeaway: 'When the price is tiny, call with any hand that beats a fair part of their range; you don’t need to be sure.',
  },
};
