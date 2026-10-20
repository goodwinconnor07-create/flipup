// Computer players. Each has a style (see botStyles.ts) and plays from GTO charts and trained
// postflop tables bent by that style (botPlay.ts). They only see what a real player in their seat
// would see, and now and then they say something (botTalk.ts).

import { decide, type BotMove } from './botPlay';
import type { Game, Hand, Seat } from './types';

export { BOTS, STYLES, type StyleId } from './botStyles';
export type { BotMove } from './botPlay';

/** What the bot whose turn it is does. */
export function botMove(game: Game, hand: Hand, seat: Seat, rng: () => number): BotMove {
  return decide(game, hand, seat, rng).move;
}
