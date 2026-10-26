// A little backdrop for each bot's quick-game tile: a sky-to-ground gradient and a few emoji props
// that suit the character (a dog gets a backyard, a frog a pond). Still, not animated.

export interface Scene {
  /** Top and bottom colours of the backdrop. */
  bg: [string, string];
  /** Props, placed in the corners and along the bottom. */
  props: [string, string, string];
}

const SCENES: Record<string, Scene> = {
  '🐸': { bg: ['#8ee0b0', '#2f8f6a'], props: ['🪷', '🌿', '💧'] },
  '🤩': { bg: ['#ffd1e6', '#ff5fa2'], props: ['✨', '🎤', '⭐'] },
  '🧌': { bg: ['#7b8a6a', '#2e3b2a'], props: ['🪨', '🍄', '🌙'] },
  '🦊': { bg: ['#ffb877', '#b5521e'], props: ['🍂', '🌲', '🍁'] },
  '🐼': { bg: ['#c9eccb', '#4f9d62'], props: ['🎋', '🌿', '🎍'] },
  '🤠': { bg: ['#ffd9a0', '#c9742f'], props: ['🌵', '☀️', '🐎'] },
  '🐙': { bg: ['#55cdf5', '#12467a'], props: ['🫧', '🐚', '🪸'] },
  '🦁': { bg: ['#ffe39a', '#d6902b'], props: ['🌾', '☀️', '🌳'] },
  '🦄': { bg: ['#ffdaf6', '#a7c7ff'], props: ['🌈', '☁️', '✨'] },
  '🐯': { bg: ['#86e096', '#1f7a43'], props: ['🌴', '🌿', '🍃'] },
  '🐶': { bg: ['#a8e6ff', '#4aa05a'], props: ['🏠', '🌳', '🦴'] },
  '🦉': { bg: ['#3a4a6e', '#0e1626'], props: ['🌙', '⭐', '🌲'] },
  '🐻': { bg: ['#9fd89f', '#3a7a3a'], props: ['🌲', '🍯', '⛰️'] },
  '🐧': { bg: ['#dff4ff', '#7fc3e8'], props: ['❄️', '🧊', '⛄'] },
  '🦖': { bg: ['#ffbd7d', '#8c2d1a'], props: ['🌋', '🌿', '🦴'] },
  '🌵': { bg: ['#ffe9b8', '#e08e3b'], props: ['☀️', '🏜️', '🪨'] },
  '🐝': { bg: ['#fff6b0', '#f4b400'], props: ['🌻', '🌼', '🍯'] },
  '🐳': { bg: ['#8bdcff', '#1a5fa6'], props: ['🌊', '🫧', '☁️'] },
  '😎': { bg: ['#92e6ff', '#ffd57a'], props: ['🏖️', '🌴', '☀️'] },
  '🐦': { bg: ['#b3e5ff', '#5bb0f0'], props: ['☁️', '🌳', '🪺'] },
  '🦋': { bg: ['#f9d0ff', '#8bd8a0'], props: ['🌸', '🌷', '🌿'] },
  '🦓': { bg: ['#ffedb8', '#8dbb5a'], props: ['🌳', '🌾', '☀️'] },
  '🐞': { bg: ['#d0f4aa', '#4f9a3a'], props: ['🍀', '🌿', '🌼'] },
  '🐺': { bg: ['#a9bde0', '#2c3a63'], props: ['🌲', '🌕', '❄️'] },
  '🐹': { bg: ['#ffe6bd', '#d9a066'], props: ['🥜', '🥕', '🏠'] },
  '🐬': { bg: ['#7ae5ec', '#1d7fb5'], props: ['🌊', '🏝️', '☀️'] },
  '🐢': { bg: ['#c5f3d8', '#e7c98b'], props: ['🐚', '🌴', '🌊'] },
  '🌸': { bg: ['#ffd9ea', '#ff8fb8'], props: ['🌸', '🌿', '🦋'] },
  '🦎': { bg: ['#ffd49b', '#b06a3b'], props: ['🪨', '🌵', '☀️'] },
  '🔥': { bg: ['#ffa563', '#b3261e'], props: ['🔥', '✨', '🌋'] },
  '🐱': { bg: ['#ffe0cc', '#c98f7a'], props: ['🧶', '🐟', '🪟'] },
  '🦒': { bg: ['#ffeaaa', '#7fae4a'], props: ['🌳', '🌿', '☀️'] },
  '🐊': { bg: ['#a6d896', '#3d6b3a'], props: ['🌿', '🪵', '💧'] },
  '🐭': { bg: ['#ffedbb', '#c79a52'], props: ['🧀', '🌾', '🏠'] },
  '🦚': { bg: ['#86e8d0', '#2f7f9c'], props: ['🌺', '🌿', '✨'] },
  '🐥': { bg: ['#fff3b3', '#9ad06a'], props: ['🌾', '🥚', '🚜'] },
  '🦅': { bg: ['#c6e6ff', '#6a8fbd'], props: ['⛰️', '☁️', '🌲'] },
  '🌹': { bg: ['#ffbdc8', '#c93c5a'], props: ['🌹', '🌿', '✨'] },
  '🗿': { bg: ['#c2e8e0', '#5a8f8a'], props: ['🌴', '🌊', '🏝️'] },
  '🌪️': { bg: ['#a5b1c2', '#3d4a60'], props: ['☁️', '⚡', '🌧️'] },
};

const FALLBACK: Scene = { bg: ['#d9e4ff', '#8fa8e8'], props: ['✨', '⭐', '☁️'] };

export const sceneFor = (emoji: string): Scene => SCENES[emoji] ?? FALLBACK;

/** A legend's backdrop on their card and profile: colours and props that suit how they're known to play. */
export const LEGEND_SCENES: Record<string, Scene> = {
  brunson: { bg: ['#ffd9a0', '#c9742f'], props: ['🌵', '🐎', '☀️'] },
  hellmuth: { bg: ['#ffc2b0', '#b3261e'], props: ['⏳', '🧣', '💢'] },
  negreanu: { bg: ['#ffe39a', '#ff8f3d'], props: ['💬', '🍁', '🎤'] },
  ivey: { bg: ['#4a4a62', '#0b0b12'], props: ['♠️', '🌙', '💎'] },
  dwan: { bg: ['#8ae8ff', '#1f5bff'], props: ['🎲', '⚡', '💥'] },
  rampage: { bg: ['#ffb199', '#d1294d'], props: ['💸', '🎰', '🔥'] },
};
