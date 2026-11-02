// How each mini game shows up outside the table: its card on Home (gradient and mood line, shared with the
// iPhone app in src/design/gameArt.ts) and how its table sounds. The table's own look (felt, rail, glow) is in global.css and
// screens.css, as `.table-oval.themed.theme-<game>`.

import { GAME_LOOK, type GameLook } from '../design/gameArt';
import type { Variant } from '../game';
import type { SoundName } from './sound';

interface GameArt extends GameLook {
  /** Table sounds are pitched by this (1 is normal). */
  pitch: number;
  /** The game's own sting for its big moment (see `playSound`). */
  sting: SoundName | null;
}

const ART: Record<Variant, GameArt> = {
  holdem: { ...GAME_LOOK.holdem, pitch: 1, sting: null },
  pineapple: { ...GAME_LOOK.pineapple, pitch: 1.12, sting: null },
  deuces: { ...GAME_LOOK.deuces, pitch: 1.2, sting: 'pop' },
  ghost: { ...GAME_LOOK.ghost, pitch: 0.82, sting: 'spook' },
  pittsburgh: { ...GAME_LOOK.pittsburgh, pitch: 0.94, sting: null },
  dice: { ...GAME_LOOK.dice, pitch: 1, sting: 'dice' },
  redriver: { ...GAME_LOOK.redriver, pitch: 0.9, sting: 'splash' },
  crucifix: { ...GAME_LOOK.crucifix, pitch: 0.92, sting: null },
  circle: { ...GAME_LOOK.circle, pitch: 1.05, sting: null },
  memory: { ...GAME_LOOK.memory, pitch: 1.08, sting: null },
  beanstalk: { ...GAME_LOOK.beanstalk, pitch: 1.1, sting: null },
  imposter: { ...GAME_LOOK.imposter, pitch: 0.88, sting: 'sting' },
};

export const cardArt = (v: Variant): GameArt => ART[v] ?? ART.holdem;
export const soundMoodFor = (v: Variant): number => cardArt(v).pitch;
