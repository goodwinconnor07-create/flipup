import type { Variant } from '@/engine';
import { radius } from '@/theme';

import { GameIcon, IconBanner, iconCorner } from './game-icon';

// A game's pictures, both from its icon (game-icon.tsx). The web app still draws the older card scenes from
// src/design/gameArt.ts.

/** The game's wide picture: its icon on its own blurred art. For the big cards and sheets. */
export function GamePicture({ variant, width, height, rounded = radius.md }: { variant: Variant; width: number; height: number; rounded?: number }) {
  return <IconBanner id={variant} width={width} height={height} rounded={rounded} />;
}

/** The game's icon, for lists, shelves and the Setup row. */
export function GameThumb({ variant, size, rounded = iconCorner(size) }: { variant: Variant; size: number; rounded?: number }) {
  return <GameIcon id={variant} size={size} rounded={rounded} />;
}
