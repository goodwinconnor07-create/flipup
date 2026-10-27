// Colours used from code. Everything the stylesheets use lives as tokens in global.css;
// these are the few that need a real value (confetti) or a per-item pick.

export const CONFETTI_COLORS = {
  party: ['#f97316', '#ec4899', '#ef4444', '#22c55e', '#facc15', '#3b82f6'],
  win: ['#16a34a', '#22c55e', '#facc15', '#fde68a', '#3b82f6'],
};

/** The join-code letter tiles. */
export const TILE_COLORS = ['var(--red)', 'var(--blue)', 'var(--green)', 'var(--gold-lo)', 'var(--pink)'];

/** The live cam's 3D room (table/camStage.ts): materials and lights need real values, not CSS tokens. */
export const CAM = {
  room: '#0d0a08',
  floor: '#1a1210',
  wall: '#17100c',
  leather: '#16110f',
  wood: '#5a3720',
  woodDark: '#2b1a10',
  key: '#ffe2b8',
  sky: '#ffd9a8',
  ground: '#1a0f08',
  rim: '#8fb4ff',
  cardFace: '#fbfaf7',
  cardInk: '#16161a',
  cardRed: '#d42a26',
  cardBack: '#1f3c88',
  cardBackLine: '#3d63c9',
  bokeh: ['#ffb347', '#ff6b4a', '#ffd27a', '#7fc8ff', '#ff9f6e'],
  chips: [
    { face: '#c8312b', stripe: '#ffffff' },
    { face: '#1f4fbf', stripe: '#ffffff' },
    { face: '#1d1d22', stripe: '#e8c25a' },
    { face: '#2f8f4e', stripe: '#ffffff' },
  ],
};
