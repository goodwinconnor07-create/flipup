// How to Play's recordings, one real hand of each game (scripts/recordHowTo.mjs). Bundled with the app, so they
// play with no connection.
import type { Variant } from '@/engine';

export const VIDEOS: Record<Variant, number> = {
  holdem: require('../../../assets/howto/holdem.mp4'),
  pineapple: require('../../../assets/howto/pineapple.mp4'),
  deuces: require('../../../assets/howto/deuces.mp4'),
  ghost: require('../../../assets/howto/ghost.mp4'),
  pittsburgh: require('../../../assets/howto/pittsburgh.mp4'),
  dice: require('../../../assets/howto/dice.mp4'),
  redriver: require('../../../assets/howto/redriver.mp4'),
  crucifix: require('../../../assets/howto/crucifix.mp4'),
  circle: require('../../../assets/howto/circle.mp4'),
  memory: require('../../../assets/howto/memory.mp4'),
  beanstalk: require('../../../assets/howto/beanstalk.mp4'),
  imposter: require('../../../assets/howto/imposter.mp4'),
};
