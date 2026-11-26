import type { Lesson } from '../model';

export const L23: Record<string, Lesson> = {
  'seven-ten-river-overbet': {
    why: 'Overbet: second pair is too thin to bet a normal size, because only better hands call ⅔ pot. A big overbet makes your range look polarised, the nuts or air. Then 8-7, 7-6, small pairs and A-4 have to call it as bluff catchers, and you get paid by hands only a little worse than yours.',
    read: [
      { about: 'preflop', text: 'In an online six-max game, 100 big blinds deep, you opened T♥7♥ from the small blind and an unknown regular called in the big blind. T-T and better would usually 3-bet.' },
      { about: 'opponent', text: 'A thinking regular reads your bet size. A normal bet looks like value; an overbet looks like the nuts or a bluff, and they defend against it with bluff catchers.' },
      { about: 'board', text: '7♠4♣2♠ gave you top pair with spade and straight draws out. The 9♥ and K♣ bring overcards but change nothing between you.' },
      { about: 'sizing', text: 'They called two big bets, so naked draws are gone: they have a pair of fours or better, or ace high at worst. Sets and 9-7 would usually have raised.' },
      { about: 'range', text: 'Ahead of you: A-7, K-7, Q-7 suited, 8-8 and 9-8. Behind you: 8-7, 7-6, 6-6, 5-5, A-4 and 5-4, which call a small bet or an overbet but fold to ⅔ pot. A-5 and A-3 fold.' },
    ],
    takeaway: 'An overbet can turn their weak pairs into bluff catchers that must call, when a normal bet only gets called by better.',
  },
  'kings-fold-turn-check-raise-shove': {
    why: 'Fold: kings aren’t enough to stack off 500 big blinds deep against a range you can read this clearly. With no bluffs and almost no worse pairs, the shove is aces, and against aces you have two outs. They’d almost never take this line with queens, let alone jacks or tens.',
    read: [
      { about: 'preflop', text: 'In a big live game about 500 big blinds deep, an early player opened, a player you know very well 3-bet, and you cold 4-bet K♥K♣ on the button. They called.' },
      { about: 'opponent', text: 'A player you know extremely well: they have basically no bluffs in a spot like this, and their lines are transparent.' },
      { about: 'board', text: '9♦5♥5♣ is paired and dry. The 3♠ changes nothing.' },
      { about: 'sizing', text: 'A small flop check-raise, then a shove for almost 300 big blinds more over your turn bet. With stacks this deep, that’s only done with the best hand.' },
      { about: 'range', text: 'For value: all six combos of aces. Almost never: queens played this way.' },
    ],
    takeaway: 'Against a player whose range you can read, fold even kings when the line is only aces.',
  },
  'king-ten-three-barrel-river-call': {
    why: 'Call: your ten matters. It makes Q-T and T-8 less likely, so their value is thinner than it looks, and their missed queen draws give enough bluffs to call against. Most players 3-bet K-K, J-J and 9-9 before the flop, so sets are rare. You need 30%, and you’re a good enough bluff catcher to pay this off.',
    read: [
      { about: 'preflop', text: 'In an online six-max game you opened K♥T♣ from the small blind and a regular called in the big blind. Most players 3-bet K-K, J-J and 9-9 there, and some K-J suited.' },
      { about: 'position', text: 'You’re out of position. They raised your small flop bet, then bet the turn and the river.' },
      { about: 'board', text: 'K♠J♣9♥ is very connected. The 7♥ gives T-8 a straight and adds a heart draw, and the A♠ puts an ace over your king.' },
      { about: 'sizing', text: 'A flop raise and two bets of about ¾ pot. Raises on this flop are straights, two pair, rare sets and draws with a queen or a ten.' },
      { about: 'range', text: 'For value: Q-T and T-8 straights, K-J, and a rare set of nines. For bluffs: missed draws with a queen like Q-8.' },
    ],
    takeaway: 'Holding a card from their value hands thins their value: call with a decent bluff catcher.',
  },
  'bottom-set-call-turn-shove-wet-board': {
    why: 'Call: only a few combos beat you, two bigger sets and the 8-7 straight. With this many draws on the board, semi-bluffs like A♦7♦ are too likely to fold a set. You need about 24%, and you’re well above that.',
    read: [
      { about: 'preflop', text: 'In a big live tournament, 36 big blinds deep, you opened 5♥5♣ from second position; the cutoff and the small blind called.' },
      { about: 'players', text: 'Three saw the flop; only the cutoff called your bet, then raised all in on the turn.' },
      { about: 'board', text: '9♦6♣5♦ gives you bottom set on a board full of draws: diamonds and straights. The 3♥ adds even more straight draws.' },
      { about: 'sizing', text: 'An all-in raise over your turn bet. With this many draws around, a shove often comes from a big draw that wants you to fold.' },
      { about: 'range', text: 'Ahead of you: 6-6, 9-9 and 8-7. Behind you: combo draws like A♦7♦.' },
    ],
    takeaway: 'On a wet board, a shove is often a draw: call with a set at a good price.',
  },
  'king-jack-call-river-check-raise-jam': {
    why: 'Call: you pay about 18 big blinds to win about 88, so the price is only about 20%. Slow-played K-K, T-T and A-A, A-T and A-K suited beat you, but there are only about twelve combos of them. A-J and A-Q suited get here too, and some of them check-raise as a bluff.',
    read: [
      { about: 'preflop', text: 'Late in a big live tournament, 42 big blinds deep, the under-the-gun player opened, you 3-bet K♣J♣ two seats later, and they called.' },
      { about: 'position', text: 'They’re out of position. They check-called the flop, checked the turn and river, then check-raised all in.' },
      { about: 'board', text: 'T♠3♥2♠ has a spade draw. The T♦ pairs the board, and the K♦ gives you two pair.' },
      { about: 'sizing', text: 'A river check-raise all in is strong, but it leaves you a small price because most of your stack is already in.' },
      { about: 'range', text: 'For value: slow-played kings, tens and aces, and A-T and A-K suited. For bluffs: A-J and A-Q suited.' },
    ],
    takeaway: 'Count combos: when bluffs are a real share and the price is small, call.',
  },
  'aces-full-call-river-shove': {
    why: 'Call: it’s down to about two hands. 7♥7♦ is quads, and A♥7♥ is a smaller full house, with the odd pair of fives. A strong player shoves both, so you’re ahead most of the time and getting a big price. The call is right even though it loses to quads.',
    read: [
      { about: 'preflop', text: 'On day one of a big live tournament, very deep, you opened A♠A♦ from third position; the button and the big blind called.' },
      { about: 'opponent', text: 'A strong player who is too good to bluff here: their shove is a full house or better.' },
      { about: 'board', text: 'A♣7♣5♣ gave you top set on a monotone board. The 7♠ gave you aces full, and the 4♦ changes nothing for full houses.' },
      { about: 'sizing', text: 'They called your turn check-raise, then shoved over your river bet. That’s a full house or quads.' },
      { about: 'range', text: 'Quad sevens with 7♥7♦. Smaller full houses: A♥7♥, and less likely, fives full.' },
    ],
    takeaway: 'Count the hands that beat you: when it’s down to one combo of quads and they’d shove worse full houses too, call.',
  },
  'top-pair-nut-flush-draw-call-turn-shove': {
    why: 'Call: you need about 35%. Only 8-8, 7-7 and 3-3, about five combos, have you all but drawing dead. Against J-J, T-T and 9-9 you have 14 outs, and A-Q and K-Q bluffs are drawing to six at most. Folding top pair with the nut flush draw here gives up a lot.',
    read: [
      { about: 'preflop', text: 'In a big live game with a straddle, you opened A♣8♣ from the hijack; the button called, the small blind 3-bet, and everyone called.' },
      { about: 'opponent', text: 'The straddle is a big live player known for big bluffs. Their shoves carry plenty of air.' },
      { about: 'players', text: 'Four saw the flop. The straddle bet into all of you, and only you called.' },
      { about: 'board', text: '8♥7♠3♣ gave you top pair. The 7♣ pairs the board and gives you the nut flush draw.' },
      { about: 'sizing', text: 'A shove for your whole stack into a big pot. From a player known for big bluffs, that includes many hands you beat.' },
      { about: 'range', text: 'Monsters: 8-8, 7-7 and 3-3. Overpairs: J-J, T-T and 9-9. Bluffs: A-Q and K-Q.' },
    ],
    takeaway: 'Count your outs against each part of their range: top pair with the nut flush draw calls a big bluffer’s shove.',
  },
};
