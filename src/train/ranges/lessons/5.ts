import type { Lesson } from '../model';

export const L5: Record<string, Lesson> = {
  'nut-flush-river-size-wsop': {
    why: 'Bet about ⅔ pot: you have the nuts, and checking only hopes for a bluff that rarely comes. Choose a size that could be a bluff from a loose 3-bettor. K-Q and Q-Q call it, and so does a suspicious A-K. A smaller bet is fine too. An overbet only gets called by the same hands that call ⅔, so it gains nothing.',
    read: [
      { about: 'preflop', text: 'You 3-bet and a strong button cold-called: 9-9 to Q-Q, A-Q, K-Q suited and some A-K. Cold-callers rarely hold the very top of the range, which would 4-bet.' },
      { about: 'players', text: 'Three players saw the flop; the opener folded to your bet. Against a single strong player, your bet sizes tell them a lot, so pick sizes your bluffs could use too.' },
      { about: 'board', text: 'K♣4♠2♦ favours you: you hold more A-K, K-K and A-A than a cold-caller. The 7♦ adds a diamond draw, and the Q♦ gives you the nut flush.' },
      { about: 'sizing', text: 'The button called twice without raising: kings, queens and pairs, not a big hand that wanted to build the pot.' },
      { about: 'opponent', text: 'A solid, aggressive pro who sees you as a loose 3-bettor. Players who think you bluff often call more when you bet.' },
      { about: 'range', text: 'K-Q and queens call a bet. A-K calls a normal bet but folds to an overbet. K-J and A-Q call only small. Smaller pairs fold.' },
    ],
    takeaway: 'With the nuts against one-pair and two-pair hands, choose a size they can call, not the biggest one.',
  },
  'two-pair-river-size-wsop': {
    why: 'Bet about ⅔ pot: that’s the most a king will surely call. Their missed draws fold to any bet, so your value comes from A-K, K-Q and K-J, and a recreational player calls a normal bet with those because the draws missed. A pot-size bet might fold some of them. Getting the call matters more than a slightly bigger bet that gets folded.',
    read: [
      { about: 'preflop', text: 'Two recreational players called your hijack open on a passive table. Their ranges are wide: kings, pairs, suited hands and connectors.' },
      { about: 'opponent', text: 'Recreational players call with top pair because they think the draws missed, but a very big bet makes them nervous. Bet what they’ll pay.' },
      { about: 'board', text: 'K♠6♦5♠ gives you two pair. The T♦ adds a diamond draw, and the 3♥ misses the flush draws.' },
      { about: 'sizing', text: 'The small blind called two big bets. With draws on board, those calls are kings, pairs and draws. The check on the river means they don’t want to bet.' },
      { about: 'range', text: 'Kings (A-K, K-Q, K-J) call a normal bet; some fold to a big one. K-T and sets are ahead. Pocket pairs call only small, and the missed draws fold.' },
    ],
    takeaway: 'Ask what the most is that their calling hands will pay, and bet that much.',
  },
  'ak-high-turn-call-vs-lag': {
    why: 'Call: ace-king beats every bluff, and you can still improve with an ace, a king or a 4. This player bets big cards and heart draws far too often, so plenty of what they bet is behind you. You need 28%, and you’re well above that. Raising is for pairs and flush draws; ace-high just wants to see the river cheaply.',
    read: [
      { about: 'preflop', text: 'A strong, loose-aggressive player called your open: pairs, suited broadways and connectors. Their range is wide, with lots of big cards.' },
      { about: 'opponent', text: 'A loose-aggressive player bets whenever you show weakness. Against someone who bluffs too often, call more often with hands that beat bluffs.' },
      { about: 'position', text: 'They’re in position, and you checked to them twice. That invites bets from their whole range, not just their strong hands.' },
      { about: 'board', text: '5♥3♥2♠ is low with a heart draw and wheel draws. The 3♦ pairs the board. You have two overcards and a gutshot to a 4.' },
      { about: 'range', text: 'Ahead of you: A-3 and A-4, fives (A-5, 6-5, 5-4, 5-5) and overpairs. Behind you: big cards with no pair and heart draws.' },
    ],
    takeaway: 'Against a player who bluffs too often, call more with hands that beat bluffs and can improve.',
  },
  'bottom-set-four-bet-pot-river': {
    why: 'Call: your set beats aces and A-K, the hands that bet here, and you need about 28%. A raise would fold out A-A and A-K, and only K-K would call. In a tournament the chips you risk with a raise are worth more than the ones you’d win. Calling keeps their value hands paying you.',
    read: [
      { about: 'preflop', text: 'A tight, straightforward player cold 4-bet your 3-bet: A-A, K-K, Q-Q, A-K and a few bluffs. That’s a strong, narrow range.' },
      { about: 'opponent', text: 'A straightforward player bets their value hands and rarely bluffs. They’ll keep betting A-A and A-K, but they won’t pay a raise with them.' },
      { about: 'position', text: 'You’re out of position, so checking lets them keep betting their strong one-pair hands for you.' },
      { about: 'board', text: 'J♥6♠3♥ gives you bottom set. The K♥ improves A-K to top pair and K-K to a bigger set. The 7♠ changes little.' },
      { about: 'sizing', text: 'They checked the flop back, then bet the turn and the river. That’s A-A and A-K betting for value, plus the odd bluff.' },
      { about: 'range', text: 'A-A and A-K bet for value, and you beat both. K-K is a bigger set. A few bluffs.' },
    ],
    takeaway: 'Raise only when worse hands call; when only a bigger set would call, just call.',
  },
  'set-of-sixes-tiny-river-bet': {
    why: 'Call: a bet of a quarter of the pot means you need only about 17%. They bet flushes this way, but also two pair, smaller sets and one-pair hands betting small. You’d have to be sure they never bet anything but a flush to fold, and you can’t be. Folding the best hand costs far more than paying off a flush now and then.',
    read: [
      { about: 'preflop', text: 'A four-way pot early in a big tournament. Callers have pairs, suited aces and broadways.' },
      { about: 'players', text: 'Four saw the flop, but only the cutoff called your bet. One cold-caller is left, in position behind the others but out of position on you.' },
      { about: 'board', text: 'K♣6♥3♣ gives you a set. The Q♣ puts three clubs out, so flushes are possible. The 8♥ is a blank.' },
      { about: 'sizing', text: 'A small turn raise, then a quarter-pot river bet. Small bets give you a great price; players often bet small with medium hands to get to a showdown cheaply.' },
      { about: 'range', text: 'Ahead of you: flushes, K-K and Q-Q. Behind you: K-Q, 3-3 and one-pair hands betting small.' },
    ],
    takeaway: 'Facing a tiny bet you need to be right very rarely: call unless you’re sure they only bet the nuts.',
  },
  'set-of-queens-river-size': {
    why: 'Bet about ⅔ pot: jacks, overpairs and sets can all call that, and you beat every one of them. A third of the pot gets more calls but less money; an overbet folds the jacks you want to pay you. Only A-K and 9-8 have you beat, and those would raise anyway.',
    read: [
      { about: 'preflop', text: 'An early raiser called your 3-bet: strong pairs, big aces and suited broadways. A-A and K-K sometimes just call to trap.' },
      { about: 'position', text: 'You’re in position. They checked the flop, bet the turn and checked the river, so you decide the size.' },
      { about: 'board', text: 'J♣T♥2♣ is very connected, with a club draw. The 7♠ gives 9-8 a straight. The Q♥ gives you a set and A-K broadway.' },
      { about: 'sizing', text: 'A pot-size turn bet followed by a river check means a strong but not top hand: jacks, overpairs and sets that want a showdown.' },
      { about: 'range', text: 'Jacks (A-J, K-J, J-T) call a normal bet. Tens call small. Sets J-J, T-T, 7-7 and 2-2 may even raise, and you beat them. K-K and A-A call. A-K and 9-8 are ahead.' },
    ],
    takeaway: 'Bet the size their medium-strong hands can call; an overbet folds them.',
  },
  'top-pair-river-check-behind': {
    why: 'Check behind: you’re often best, but a bet only gets called by the hands that beat you. Two pair, sets and straights call any size, and the worse tens and nines fold. With no read that they call down light, take the free showdown.',
    read: [
      { about: 'preflop', text: 'The small blind called your hijack open: pairs, suited aces, broadways and suited connectors. Those hands love a middle board.' },
      { about: 'position', text: 'You’re in position, so you can check the river and see a showdown for free.' },
      { about: 'board', text: 'T♠9♦8♥ is as connected as boards get. The 6♥ completes many straights and gives you a heart draw, and the 2♣ misses it.' },
      { about: 'sizing', text: 'A small turn lead and a river check. Players lead small to see a cheap river with medium hands; their check now says they don’t want to bet.' },
      { about: 'range', text: 'Ahead of you: Q-J and 7-6 straights, sets and two pair, all calling a bet. Behind you: tens, nines and missed K-Q and K-J, which fold.' },
    ],
    takeaway: 'When worse hands fold and better ones call, take the free showdown.',
  },
  'nut-flush-river-size-multiway': {
    why: 'Bet small: both players checked, so neither has a flush, and a big bet rarely gets called. A small bet keeps in the overpairs, Q-J and stubborn top pairs, and that’s where your money is. A ¾-pot bet is close, but it folds the top pairs. A shove only gets called by hands that won’t fold anyway, and there are almost none.',
    read: [
      { about: 'preflop', text: 'Seven players limped, including a tricky player under the gun who can limp A-A and K-K. Nobody showed strength, so ranges are wide.' },
      { about: 'players', text: 'Five took the flop and three the river. In a big multiway pot, small bets get called by more hands.' },
      { about: 'board', text: 'Q♠J♠3♣ gave you the nut flush draw, and the 6♠ completed it. The 2♣ changes nothing.' },
      { about: 'sizing', text: 'Under the gun bet the turn and the lojack called, then both checked the river. Players with a flush would bet; checking twice caps both ranges.' },
      { about: 'range', text: 'Under the gun: A-A and K-K, top pairs like A-Q, K-Q and Q-T, and Q-J. Lojack: top pairs like K-Q, Q-T and Q-9, Q-J and pocket pairs. Top pairs and pocket pairs call only small.' },
    ],
    takeaway: 'Against capped ranges, a small value bet gets more calls and more money than a big one.',
  },
  'eights-full-river-raise': {
    why: 'Raise: Q-Q, K-K and A-A are 18 combos that will pay; J-J, T-T and quads are only 7 that beat you. Calling needs a third, but raising needs to beat more than half of the hands that call it, and the overpairs make that easy. Only their bluffs fold to a raise. Just calling leaves chips behind.',
    read: [
      { about: 'preflop', text: 'A regular opened the cutoff and you called on the button. Their range is pairs, broadways and suited aces.' },
      { about: 'position', text: 'You’re in position. They checked the flop and turn, then check-raised the turn and bet the river: they’re taking control.' },
      { about: 'board', text: '8♦3♦3♥ gave you a full house. The T♣ and J♥ make full houses for T-T and J-J, and overpairs now have two pair.' },
      { about: 'sizing', text: 'A turn check-raise and a pot-size river bet is a strong line, but from a regular it includes overpairs, trips and the odd float, not only full houses.' },
      { about: 'range', text: 'Behind you: Q-Q, K-K, A-A and A-3. Ahead of you: J-J, T-T and quads. Bluffs: floats that check-raised.' },
    ],
    takeaway: 'Raise for value when the hands that call a raise are mostly worse than yours.',
  },
  'jacks-incoherent-story': {
    why: 'Call: their story doesn’t add up. A min-raise on the flop, a check on the turn and a pot-sized bet on the river is how a give-up turns into a bluff, not how value plays. Nearly all their value would have bet the turn, and the second deuce removes more of it. You need a third, and jacks beat every bluff.',
    read: [
      { about: 'preflop', text: 'An inexperienced cutoff called your 3-bet: pairs, suited aces, broadways and suited connectors.' },
      { about: 'opponent', text: 'Inexperienced players often play hands without a plan. A line that changes direction is a clue that the story is made up.' },
      { about: 'board', text: 'A♣7♦2♥ is dry. The 5♦ adds a diamond draw and a wheel for 4-3, and the 2♣ pairs the board.' },
      { about: 'sizing', text: 'A near-minimum flop raise, a turn check, then a pot-size river bet. Strong hands like A-2, A-7 or 7-7 would bet the turn to build the pot.' },
      { about: 'range', text: 'For value: quads with 2♠2♦, and rarely A-2, A-7 or 7-7 that slow-played. For bluffs: floats that raised the flop and gave up on the turn.' },
    ],
    takeaway: 'When a line makes no sense for value hands, it’s usually a bluff: call with a hand that beats bluffs.',
  },
};
