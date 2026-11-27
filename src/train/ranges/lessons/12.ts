import type { Lesson } from '../model';

export const L12: Record<string, Lesson> = {
  'bottom-pair-call-small-river-bet': {
    why: 'Call: wide against wide, they reach the river with lots of hands that have nothing, and a small bet after a checked turn is where those bluffs show up. Your pair of threes beats every one of them. You need a quarter, and the missed club draws and floats get you there.',
    streets: [
      { street: 'preflop', text: 'You open 4♥3♥ on the button and the big blind defends. Both ranges are wide, so both players reach later streets with plenty of hands that have nothing.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'You flop bottom pair on Q♣5♣3♦ and c-bet small. A small bet gets called by a lot: queens, fives, club draws, gutshots, and ace-high hands floating to see if you give up.', range: 'Queens, fives, club draws, gutshots like J-T and 7-6, and ace-high floats like A-J and A-T.' },
      { street: 'turn', text: 'The K♥ adds an overcard. You check back to get to a showdown: bottom pair doesn’t want to face a check-raise, and checking keeps their floats in.', range: 'Queens and kings, fives, club draws, gutshots, and ace-high floats.' },
      { street: 'river', text: 'The 2♠ misses every draw, and they bet half the pot. Their club draws, J-T, 7-6 and floated aces all missed and have no way to win but to bet. A typical live player bets bigger with queens and kings.', range: 'Value: queens, kings and better, usually bet bigger. Bluffs: missed club draws, and J-T, A-J, A-T and 7-6 that missed or floated.' },
    ],
    takeaway: 'Small river bets after a checked turn are where live players’ bluffs show up: bottom pair can catch them.',
  },
  'queens-fold-ace-flush-river-3bet-pot': {
    why: 'Fold: in a tight early-position 3-bet pot there are hardly any bluffs left. The flushes got there, the aces got there, and pairs like 9-9 and T-T wouldn’t bet. Their range is nearly all value. You need 29%, and queens are almost never good.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens and calls your 3-bet with Q♥Q♦. Calling a 3-bet from the tightest seat leaves a narrow range: pairs, suited aces and big cards.', range: 'Pairs like 9-9 to J-J, suited aces, A-K, A-Q, and suited broadways.' },
      { street: 'flop', text: 'The flop is J♠6♠3♥. You c-bet and they call with pairs, aces and spade draws. The flop call keeps their whole range in.', range: 'Pairs, J-J and sets, A-J, big aces with a spade, and spade draws.' },
      { street: 'turn', text: 'The A♠ brings the flush and pairs every ace in their range. You check back: queens now trail too much of their range to keep betting.', range: 'Flushes, aces (A-K down to A-4), sets, and pairs.' },
      { street: 'river', text: 'The 2♣ is a blank, and they bet over 60% of the pot. Their draws got there, their aces got there, and 9-9 or T-T would check for a showdown rather than bet.', range: 'Value: flushes; A-K, A-Q, A-J, A-T, A-5 and A-4; sets. Bluffs: the odd missed K-Q or K-T.' },
    ],
    takeaway: 'In a tight 3-bet pot, when the scare cards hit their range, a big river bet is almost all value.',
  },
  'sevens-call-small-bet-king-river-3bet-pot': {
    why: 'Call: even though the bet is small, their range is polarised. When a king lands after you 3-bet and checked the turn, they put you on A-K and won’t bet tens or jacks thinly. So they bet a king or better, or a Q-J, A-Q or A-J that floated the flop and missed. You beat all of those bluffs at a good price.',
    streets: [
      { street: 'preflop', text: 'You 3-bet 7♣7♠ on the button against a cutoff open, and they call. Their range: pairs, broadways and suited aces.', range: 'Pairs, broadways like K-Q, Q-J and K-J, A-Q, A-J, and suited aces.' },
      { street: 'flop', text: 'The flop is T♣8♥8♦. You c-bet small and they call with tens, pairs, Q-J and ace-high floats.', range: 'Tens, pairs, Q-J and J-9 drawing, and ace-high floats like A-Q and A-J.' },
      { street: 'turn', text: 'The 4♠. Your sevens beat their Q-J and ace highs, so you check back to get to a showdown.', range: 'Tens, pairs, Q-J and ace-high floats.' },
      { street: 'river', text: 'The K♦. When a king lands after you 3-bet and checked the turn, they read you for A-K, so they won’t bet tens or jacks thinly. They bet a king or better, or nothing.', range: 'Value: A-K, K-Q, K-J and K-T, and T-T (full house). Bluffs: Q-J, A-Q and A-J that floated.' },
    ],
    takeaway: 'When their medium hands would check, even a small bet is polarised: call if you beat the bluffs.',
  },
  'second-pair-check-river-out-of-position': {
    why: 'Check: your nines have real showdown value. Wide against wide, after a small c-bet and a checked turn, you beat lots of ace highs, smaller pairs and worse nines. A bet folds those and gets called by queens, kings, flushes and better nines. Take the showdown.',
    streets: [
      { street: 'preflop', text: 'You defend J♦9♦ from the big blind against a button open. Both ranges are wide.', range: 'Wide: most suited hands, broadways, pairs and connectors.' },
      { street: 'flop', text: 'You flop second pair on Q♣9♥4♠. They c-bet small and you call.', range: 'Their whole range: queens, nines, draws, pairs and air.' },
      { street: 'turn', text: 'The K♣ adds a club draw and straight draws. It goes check, check, so they rarely have a strong hand they wanted to bet.', range: 'Weak queens, nines, pairs, ace high, and draws.' },
      { street: 'river', text: 'The 2♣ completes the clubs. You beat their ace highs, smaller pairs and worse nines; a bet only gets called by queens, kings, flushes and better nines.', range: 'Ahead of you: queens, kings, club flushes, A-9, K-9 and J-T. Behind you: worse nines, smaller pairs and ace high (fold to a bet).' },
    ],
    takeaway: 'Keep your showdown value: when a bet folds worse hands and gets called by better ones, check.',
  },
  'ace-ten-fold-utg-triple-barrel': {
    why: 'Fold: ace-high boards give an early opener very few natural bluffs, only J-T and K-T. Live players rarely invent others, and they bet their better aces for value. Your A-T is a bluff catcher against a range that’s nearly all value. You need 30%, and you’re well short.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens and you defend A♦T♦ from the big blind. An under-the-gun range is big pairs, big aces and suited broadways.', range: 'Big pairs, A-K to A-T, and suited broadways like K-T and J-T.' },
      { street: 'flop', text: 'You flop top pair on A♣9♠2♦. You check-call a small c-bet. An ace-high flop is great for the opener, who has far more strong aces than you.', range: 'Aces, big pairs, and big cards like K-Q and J-T.' },
      { street: 'turn', text: 'The Q♦. They bet again: their J-T picks up a straight draw and K-T a gutshot, and their better aces keep betting for value.', range: 'Better aces, two pairs, sets, and J-T and K-T drawing.' },
      { street: 'river', text: 'The 6♥ and a third bet. On an ace-high board their natural bluffs are only J-T and K-T. Live players don’t turn K-8 or small pairs into triple barrels, and they bet A-K and A-Q for value.', range: 'Value: better aces, two pair and sets. A-T splits. Bluffs: J-T and K-T.' },
    ],
    takeaway: 'On ace-high boards an early opener has few natural bluffs: fold weak top pair to three barrels.',
  },
  'top-pair-fold-turn-raise-after-checked-flop': {
    why: 'Fold: live players hardly ever raise this turn as a bluff after checking the flop. A player who checked with nothing doesn’t start raising a gutshot here, and top pair doesn’t play this fast. Against sets, K-J and slow-played aces you’re nearly drawing dead. You need 26%, and you’re far short.',
    streets: [
      { street: 'preflop', text: 'Under the gun opens and you defend K♥Q♣ from the big blind. Their range is strong: big pairs, big aces and suited broadways.', range: 'Big pairs, big aces and suited broadways.' },
      { street: 'flop', text: 'The flop is K♣7♠2♦ and it goes check, check. They’d bet most top pairs here, so a check usually means weaker hands or a big hand slow-playing.', range: 'Big pairs below kings, A-x that missed, and slow-played sets and aces.' },
      { street: 'turn', text: 'The J♦. You bet half the pot and they raise three times your bet. A player who checked the flop with nothing doesn’t start raising a gutshot, and top pair doesn’t play this fast. This is sets, K-J and the odd slow-played aces.', range: 'Sets, K-J (two pair), and aces that slowed down on the flop.' },
    ],
    takeaway: 'When a player who checked the flop raises the turn, they usually slow-played: fold one pair.',
  },
  'top-two-fold-big-river-bet-after-check-raise': {
    why: 'Fold: the worst hand they bet this big is A-Q or 4-4, and both beat you. You check-raised and made the pot huge, so a live player rarely bluffs here, and they have hardly any missed hands left. You need 29%, and against an under-bluffed range even two pair is a fold.',
    streets: [
      { street: 'preflop', text: 'You open K♦Q♦ and the button calls: pairs, suited aces, broadways and connectors.', range: 'Pairs, suited aces, broadways and suited connectors.' },
      { street: 'flop', text: 'You flop top pair on Q♠7♣4♦. They bet, you check-raise big, and they call. Weak queens and A-J fold here, so they continue with strong queens, sets and the odd draw.', range: 'Strong queens like A-Q, sets, and a few draws.' },
      { street: 'turn', text: 'The A♦. They bet big and you call. Betting big into a player who check-raised is a strong hand.', range: 'A-Q, A-K, sets, two pairs, and J-T drawing to broadway.' },
      { street: 'river', text: 'The K♣ gives you two pair, and they bet over 100 big blinds. You’ve looked strong all hand, and they have almost no hands with nothing left.', range: 'Value: A-Q, A-K, A-7 and A-4, sets, J-T. K-Q splits. A rare bluff: 6-5 suited.' },
    ],
    takeaway: 'When you’ve looked strong all hand and they still bet huge, they rarely bluff: fold even two pair.',
  },
  'queens-overbet-blank-turn-capped-range': {
    why: 'Overbet: they’re capped, because their sets and two pair would have raised the flop. Their best hands are jacks like A-J and K-J, and those won’t fold to any size, nor will their draws. So put the money in while you can and bet big.',
    streets: [
      { street: 'preflop', text: 'You open Q♥Q♦ on the button and the big blind defends.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'The flop is J♠9♠2♣. A half-pot c-bet gets their sets and two pair to raise, while weaker jacks, nines and draws just call.', range: 'Jacks, nines, straight draws like K-T, Q-T, T-8 and 8-7, and spade draws.' },
      { street: 'turn', text: 'The 3♦ changes nothing, and they check. Their best hand is usually A-J or K-J, and they won’t fold that, or their draws, to any size.', range: 'Jacks (call any size), straight and flush draws (call any size), nines (fold to an overbet), smaller pairs and ace high (call only small), and 3-3 (a set).' },
    ],
    takeaway: 'When they’re capped below you and their best hands won’t fold, bet big.',
  },
  'nut-flush-overbet-turn-vs-check-raiser': {
    why: 'Overbet: their sets and two pair can still make a full house, so they won’t fold to any size this turn. That means the bigger you bet, the more you win. A player who check-raises a flush draw would keep betting it, so they rarely have a flush themselves.',
    streets: [
      { street: 'preflop', text: 'You open A♠7♠ on the button and the big blind defends.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'The flop is J♠9♠2♣, and they check-raise your bet. Live players rarely check-raise flush draws here, so it’s mostly sets and J-9. You call with the nut flush draw.', range: 'Sets (J-J, 9-9, 2-2) and J-9.' },
      { street: 'turn', text: 'The 3♠ gives you the nut flush, and they check. A player who check-raised with a flush draw would keep betting, so they rarely have a flush. Their sets and J-9 have outs to a full house and won’t fold.', range: 'Sets and J-9, both drawing to a full house.' },
    ],
    takeaway: 'When their hand can’t fold because it can still beat you, bet as big as you can.',
  },
  'aces-fold-turn-check-raise': {
    why: 'Fold: you’ve done all the betting, and a typical live player answers with a turn check-raise. That isn’t a bluff; it’s K-J, two pair and sets. Your aces are almost drawing dead against that range. You need 25%, and you have far less.',
    streets: [
      { street: 'preflop', text: 'You open A♠A♣ on the button and the big blind defends.', range: 'Wide: suited hands, connectors, pairs and broadways.' },
      { street: 'flop', text: 'The flop is K♥7♣4♦. You c-bet small and they call with kings, pairs and draws.', range: 'Kings, sevens, fours, pairs, and straight draws.' },
      { street: 'turn', text: 'The J♠. You bet big to get value from kings, and they check-raise. You’ve done nothing but bet, and live players almost never check-raise the turn as a bluff into that. It’s K-J, two pair and sets.', range: 'Two pairs (K-J, K-7, K-4, J-7, J-4, 7-4) and sets.' },
    ],
    takeaway: 'When you’ve done all the betting and a typical player check-raises the turn, fold even aces.',
  },
};
