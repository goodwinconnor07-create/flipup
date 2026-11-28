import type { Lesson } from '../model';

export const L12: Record<string, Lesson> = {
  'bottom-pair-call-small-river-bet': {
    why: 'Call: wide against wide, they reach the river with lots of hands that have nothing, and a small bet after a checked turn is where those bluffs show up. Your threes beat every one of them. You need a quarter, and the missed club draws and floats get you there.',
    streets: [
      { street: 'preflop', text: 'You open 4♥3♥ on the button and the big blind defends. With both ranges wide, both players reach later streets with plenty of nothing.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'You flop bottom pair on Q♣5♣3♦ and c-bet small, which gets called by a lot, including ace-high hands floating to see if you give up.', range: 'Queens, fives, club draws, gutshots like J-T and 7-6, floats like A-J and A-T.' },
      { street: 'turn', text: 'The K♥. You check back: bottom pair doesn’t want to face a check-raise, and the check keeps their floats in.', range: 'Queens and kings, fives, club draws, gutshots, ace-high floats.' },
      { street: 'river', text: 'The 2♠ misses every draw and they bet half the pot. Their missed draws and floats have no way to win but to bet, and a typical live player bets bigger with queens and kings.', range: 'Value: queens, kings and better, usually bet bigger. Bluffs: missed club draws, J-T, A-J, A-T, 7-6.' },
    ],
    takeaway: 'Small river bets after a checked turn are where live players’ bluffs show up: bottom pair can catch them.',
  },
  'queens-fold-ace-flush-river-3bet-pot': {
    why: 'Fold: in a tight early-position 3-bet pot there are hardly any bluffs left. The flushes and the aces got there, and pairs like 9-9 and T-T would check rather than bet. Their range is nearly all value, you need 29%, and queens are almost never good.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens and calls your 3-bet with Q♥Q♦. Calling a 3-bet from the tightest seat leaves a narrow range.', range: 'Pairs 9-9 to J-J, suited aces, A-K, A-Q, suited broadways.' },
      { street: 'flop', text: 'On J♠6♠3♥ you c-bet and they call, keeping their whole range in.', range: 'Pairs, J-J and sets, A-J, big aces with a spade, spade draws.' },
      { street: 'turn', text: 'The A♠ brings the flush and pairs every ace they hold. You check back: queens now trail too much of their range to keep betting.', range: 'Flushes, aces A-K to A-4, sets, pairs.' },
      { street: 'river', text: 'The 2♣ is a blank and they bet over 60% of the pot. Their draws and aces got there, and their smaller pairs would check for a showdown.', range: 'Value: flushes, A-K, A-Q, A-J, A-T, A-5, A-4, sets. Bluffs: the odd missed K-Q or K-T.' },
    ],
    takeaway: 'In a tight 3-bet pot, when the scare cards hit their range, a big river bet is almost all value.',
  },
  'sevens-call-small-bet-king-river-3bet-pot': {
    why: 'Call: even though the bet is small, it’s polarised. With a king landing after you 3-bet and checked the turn, they put you on A-K and won’t bet tens or jacks thinly. So they bet a king or better, or a missed Q-J, A-Q or A-J, and you beat all of those bluffs at a good price.',
    streets: [
      { street: 'preflop', text: 'You 3-bet 7♣7♠ on the button over a cutoff open, and they call.', range: 'Pairs, broadways like K-Q, Q-J and K-J, A-Q, A-J, suited aces.' },
      { street: 'flop', text: 'On T♣8♥8♦ they check, you c-bet 12 into 33.5, and they call with anything that hit or floats.', range: 'Tens, pairs like 9-9 and J-J, Q-J and J-9 drawing, floats like A-Q and A-J.' },
      { street: 'turn', text: 'The 4♠ checks through. Your sevens beat their Q-J and ace highs but not their tens, so you take the free card.', range: 'Tens, pairs, Q-J, ace-high floats.' },
      { street: 'river', text: 'The K♦ and they bet 25 into 57.5. After you 3-bet and checked the turn, they read you for A-K, so their tens and jacks check; they bet a king or better, or a missed float.', range: 'Value: A-K, K-Q, K-J, K-T, T-T. Bluffs: Q-J, A-Q and A-J that floated.' },
    ],
    takeaway: 'When their medium hands would check, even a small bet is polarised: call if you beat the bluffs.',
  },
  'second-pair-check-river-out-of-position': {
    why: 'Check: your nines have real showdown value. After a small c-bet and a checked turn you beat lots of ace highs, smaller pairs and worse nines, and a bet folds those while queens, kings, flushes and better nines call. Take the showdown.',
    streets: [
      { street: 'preflop', text: 'A typical live player opens the button and you defend J♦9♦ from the big blind. Both ranges are wide.', range: 'Most suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'You flop second pair on Q♣9♥4♠. They c-bet small, 5 into 10.5, with almost everything, and you call.', range: 'Queens, nines, draws, pairs and air.' },
      { street: 'turn', text: 'The K♣ adds club and straight draws, and it checks through, so they rarely hold a strong hand they wanted to bet.', range: 'Weak queens, nines, pairs, ace high, draws.' },
      { street: 'river', text: 'The 2♣ completes the clubs. You act first, ahead of their ace highs, smaller pairs and worse nines, which fold to a bet; the hands that call beat you.', range: 'Ahead: queens, kings, flushes, A-9, K-9, J-T. Behind (fold to a bet): worse nines, smaller pairs, ace high.' },
    ],
    takeaway: 'Keep your showdown value: when a bet folds worse hands and gets called by better ones, check.',
  },
  'ace-ten-fold-utg-triple-barrel': {
    why: 'Fold: an ace-high board gives an early opener very few natural bluffs, only J-T and K-T, and live players rarely invent others while betting their better aces for value. Your A-T is a bluff catcher against a range that’s nearly all value. You need 30%, and you’re well short.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens and you defend A♦T♦ from the big blind against the tightest range at the table.', range: 'Big pairs, A-K to A-T, suited broadways like K-T and J-T.' },
      { street: 'flop', text: 'You flop top pair on A♣9♠2♦ and check-call a small c-bet. An ace-high flop is great for the opener, who holds far more strong aces than you.', range: 'Aces, big pairs, big cards like K-Q and J-T.' },
      { street: 'turn', text: 'The Q♦ and they bet again: their better aces for value, and J-T and K-T with fresh draws.', range: 'Better aces, two pairs, sets, J-T and K-T drawing.' },
      { street: 'river', text: 'The 6♥ and a third bet. Live players don’t turn K-8 or small pairs into triple barrels, so the bluffs are only the missed J-T and K-T.', range: 'Value: better aces, two pair, sets. Split: A-T. Bluffs: J-T and K-T.' },
    ],
    takeaway: 'On ace-high boards an early opener has few natural bluffs: fold weak top pair to three barrels.',
  },
  'top-pair-fold-turn-raise-after-checked-flop': {
    why: 'Fold: live players hardly ever raise this turn as a bluff after checking the flop. A player who checked with nothing doesn’t start raising a gutshot, and top pair doesn’t play this fast. Against sets, K-J and slow-played aces you’re nearly drawing dead, and you need 26%.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens and you defend K♥Q♣ from the big blind against the tightest range at the table.', range: 'Big pairs, big aces, suited broadways.' },
      { street: 'flop', text: 'K♣7♠2♦ checks through. They’d bet most top pairs here, so the check is weaker hands or a big hand slow-playing.', range: 'Pairs below kings, unpaired big aces, slow-played sets and aces.' },
      { street: 'turn', text: 'The J♦. You bet half the pot and they raise three times your bet. After a flop check, a raise this big on this card is a hand that was waiting.', range: 'Sets, K-J, aces that slowed down on the flop.' },
    ],
    takeaway: 'When a player who checked the flop raises the turn, they usually slow-played: fold one pair.',
  },
  'top-two-fold-big-river-bet-after-check-raise': {
    why: 'Fold: the worst hand they bet this big is A-Q or 4-4, and both beat you. You check-raised and made the pot huge, so a live player rarely bluffs here, and they hold almost no hands with nothing. You need 29%, and against an under-bluffed range even two pair is a fold.',
    streets: [
      { street: 'preflop', text: 'You open K♦Q♦ from the hijack, 300 big blinds deep, and the button calls.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'You flop top pair on Q♠7♣4♦. They bet, you check-raise big, and they call. Weak queens and A-J fold to that.', range: 'Strong queens like A-Q, sets, a few draws.' },
      { street: 'turn', text: 'The A♦ gives you a flush draw. You check, they bet 50 into 81.5, and you call. Betting big into a check-raiser is a strong hand.', range: 'A-Q, A-K, sets, two pairs, J-T drawing.' },
      { street: 'river', text: 'The K♣ gives you two pair, and they bet over 100 big blinds. You’ve looked strong all hand, and they have almost nothing left that missed.', range: 'Value: A-Q, A-K, A-7, A-4, sets, J-T. Split: K-Q. A rare bluff: 6-5 suited.' },
    ],
    takeaway: 'When you’ve looked strong all hand and they still bet huge, they rarely bluff: fold even two pair.',
  },
  'queens-overbet-blank-turn-capped-range': {
    why: 'Overbet: they’re capped, because their sets and two pair would have raised the flop. Their best hands are jacks like A-J and K-J, and those won’t fold to any size, and neither will their draws. Put the money in while you can.',
    streets: [
      { street: 'preflop', text: 'You open Q♥Q♦ on the button and a typical live player defends the big blind. They’d 3-bet many of their best hands, so their range is wide but capped.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'On J♠9♠2♣ you c-bet half the pot and they call. Their sets and two pair would raise; weaker jacks, nines and draws just call.', range: 'Jacks, nines, straight draws like K-T, Q-T, T-8 and 8-7, spade draws.' },
      { street: 'turn', text: 'The 3♦ changes nothing and they check. Their best hand is usually A-J or K-J, which won’t fold to any size, and neither will their draws.', range: 'Call any size: jacks, draws. Fold to an overbet: nines. Small only: smaller pairs, ace high. Set: 3-3.' },
    ],
    takeaway: 'When they’re capped below you and their best hands won’t fold, bet big.',
  },
  'nut-flush-overbet-turn-vs-check-raiser': {
    why: 'Overbet: their sets and two pair can still make a full house, so they won’t fold to any size, and the bigger you bet, the more you win. A player who check-raises a flush draw would keep betting it, so they rarely hold a flush themselves.',
    streets: [
      { street: 'preflop', text: 'You open A♠7♠ on the button and a typical live player defends the big blind wide.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'On J♠9♠2♣ they check-raise your bet. Live players rarely check-raise flush draws here, so it’s mostly sets and J-9. You call with the nut flush draw.', range: 'Sets J-J, 9-9 and 2-2, and J-9.' },
      { street: 'turn', text: 'The 3♠ gives you the nut flush, and they check. Their sets and J-9 can still fill up, so they won’t fold.', range: 'Sets and J-9, both drawing to a full house.' },
    ],
    takeaway: 'When their hand can’t fold because it can still beat you, bet as big as you can.',
  },
  'aces-fold-turn-check-raise': {
    why: 'Fold: you’ve done all the betting, and a typical live player answers with a turn check-raise. That isn’t a bluff; it’s K-J, two pair and sets, and your aces are almost drawing dead. You need 25% and have far less.',
    streets: [
      { street: 'preflop', text: 'You open A♠A♣ on the button and a typical live player defends the big blind wide.', range: 'Suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'On K♥7♣4♦ you c-bet small and they call. Two pair and sets often check-raise here, but some wait for the turn.', range: 'Kings, sevens, fours, pairs, straight draws.' },
      { street: 'turn', text: 'The J♠. You bet big for value from kings, and they check-raise. Into a player who has done nothing but bet, live players almost never check-raise the turn as a bluff.', range: 'Two pairs K-J, K-7, K-4, J-7, J-4, 7-4, and sets.' },
    ],
    takeaway: 'When you’ve done all the betting and a typical player check-raises the turn, fold even aces.',
  },
};
