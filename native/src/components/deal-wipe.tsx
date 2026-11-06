import { PrintCover } from './launch-cover';

/** How long the spade takes to print over a game that just opened: quicker than the launch, so play starts fast. */
const DEAL_PRINT_MS = 700;

/**
 * The game's loading screen over a screen that just opened (the lobby, the table, a party): the same cover the app
 * opens with (`LaunchCover`), the icon printed on the moving blue field, then it pops and the cover fades. It never
 * takes touches, so it can't block play. With Reduce Motion it's a quick fade.
 */
export function DealWipe() {
  return <PrintCover total={DEAL_PRINT_MS} zIndex={50} />;
}
