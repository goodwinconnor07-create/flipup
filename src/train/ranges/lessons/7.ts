import type { Lesson } from '../model';

export const L7: Record<string, Lesson> = {
  'kings-full-shove-short-stack': {
    why: 'Raise all in: they bet every ace here, and you beat nearly all of them. Only A-K, the last pair of aces, A-5 and A-3 have you. With under 5 big blinds left behind, any ace will call the rest. Just calling leaves chips they would have paid.',
    streets: [
      { street: 'preflop', text: 'A 17-big-blind stack opens under the gun in a tournament, and you call on the button with K♣K♦. A short stack opening first in is strong: big pairs, big aces and suited broadways.', range: 'Big pairs, A-K to A-T, and suited broadways.' },
      { street: 'flop', text: 'You flop kings full on A♥A♠K♠. They check, and you check behind. With a hand this strong you let them catch up: a bet folds out everything but an ace, while a check keeps their whole range in and lets them bluff or bet a pair on the turn.', range: 'Every ace, big pairs, and broadways with nothing.' },
      { street: 'turn', text: 'The 5♥ and they bet small, 2.94. A short stack bets here with trip aces, with pairs that think your check means weakness, and with draws. You just call: a raise would only get called by aces, and you want them to keep betting.', range: 'Trip aces, pairs, 5-5, and spade draws.' },
      { street: 'river', text: 'The 3♦ fills only A-3 and 3-3. They bet more than half the pot, leaving under 5 big blinds. A short stack betting this much is committed, and they do it with every ace.', range: 'Behind you: trip aces like A-Q and A-J, and 5-5 and 3-3. Ahead of you: A-K, A-A, A-5 and A-3.' },
    ],
    takeaway: 'When a short stack bets most of what’s left, raise all in with any hand that beats most of their bets.',
  },
  'kings-call-multiway-lead-shove': {
    why: 'Call: a set might lead to protect itself, but there are only nine set combos and far more combos of the two flush draws. A weak player shoves draws like these all the time. You need about 30%, and kings win far more often than that.',
    streets: [
      { street: 'preflop', text: 'A weak player limps, you raise K♣K♦, and three of them call, including the limper. The limper’s range is wide: pairs, suited cards and connectors.', range: 'Wide: pairs, suited cards and connectors.' },
      { street: 'flop', text: 'The flop is 9♦7♣3♣. You bet and only the limper calls. Calling against a raiser with two players behind is usually a pair or a draw, and sets call too.', range: 'Pairs, nines and sevens, club draws, straight draws, and sets.' },
      { street: 'turn', text: 'The 5♦ brings a second flush draw, and the limper leads all in for about three quarters of the pot. A set might lead to protect itself, but weak players love to shove draws: an all in feels like a way to win now.', range: 'Value: sets 9-9, 7-7 and 3-3. Shoving with outs: diamond draws and club draws.' },
    ],
    takeaway: 'Count combos: a few sets can’t outweigh two whole flush draws.',
  },
  'aces-up-raise-small-river-bet': {
    why: 'Raise: you beat almost everything that bets this small. Every weaker ace, every pocket pair and every bluff loses to aces up; only a full house beats you. A big raise still gets paid by their aces, which find it hard to fold. Calling would leave chips behind that those aces would pay.',
    streets: [
      { street: 'preflop', text: 'Under the gun limps, the next player raises, and you call on the button with A♦T♦, 200 big blinds deep. Raising over a limper takes a strong range: big pairs, big aces and suited broadways.', range: 'Big pairs, A-K to A-J, suited aces and suited broadways.' },
      { street: 'flop', text: 'The flop is 5♦2♥2♠, paired and dry. They bet and you call. Pairs, big cards and the odd five are all here.', range: 'Overpairs, big cards that missed, fives, and a deuce now and then.' },
      { street: 'turn', text: 'The T♠ gives you a pair, and it checks through. Their check looks weak: big hands usually keep betting on a dry board.', range: 'Big cards, medium pairs, and some slow-played overpairs.' },
      { street: 'river', text: 'The A♣ gives you aces up, and they bet about a third of the pot. A small bet after checking the turn is thin value or a cheap bluff: an ace, a pocket pair, or nothing.', range: 'Behind you: A-K, A-Q, A-J, suited aces, A-5, pocket pairs and bluffs. A-T splits. Full houses beat you.' },
    ],
    takeaway: 'When a small bet comes from a range you beat almost entirely, raise: their aces won’t fold.',
  },
  'trips-weak-kicker-river-call': {
    why: 'Call: better kings and full houses beat you, but you hold a king, so they have fewer of them. They also bet every pair of jacks and some busted straight draws. You need about 28%, and you’re ahead far more often. You might be beaten, but you can’t fold.',
    streets: [
      { street: 'preflop', text: 'You open K♠9♥ from the cutoff; the button and the big blind call. The button’s range is wide: pairs, suited aces, broadways and connectors.', range: 'Wide: pairs, suited aces, broadways and connectors.' },
      { street: 'flop', text: 'You flop top pair on K♥J♣3♦ and check to the preflop caller. The button bets and you call; the big blind folds. Kings, jacks and straight draws all bet here.', range: 'Kings, jacks, straight draws like Q-T, and some floats.' },
      { street: 'turn', text: 'The 2♠ is a blank. You check, they bet again, 12.67, and you call. A second bet keeps kings, jacks and straight draws like Q-T, A-Q and T-9. A live player bets a pair of jacks again here too, hoping you have a weaker pair.', range: 'Kings, jacks, two pairs, sets, and straight draws.' },
      { street: 'river', text: 'The K♣ gives you trips, and they bet two thirds of the pot. A better king or a full house beats you, but they bet a pair of jacks for value and keep firing missed straight draws. Your king makes their kings rarer.', range: 'Ahead of you: A-K, K-Q and K-T; K-J, J-J, 3-3 and 2-2 (full houses). K-9 splits. Behind you: a pair of jacks and missed straight draws.' },
    ],
    takeaway: 'Holding a card from their value hands makes a call better.',
  },
  'two-pair-fold-river-lead': {
    why: 'Fold: a straightforward player leads here with a jack, a straight or a paired eight, and all of those beat your sevens. They rarely bluff. You need 27%, and you win only when they’re bluffing. Against this player and this river, the fold is clear.',
    streets: [
      { street: 'preflop', text: 'At a final table you open A♠7♥ from the cutoff and a straightforward, tight-aggressive big stack calls from the small blind.', range: 'Pairs, broadways, suited aces and suited connectors.' },
      { street: 'flop', text: 'The flop is J♥J♠7♦ and it checks through; you check back your pair of sevens. A straightforward player checks most hands here, even some jacks.', range: 'Jacks slow-playing, sevens, pairs, broadways and draws.' },
      { street: 'turn', text: 'The 4♥ adds a heart draw. They check again, you bet small, 2.19, and they call. A straightforward player calls a small bet with a jack that is slow-playing, a seven, an eight, a heart draw, or straight draws like T-9 and 6-5.', range: 'Jacks, sevens, pairs, straight draws like T-9 and 6-5, and heart draws.' },
      { street: 'river', text: 'The 8♣ completes T-9 and 6-5 straights and pairs every eight. They lead for more than half the pot. From a straightforward player, a change from checking to leading on the card that helps their draws is value.', range: 'Value: a jack, T-9 and 6-5, a paired eight, and full houses. Bluffs: rare.' },
    ],
    takeaway: 'When a straightforward player leads the river, believe them and fold a weak two pair.',
  },
  'underpair-turn-call-vs-three-bettor': {
    why: 'Call: they bet top pair and overpairs, but plenty of unpaired high cards that missed bet here too, and your sevens beat all of them. A small bet gives you an excellent price: you need only 22%. Raising has no point: worse hands fold and better ones don’t.',
    streets: [
      { street: 'preflop', text: 'You open 7♠7♣ from the hijack in a tournament, and a tight-aggressive player 3-bets from the small blind; you call. Their range is big pairs and big cards like A-K, A-Q, K-Q and K-J.', range: 'Big pairs, A-K, A-Q, K-Q, K-J and suited broadways.' },
      { street: 'flop', text: 'The flop is T♠8♠3♣. They check and you check back. A 3-bettor who skips the c-bet often has big cards that missed and wants to see the turn cheaply; they’d usually bet their overpairs.', range: 'Big cards that missed, some overpairs checking, A-T, and spade draws.' },
      { street: 'turn', text: 'The 2♥ is a blank. They bet about 40% of the pot. A small stab after checking the flop is often a missed hand taking a cheap shot, alongside the overpairs and top pairs.', range: 'Value: overpairs, A-T and T-T. Bluffs: A-K, A-Q, K-Q, K-J and other high cards that missed.' },
    ],
    takeaway: 'When a 3-bettor checks the flop and bets small on the turn, an underpair is a good bluff catcher.',
  },
  'low-straight-just-call-river': {
    why: 'Call: their bet is two pair or a missed seven about as often as it’s 8-7 or 7-3. You need about 28%, and you’re ahead well over half the time. Don’t raise: the hands that would call a raise are the ones that beat you.',
    streets: [
      { street: 'preflop', text: 'Five players limp in a tournament, you with 3♠3♦, and the big blind checks. With a free look, the big blind can have any two cards.', range: 'The big blind: any two cards.' },
      { street: 'flop', text: 'The flop is 6♠4♦2♥, and it checks round five ways. Nobody had enough to bet into a big field. That keeps every range wide: sets and straights would often bet, so a five-way check takes some of the strongest hands out, but every draw is still there.', range: 'Anything without a strong hand: small pairs, draws and air.' },
      { street: 'turn', text: 'The 5♥ gives you a six-high straight, and also 7-3 a seven-high one and 8-7 an eight-high one. The big blind bets the pot into four players, and you call; the others fold. A pot-size bet into a big field is strong, but also comes from two pair and sevens drawing.', range: 'Value: 8-7, 7-3 and other threes. Two pair, and sevens drawing to a straight.' },
      { street: 'river', text: 'The 9♠ changes little. They bet about 60% of the pot. They bet 8-7 and 7-3, but also two pair for value and missed sevens as a bluff.', range: 'Ahead of you: 8-7 and some 7-3. Other threes split. Behind you: two pair and missed sevens.' },
    ],
    takeaway: 'Call when you beat their bluffs and thin value; raise only when worse hands will call.',
  },
  'weak-flush-river-call': {
    why: 'Call: they only bet the 9♠ or better here, and most of the time they don’t hold a spade at all. Without a spade the bet is a bluff, and you beat every bluff. You need about 30%, and you’re ahead far more often. Folding would be a big mistake.',
    streets: [
      { street: 'preflop', text: 'The lojack opens in a tournament and you defend your big blind with 4♦4♠ and 30 big blinds. Their range is pairs, broadways and suited aces.', range: 'Pairs, broadways, suited aces and suited connectors.' },
      { street: 'flop', text: 'The flop is A♠7♠2♠, monotone. You have a pair and the 4♠. They bet small with most of their range and you call.', range: 'Their whole range: aces, pairs, spades, and hands with nothing.' },
      { street: 'turn', text: 'The 7♥ pairs the board, and it checks through. A strong flush would usually bet the turn to build the pot; checking back leans to medium hands and air.', range: 'Aces and medium pairs taking it slow, small spades, and air.' },
      { street: 'river', text: 'The 8♠ puts four spades out, so any spade makes a flush, and yours is a small one. They bet three quarters of the pot. With one spade, they bet only strong ones, the 9♠ or better; small spades check. Without a spade, this is a bluff.', range: 'Value: one spade 9♠ or higher, some slow-played flushes, and full houses. Bluffs: hands with no spade.' },
    ],
    takeaway: 'On a four-flush board, think about which flushes would bet and how often they have no spade at all.',
  },
  'trips-call-river-shove-3bet-pot': {
    why: 'Call: they shove straights and full houses, but also some overpairs and plenty of missed spade and straight draws. You need about 29%, and you’re ahead about half the time. Online regulars give up on some missed draws, but they still shove enough of them to make this a call.',
    streets: [
      { street: 'preflop', text: 'You open Q♠J♠ on the button and the big blind 3-bets light; you call in position. Their range: pairs, suited aces and suited connectors.', range: 'Pairs, suited aces, suited broadways and suited connectors.' },
      { street: 'flop', text: 'You flop top pair on J♥8♠2♣. They bet half the pot, 10.75, and you call. A light 3-bettor c-bets most of their range here: overpairs, jacks, straight draws like T-9 and Q-T, and air. Top pair with a queen kicker is well ahead of that.', range: 'Overpairs, jacks, straight draws like T-9 and Q-T, and air.' },
      { street: 'turn', text: 'The 7♠ gives T-9 a straight and adds a spade draw. They bet half the pot again, and you call: spade and straight draws keep firing.', range: 'T-9 (a straight), overpairs, jacks, sets, and spade and straight draws.' },
      { street: 'river', text: 'The J♦ gives you trips with a queen kicker. They shove for about ⅔ pot, which is polarised: strong hands and missed draws, with fewer of the medium hands.', range: 'Ahead of you: T-9, full houses, A-J and K-J. Behind you: J-T, some overpairs, and missed spade and straight draws.' },
    ],
    takeaway: 'Against a polarised shove, trips with a decent kicker beat enough bluffs to call.',
  },
};
