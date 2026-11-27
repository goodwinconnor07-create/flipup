import type { Lesson } from '../model';

export const L23: Record<string, Lesson> = {
  'seven-ten-river-overbet': {
    why: 'Bet bigger than the pot: a thinking regular reads your bet size. A normal bet looks like value, so they fold the weak pairs your top pair beats and call with the hands that beat you. An overbet looks like the nuts or a bluff, and they defend against it with bluff catchers: 8-7, 7-6, 6-6, 5-5, A-4 and 5-4 call an overbet or a small bet, but fold to ⅔ pot. A-7, K-7, Q-7 suited, 8-8 and 9-8 beat you whatever you bet. The overbet gets the most from the hands you beat.',
    streets: [
      { street: 'preflop', text: 'In an online six-max game, 100 big blinds deep, you open T♥7♥ from the small blind to 3, and an unknown regular calls in the big blind. T-T and better would usually 3-bet, so their range tops out lower than yours: that gives you room to represent big hands later.', range: 'Wide: pairs up to 9-9, any ace, broadways, suited kings and queens, suited connectors.' },
      { street: 'flop', text: 'You flop top pair on 7♠4♣2♠, with spade and straight draws out. You bet 5.5 into about 6, almost the pot, and they call. A big bet charges their draws and narrows them to pairs, draws and ace high with backdoors. Sets and 4-2 would usually raise.', range: 'Sevens like A-7, K-7, 8-7 and 7-6, fours like A-4 and 5-4, pairs like 8-8, 6-6 and 5-5, spade draws, straight draws like 6-5 and 6-3, and ace high.' },
      { street: 'turn', text: 'The 9♥ brings an overcard. You bet 14.4 into about 17, and they call again. Two big calls take out the naked draws that didn’t improve and most ace high. They have a pair of fours or better, or ace high at worst; sets and 9-7 would usually have raised.', range: 'A-7, K-7 and Q-7 suited, 8-7 and 7-6, 9-8 and 8-8, 6-6 and 5-5, A-4 and 5-4, and some ace high like A-5 and A-3.' },
      { street: 'river', text: 'The K♣ brings another overcard and gives K-7 two pair. You act first. Their range is now pairs from fours up and a little ace high. A ⅔-pot bet looks like value to them, so their weak sevens and small pairs give up. An overbet looks polarised, so they call with those same pairs to catch your bluffs.', range: 'Ahead of you: A-7, K-7, Q-7 suited, 8-8 and 9-8. Behind you: 8-7, 7-6, 6-6, 5-5, A-4 and 5-4, which call a small bet or an overbet but fold to ⅔ pot. A-5 and A-3 fold.' },
    ],
    takeaway: 'Against a thinking player whose range is bluff catchers, an overbet gets called by them where a normal bet doesn’t.',
  },
  'kings-fold-turn-check-raise-shove': {
    why: 'Fold: you know this player extremely well, and they have basically no bluffs here. A 3-bet, a call of your 4-bet, a small flop check-raise and then a shove for almost 300 big blinds more over your turn bet, with stacks this deep, is only done with the best hand: aces. Queens played this way almost never happen. You’re getting a price of about 31%, but kings win only when they have queens.',
    streets: [
      { street: 'preflop', text: 'In a big live game about 500 big blinds deep, an early player opens to 3, a player you know very well 3-bets to 9, and you cold 4-bet K♥K♣ on the button to 30. The opener folds and they call. With stacks this deep, a call of a 4-bet out of position from a tight player is A-A trapping, Q-Q, J-J, A-K, and a few suited hands.', range: 'A-A trapping, Q-Q and J-J, A-K and A-Q suited, and a few suited broadways.' },
      { street: 'flop', text: 'The flop is 9♦5♥5♣, paired and dry. They check, you bet 30 into about 65, and they check-raise to 84; you call. On a dry, paired board, this player check-raises only with a hand that wants to build a big pot: aces, and very rarely queens or a five.', range: 'A-A, and almost never Q-Q, J-J or a five played this way.' },
      { street: 'turn', text: 'The 3♠ changes nothing. They check, you bet 60, and they raise all in for 350, almost 300 big blinds more. A player you know this well doesn’t risk a stack this deep without the best hand. Their line has been transparent: only aces.', range: 'Value: all six combos of aces. Almost never: queens played this way.' },
    ],
    takeaway: 'When you know a player’s line has no bluffs, believe it, even with kings.',
  },
  'king-ten-three-barrel-river-call': {
    why: 'Call: raises on this flop are straights, two pair, rare sets and draws with a queen or a ten. Your K♥T♣ removes some of their value: the ten cuts Q-T and T-8 straights, and the king cuts K-J. Most sets 3-bet before the flop. Their missed draws with a queen, like Q-8, have no showdown value and bluff the ace. A bet of about ¾ pot sets the price at about 30%, and with your blockers you’re ahead often enough.',
    streets: [
      { street: 'preflop', text: 'In an online six-max game you open K♥T♣ from the small blind to 3, and a regular calls in the big blind. Most players 3-bet K-K, J-J and 9-9 there, and some K-J suited, so their strongest hands are rarer than usual.', range: 'Wide: pairs below the biggest, suited and offsuit broadways, suited connectors, any ace.' },
      { street: 'flop', text: 'The flop is K♠J♣9♥, very connected. You bet small, 2 into 6, and they raise to 6; you call with top pair and a gutshot. Raises on this flop are straights, two pair, rare sets, and draws with a queen or a ten that want to take the pot.', range: 'Q-T (a straight), K-J, rare sets, and draws like Q-8, Q-T, T-8 and Q-9.' },
      { street: 'turn', text: 'The 7♥ gives T-8 a straight and adds a heart draw. You check, they bet 13.2 into 18, about ¾ pot, and you call. Their value now includes T-8, and their draws with a queen still have outs.', range: 'Q-T and T-8, K-J, rare sets of nines, Q-8 and other queen draws, heart draws.' },
      { street: 'river', text: 'The A♠ puts an ace over your king. You check, and they bet 33.95 into about 44.4, about ¾ pot. Their value is the straights, K-J and rare sets; their missed draws with a queen have no showdown value and bet the ace.', range: 'Value: Q-T and T-8 straights, K-J, and a rare set of nines. Bluffs: missed draws with a queen like Q-8.' },
    ],
    takeaway: 'When your cards remove their value hands, a middle-kicker top pair can call a third barrel.',
  },
  'bottom-set-call-turn-shove-wet-board': {
    why: 'Call: an all-in raise over your turn bet on a board this wet often comes from a big draw that wants you to fold. You lose to 6-6, 9-9 and 8-7, but you’re a big favourite over combo draws like A♦7♦, and even when you’re behind you can fill up on the river. You’re getting a price of about 24%, and your set wins more often.',
    streets: [
      { street: 'preflop', text: 'In a big live tournament, 36 big blinds deep, you open 5♥5♣ from second position to 2.17; the cutoff and the small blind call. A cutoff calls with pairs, suited broadways, suited aces and suited connectors.', range: 'Pairs, suited broadways, suited aces like A♦7♦, and suited connectors like 8-7.' },
      { street: 'flop', text: 'You flop bottom set on 9♦6♣5♦, a board full of draws: diamonds and straights. You bet 4 into about 8.4, the cutoff calls and the small blind folds. A cutoff calls with sets, straights, diamond draws, straight draws and pairs. On a board this wet, players continue with any piece of it, so the call doesn’t narrow them much.', range: 'Sets 6-6 and 9-9, 8-7 (a straight), diamond draws, straight draws like 8-x and 7-x, and nines and sixes.' },
      { street: 'turn', text: 'The 3♥ adds even more straight draws. You bet 12 into about 16.4, and they raise all in to 30.33. With this many draws around, a shove often comes from a big draw that wants you to fold.', range: 'Ahead of you: 6-6, 9-9 and 8-7. Behind you: combo draws like A♦7♦.' },
    ],
    takeaway: 'On a wet board with a short stack, call a shove with a set: their draws outnumber their bigger hands.',
  },
  'king-jack-call-river-check-raise-jam': {
    why: 'Call: a river check-raise all in is strong, but most of your stack is already in, so the price is only about 20%. Count the combos. Their value is slow-played kings, tens and aces, and A-T and A-K suited; their bluffs are A-J and A-Q suited, which missed and turned into a bluff. Your king removes some of their kings and A-K. You need to win one time in five, and you do more often than that.',
    streets: [
      { street: 'preflop', text: 'Late in a big live tournament, 42 big blinds deep, the under-the-gun player opens to 2.5, you 3-bet K♣J♣ two seats later to 7.5, and they call. A deep-stacked opener calls a 3-bet out of position with pairs, suited aces and suited broadways, and sometimes traps with A-A or K-K.', range: 'Pairs, suited aces like A-K, A-Q, A-J and A-T, suited broadways, and some A-A and K-K trapping.' },
      { street: 'flop', text: 'The flop is T♠3♥2♠, with a spade draw. They check, you c-bet 5.75 into about 17.5, and they call. A check-call keeps overpairs, tens, spade draws and ace high with backdoors.', range: 'Overpairs, tens like A-T, spade draws, sets, and A-K, A-Q and A-J with backdoor draws.' },
      { street: 'turn', text: 'The T♦ pairs the board. They check, and you check behind. Checking keeps the pot small with king high and lets their ace-high hands keep bluffing. Their check keeps their whole range: slow-played big pairs and tens, and ace high.', range: 'Slow-played overpairs, tens, A-K, A-Q and A-J, and spade draws.' },
      { street: 'river', text: 'The K♦ gives you two pair, kings and tens. They check, you bet 11.5 into about 29, and they check-raise all in to 29.4. A river check-raise all in is strong: slow-played kings, tens and aces, and A-T and A-K. But A-J and A-Q suited missed and can only win by raising.', range: 'Value: slow-played kings, tens and aces, and A-T and A-K suited. Bluffs: A-J and A-Q suited.' },
    ],
    takeaway: 'When a big raise leaves you a small price, count the combos: call if their bluffs are enough.',
  },
  'aces-full-call-river-shove': {
    why: 'Call: a strong player who is too good to bluff here shoves only with a full house or better. Count the hands that beat you: only quad sevens, and with two sevens on the board and you holding none, that’s a single combo, 7♥7♦. Smaller full houses like A♥7♥, and less likely fives full, shove too, and you beat them. A price of about 23% is easy to beat when only one hand has you.',
    streets: [
      { street: 'preflop', text: 'On day one of a big live tournament, very deep, you open A♠A♦ from third position to 2.67; the button and the big blind call. A button calls with pairs, suited aces, suited broadways and suited connectors.', range: 'Pairs, suited aces like A♥7♥, suited broadways, and suited connectors.' },
      { street: 'flop', text: 'You flop top set on A♣7♣5♣, a monotone board. You bet 4.67 into about 8.5, the button calls and the big blind folds. A button calls with flushes, single clubs, aces, sevens, fives and sets.', range: 'Flushes, single clubs, aces like A♥7♥, sevens, fives, sets 7-7 and 5-5.' },
      { street: 'turn', text: 'The 7♠ gives you aces full. You check, they bet 11.33, and you check-raise to 38.67; they call. Calling a check-raise on a paired board narrows them to strong hands: full houses, flushes and trips.', range: 'Quad sevens, A♥7♥, fives full, flushes, and trips like 8-7 and 7-6.' },
      { street: 'river', text: 'The 4♦ changes nothing for full houses. You bet 108 and they shove for 243.32. A strong player too good to bluff here shoves only with a full house or better.', range: 'Value: quad sevens with 7♥7♦. Smaller full houses: A♥7♥, and less likely, fives full.' },
    ],
    takeaway: 'Count the hands that beat you: when it’s one combo, call even a shove.',
  },
  'top-pair-nut-flush-draw-call-turn-shove': {
    why: 'Call: the straddle is a big live player known for big bluffs, and their shoves carry plenty of air. Their value is 8-8, 7-7 and 3-3, and J-J, T-T and 9-9 overpairs; their bluffs are A-Q and K-Q with six outs. Top pair, top kicker is far ahead of A-Q and K-Q. Against the overpairs, any club, ace or eight wins, and against the sets the flush draw is still live. You’re getting a price of about 34%, and against this range you win more often than that.',
    streets: [
      { street: 'preflop', text: 'In a big live game with a straddle, you open A♣8♣ from the hijack to 3.5; the button calls, the small blind 3-bets to 16.25, and everyone calls, including the straddle. A big player in the straddle calls a 3-bet with a wide range.', range: 'The straddle: pairs, broadways like A-Q and K-Q, suited aces, suited connectors.' },
      { street: 'flop', text: 'You flop top pair on 8♥7♠3♣. The small blind checks, the straddle bets 28.75 into 65, and only you call. A bet into four players usually means a strong hand, but from a big bluffer it’s wide: sets, overpairs, and big cards with backdoors that want to take the pot. Calling with top pair and a backdoor flush draw keeps their bluffs in.', range: 'Sets, overpairs like J-J, T-T and 9-9, A-Q and K-Q, straight draws.' },
      { street: 'turn', text: 'The 7♣ pairs the board and gives you the nut flush draw. The straddle shoves 135 into about 122.5, putting you all in. Sets and overpairs shove to stop your draws, and a player known for big bluffs also shoves A-Q and K-Q, which have six outs and plenty of fold equity. You have top pair plus the nut flush draw, so even when you’re behind you have many ways to win.', range: 'Monsters: 8-8, 7-7 and 3-3. Overpairs: J-J, T-T and 9-9. Bluffs: A-Q and K-Q.' },
    ],
    takeaway: 'Against a big bluffer, top pair with the nut flush draw calls a shove.',
  },
};
