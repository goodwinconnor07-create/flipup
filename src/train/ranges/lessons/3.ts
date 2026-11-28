import type { Lesson } from '../model';

export const L3: Record<string, Lesson> = {
  'top-two-four-straight': {
    why: 'Check: a bet only gets called by hands that beat you. Any jack has broadway, A-K and sets are ahead, and the weaker two pairs you’d want paid by will fold. Nothing better folds either, so a bet has no bluff value. Check to a cheap showdown, and if a live player then shoves, believe them.',
    streets: [
      { street: 'preflop', text: 'You open A♠Q♦ under the gun and the hijack calls. Cold-calling an early raise with six players behind, a live player 3-bets only the very best, which leaves plenty of broadways and jacks in their range.', range: 'Pocket pairs, suited aces, broadways like K-J, Q-J and J-T, suited connectors.' },
      { street: 'flop', text: 'You flop top two pair on A♣Q♠T♦, where every jack has a straight draw and K-J already has a straight. You bet 6 and they call; the small pairs and connectors fold.', range: 'Aces, queens, two pairs like A-T, Q-T and K-T, sets, K-J, and jacks drawing.' },
      { street: 'turn', text: 'The 8♣ adds a club draw and gives J-9 a straight. You bet 14 into 21.5 and they call again: on a board this wet, a second call is a hand happy to keep going.', range: 'K-J and J-9, jacks drawing, sets, A-K, two pairs, club draws.' },
      { street: 'river', text: 'The K♠ puts four to a straight out: any jack makes broadway and A-K makes a better two pair. You act first. Every jack, A-K and the sets call or raise a bet; the weaker two pairs fold.', range: 'Ahead of you: any jack, A-K and sets. Behind you: A-T, Q-T, K-T, A-8, A-9 and Q-9, which fold to a bet.' },
    ],
    takeaway: 'Bet only when worse hands will call: on a four-straight board, take two pair to a cheap showdown.',
  },
  'second-nuts-capped-range': {
    why: 'Bet about ¾ pot: their range is capped at two pair, so size for the hands that can pay. A player who led twice and then checks the river rarely holds a straight; that hand would keep betting or check-raise. Two pair and the best top pairs call a solid bet but fold to an overbet. A third of the pot also works, a little less well.',
    streets: [
      { street: 'preflop', text: 'You open A♦Q♠ from the lojack and the big blind defends. With an ante in, the big blind gets a great price and defends wide, with plenty of connected hands.', range: 'Very wide: suited aces and kings, broadways, pairs, lots of connectors.' },
      { street: 'flop', text: 'On J♥T♣8♣ the big blind leads into you. A lead on a board this connected is pairs, two pairs and draws. You call with two overcards and a double gutshot: a nine or a king makes your straight.', range: 'Jacks, tens and eights, two pairs like J-T, T-8 and J-8, straight draws, club draws.' },
      { street: 'turn', text: 'The 4♦ is a blank and they lead ⅔ pot again. You’re ahead of their draws, and a raise wouldn’t represent much, so you call.', range: 'Two pairs, top pairs like A-J and K-J, tens and eights, club and straight draws.' },
      { street: 'river', text: 'The 9♦ gives you the second-best straight; only K-Q beats it. Now they check. Lead, lead, check is capped: a straight would bet again or check-raise, so this is one or two pair, with the draws missed.', range: 'Two pairs (J-T, J-9, T-9, J-8, T-8), top pairs like A-J and K-J, tens and eights, missed club draws, rarely a straight.' },
    ],
    takeaway: 'Against a capped range, choose a value bet their best one-pair and two-pair hands can still call.',
  },
  'top-pair-river-shove': {
    why: 'Shove: worse tens, eights and pairs with a diamond will call, and your stack is about the size of the pot. Checking often wins the pot but wins less, because those hands won’t bet. With so little behind, a smaller bet just leaves chips on the table. A-T and the odd slow-played flush or set beat you, but the worse hands that call are far more common.',
    streets: [
      { street: 'preflop', text: 'You open K♣T♣ from the lojack with about 28 big blinds; the cutoff and the big blind call. Their best hands would usually 3-bet.', range: 'Pairs, suited broadways, suited aces and connectors.' },
      { street: 'flop', text: 'T♥8♦5♦ checks round three ways. You check top pair to keep a multiway pot small. Nobody showed strength, so nobody is committed yet.', range: 'Wide: tens, eights and fives, diamond and straight draws, overcards, a few slow sets.' },
      { street: 'turn', text: 'The 3♦ completes the diamonds. You bet half the pot, the cutoff calls and the big blind folds. Most tournament players raise a flush or a set on a board this wet, so a plain call is mostly one pair, often with a diamond.', range: 'One pair: A-T, Q-T, J-T, T-9, eights, smaller pairs, many with a diamond; rarely a flush or set.' },
      { street: 'river', text: 'The 4♥ changes nothing. You act first with about a pot behind. Their range is mostly worse pairs, and those won’t bet if you check, so there’s nothing to catch.', range: 'Ahead: A-T and the odd flush or set. Behind and calling: Q-T, J-T, T-9, 9-8, 8-7, smaller pairs. Big cards fold.' },
    ],
    takeaway: 'When your stack is about the size of the pot and worse hands will call, shove.',
  },
  'trips-sizing-river': {
    why: 'Bet about ¾ pot: size it for the hands that pay. Pocket pairs call a medium bet and fold to an overbet, the missed draws fold to anything, and their better kings call any size, so a huge bet gains nothing. Against mostly missed draws and medium hands, a medium bet earns the most.',
    streets: [
      { street: 'preflop', text: 'You open K♣J♣ from second position and both blinds call. The small blind’s flat out of position leaves out its best hands, which would 3-bet.', range: 'Pairs, suited aces, suited broadways and suited connectors.' },
      { street: 'flop', text: 'On 5♣4♣2♦ you bet small into two players with a king-high flush draw, and both call. Small bets work multiway: more worse hands call them.', range: 'Pairs, A-5 and A-4, club draws, straight draws like 8-7, 6-3 and A-3, some sets.' },
      { street: 'turn', text: 'The K♦ gives you top pair. You bet small again; the small blind calls and the big blind folds. Their check-calls are medium pairs wanting a showdown, and draws.', range: 'Pocket pairs, A-5 and A-4, kings like A-K, K-Q and K-T, club and straight draws, slow sets.' },
      { street: 'river', text: 'The K♥ gives you trips and they check. Every draw missed. Their range now splits three ways: pairs that call a medium bet, better kings that call anything, and missed draws that fold.', range: 'Medium bet only: pocket pairs. Small only: A-5, A-4. Beat you: A-K, K-Q. Calls: K-T. Folds: missed draws.' },
    ],
    takeaway: 'Size for the hands that pay: when their callers are medium pairs, a medium bet wins more than an overbet.',
  },
  'trips-check-fold': {
    why: 'Check: a bet gets called by every hand that beats you and folded by the pairs you beat. The A♥ completed broadway for K-J and filled up A-Q, exactly the hands that kept calling. A tight player won’t bluff into a hand that check-raised the flop, so a bet from them is real: check, and fold to a big one.',
    streets: [
      { street: 'preflop', text: 'A tight button raises and you defend Q♠J♣ from the big blind. A tight button’s range is broadways, pairs and strong aces, exactly the hands that hit high boards.', range: 'Broadways like K-Q, K-J, Q-T and J-T, pairs, strong aces.' },
      { street: 'flop', text: 'You flop trips on Q♥Q♣T♦ and check-raise the c-bet; they call. A tight player doesn’t call a check-raise here with nothing: they have a queen, a ten, or a strong draw.', range: 'Queens like K-Q, Q-T and Q-9, tens like T-T, A-T and J-T, A-Q, and K-J and J-9 drawing.' },
      { street: 'turn', text: 'The 8♠ gives J-9 a straight. You bet again and they call. Nothing weak calls a check-raise and then another bet.', range: 'J-9, queens and full houses, tens, and K-J drawing.' },
      { street: 'river', text: 'The A♥ completes broadway for K-J and fills A-Q. You act first. The worse hands, A-K, A-J and kings, won’t put in more, and nothing better will fold.', range: 'Ahead: K-J, J-9, A-Q, Q-T, T-T, Q-8 and K-Q. Split: Q-J. Behind: Q-9, A-K, A-J, kings and A-T, which fold except Q-9.' },
    ],
    takeaway: 'Ask who calls: if only better hands do, check, and believe a tight player who then bets.',
  },
  'nines-full-check-raise': {
    why: 'Fold: almost everything that check-raises all in here beats you. Every king is quads, A-A down to T-T are bigger full houses, and 9-9 splits; you beat only 2-2 and a rare bluff. You need 29%, and you’re far short. The board made better hands easy to hold, and this is the strongest line there is.',
    streets: [
      { street: 'preflop', text: 'The hijack opens and you call in the cutoff with A♣9♣. Their range includes all the big pairs.', range: 'Pairs including A-A to T-T, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'K♣K♦2♠ checks through. On a dry paired board a raiser often checks kings and big pairs to trap or keep the pot small, so the check isn’t weakness.', range: 'Big pairs and kings taking it slow, plus the hands that missed.' },
      { street: 'turn', text: 'The 9♥ gives you two pair, and the hijack leads ⅔ pot; you call. Leading after checking the flop is often a hand that wants value now.', range: 'Kings, big pairs, 9-9 and some bluffs.' },
      { street: 'river', text: 'The K♥ gives you kings full. They check, you bet, and they check-raise all in. Any king is now quads and any pair above nines a bigger full house. A bluff would just bet or give up, not check-raise all in.', range: 'Value: any king, A-A, Q-Q, J-J and T-T. Split: 9-9. Smaller: 2-2, sometimes. Bluffs: rare.' },
    ],
    takeaway: 'A river check-raise all in is value almost every time; when the board makes better hands easy, even a full house can fold.',
  },
  'ak-hearts-river-raise': {
    why: 'Fold: your two hearts are exactly the cards their bluffs need. They raise full houses, quads and K-Q for value and missed heart draws as bluffs, and holding the A♥ and K♥ removes the best of those draws. You block their bluffs and none of their value. You need 33% and you’re short; the same A-K without hearts would call.',
    streets: [
      { street: 'preflop', text: 'You open A♥K♥ from second position; the cutoff and the big blind call.', range: 'Pairs, suited broadways, suited aces, A-J and better, K-Q.' },
      { street: 'flop', text: 'You flop top pair, top kicker on A♠J♥T♦, where K-Q has a straight. Your small c-bet folds the big blind; the cutoff calls.', range: 'Aces, K-Q, sets, two pairs like A-J and J-T, straight draws.' },
      { street: 'turn', text: 'The 5♥ adds a heart draw. You bet small again and they call. Heart draws join their range, but you hold the A♥ and K♥, the two best cards for one.', range: 'Aces, K-Q, sets, two pairs, and heart draws without the ace or king.' },
      { street: 'river', text: 'The J♠ makes T-T, J-T and A-J full houses. You bet small and they raise big. A big raise over a small river bet is very strong or a bluff, and a strong regular’s natural bluffs here are missed heart draws.', range: 'Value: T-T, J-T and A-J, J-J, K-Q. Bluffs: missed heart draws, most of which your A♥K♥ blocks.' },
    ],
    takeaway: 'Check which bluffs your cards remove: holding the cards their bluffs need makes a call worse.',
  },
  'aq-overbet-shove': {
    why: 'Call: against a shove for more than the pot you have to keep about 45% of your range, and A-Q is near the top of it. Their value is Q-9, and your queen removes some of it; their bluffs are every missed diamond draw plus J-T, K-J and K-T, none of which you block. You need 36%, and you’re well above that.',
    streets: [
      { street: 'preflop', text: 'You open A♥Q♠ from the small blind and the big blind defends. Blind against blind, both ranges are very wide.', range: 'Very wide: suited hands, connectors, broadways and pairs.' },
      { street: 'flop', text: 'On 9♠Q♦4♦ you c-bet and the aggressive big blind check-raises. Being out of position all hand makes it easy for them to keep firing.', range: 'Q-9, sets, diamond draws, and straight draws like J-T, K-J and K-T.' },
      { street: 'turn', text: 'The 5♠ changes little. You check and they bet ¾ pot: the same value, and draws still betting.', range: 'Q-9 and sets, diamond draws, J-T, K-J and K-T.' },
      { street: 'river', text: 'The 5♥ misses every draw. You check and they shove 75 into 61. A medium hand like a queen would check, so the shove is value or a missed draw, and this river bricked a lot of draws.', range: 'Value: Q-9, fewer because of your queen. Bluffs: missed diamond draws, some J-T, K-J and K-T.' },
    ],
    takeaway: 'Against a polarised overbet, keep enough strong hands in to stop them bluffing profitably; top pair top kicker is one of them.',
  },
  'ak-four-straight-call': {
    why: 'Call: they hold the straights, but they also bet two pairs below yours, and your hand is too high in your range to fold. The ¾-pot lead prices you at 30%. With mostly straights a good player would overbet; a normal size says it’s mixed with weaker two pairs that think they’re good.',
    streets: [
      { street: 'preflop', text: 'You 3-bet A♦K♦ on the button over a hijack open and they call. A-A, K-K and most A-K would 4-bet, so their calling range is capped.', range: 'Pairs, suited broadways like K-Q, Q-J and J-T, A-Q, suited aces; few A-K.' },
      { street: 'flop', text: 'On J♣3♠Q♦ they check, you c-bet half the pot, and they call. Your ace and king remove some of their best one-pair hands.', range: 'Queens (A-Q, K-Q, Q-J), jacks (A-J, K-J, J-T), Q-T drawing, pairs like T-T.' },
      { street: 'turn', text: 'The A♣ gives you top pair, top kicker and both check, which keeps their weaker hands in and the pot small.', range: 'Queens and jacks, A-Q and A-J (now two pair), Q-T and J-T drawing to a ten.' },
      { street: 'river', text: 'The K♥ gives you aces and kings but makes broadway for any ten. They lead ¾ pot. Q-T and J-T got there, but A-Q, K-Q, A-J and K-J also have two pair now and will bet it.', range: 'Value: Q-T and J-T. Thinner: A-Q, K-Q, A-J and K-J, below your two pair.' },
    ],
    takeaway: 'When the river completes a straight, ask how often they really hold it and whether their bet size looks like the nuts.',
  },
  'aces-multiway-shove': {
    why: 'Call: you need only 18%. Calling 70 into 315.5 needs very little, and a loose player raises the turn with plenty of missed draws and weaker made hands that you beat. Sets, two pair, J-T and Q-Q are ahead, but at this price folding would be a big mistake.',
    streets: [
      { street: 'preflop', text: 'You open A♥A♣ from second position at a loose live table; middle position and the big blind call. Cold-callers here play wide.', range: 'Wide: suited hands, pairs, connectors and broadways.' },
      { street: 'flop', text: 'On 9♦8♦3♠, a very wet board, you bet and both call. With two callers, many pairs and draws continue.', range: 'Flush and straight draws, pairs like 9-x and 8-x, two pairs and sets.' },
      { street: 'turn', text: 'The 2♣ is a blank. You bet big, middle position raises and the big blind folds. A loose player raises sets and two pair but also big draws and hands like A-9 or T-T. With 70 left, the rest goes in anyway, so you call.', range: 'Sets and two pair, big draws, and weaker hands like A-9, T-T and J-J.' },
      { street: 'river', text: 'The Q♥ misses every draw except J-T. You check, and they shove 70 into 245, a huge price.', range: 'Value: sets, two pair, J-T, Q-Q. Worse: A-9, T-T, J-J, kings. Bluffs: missed flush draws, 7-6.' },
    ],
    takeaway: 'When the price is tiny, call with any hand that beats a fair part of their range; you don’t need to be sure.',
  },
};
