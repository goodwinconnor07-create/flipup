import { PrintCover } from './launch-cover';

/** How long the icon holds over a game that just opened: quicker than the launch, so play starts fast. */
const DEAL_PRINT_MS = 700;

/**
 * The game's loading screen over a screen that just opened (the lobby, the table, a party): the same cover the app
 * opens with (`LaunchCover`), the icon with its shimmer on the moving blue field, then it eases out. It never
 * takes touches, so it can't block play. With Reduce Motion it's a quick fade.
 */
export function DealWipe() {
  return <PrintCover total={DEAL_PRINT_MS} zIndex={50} />;
}
