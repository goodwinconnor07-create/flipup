// Computer players. Each has a style (see botStyles.ts) and a mood (botMind.ts). Before the flop
// they play from GTO charts bent by that style; after it they picture what the others could hold
// from their public moves (botRange.ts) and weigh every option (botPlay.ts). They only see what a
// real player in their seat would see, take as long as a person would, and now and then they say
// something (botTalk.ts) or show their cards.

import { decide, type BotMove } from './botPlay';
import type { Game, Hand, Seat } from './types';

export { BOTS, STYLES, type StyleId } from './botStyles';
export type { BotMove } from './botPlay';

/** What the bot whose turn it is does. */
export function botMove(game: Game, hand: Hand, seat: Seat, rng: () => number): BotMove {
  return decide(game, hand, seat, rng).move;
}
