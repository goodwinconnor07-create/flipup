// How to Play's pictures, one real hand of each game on the app's own table (scripts/shootHowTo.mjs writes this
// file). Bundled with the app, so they show with no connection.
import type { Variant } from '@/engine';

import type { Shot } from './steps';

export const SHOTS: Partial<Record<Variant, Partial<Record<Shot, number>>>> = {
  holdem: {
    deal: require('../../../assets/howto/holdem/deal.webp'),
    flop: require('../../../assets/howto/holdem/flop.webp'),
    river: require('../../../assets/howto/holdem/river.webp'),
    showdown: require('../../../assets/howto/holdem/showdown.webp'),
    turn: require('../../../assets/howto/holdem/turn.webp'),
  },
  pineapple: {
    deal: require('../../../assets/howto/pineapple/deal.webp'),
    discard: require('../../../assets/howto/pineapple/discard.webp'),
    flop: require('../../../assets/howto/pineapple/flop.webp'),
    river: require('../../../assets/howto/pineapple/river.webp'),
    showdown: require('../../../assets/howto/pineapple/showdown.webp'),
    turn: require('../../../assets/howto/pineapple/turn.webp'),
  },
  deuces: {
    deal: require('../../../assets/howto/deuces/deal.webp'),
    flop: require('../../../assets/howto/deuces/flop.webp'),
    river: require('../../../assets/howto/deuces/river.webp'),
    showdown: require('../../../assets/howto/deuces/showdown.webp'),
    turn: require('../../../assets/howto/deuces/turn.webp'),
  },
  ghost: {
    deal: require('../../../assets/howto/ghost/deal.webp'),
    flop: require('../../../assets/howto/ghost/flop.webp'),
    ghost: require('../../../assets/howto/ghost/ghost.webp'),
    river: require('../../../assets/howto/ghost/river.webp'),
    turn: require('../../../assets/howto/ghost/turn.webp'),
  },
  pittsburgh: {
    deal: require('../../../assets/howto/pittsburgh/deal.webp'),
    flop: require('../../../assets/howto/pittsburgh/flop.webp'),
    river: require('../../../assets/howto/pittsburgh/river.webp'),
    showdown: require('../../../assets/howto/pittsburgh/showdown.webp'),
    turn: require('../../../assets/howto/pittsburgh/turn.webp'),
  },
  dice: {
    deal: require('../../../assets/howto/dice/deal.webp'),
    dice: require('../../../assets/howto/dice/dice.webp'),
    flop: require('../../../assets/howto/dice/flop.webp'),
    river: require('../../../assets/howto/dice/river.webp'),
    showdown: require('../../../assets/howto/dice/showdown.webp'),
    turn: require('../../../assets/howto/dice/turn.webp'),
  },
  redriver: {
    deal: require('../../../assets/howto/redriver/deal.webp'),
    flop: require('../../../assets/howto/redriver/flop.webp'),
    river: require('../../../assets/howto/redriver/river.webp'),
    showdown: require('../../../assets/howto/redriver/showdown.webp'),
    turn: require('../../../assets/howto/redriver/turn.webp'),
  },
  crucifix: {
    deal: require('../../../assets/howto/crucifix/deal.webp'),
    flop: require('../../../assets/howto/crucifix/flop.webp'),
    river: require('../../../assets/howto/crucifix/river.webp'),
    showdown: require('../../../assets/howto/crucifix/showdown.webp'),
    turn: require('../../../assets/howto/crucifix/turn.webp'),
  },
  circle: {
    deal: require('../../../assets/howto/circle/deal.webp'),
    flop: require('../../../assets/howto/circle/flop.webp'),
    river: require('../../../assets/howto/circle/river.webp'),
    showdown: require('../../../assets/howto/circle/showdown.webp'),
    turn: require('../../../assets/howto/circle/turn.webp'),
  },
  memory: {
    deal: require('../../../assets/howto/memory/deal.webp'),
    flop: require('../../../assets/howto/memory/flop.webp'),
    peek: require('../../../assets/howto/memory/peek.webp'),
    river: require('../../../assets/howto/memory/river.webp'),
    showdown: require('../../../assets/howto/memory/showdown.webp'),
    turn: require('../../../assets/howto/memory/turn.webp'),
  },
  beanstalk: {
    deal: require('../../../assets/howto/beanstalk/deal.webp'),
    flop: require('../../../assets/howto/beanstalk/flop.webp'),
    river: require('../../../assets/howto/beanstalk/river.webp'),
    showdown: require('../../../assets/howto/beanstalk/showdown.webp'),
    turn: require('../../../assets/howto/beanstalk/turn.webp'),
  },
  bjholdem: {
    deal: require('../../../assets/howto/bjholdem/deal.webp'),
    flop: require('../../../assets/howto/bjholdem/flop.webp'),
    river: require('../../../assets/howto/bjholdem/river.webp'),
    showdown: require('../../../assets/howto/bjholdem/showdown.webp'),
    turn: require('../../../assets/howto/bjholdem/turn.webp'),
  },
  imposter: {
    deal: require('../../../assets/howto/imposter/deal.webp'),
    flop: require('../../../assets/howto/imposter/flop.webp'),
    reveal: require('../../../assets/howto/imposter/reveal.webp'),
    river: require('../../../assets/howto/imposter/river.webp'),
    turn: require('../../../assets/howto/imposter/turn.webp'),
    vote: require('../../../assets/howto/imposter/vote.webp'),
  },
};
