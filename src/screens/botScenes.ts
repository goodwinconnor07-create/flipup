// A little backdrop for each AI Legend: a sky-to-ground gradient and a few emoji props that suit how
// they're known to play. Still, not animated.

export interface Scene {
  /** Top and bottom colours of the backdrop. */
  bg: [string, string];
  /** Props, placed in the corners and along the bottom. */
  props: [string, string, string];
}

/** A legend's backdrop on their card and profile: colours and props that suit how they're known to play. */
export const LEGEND_SCENES: Record<string, Scene> = {
  brunson: { bg: ['#ffd9a0', '#c9742f'], props: ['🌵', '🐎', '☀️'] },
  hellmuth: { bg: ['#ffc2b0', '#b3261e'], props: ['⏳', '🧣', '💢'] },
  negreanu: { bg: ['#ffe39a', '#ff8f3d'], props: ['💬', '🍁', '🎤'] },
  ivey: { bg: ['#4a4a62', '#0b0b12'], props: ['♠️', '🌙', '💎'] },
  dwan: { bg: ['#8ae8ff', '#1f5bff'], props: ['🎲', '⚡', '💥'] },
  rampage: { bg: ['#ffb199', '#d1294d'], props: ['💸', '🎰', '🔥'] },
};
