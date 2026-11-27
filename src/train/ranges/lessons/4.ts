import type { Lesson } from '../model';

export const L4: Record<string, Lesson> = {
  'two-pair-vs-maniac': {
    why: 'Call: you beat almost everything a maniac bets for value here. Only K-Q, 8-7 and A-J are ahead; A-9, T-9, A-6 and one-pair aces all lose to you. Half pot needs you to win about one time in four, and against a range this wide you win far more often. Raising earlier would have been even better, because he pays with worse.',
    read: [
      { about: 'preflop', text: 'A maniac who plays about 80% of hands called the cutoff’s open from the button. His range is nearly any two cards.' },
      { about: 'opponent', text: 'A maniac bets weak aces, two pairs and draws, and turns plenty of nothing into bluffs. Against him, medium-strong hands go up in value.' },
      { about: 'players', text: 'Three saw the flop; the cutoff checked the turn and folded to the bet. On the river it’s you against the maniac.' },
      { about: 'board', text: 'A♠T♥9♣ is wet and gives you top two pair. The 6♠ gives 8-7 a straight, and the J♥ completes K-Q’s broadway and makes A-J a better two pair.' },
      { about: 'sizing', text: 'A half-pot bet from a maniac is just his normal bet. It doesn’t narrow his range much: he bets this with value hands, with marginal hands and with air.' },
      { about: 'range', text: 'Ahead of you: K-Q, 8-7 and A-J. Behind you: A-9, T-9, A-6, A-K, A-Q and weaker aces, plus the odd strange bluff.' },
    ],
    takeaway: 'Against a maniac, widen what you call with: two pair is an easy call when they bet so many worse hands.',
  },
  'middle-pair-thin-value': {
    why: 'Bet small: your pair of sixes is ahead of nearly everything that checks here. They’d have bet every ten and most nines on the river, so their check leaves sixes, fours, small pairs and overcards. A third-pot bet gets called by the sixes, fours and some small pairs. Only 7-7 and 8-8 beat you, so this thin value bet earns more than checking.',
    read: [
      { about: 'preflop', text: 'The small blind flatted your cutoff open: pairs, suited aces, broadways and suited connectors. Their strongest hands would 3-bet.' },
      { about: 'position', text: 'You’re in position. You checked back the turn to keep strong hands in your checking range and get to the river cheaply.' },
      { about: 'board', text: '4♦T♣6♠ with the 9♦ turn brings straight and diamond draws. The T♥ pairs the board, so fewer tens are possible.' },
      { about: 'sizing', text: 'Check-call, check, check: a player with a ten or a strong nine would bet the river after you checked back the turn. Their range is capped at a medium pair.' },
      { about: 'range', text: 'Call a small bet: 7-6, 6-5, A-4, 5-4 and some small pairs. A-6 splits. Beat you: 7-7 and 8-8. Overcards fold.' },
    ],
    takeaway: 'When a capped range checks to you and you’re ahead of most of it, a small bet gets paid by weaker pairs.',
  },
  'two-pair-turn-shove': {
    why: 'Call: you need only 23%, and your hand is near the top of your range. They shove K-J, J-J and A-3 for value, but they also shove worse kings like K-Q and K-T and every club and straight draw. Against all of that you win more than enough. Betting small and then folding to a shove is the real mistake here.',
    read: [
      { about: 'preflop', text: 'The hijack and both blinds called your early raise at a live table, so ranges are wide. The hijack’s strongest hands would 3-bet.' },
      { about: 'players', text: 'Four players saw the flop; only the hijack called your bet. A cold call against a multiway field still leaves a wide, draw-heavy range.' },
      { about: 'board', text: 'K♣J♥3♣ has a club draw and broadway straight draws like Q-T. The 3♦ pairs the board, giving A-3 trips and J-J a full house.' },
      { about: 'sizing', text: 'Your small turn bet left little behind, and their shove only asks you for 26 more. The price is set: once most of the stack is in, you don’t fold top pair top kicker.' },
      { about: 'range', text: 'Ahead of you: K-J, J-J and A-3. A-K splits. Behind you: K-Q, K-T, club draws and straight draws like Q-T, which still have outs.' },
    ],
    takeaway: 'When your stack is short and the price is good, don’t bet small and fold: a strong hand calls the shove.',
  },
  'big-draw-multiway-turn': {
    why: 'Call: you’re getting about 8.5 to 1 with around 15 outs, and a raise is unlikely to fold out three players. Some outs aren’t clean: the T♣ and 5♣ also fill club flushes, and a higher heart draw can beat yours. Even counting fewer outs, the price is easily good enough. Calling keeps everyone in, so you get paid when you hit.',
    read: [
      { about: 'preflop', text: 'Four players limped, the button raised, and three of you called. Every range is wide and full of suited and connected hands.' },
      { about: 'players', text: 'Four players are still in. With that many, someone usually has a made hand they won’t fold, so raising with a draw rarely wins the pot straight away.' },
      { about: 'board', text: 'K♥8♣7♣ has a club draw and straight draws. The 3♥ gives you a heart flush draw to go with your open-ender: a 5 or a ten makes your straight.' },
      { about: 'sizing', text: 'A small turn bet of 14.5 into a big pot, with two callers before you, gives you a great price. Small bets in multiway pots are perfect for draws.' },
      { about: 'range', text: 'Kings, eights and sevens, sets and overpairs, club draws, and some heart draws. Some of the heart draws are higher than yours.' },
    ],
    takeaway: 'In a multiway pot, call with a big draw at a good price; a raise rarely makes everyone fold.',
  },
  'top-pair-ace-river': {
    why: 'Fold: the ace hit the hands they were betting with. You lose to their aces, overpairs, sets, two pair and K-Q, and many of their draws now have a pair of aces. Few missed draws are left to bluff. You need 29%, and you win far less often than that.',
    read: [
      { about: 'preflop', text: 'An under-the-gun open in a tournament is strong and tight: big pairs, A-K down to A-T, and suited broadways. You called on the button.' },
      { about: 'position', text: 'You have position and called twice, keeping their whole range in while your top pair was ahead of their draws.' },
      { about: 'board', text: 'J♦6♥3♠ is dry. The T♥ adds a heart draw and straight draws. The A♠ pairs their big aces, makes broadway for K-Q, and pairs the heart draws that held an ace.' },
      { about: 'sizing', text: 'Three bets that grow each street, from a tight player, is a value line. A river bet after the card that hits their range is rarely a bluff.' },
      { about: 'range', text: 'Overpairs and a set of aces; A-K, A-Q, A-J and A-T; K-Q; sets and two pair; heart draws that made a pair of aces. Only a few missed draws are bluffs.' },
    ],
    takeaway: 'When the river improves exactly the hands that were betting, top pair becomes a fold.',
  },
  'passive-overbet-limped': {
    why: 'Fold: ace-seven only beats a bluff, and a passive player who suddenly overbets has almost none. Their bet is a queen they slow-played or a spade draw that got there. With no bluffs to catch, a bluff catcher has to fold. The 38% price doesn’t help when you’re almost never ahead.',
    read: [
      { about: 'preflop', text: 'A limped pot: a weak, passive limper, a loose button and the small blind limped, and you checked. Nobody showed strength, so any two cards are possible.' },
      { about: 'opponent', text: 'A weak, passive player rarely raises or bluffs. They check strong hands, call with them, and only bet big when they’re sure. A big bet from them is real.' },
      { about: 'players', text: 'Four players saw the flop, which checked through. After your turn bet only the passive limper stayed, which is where their strength shows.' },
      { about: 'board', text: 'Q♣6♠3♦ is dry. The Q♠ pairs the board and adds a spade draw, and the A♠ completes the spades and gives you a pair of aces.' },
      { about: 'sizing', text: 'Betting 1½ times the pot is polarised. From a passive player who never raised, it’s trips or a flush, almost never a bluff.' },
      { about: 'range', text: 'A queen that checked the flop and called the turn, and spade draws that got there. Bluffs: very few.' },
    ],
    takeaway: 'When a passive player suddenly overbets, they almost always have it: fold a bluff catcher.',
  },
  'top-pair-all-in-and-call': {
    why: 'Fold: when a shove gets called with you still to act, both hands are strong. The shover has sets, straights and two pair; the caller is mostly a straight, with the A-3, 5-3, 4-3 and 3-2 a loose limper holds. Top pair is drawing nearly dead most of the time. You need 30%, and you’re nowhere near that.',
    read: [
      { about: 'preflop', text: 'Seven players limped at a live table. Every range is wide: suited aces, small connectors, any pair. Those hands all love a low board.' },
      { about: 'players', text: 'With seven players in, one pair is rarely good for big money. Three stayed for the turn, and then two put everything in before you.' },
      { about: 'board', text: 'A♣4♦2♥ is low and connected. The 5♣ makes a straight for any 3 and for 6-3, and fills up two pairs like A-5 and 5-4.' },
      { about: 'sizing', text: 'Under the gun shoved about three times the pot, and the button called it. A shove that big and a cold call of it are both face-up strength.' },
      { about: 'range', text: 'The shover: straights with any 3, sets like 5-5, 4-4, 2-2 and A-A, and two pairs like A-5, A-4, A-2 and 5-4. The caller: straights with A-3, 6-3, 5-3, 4-3 and 3-2, and sometimes sets.' },
    ],
    takeaway: 'When a shove gets called before you act, both ranges are strong: fold one pair.',
  },
  'kings-turn-overbet-shove': {
    why: 'Call: a 60-big-blind shove is much weaker than an overbet from a deep stack. They shove worse pairs like T-T to Q-Q, eights, and the club and straight draws. Kings beat every one of those made hands; only the draws can catch up, and with one card to come they usually miss. You need 40%, and you’re comfortably above it.',
    read: [
      { about: 'preflop', text: 'The big blind called your raise with 60 big blinds. They’d 3-bet their best hands, so their range is wide: pairs, suited hands and connectors.' },
      { about: 'position', text: 'Out of position, the big blind check-called the flop and then shoved the turn. A short stack shoves to avoid tough river decisions.' },
      { about: 'board', text: '8♣7♣2♥ is wet: club draws and straight draws like T-9 and 6-5. The 3♥ changes little.' },
      { about: 'sizing', text: 'The shove is nearly twice the pot, but it’s just their whole stack. With this little behind, they shove one-pair hands and draws that would fold to a bet.' },
      { about: 'range', text: 'Pairs below yours: T-T, J-J and Q-Q. Eights: A-8, K-8, 9-8, 8-6 and 8-5. Draws: clubs, T-9 and 6-5.' },
    ],
    takeaway: 'A short stack’s shove is wider than a deep stack’s overbet: an overpair calls.',
  },
  'turned-nuts-river-check-raise': {
    why: 'Call: full houses beat you, but his line almost never holds one. A-5, A-4 and A-6 would have played the turn differently, and the hands that check-raise the turn like this are pair-plus-draw hands. Everything else that shoves, smaller straights and missed draws, loses to you or splits. You need 36%, and despite the size you win most of the time.',
    read: [
      { about: 'preflop', text: 'The straddle defended your open with almost any two cards at this price. His range is very wide.' },
      { about: 'opponent', text: 'A fearless high-stakes player makes big bluffs and big hero calls. The size of his bet says less about his hand than it would from a careful player.' },
      { about: 'board', text: 'A♠5♥4♣ is a wheel board. The 6♠ gives you the nut straight, 8-7. The A♥ pairs the board, so A-5, A-4 and A-6 now make full houses.' },
      { about: 'sizing', text: 'He check-raised the turn, then check-raised all in on the river for over four times the pot. That says straight or full house, but full houses rarely take this line, so it’s often a story.' },
      { about: 'range', text: 'For value: a rare full house, smaller straights 7-3 and 3-2, and 8-7 to split. Bluffs: turn check-raises like 8-6 and 7-5 that missed, and air like T-2.' },
    ],
    takeaway: 'Judge a huge bet by the hands that would really take that line, not by its size.',
  },
  'ace-seven-river-give-up': {
    why: 'Check and give up: every hand they have beats ace-seven, and this player doesn’t fold. Their pairs make full houses and their big aces outkick you. A bluff only works if better hands fold, and against a range of 9-9 to Q-Q and A-K, A-Q and A-J that call, it won’t. An overbet shove here would just burn chips.',
    read: [
      { about: 'preflop', text: 'The cutoff 3-bet and then called your 4-bet. A-A and K-K mostly 5-bet, so their range is 9-9 to Q-Q and big aces like A-K, A-Q and A-J suited.' },
      { about: 'position', text: 'You’re out of position in a big pot with no draw, so you act first every street with a hand that can’t improve much.' },
      { about: 'board', text: '5♦5♠3♦ with the 5♣ puts trips on the board. Any pocket pair is now a full house, and any big ace has a better kicker than yours.' },
      { about: 'sizing', text: 'Two checks from them don’t make their range weak. Strong hands check behind here to keep bluffs in and to get to a showdown they win.' },
      { about: 'opponent', text: 'A famous pro who rarely folds a good hand to pressure. Bluffing a player who calls with the top of their range is throwing chips away.' },
      { about: 'range', text: 'Pairs 9-9 to Q-Q (full houses), some A-A and K-K that just called, and A-K, A-Q and A-J. Every one beats you.' },
    ],
    takeaway: 'Bluff only when better hands fold; against a range of overpairs that never folds, give up.',
  },
};
