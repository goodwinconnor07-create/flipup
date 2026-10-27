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
  lampShade: '#123a2a',
  lampGlow: '#fff1d6',
  sky: '#ffd9a8',
  ground: '#1a0f08',
  rim: '#8fb4ff',
  cardFace: '#fbfaf7',
  cardInk: '#16161a',
  cardRed: '#d42a26',
  cardBack: '#1f3c88',
  cardBackLine: '#3d63c9',
  /** The live cam's Mii-style players (table/camMii.ts). */
  skin: ['#ffe3cc', '#f8d0ad', '#eab88f', '#cf9466', '#a16a43', '#6e442a'],
  hair: ['#1d1714', '#3b2417', '#6b3f22', '#c9974a', '#8f3a1e', '#8c8783'],
  shirt: ['#e0352b', '#f08a24', '#f4cc2a', '#7ac143', '#1f8f3a', '#1f5fd1', '#44b6e8', '#f27aa8', '#7d4cbf', '#7a4a26', '#f2f2f2', '#2b2b2e'],
  eye: '#17130f',
  lip: '#b8473f',
  mouth: '#5a1f1c',
  teeth: '#ffffff',
  tongue: '#e8616b',
  heart: '#f0304e',
  bokeh: ['#ffb347', '#ff6b4a', '#ffd27a', '#7fc8ff', '#ff9f6e'],
  chips: [
    { face: '#c8312b', stripe: '#ffffff' },
    { face: '#1f4fbf', stripe: '#ffffff' },
    { face: '#1d1d22', stripe: '#e8c25a' },
    { face: '#2f8f4e', stripe: '#ffffff' },
  ],
};
