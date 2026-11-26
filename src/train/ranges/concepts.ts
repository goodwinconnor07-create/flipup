// The theory behind each hand's concept: what the idea is and how to use it, shown in the breakdown under "The
// concept". Every concept a hand names (`Scenario.concept`) has an entry here; ranges.test.ts checks it. Plain words,
// no source named, nothing about one particular hand.

export const CONCEPTS: Record<string, string> = {
  'Bluff catching':
    'A bluff catcher is a hand that beats every bluff and loses to every value bet. Its strength doesn’t matter, only whether the bettor has enough bluffs. Compare the pot odds with how many of their possible hands are bluffs: call when the bluffs are common enough, fold when the line is almost all value.',
  'Value betting':
    'You bet for value when worse hands will call often enough. Ask which hands call that you beat and which call that beat you. If the first list is longer, bet. Checking a strong hand gives up the chips the worse hands would have paid.',
  'Player types':
    'Ranges are built from the player, not only from the cards. Tight players bet strong hands and rarely bluff; loose players call too much and bluff too often. Many live and low-stakes players are passive, so a big raise from them is usually real. Adjust to the person you’re playing.',
  'Value bet sizing':
    'Choose the size the worse hands can still pay. Against a range of strong hands and draws, bet big. Against a capped range of weak pairs, bet small so they keep calling. The best size wins the most from the hands you beat, not the most when you’re called.',
  'Folding strong hands':
    'A hand is only strong compared with what your opponent can have. When the action and the board say they hold mostly hands that beat you, even a big pair or a set can be a fold. Read the range, not your own cards.',
  'Hand reading':
    'Hand reading narrows a range one street at a time. Start with what they did before the flop and from where, then remove the hands that would have played differently on each street. What’s left, and how often each kind of hand bets, tells you what to do.',
  Bluffing:
    'A bluff works when they fold often enough to pay for the times they call. Bluff when your story is believable, when their range is weak or capped, and with hands that can’t win at a showdown. A bluff needs to fold out better hands. Betting a weak hand that only gets called by better is not a bluff.',
  'Folding to strength':
    'Some lines are almost never bluffs: a passive player raising, a check-raise on the turn or river, or several players putting money in. When the action shows strength and you only beat the bluffs that rarely show up, fold, even with a hand that looks good.',
  'Polarised ranges':
    'A polarised range is strong hands and bluffs with nothing in between, the kind that bets big or overbets. Against it, your hand’s exact strength matters less than whether it beats the bluffs. Medium hands become bluff catchers, so count the bluffs.',
  'Thin value':
    'A thin value bet is a bet with a hand that’s only a little ahead of what calls, such as second pair or a weak top pair. It works against players who call with worse and rarely raise as a bluff. Keep the size small enough for worse hands to call.',
  'Pot odds':
    'Pot odds are the price of a call: what you put in divided by the pot after your call. Facing a pot-size bet you need to win a third of the time; facing half pot, a quarter. Compare that price with how often your hand is best against everything they could have.',
  'Calling, not raising':
    'Raising only makes sense when worse hands call it or better hands fold to it. When your raise would fold out every bluff and only get called by better hands, call instead. That keeps their bluffs in and keeps the pot small when you’re behind.',
  Blockers:
    'Holding a card removes the hands that need it from their range. A blocker to their best hands makes a call better, and a blocker to their bluffs makes it worse. When you bluff, block the hands that would call you and leave the hands that fold.',
  'Betting only gets called by better':
    'Before you bet, list who calls. If every hand that calls beats you and every hand you beat folds, the bet loses chips whatever happens. Check and take the free showdown, or give up the pot cheaply.',
  'Value raising':
    'Raise for value when enough worse hands will put more chips in. Hands like top pair with a good kicker, overpairs and strong draws often call a raise. If only better hands continue, calling is better.',
  'Overbet bluffs':
    'An overbet puts the most pressure on a capped range: one that turned down the chance to bet or raise and so rarely has the nuts. Pick bluffs that block their strongest calls and have no showdown value. Make sure your own line could hold the nuts, or the story falls apart.',
  'Calling an all-in':
    'Facing an all-in, there are no more decisions. Count your chance of winning against everything they shove with and compare it with the price. Every chip you call with is a chip you’ll lose or win now, so the math decides.',
  'Sizing value bets':
    'Bet the size the worse hands will call. On dry boards against capped ranges that means smaller bets. On wet boards, or against players who never fold a pair, bigger bets earn more. Think about who calls, not how strong you are.',
  'Raising for value':
    'A raise for value asks worse hands to pay more. It works when their range has many medium hands that won’t fold, and it builds the pot when you’re ahead. Before raising, check that the worse hands will actually call it.',
  'Folding a big hand':
    'Big hands are hard to fold, but strong lines from tight players, multiway pots and scary boards often mean you’re beat. If almost nothing that bets or calls this way is worse than you, folding keeps the chips you would have lost.',
  'Disciplined folds':
    'Good players fold more often when the price is high and the action shows strength. Don’t call because you’re curious or because you’ve already put chips in: the chips already in the pot don’t change whether this call is good.',
  'Reading bet sizes':
    'Bet sizes carry information. Small bets often mean a wide range of medium hands; big bets and overbets mean strong hands or bluffs. Many players bet big with their strongest hands and small with marginal ones, so the size can narrow their range.',
  'Pot control':
    'With a medium-strength hand, keep the pot small. Checking a street keeps their bluffs in, avoids a raise you can’t call, and gets you to a cheap showdown. Save big pots for hands that can win them.',
  'Choosing your bluffs':
    'The best bluffs have no showdown value and block the hands that would call. Hands that might win by checking are better kept as checks. Pick the hands that lose every showdown and make the strong calls less likely.',
  'When not to bet':
    'Checking is right when betting folds out the hands you beat and gets called by the ones that beat you. It also protects your checking range. Not every good hand needs to bet.',
  'Value betting multiway':
    'With more players in the pot, someone is more likely to have a strong hand, so it takes a stronger hand to bet for value. But more players also means more worse hands that call. Strong made hands bet; medium hands usually check.',
  'Showdown value':
    'A hand with showdown value can win without betting. Turning it into a bluff throws that away; betting it for value only works if worse hands call. Often the best play is to check and see the showdown.',
  'Short-stack shoves':
    'With a short stack there’s little room to play after the flop, so shoving is often best. The shove wins the pot when they fold and gets all the money in while your hand still has a good chance when they call.',
  'Sets against draws':
    'A set is ahead of almost every draw but can lose when the draws hit. On wet boards, bet big enough that draws pay a wrong price to continue, and get the chips in while you’re ahead.',
  'Reading a transparent range':
    'Some players play so straightforwardly that their actions spell out their hands. When a predictable player suddenly shows strength, believe it. When they show weakness, take the pot.',
  'Raise-folding for value':
    'Sometimes you raise for value expecting worse hands to call, and plan to fold if they raise again. Raising builds the pot when you’re ahead. Folding to a re-raise is fine when that re-raise is almost always better.',
  'Pot odds against a check-raise':
    'A check-raise is usually a strong range with some draws. Compare the price of calling with how often you beat it, and count how many of their hands are draws you beat right now. Strong one-pair hands often have to call or fold, not raise.',
  'Polarising with an overbet':
    'An overbet says you have the nuts or nothing. Use it when your range holds more of the strongest hands than theirs does: they can’t call much, and the size makes your best hands pay the most.',
  'Polarised check-raises':
    'A check-raise, especially on the turn or river, is usually very strong or a bluff. Medium hands rarely check-raise. Treat your hand as a bluff catcher and count how many bluffs are realistic.',
  'Passive lines that shove':
    'A player who checks and calls for two streets and then shoves is rarely bluffing. Passive players save big bets for big hands. When a quiet line turns aggressive, the range is mostly value.',
  'Multiway pots':
    'In a multiway pot every extra player makes it more likely that someone has a strong hand. Bluffs work less often, ranges are stronger, and one pair is worth less. Play your strong hands for value and give up more often with the rest.',
  'Multiway draws':
    'Draws gain value in multiway pots because more players pay you off when you hit. But you need the right price, and the nuts matters more than ever: drawing to a weak flush or straight can cost a lot.',
  'Multiway all-ins':
    'When several players are all in, at least one of them usually has a strong hand. Your hand has to beat all of them, so it needs to be much stronger than in a heads-up all-in.',
  'Minimum defence':
    'Minimum defence frequency is how often you must continue so a bluff with any two cards doesn’t profit. Against a pot-size bet you need to keep about half your range. It’s a guide against strong players; against players who rarely bluff, you can fold more.',
  'Folding the bottom of your range':
    'Every range has a weakest part. When you reach the river with the worst of your possible hands and face a big bet, those are the hands that fold. Fold the bottom and call with the hands that beat at least some of their bluffs.',
  'Counting the hands that beat you':
    'Before calling, count. List each kind of hand they could value-bet and each bluff, and think about how many ways each can be dealt. A pair can be dealt 6 ways, an unpaired hand 16 (4 of them suited). Real counts beat guesses.',
  'Counting combos':
    'Combos are the ways a hand can be dealt. A pocket pair can be dealt 6 ways, an unpaired hand 16, of which 4 are suited. Cards on the board and in your hand remove some. Counting value against bluffs turns a feeling into a decision.',
  'Calling off':
    'Once most of your stack is in, small remaining bets are easy calls. Look at the whole hand: if the pot odds are good enough against their range, call. If you weren’t prepared to call off, the time to fold was earlier.',
  'Calling a shove with equity':
    'Even when you’re behind, a draw can be a profitable call against a shove if the pot offers a good enough price. Count your outs, turn them into a chance to win, and compare that with the price.',
  'Blockers and bluff catching':
    'When you bluff catch, the best hands block their value and leave their bluffs alone. Holding a card from their strongest hands makes calling better; holding the cards their bluffs need makes it worse.',
  'Bet sizing tells':
    'Many players bet big with strong hands and small with weak ones, or the other way round. Watch the size: a sudden change in sizing often says more than the bet itself.',
  '4-bet pots':
    'In a 4-bet pot ranges are very narrow, mostly big pairs and A-K, and the stacks are short compared with the pot. One pair is often strong enough to get all in, and boards that miss the big cards help the hand that has an overpair.',
  '3-bet pots':
    'In a 3-bet pot both ranges are strong and the pot is big, so less is left to bet. Top pair and overpairs go further, and boards with high cards favour the player who 3-bet.',
};
