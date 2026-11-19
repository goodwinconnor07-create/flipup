import { type ReactNode } from 'react';

import type { Variant } from '@/engine';
import { gameTint, LobbyTint } from '@/theme';

import { GrainBackground } from '../grain-background';
import { GameBackdrop } from '../home/game-backdrop';

/**
 * A lobby's page (19 Nov 2026, the owner's pick from a mock-up): in the chosen game's colour, as Home is, fading to
 * the next game's when Change picks another, with its links, Add Bot, Back and the Start game label in the game's
 * tint (`LobbyTint`). With no single game (a party's lobby) it's the blue moving field.
 */
export function LobbyBackdrop({ variant, children }: { variant: Variant | null; children: ReactNode }) {
  if (!variant) return <GrainBackground>{children}</GrainBackground>;
  return (
    <LobbyTint tint={gameTint(variant)}>
      <GameBackdrop variant={variant}>{children}</GameBackdrop>
    </LobbyTint>
  );
}
