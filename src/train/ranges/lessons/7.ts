import type { Lesson } from '../model';

export const L7: Record<string, Lesson> = {
  'top-pair-fold-turn-check-raise': {
    why: 'Fold: most players check-raise a blank turn only with two pair or better. The 4♣ changed nothing, so the raise isn’t about the card: they had a strong hand on the flop and waited, and straight draws rarely raise here. You need 26%, and top pair with a ten kicker falls short.',
    streets: [
      { street: 'preflop', text: 'You open K♠T♥ from the cutoff and the big blind defends wide.', range: 'Suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'You flop top pair on a connected K♦J♥8♠. You bet small and they call. A big blind check-calls most of its hands here, strong and weak alike.', range: 'Kings, jacks and eights, two pairs like K-J, K-8 and J-8, sets, straight draws like Q-T, T-9 and Q-9.' },
      { street: 'turn', text: 'The 4♣ is a blank. You bet again and they check-raise three times your bet. A typical player rarely turns a draw into a big turn raise; draws call and see the river.', range: 'Value: sets and two pairs like K-J, K-8 and J-8. Bluffs: a few straight draws.' },
    ],
    takeaway: 'A check-raise on a blank turn from a typical player is two pair or better: fold one pair.',
  },
  'kings-full-shove-short-stack': {
    why: 'Raise all in: they bet every ace here, and you beat nearly all of them; only A-K, the last aces, A-5 and A-3 have you. With under 5 big blinds left behind, any ace calls the rest, so just calling leaves chips they would have paid.',
    streets: [
      { street: 'preflop', text: 'A 17-big-blind stack opens under the gun, and you call on the button with K♣K♦. A short stack opening first in is strong.', range: 'Big pairs, A-K to A-T, suited broadways.' },
      { street: 'flop', text: 'You flop kings full on A♥A♠K♠. They check, and you check behind: a bet folds everything but an ace, while a check lets them catch up or bluff.', range: 'Every ace, big pairs, broadways with nothing.' },
      { street: 'turn', text: 'The 5♥ and they bet small, 2.94. Trip aces, pairs that read your check as weakness, and draws all bet here. A raise would only get called by aces, so you call.', range: 'Trip aces, pairs, 5-5, spade draws.' },
      { street: 'river', text: 'The 3♦ fills only A-3 and 3-3. They bet more than half the pot, leaving under 5 big blinds: committed, and they do that with every ace.', range: 'Behind you: A-Q, A-J and other aces, 5-5 and 3-3. Ahead of you: A-K, A-A, A-5 and A-3.' },
    ],
    takeaway: 'When a short stack bets most of what’s left, raise all in with any hand that beats most of their bets.',
  },
  'kings-call-multiway-lead-shove': {
    why: 'Call: a set might lead to protect itself, but there are only nine set combos and far more combos of the two flush draws, which a weak player shoves all the time. You need about 30%, and kings win far more often.',
    streets: [
      { street: 'preflop', text: 'A weak player limps, you raise K♣K♦, and three of them call, including the limper.', range: 'The limper: pairs, suited cards and connectors.' },
      { street: 'flop', text: 'On 9♦7♣3♣ you bet and only the limper calls. Calling a raiser with two players behind is usually a pair or a draw, sometimes a set.', range: 'Pairs, nines and sevens, club and straight draws, sets.' },
      { street: 'turn', text: 'The 5♦ brings a second flush draw, and the limper leads all in for ¾ pot. Weak players love to shove draws: an all-in feels like a way to win now.', range: 'Value: sets 9-9, 7-7 and 3-3. Shoving with outs: diamond and club draws.' },
    ],
    takeaway: 'Count combos: a few sets can’t outweigh two whole flush draws.',
  },
  'aces-up-raise-small-river-bet': {
    why: 'Raise: you beat almost everything that bets this small. Every weaker ace, pocket pair and bluff loses to aces up; only a full house beats you. Their aces find it hard to fold even to a big raise, so calling leaves chips behind.',
    streets: [
      { street: 'preflop', text: 'Under the gun limps, the next player raises, and you call on the button with A♦T♦, 200 big blinds deep. Raising over a limper takes a strong range.', range: 'Big pairs, A-K to A-J, suited aces and suited broadways.' },
      { street: 'flop', text: 'On a dry 5♦2♥2♠ they bet and you call.', range: 'Overpairs, big cards that missed, fives, a deuce now and then.' },
      { street: 'turn', text: 'The T♠ gives you a pair, and it checks through. Big hands usually keep betting a dry board, so their check looks weak.', range: 'Big cards, medium pairs, some slow overpairs.' },
      { street: 'river', text: 'The A♣ gives you aces up, and they bet a third of the pot. A small bet after a turn check is thin value or a cheap bluff.', range: 'Behind: A-K, A-Q, A-J, suited aces, A-5, pocket pairs, bluffs. Split: A-T. Ahead: full houses.' },
    ],
    takeaway: 'When a small bet comes from a range you beat almost entirely, raise: their aces won’t fold.',
  },
  'trips-weak-kicker-river-call': {
    why: 'Call: better kings and full houses beat you, but you hold a king, so they have fewer of them, and they also bet every pair of jacks and some busted straight draws. You need about 28%, and you’re ahead far more often.',
    streets: [
      { street: 'preflop', text: 'You open K♠9♥ from the cutoff; the button and the big blind call.', range: 'The button: pairs, suited aces, broadways and connectors.' },
      { street: 'flop', text: 'You flop top pair on K♥J♣3♦ and check to the field. The button bets, you call, and the big blind folds.', range: 'Kings, jacks, straight draws like Q-T, some floats.' },
      { street: 'turn', text: 'The 2♠ is a blank. You check, they bet 12.67, and you call. A live player bets a pair of jacks again here, hoping you hold a weaker pair.', range: 'Kings, jacks, two pairs, sets, straight draws like Q-T, A-Q and T-9.' },
      { street: 'river', text: 'The K♣ gives you trips, and they bet ⅔ pot. They keep betting jacks for value and missed draws as bluffs, and your king makes their kings rarer.', range: 'Ahead: A-K, K-Q, K-T, K-J, J-J, 3-3, 2-2. Split: K-9. Behind: jacks and missed straight draws.' },
    ],
    takeaway: 'Holding a card from their value hands makes a call better.',
  },
  'two-pair-fold-river-lead': {
    why: 'Fold: a straightforward player leads here with a jack, a straight or a paired eight, and all of those beat your sevens. They rarely bluff, so you need 27% and win only against their few bluffs.',
    streets: [
      { street: 'preflop', text: 'At a final table you open A♠7♥ from the cutoff and a straightforward, tight-aggressive big stack calls from the small blind.', range: 'Pairs, broadways, suited aces and suited connectors.' },
      { street: 'flop', text: 'J♥J♠7♦ checks through; you check back your pair of sevens. A straightforward player checks most hands here, even some jacks.', range: 'Jacks slow-playing, sevens, pairs, broadways and draws.' },
      { street: 'turn', text: 'The 4♥ adds a heart draw. They check, you bet small, 2.19, and they call.', range: 'Jacks, sevens, pairs, straight draws like T-9 and 6-5, heart draws.' },
      { street: 'river', text: 'The 8♣ makes T-9 and 6-5 straights and pairs every eight. They lead over half the pot. From a straightforward player, switching to a lead on the card that helps their hands is value.', range: 'Value: a jack, T-9, 6-5, a paired eight, full houses. Bluffs: rare.' },
    ],
    takeaway: 'When a straightforward player leads the river, believe them and fold a weak two pair.',
  },
  'underpair-turn-call-vs-three-bettor': {
    why: 'Call: they bet top pair and overpairs, but plenty of unpaired high cards bet here too, and your sevens beat all of them. A small bet gives an excellent price: you need only 22%. Raising has no point, because worse hands fold and better ones don’t.',
    streets: [
      { street: 'preflop', text: 'You open 7♠7♣ from the hijack, a tight-aggressive small blind 3-bets, and you call.', range: 'Big pairs, A-K, A-Q, K-Q, K-J, suited broadways.' },
      { street: 'flop', text: 'On T♠8♠3♣ they check and you check back. A 3-bettor would usually c-bet overpairs, so skipping it often means big cards that missed.', range: 'Big cards that missed, some overpairs, A-T, spade draws.' },
      { street: 'turn', text: 'The 2♥ is a blank and they bet 40% of the pot. A small stab after checking the flop is often a missed hand taking a cheap shot.', range: 'Value: overpairs, A-T, T-T. Bluffs: A-K, A-Q, K-Q, K-J and other missed high cards.' },
    ],
    takeaway: 'When a 3-bettor checks the flop and bets small on the turn, an underpair is a good bluff catcher.',
  },
  'low-straight-just-call-river': {
    why: 'Call: their bet is two pair or a missed seven about as often as it’s 8-7 or 7-3. You need about 28%, and you’re ahead well over half the time. Don’t raise: the hands that call a raise are the ones that beat you.',
    streets: [
      { street: 'preflop', text: 'Five players limp, you with 3♠3♦, and the big blind checks for free with any two cards.', range: 'The big blind: any two cards.' },
      { street: 'flop', text: '6♠4♦2♥ checks round five ways. Sets and straights would often bet into a crowd, so the check takes some strong hands out but leaves every draw.', range: 'Small pairs, draws and air.' },
      { street: 'turn', text: 'The 5♥ gives you a six-high straight, but 7-3 and 8-7 have higher ones. The big blind bets the pot into four players, and only you call. That’s strong, but two pair and sevens drawing bet this way too.', range: 'Value: 8-7, 7-3, other threes. Also: two pair and sevens drawing.' },
      { street: 'river', text: 'The 9♠ changes little. They bet 60% of the pot: 8-7 and 7-3, but also two pair for value and missed sevens as a bluff.', range: 'Ahead: 8-7, some 7-3. Split: other threes. Behind: two pair, missed sevens.' },
    ],
    takeaway: 'Call when you beat their bluffs and thin value; raise only when worse hands will call.',
  },
  'weak-flush-river-call': {
    why: 'Call: they bet only the 9♠ or better here, and most of the time they hold no spade at all. Without a spade the bet is a bluff, and you beat every bluff. You need about 30%, and you’re ahead far more often.',
    streets: [
      { street: 'preflop', text: 'The lojack opens and you defend 4♦4♠ from the big blind with 30 big blinds.', range: 'Pairs, broadways, suited aces and suited connectors.' },
      { street: 'flop', text: 'On a monotone A♠7♠2♠ you have a pair and the 4♠. They bet small with most of their range and you call.', range: 'Aces, pairs, spades, and air.' },
      { street: 'turn', text: 'The 7♥ checks through. A strong flush would usually bet to build the pot, so the check leans to medium hands and air.', range: 'Aces and medium pairs taking it slow, small spades, air.' },
      { street: 'river', text: 'The 8♠ puts four spades out: any spade is a flush, and yours is small. They bet ¾ pot. With one spade they bet only the strong ones; small spades check.', range: 'Value: one spade 9♠ or higher, slow flushes, full houses. Bluffs: hands with no spade.' },
    ],
    takeaway: 'On a four-flush board, think about which flushes would bet and how often they have no spade at all.',
  },
  'trips-call-river-shove-3bet-pot': {
    why: 'Call: they shove straights and full houses, but also some overpairs and plenty of missed spade and straight draws. You need about 29% and you’re ahead about half the time. Online regulars give up some missed draws, but they still shove enough of them.',
    streets: [
      { street: 'preflop', text: 'You open Q♠J♠ on the button, the big blind 3-bets light, and you call in position.', range: 'Pairs, suited aces, suited broadways and suited connectors.' },
      { street: 'flop', text: 'You flop top pair on J♥8♠2♣. They bet half the pot and you call. A light 3-bettor c-bets most of its range here, and you’re well ahead of it.', range: 'Overpairs, jacks, straight draws like T-9 and Q-T, air.' },
      { street: 'turn', text: 'The 7♠ gives T-9 a straight and adds a spade draw. They bet half the pot again and you call: the draws keep firing.', range: 'T-9, overpairs, jacks, sets, spade and straight draws.' },
      { street: 'river', text: 'The J♦ gives you trips with a queen kicker. They shove for ⅔ pot: strong hands and missed draws, with fewer medium hands.', range: 'Ahead: T-9, full houses, A-J and K-J. Behind: J-T, some overpairs, missed spade and straight draws.' },
    ],
    takeaway: 'Against a polarised shove, trips with a decent kicker beat enough bluffs to call.',
  },
};
