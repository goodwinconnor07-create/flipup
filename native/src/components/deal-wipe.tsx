import type { Variant } from '@/engine';

import { PrintCover } from './launch-cover';

/** How long the icon holds over a game that just opened: quicker than the launch, so play starts fast. */
const DEAL_PRINT_MS = 700;

/**
 * The game's loading screen over a screen that just opened (the lobby, the table, a party): the same cover the app
 * opens with (`LaunchCover`), the icon with its shimmer, then it eases out. A table or lobby passes its game, so the
 * cover is that game's icon on its colours (as the lobby it opens onto); a party, with several games, keeps the blue
 * field. It never takes touches, so it can't block play. With Reduce Motion it's a quick fade.
 */
export function DealWipe({ variant }: { variant?: Variant }) {
  return <PrintCover total={DEAL_PRINT_MS} zIndex={50} variant={variant} />;
}
