// How each mini game shows up outside the table: its card on Home (gradient, a line that sets
// the mood) and how its table sounds. The table's own look (felt, rail, glow) is in global.css and
// screens.css, as `.table-oval.themed.theme-<game>`.

import type { Variant } from '../game';
import type { SoundName } from './sound';

interface GameArt {
  /** Home card: the gradient. */
  card: [string, string];
  /** A line that sets the mood. Shown on the game's card sheet. */
  mood: string;
  /** Table sounds are pitched by this (1 is normal). */
  pitch: number;
  /** The game's own sting for its big moment (see `playSound`). */
  sting: SoundName | null;
}

const ART: Record<Variant, GameArt> = {
  holdem: { card: ['#1f8a57', '#0a3b25'], mood: 'The classic. Your felt, your rules.', pitch: 1, sting: null },
  pineapple: { card: ['#f9b233', '#e8641b'], mood: 'Sunny, juicy and a bit silly.', pitch: 1.12, sting: null },
  deuces: { card: ['#ff4fa0', '#7a2cff'], mood: 'Wild cards, loud colours.', pitch: 1.2, sting: 'pop' },
  ghost: { card: ['#1b2a3a', '#050a10'], mood: 'Cold air. Something is watching the pot.', pitch: 0.82, sting: 'spook' },
  pittsburgh: { card: ['#32465c', '#0e151d'], mood: 'Steel, rivers and a bridge in the dark.', pitch: 0.94, sting: null },
  dice: { card: ['#c0283f', '#4a0a16'], mood: 'Craps table energy. Everything is one roll from changing.', pitch: 1, sting: 'dice' },
  redriver: { card: ['#d92b2b', '#2a0606'], mood: 'The river runs red. Keep going until it stops.', pitch: 0.9, sting: 'splash' },
  crucifix: { card: ['#5a4691', '#1a1230'], mood: 'Five cards in a cross. Read the arms.', pitch: 0.92, sting: null },
  circle: { card: ['#1d7fb8', '#0a2a45'], mood: 'Six cards round a clock. Hours matter.', pitch: 1.05, sting: null },
  imposter: { card: ['#2f3441', '#0a0b10'], mood: 'Trust nobody. Watch the bets.', pitch: 0.88, sting: 'sting' },
};

export const cardArt = (v: Variant): GameArt => ART[v] ?? ART.holdem;
export const soundMoodFor = (v: Variant): number => cardArt(v).pitch;
