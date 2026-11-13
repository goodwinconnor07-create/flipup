// How each mini game shows up outside the table: its card on Home (gradient and mood line, shared with the
// iPhone app in src/design/gameArt.ts) and how its table sounds. The table's own look (felt, rail, glow) is in global.css and
// screens.css, as `.table-oval.themed.theme-<game>`.

import { GAME_LOOK, type GameLook } from '../design/gameArt';
import type { Variant } from '../game';
import type { SoundName } from './sound';

interface GameArt extends GameLook {
  /** The game's own sting for its big moment (see `playSound`). */
  sting: SoundName | null;
}

const ART: Record<Variant, GameArt> = {
  holdem: { ...GAME_LOOK.holdem, sting: null },
  pineapple: { ...GAME_LOOK.pineapple, sting: null },
  deuces: { ...GAME_LOOK.deuces, sting: 'pop' },
  ghost: { ...GAME_LOOK.ghost, sting: 'spook' },
  pittsburgh: { ...GAME_LOOK.pittsburgh, sting: null },
  dice: { ...GAME_LOOK.dice, sting: 'dice' },
  redriver: { ...GAME_LOOK.redriver, sting: 'splash' },
  crucifix: { ...GAME_LOOK.crucifix, sting: null },
  circle: { ...GAME_LOOK.circle, sting: null },
  memory: { ...GAME_LOOK.memory, sting: null },
  beanstalk: { ...GAME_LOOK.beanstalk, sting: null },
  bjholdem: { ...GAME_LOOK.bjholdem, sting: null },
  imposter: { ...GAME_LOOK.imposter, sting: 'sting' },
  power: { ...GAME_LOOK.power, sting: 'pop' },
  missions: { ...GAME_LOOK.missions, sting: 'sting' },
  slide: { ...GAME_LOOK.slide, sting: null },
  headband: { ...GAME_LOOK.headband, sting: null },
  belt: { ...GAME_LOOK.belt, sting: null },
  onion: { ...GAME_LOOK.onion, sting: null },
  chain: { ...GAME_LOOK.chain, sting: null },
  elevator: { ...GAME_LOOK.elevator, sting: null },
  plo: { ...GAME_LOOK.plo, sting: null },
};

export const cardArt = (v: Variant): GameArt => ART[v] ?? ART.holdem;
export const soundMoodFor = (v: Variant): number => cardArt(v).pitch;
