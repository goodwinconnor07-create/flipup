// The lobby's blue, or the game's colour on a lobby drawn in it (19 Nov 2026, the owner's pick from a mock-up: the
// lobby page takes the chosen game's colour, as Home does). `LobbyTint` sets it for a page; the lobby's links, Add
// Bot, Back and the Start game label read it with `useLobbyTint()`, and anywhere else gets the brand blue.
import { createContext, useContext, type ReactNode } from 'react';

import { gameLook } from '@design/gameArt';

import { brand } from './brand';

export interface Tint {
  /** Links and text buttons on the dark page (Back, Change, How it plays, Add Bot, Copy). */
  link: string;
  /** Words on the white Start game button. */
  ink: string;
  /** Its second line, a shade deeper. */
  inkSoft: string;
  /** The page's darkest colour, for the fade under Start game (none: the blue page's own). */
  night?: string;
  /** Start game's solid fill while it waits (none: the blue page's). */
  idle?: string;
  /** A popup's solid fill (the Add a bot menu): the page's own middle colour, so it reads as part of the page. */
  surface: string;
}

const BLUE: Tint = { link: brand.violetDark, ink: brand.violet, inkSoft: brand.violetDeep, surface: '#132048' };

const channels = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
/** Towards white by `k` (a pale tint that reads on the dark page). */
const lift = (h: string, k: number) => hex(channels(h).map((v) => v + (255 - v) * k));
/** Towards black by `k` (dark enough to read on white). */
const deepen = (h: string, k: number) => hex(channels(h).map((v) => v * (1 - k)));

/** A game's tint: a pale version of its light tone for links (4.5:1 or better on its page), its band darkened for ink on white. */
export function gameTint(variant: string): Tint {
  const look = gameLook(variant as Parameters<typeof gameLook>[0]);
  return { link: lift(look.tone, 0.45), ink: deepen(look.band, 0.15), inkSoft: deepen(look.band, 0.3), night: deepen(look.band, 0.82), idle: deepen(look.band, 0.55), surface: deepen(look.card[0], 0.55) };
}

const Ctx = createContext<Tint | null>(null);

export function LobbyTint({ tint, children }: { tint: Tint | null; children: ReactNode }) {
  return <Ctx.Provider value={tint}>{children}</Ctx.Provider>;
}

/** The tint a lobby set, or null when the page is the plain blue one. */
export const useLobbyTintOrNull = (): Tint | null => useContext(Ctx);
/** The lobby's link and ink colours: the game's on a game-coloured lobby, the brand blue anywhere else. */
export const useLobbyTint = (): Tint => useContext(Ctx) ?? BLUE;
