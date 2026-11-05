// Written by scripts/drawGameIcons.mjs: don't edit. Every game's and solo card's icon (src/design/icons/<id>.svg, shown
// in the iPhone app as native/assets/game-icons/<id>.webp) and its two background colours, top left to bottom right.
export const ICON_COLOURS = {
  holdem: ['#2aa86b', '#06301d'],
  deuces: ['#ff4fa0', '#6a22f0'],
  ghost: ['#24405c', '#03070c'],
  pittsburgh: ['#3a5574', '#070c12'],
  dice: ['#e0334f', '#3a0610'],
  crucifix: ['#6a55a8', '#140d26'],
  circle: ['#2a93cf', '#06203a'],
  memory: ['#8a6bff', '#1f0f5c'],
  bjholdem: ['#16855a', '#041d12'],
  detective: ['#1f44a8', '#060f2e'],
  rewind: ['#2557d6', '#0a1a52'],
  ranges: ['#2a5fe0', '#0b1d5c'],
  pineapple: ['#ffcf52', '#e2570f'],
  imposter: ['#3a4152', '#07080c'],
  beanstalk: ['#6fd6ff', '#1d7a3a'],
  redriver: ['#3a0a14', '#0a0204'],
  shortStack: ['#3a6ae6', '#0f2a78'],
} as const satisfies Record<string, readonly [string, string]>;

export type IconId = keyof typeof ICON_COLOURS;

export const iconColours = (id: IconId): readonly [string, string] => ICON_COLOURS[id];
