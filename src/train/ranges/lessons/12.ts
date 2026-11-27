import type { Lesson } from '../model';

export const L12: Record<string, Lesson> = {
  'bottom-pair-call-small-river-bet': {
    why: 'Call: wide against wide, they reach the river with lots of hands that have nothing, and a small bet after a checked turn is where those bluffs show up. Your pair of threes beats every one of them. You need a quarter, and the missed club draws and floats get you there.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended: both ranges are wide.' },
      { about: 'position', text: 'You’re in position and checked back the turn with bottom pair to get to a cheap showdown.' },
      { about: 'board', text: 'Q♣5♣3♦ has a club draw and gutshots. The K♥ and the 2♠ miss them all.' },
      { about: 'sizing', text: 'A half-pot lead after a checked turn. Typical live players bet bigger with queens and kings; the smaller size leans toward missed hands.' },
      { about: 'range', text: 'For value: queens, kings and better, usually bet bigger. For bluffs: missed club draws, and J-T, A-J, A-T and 7-6 that floated or missed a gutshot.' },
    ],
    takeaway: 'Small river bets after a checked turn are where live players’ bluffs show up: bottom pair can catch them.',
  },
  'queens-fold-ace-flush-river-3bet-pot': {
    why: 'Fold: in a tight early-position 3-bet pot there are hardly any bluffs left. The flushes got there, the aces got there, and pairs like 9-9 and T-T wouldn’t bet. Their range is nearly all value. You need 29%, and queens are almost never good.',
    read: [
      { about: 'preflop', text: 'Under the gun opened and called your 3-bet: a tight range of pairs, suited aces and big cards.' },
      { about: 'position', text: 'They’re out of position. They check-called the flop, checked the turn, then led the river.' },
      { about: 'board', text: 'J♠6♠3♥ has a spade draw. The A♠ completes the spades and pairs every ace in their range, and the 2♣ changes nothing.' },
      { about: 'sizing', text: 'A river bet of over 60% of the pot after the scare cards hit. Medium pairs would check; the bet is a made hand.' },
      { about: 'range', text: 'For value: flushes; A-K, A-Q, A-J, A-T, A-5 and A-4; sets. Bluffs: the odd missed K-Q or K-T.' },
    ],
    takeaway: 'In a tight 3-bet pot, when the scare cards hit their range, a big river bet is almost all value.',
  },
  'sevens-call-small-bet-king-river-3bet-pot': {
    why: 'Call: even though the bet is small, their range is polarised. When a king lands after you 3-bet and checked the turn, they put you on A-K and won’t bet tens or jacks thinly. So they bet a king or better, or a Q-J, A-Q or A-J that floated the flop and missed. You beat all of those bluffs at a good price.',
    read: [
      { about: 'preflop', text: 'You 3-bet the button against a cutoff open and they called: pairs, broadways and suited aces.' },
      { about: 'position', text: 'You’re in position. You checked back the turn with sevens, which beat their floats but not much else.' },
      { about: 'board', text: 'T♣8♥8♦ is paired. The 4♠ is a blank, and the K♦ hits A-K, K-Q and K-J.' },
      { about: 'sizing', text: 'A small river lead. Their medium hands would check to see a showdown, so even a small bet is strong hands or missed ones.' },
      { about: 'range', text: 'For value: A-K, K-Q, K-J and K-T, and T-T full. For bluffs: Q-J, A-Q and A-J that floated the flop.' },
    ],
    takeaway: 'When their medium hands would check, even a small bet is polarised: call if you beat the bluffs.',
  },
  'second-pair-check-river-out-of-position': {
    why: 'Check: your nines have real showdown value. Wide against wide, after a small c-bet and a checked turn, you beat lots of ace highs, smaller pairs and worse nines. A bet folds those and gets called by queens, kings, flushes and better nines. Take the showdown.',
    read: [
      { about: 'preflop', text: 'You defended the big blind against a button open: wide ranges on both sides.' },
      { about: 'position', text: 'You’re out of position and act first on the river. Checking lets you see the showdown if they check behind.' },
      { about: 'board', text: 'Q♣9♥4♠ gave you second pair. The K♣ adds a club draw and straight draws, and the 2♣ completes the clubs.' },
      { about: 'sizing', text: 'A small c-bet, then a checked turn. Strong hands usually bet the turn, so their range is weaker than it could be.' },
      { about: 'range', text: 'Ahead of you: queens, kings, club flushes, A-9, K-9 and J-T. Behind you: worse nines, smaller pairs and ace high, which fold to a bet.' },
    ],
    takeaway: 'Keep your showdown value: when a bet folds worse hands and gets called by better ones, check.',
  },
  'ace-ten-fold-utg-triple-barrel': {
    why: 'Fold: ace-high boards give an early opener very few natural bluffs, only J-T and K-T. Live players rarely invent others, and they bet their better aces for value. Your A-T is a bluff catcher against a range that’s nearly all value. You need 30%, and you’re well short.',
    read: [
      { about: 'preflop', text: 'Under the gun opened and you defended the big blind. Their range is big pairs, big aces and suited broadways.' },
      { about: 'position', text: 'You’re out of position and check-called every street.' },
      { about: 'board', text: 'A♣9♠2♦ is ace-high, which favours the early opener’s range. The Q♦ adds straight draws for J-T and K-T, and the 6♥ misses them.' },
      { about: 'sizing', text: 'Three bets that grow each street. A typical live player triple-barrels with value, not with random hands.' },
      { about: 'range', text: 'For value: better aces, two pair and sets. Other A-T splits. For bluffs: J-T and K-T, and little else.' },
    ],
    takeaway: 'On ace-high boards an early opener has few natural bluffs: fold weak top pair to three barrels.',
  },
  'top-pair-fold-turn-raise-after-checked-flop': {
    why: 'Fold: live players hardly ever raise this turn as a bluff after checking the flop. A player who checked with nothing doesn’t start raising a gutshot here, and top pair doesn’t play this fast. Against sets, K-J and slow-played aces you’re nearly drawing dead. You need 26%, and you’re far short.',
    read: [
      { about: 'preflop', text: 'Under the gun opened and you defended the big blind. Their range is strong: big pairs, big aces and suited broadways.' },
      { about: 'position', text: 'They’re in position and checked back the flop. Checking back a dry flop is often a big hand slowing down, or a hand with nothing.' },
      { about: 'board', text: 'K♣7♠2♦ is dry. The J♦ adds K-J two pair and a diamond draw.' },
      { about: 'sizing', text: 'A raise to three times your bet on the turn. After checking the flop, that’s a slow-played monster or a hand that just improved.' },
      { about: 'opponent', text: 'A typical live player doesn’t turn a missed hand into a turn raise. Their raises are value.' },
      { about: 'range', text: 'Sets, K-J and aces that slowed down on the flop.' },
    ],
    takeaway: 'When a player who checked the flop raises the turn, they usually slow-played: fold one pair.',
  },
  'top-two-fold-big-river-bet-after-check-raise': {
    why: 'Fold: the worst hand they bet this big is A-Q or 4-4, and both beat you. You check-raised and made the pot huge, so a live player rarely bluffs here, and they have hardly any missed hands left. You need 29%, and against an under-bluffed range even two pair is a fold.',
    read: [
      { about: 'preflop', text: 'You opened and the button called: pairs, suited aces, broadways and connectors.' },
      { about: 'position', text: 'They’re in position. They called your big flop check-raise, then bet the turn and the river themselves.' },
      { about: 'board', text: 'Q♠7♣4♦ gave you top pair. The A♦ adds aces and a diamond draw, and the K♣ gives you two pair and J-T broadway.' },
      { about: 'sizing', text: 'Calling a big check-raise, then betting big twice into a player who showed strength. Players don’t bluff huge pots into strength often.' },
      { about: 'opponent', text: 'Typical live players bluff less as the pot gets bigger. A bet over 100 big blinds is almost always real.' },
      { about: 'range', text: 'For value: A-Q, A-K, A-7 and A-4; sets; J-T. K-Q splits. A rare bluff: 6-5 suited.' },
    ],
    takeaway: 'When you’ve looked strong all hand and they still bet huge, they rarely bluff: fold even two pair.',
  },
  'queens-overbet-blank-turn-capped-range': {
    why: 'Overbet: they’re capped, because their sets and two pair would have raised the flop. Their best hands are jacks like A-J and K-J, and those won’t fold to any size, nor will their draws. So put the money in while you can and bet big.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended with a wide range.' },
      { about: 'position', text: 'You’re in position, and they checked to you again on the turn.' },
      { about: 'board', text: 'J♠9♠2♣ has spade draws and straight draws like K-T, Q-T, T-8 and 8-7. The 3♦ is a blank.' },
      { about: 'sizing', text: 'They just called your half-pot flop bet. Sets and two pair would raise here, so their range is capped below your queens.' },
      { about: 'range', text: 'Jacks and draws call any size. Nines call a normal bet but fold to an overbet. Smaller pairs and ace high call only small. 3-3 just made a set.' },
    ],
    takeaway: 'When they’re capped below you and their best hands won’t fold, bet big.',
  },
  'nut-flush-overbet-turn-vs-check-raiser': {
    why: 'Overbet: their sets and two pair can still make a full house, so they won’t fold to any size this turn. That means the bigger you bet, the more you win. A player who check-raises a flush draw would keep betting it, so they rarely have a flush themselves.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended.' },
      { about: 'position', text: 'You’re in position. They check-raised the flop and then checked the turn to you.' },
      { about: 'board', text: 'J♠9♠2♣ has a spade draw, and you had the nut flush draw. The 3♠ made your flush.' },
      { about: 'sizing', text: 'A flop check-raise from a typical live player is mostly sets and J-9. Live players rarely check-raise flush draws here.' },
      { about: 'range', text: 'Sets and J-9. Both have outs to a full house, so they call any bet.' },
    ],
    takeaway: 'When their hand can’t fold because it can still beat you, bet as big as you can.',
  },
  'aces-fold-turn-check-raise': {
    why: 'Fold: you’ve done all the betting, and a typical live player answers with a turn check-raise. That isn’t a bluff; it’s K-J, two pair and sets. Your aces are almost drawing dead against that range. You need 25%, and you have far less.',
    read: [
      { about: 'preflop', text: 'You opened the button and the big blind defended.' },
      { about: 'position', text: 'They’re out of position. They check-called the flop, then check-raised your big turn bet.' },
      { about: 'board', text: 'K♥7♣4♦ is dry. The J♠ makes K-J two pair, and J-7 and J-4 too.' },
      { about: 'sizing', text: 'A check-raise over a big turn bet is the strongest line on the turn. Bluffs that big into a player who keeps betting are very rare.' },
      { about: 'opponent', text: 'Typical live players almost never check-raise the turn as a bluff against someone who has bet every street.' },
      { about: 'range', text: 'Two pairs: K-J, K-7, K-4, J-7, J-4 and 7-4. Sets.' },
    ],
    takeaway: 'When you’ve done all the betting and a typical player check-raises the turn, fold even aces.',
  },
};
