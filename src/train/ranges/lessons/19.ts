import type { Lesson } from '../model';

export const L19: Record<string, Lesson> = {
  'aces-call-turn-check-raise-all-in-low-board': {
    why: 'Call: an elite player check-raises this turn with value and with strong draws to stay balanced, and much of that range is diamonds and pairs with straight draws. Sets, A-5 and 6-5 beat you, but you’re ahead of the draws and the nines, and your A♥ removes some A-5. You need about 34%, and aces win often enough.',
    streets: [
      { street: 'preflop', text: 'In a high-stakes event an elite player opens middle position, you 3-bet A♥A♣ on the button, 222 big blinds deep, and they call. Deep stacks invite calls with hands that flop well.', range: 'Pairs, suited broadways, suited aces like A-5, suited connectors like 6-5 and 7-6.' },
      { street: 'flop', text: 'On a dry 9♦4♣2♥ they check, you bet 15 into 22.5, and they call with a pair, a set, or a hand with a gutshot or backdoors; most high cards fold.', range: 'Nines, sets, pairs like 8-8 and 7-7, wheel draws like A-5, A-3 and 5-3, 6-5.' },
      { street: 'turn', text: 'The 3♦ makes straights for A-5 and 6-5 and adds a diamond draw. You bet 45 into 52.5 and they check-raise all in for 197.', range: 'Value: 4-4, 3-3, 2-2, sometimes 9-9, nines, A-5, 6-5. Draws: diamonds, pairs with a straight draw.' },
    ],
    takeaway: 'Against a balanced player, a turn check-raise all in on a low board includes many draws: aces can call.',
  },
  'jacks-call-small-river-bet-four-flush-lag': {
    why: 'Call: a small bet on a scary river is polarised, a strong flush or a miss. A tough, loose player floats wide and bets when you check, so the misses are plentiful, and your pair beats every one. Less than half the pot prices you at about 21%, and you’re ahead more often.',
    streets: [
      { street: 'preflop', text: 'You open J♦8♦ from the cutoff; a tough, loose, aggressive button and the big blind call.', range: 'The button: very wide, pairs, suited hands, broadways, connectors, any ace.' },
      { street: 'flop', text: 'On 3♥5♦4♥ you bet 6 into 9.5; the button calls and the big blind folds. This player floats with almost anything, planning to bet later.', range: 'Pairs, heart draws, 7-6, A-2, 6-2, sets, floats like ace high, A-Q, 8-6, 8-7.' },
      { street: 'turn', text: 'The J♥ gives you top pair and puts three hearts out. You check, they bet 16 into 21.5, and you call: this player bets whenever you check.', range: 'Flushes, A-2, 7-6, sets, pairs, heart draws, floats betting.' },
      { street: 'river', text: 'The T♥ puts four hearts out. You check and they bet 20 into 53.5. A weak flush or a medium pair would check; this is a strong flush or a miss.', range: 'Value: A♥, K♥ or Q♥ flushes, A-2, 7-6. Bluffs: ace high, A-Q, 8-6, 8-7, 6-4, tens, small pairs.' },
    ],
    takeaway: 'Against a loose, aggressive player, a small bet on a four-flush river is often a bluff: call with a pair.',
  },
  'ten-high-bluff-river-capped-flop-check-back': {
    why: 'Bet ¾ pot: a player who checks back this flop rarely has two pair or better, and your turn check-raise represents the straights and sets they rarely hold. Ten high can’t win at showdown, while their sevens, fives, pocket pairs and missed club draws fold to a big bet; only A-K and paired kings call. An overbet works too.',
    streets: [
      { street: 'preflop', text: 'In a big live game the player one off the button opens and you defend T♠9♠ from the big blind, 100 big blinds deep.', range: 'The cutoff: pairs, any ace, broadways, suited kings, suited connectors.' },
      { street: 'flop', text: '7♣5♣4♦ checks through. A cutoff would bet sets and straights on this board, so the check caps them.', range: 'Ace high and king high, 7-x and 5-x, pocket pairs, some club draws.' },
      { street: 'turn', text: 'The A♠. They bet 6 into 7.5 and you check-raise to 25.5 as a bluff, representing the straights and sets a big blind holds. They call: an ace, or a pair not ready to fold.', range: 'Aces, A-7 and A-5, pocket pairs, sevens and fives, club draws.' },
      { street: 'river', text: 'The K♠ misses you. Their range is aces, pairs and missed draws, and only the strongest of it can stand a big bet.', range: 'Small only: an ace. Call: A-K, paired kings. Fold: sevens, fives, pocket pairs, missed clubs.' },
    ],
    takeaway: 'When they check back a flop their strong hands would bet, keep telling the story with big bets: their capped range folds.',
  },
  'ace-high-call-river-weak-limper-paired-board': {
    why: 'Call: a weak open-limper bets whenever you check, so their value has to be narrow, a nine, trip deuces, sometimes a pocket pair or a seven, while every missed heart draw, king high, queen high and wheel draw bets too. Ace high beats all of those. The price is about 29%, and you’re ahead more often.',
    streets: [
      { street: 'preflop', text: 'A weak player new to the table limps; you complete A♥6♥ from the small blind and the big blind checks.', range: 'Very wide: suited hands, connectors, weak aces, kings and queens, small pairs.' },
      { street: 'flop', text: 'On 2♥3♣9♥ you have a flush draw and a wheel draw. You bet 2.38 into 3.75, the big blind folds and the limper calls.', range: 'Nines, deuces, threes, pocket pairs, heart draws, wheel draws like 5-4, overcards.' },
      { street: 'turn', text: 'The 2♠ pairs the board. You check and they bet 3.43 into 8.5. This player bets into a check with almost anything.', range: 'Nines, trip deuces, pocket pairs, heart and wheel draws, air.' },
      { street: 'river', text: 'The 7♦ misses every draw. You check and they bet 10.33 into 15.4. Betting into every check means a wide range, mostly misses.', range: 'Value: a nine or trip deuces, sometimes a pocket pair or a seven. Bluffs: missed hearts, king and queen high, wheel draws.' },
    ],
    takeaway: 'Against a player who bets into every check, ace high can be a call: their bets are mostly air.',
  },
  'top-pair-small-river-bet-after-three-checks': {
    why: 'Bet small: a range that checks back twice leans to hands with a little showdown value, weak aces, small pairs, a nine or a five, which call a small bet and fold to a big one. Better aces and two pair are rare after two checks, and king and queen high fold to anything. A small bet gets paid by the most hands.',
    streets: [
      { street: 'preflop', text: 'In an online tournament, 200 big blinds deep, the hijack opens and you defend A♠T♥ from the big blind.', range: 'The hijack: pairs, any ace, broadways, suited kings, suited connectors.' },
      { street: 'flop', text: '5♠9♥J♣ checks through. A hijack bets most strong hands on a board with this many draws, so the check is misses and small showdown value.', range: 'Ace and king high, small pairs, nines and fives, a few gutshots.' },
      { street: 'turn', text: 'The 2♦ checks through again. A jack or better would usually have bet one street by now, so they’re capped at medium.', range: 'Weak aces, small pairs, nines, fives, king and queen high.' },
      { street: 'river', text: 'The A♥ gives you top pair and you act first. After three checks the pot is tiny, and their weak aces and small pairs will call a small bet as bluff catchers.', range: 'Small only: weak aces, small pairs, a nine or five. Call anything: better aces, two pair. Fold: king and queen high.' },
    ],
    takeaway: 'After three checks, their range is medium hands: a small value bet gets paid by more of them than a big one.',
  },
  'top-pair-fold-sudden-big-river-bet-straightforward': {
    why: 'Fold: a straightforward player bets big when strong and checks when not. They checked the turn, then bet 80% of the pot on a river that changed nothing, so they didn’t just make a hand: they were trapping with trips or a full house. A few missed club draws are the only bluffs, too few for a 31% price.',
    streets: [
      { street: 'preflop', text: 'A straightforward $2-$5 regular raises from middle position; you call K♣8♣ on the button and the big blind calls.', range: 'Pairs, A-K to A-T, suited broadways, suited aces, suited connectors.' },
      { street: 'flop', text: 'On 9♣9♠7♣ they bet small, 6 into 18.5; you call with a backdoor draw and the big blind folds. A small bet is most of their range.', range: 'Nines, sevens, overpairs, club draws, high cards.' },
      { street: 'turn', text: 'The K♦ gives you top pair. They check and you check behind. This player checks when not strong, so it’s usually a pair, a draw or high cards.', range: 'Overpairs and pairs, club draws, A-K and high cards, a few trapping trips or full houses.' },
      { street: 'river', text: 'The 4♥ changes nothing, and they bet 24 into 30.5. A pair would check again; checking the turn and then betting big on a blank is how strong hands trap.', range: 'Value: trip nines, 7-7, K-K. Bluffs: a few missed club draws.' },
    ],
    takeaway: 'When a straightforward player checks and then bets big on a blank, they were trapping: fold top pair.',
  },
  'top-two-check-river-good-aggressive-player': {
    why: 'Check: a very good, aggressive player checks strong hands on the river to trap and won’t pay a big bet with one pair. After calling your flop raise and checking twice, their range is sets and straights, which call anything, and one pair and missed draws, which fold. K-Q splits. A bet only gets called by better.',
    streets: [
      { street: 'preflop', text: 'In a deep 6-max game you call an under-the-gun raise with K♥Q♥; a very good, aggressive small blind and the big blind call.', range: 'The small blind: pairs, suited broadways, suited aces, suited connectors.' },
      { street: 'flop', text: 'You flop top two pair on K♠Q♦7♥. The small blind leads, the raiser calls, you raise to 26.65, and only the small blind calls.', range: 'Sets, K-7, Q-7, K-Q, strong kings, J-T, A-J, J-9.' },
      { street: 'turn', text: 'The 9♦ gives J-T a straight. They check and you check behind: on a card that completes a straight, two pair keeps the pot from growing.', range: 'Sets, J-T, two pair, kings and queens, Q-J, diamond draws.' },
      { street: 'river', text: 'The 4♣ changes little and they check again. A very good player checks sets and straights here hoping you bet; their one-pair hands check and fold.', range: 'Call any bet: sets, straights. Split: K-Q. Fold: a king or a queen, missed draws.' },
    ],
    takeaway: 'Against a very good player who checks to you, check top two pair: they won’t pay with worse.',
  },
  'top-pair-fold-big-river-bet-best-player': {
    why: 'Fold: good players who aren’t elite still bet big with value and smaller with bluffs. An 80%-pot bet on the card that completes the draws leans to value, 9-8, spade flushes, sets, two pair and some better kings, with bluffs too few for a 31% price.',
    streets: [
      { street: 'preflop', text: 'In a big live game a splashy player limps, the best player at the table raises the hijack, and you call K♠J♦ from the big blind; the limper calls.', range: 'The best player: pairs, broadways, suited aces, suited connectors like 9-8 and 8-7.' },
      { street: 'flop', text: 'You flop top pair on K♣7♠6♦. You check, they bet 6.5 into 12.5, and you call; the limper folds.', range: 'Kings, sevens, sets, straight draws like 9-8, 8-5 and 5-4, air.' },
      { street: 'turn', text: 'The 2♠ adds a spade draw and they bet half the pot again; you call.', range: 'Kings, sets, two pair, spade and straight draws, some air.' },
      { street: 'river', text: 'The T♠ completes the flush and 9-8, and they bet 40 into 50.5. A good player bets bigger with the hands that just got there, and bluffs smaller.', range: 'Value: 9-8, spade flushes, K-K, 7-7, 6-6, T-T, K-T, some A-K and K-Q. Bluffs: missed hands.' },
    ],
    takeaway: 'A good player’s big bet on the card that completes draws is mostly value: fold top pair.',
  },
  'two-pair-big-river-value-bet-caller': {
    why: 'Bet ¾ pot: a poor hand reader thinks about what’s possible, not what’s likely, and calls because they don’t believe you. Their sixes, fives, small pairs and ace high call a normal bet, and that’s most of their range. Some 7-6, A-7, straights and overpairs beat you, but checking gives up all that value.',
    streets: [
      { street: 'preflop', text: 'You open 8♠7♠ from middle position, 250 big blinds deep; three call, including a small blind who reads hands poorly.', range: 'The small blind: very wide, suited hands, connectors, small pairs, weak aces.' },
      { street: 'flop', text: '7♥6♦3♠ checks round four ways. Sets and straights would often bet a board this connected, so the check takes some out.', range: 'Sevens, sixes, threes, pairs, straight draws like 5-4, 8-5 and 9-8.' },
      { street: 'turn', text: 'The 3♦ gives you two pair. You bet 8 into 13 and only the small blind calls, with any pair or draw.', range: 'Sixes, fives, small pairs, ace high, straight draws, some sevens.' },
      { street: 'river', text: 'The 5♣ makes straights for 4-x and 9-8, and they check. Strong hands might bet, so the check leans to the medium hands that call you because they don’t believe you.', range: 'Normal bet: sixes, fives, small pairs, ace high. Beat you: some 7-6, A-7, straights, overpairs. Small only: misses.' },
    ],
    takeaway: 'Against a player who calls because they don’t believe you, value-bet two pair.',
  },
  'top-pair-call-river-donk-unknown': {
    why: 'Call: they never raised, then led 60% of the pot on the river. Without a raise anywhere, two pair or better is a small part of their range; worse kings, tens and missed heart and straight draws make up most of the lead. You need about 27%, and top pair with a queen kicker is ahead far more often.',
    streets: [
      { street: 'preflop', text: 'At a small online game you open K♣Q♦ from the cutoff and an unknown player defends the big blind wide.', range: 'Pairs below the biggest, any ace, broadways, suited and connected hands.' },
      { street: 'flop', text: 'You flop top pair on K♥2♣T♥. They check and call 3.8 into 6.5.', range: 'Kings, tens, deuces, heart draws, Q-J, J-9, A-J, pairs.' },
      { street: 'turn', text: 'The 7♦ is a blank. They check and call 9.7 into 14. Sets and two pair would often raise a board this wet.', range: 'Kings, tens, a few two pairs and sets, heart and straight draws.' },
      { street: 'river', text: 'The 4♦ misses the hearts and they lead 20 into 33.5. After never raising, a lead is often a miss trying to win the pot, or a weaker king betting first.', range: 'Ahead: some slow sets and two pair, some A-K. Behind: worse kings, tens, missed heart and straight draws.' },
    ],
    takeaway: 'When they never raised, a river lead is rarely a monster: call with top pair.',
  },
};
