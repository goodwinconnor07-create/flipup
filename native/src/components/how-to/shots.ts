// How to Play's pictures: one real hand of each game, screenshots of the app on an iPhone 17 Pro simulator
// (native/scripts/howto, .github/workflows/howto-shots.yml write this file). Bundled with the app, so they show with
// no connection.
import type { Variant } from '@/engine';

import type { Shot } from './steps';

/** The pictures' shape: an iPhone 17 Pro screen, 402 × 874 points. */
export const SHOT_ASPECT = 402 / 874;

export const SHOTS: Partial<Record<Variant, Partial<Record<Shot, number>>>> = {
  holdem: {
    cards: require('../../../assets/howto/holdem/cards.webp'),
    flop: require('../../../assets/howto/holdem/flop.webp'),
    river: require('../../../assets/howto/holdem/river.webp'),
    showdown: require('../../../assets/howto/holdem/showdown.webp'),
    turn: require('../../../assets/howto/holdem/turn.webp'),
    yourturn: require('../../../assets/howto/holdem/yourturn.webp'),
  },
  pineapple: {
    cards: require('../../../assets/howto/pineapple/cards.webp'),
    discard: require('../../../assets/howto/pineapple/discard.webp'),
    flop: require('../../../assets/howto/pineapple/flop.webp'),
    river: require('../../../assets/howto/pineapple/river.webp'),
    showdown: require('../../../assets/howto/pineapple/showdown.webp'),
    turn: require('../../../assets/howto/pineapple/turn.webp'),
    yourturn: require('../../../assets/howto/pineapple/yourturn.webp'),
  },
  deuces: {
    cards: require('../../../assets/howto/deuces/cards.webp'),
    flop: require('../../../assets/howto/deuces/flop.webp'),
    river: require('../../../assets/howto/deuces/river.webp'),
    showdown: require('../../../assets/howto/deuces/showdown.webp'),
  },
  ghost: {
    cards: require('../../../assets/howto/ghost/cards.webp'),
    flop: require('../../../assets/howto/ghost/flop.webp'),
    river: require('../../../assets/howto/ghost/river.webp'),
    showdown: require('../../../assets/howto/ghost/showdown.webp'),
    turn: require('../../../assets/howto/ghost/turn.webp'),
    yourturn: require('../../../assets/howto/ghost/yourturn.webp'),
  },
  pittsburgh: {
    cards: require('../../../assets/howto/pittsburgh/cards.webp'),
    flop: require('../../../assets/howto/pittsburgh/flop.webp'),
    river: require('../../../assets/howto/pittsburgh/river.webp'),
    showdown: require('../../../assets/howto/pittsburgh/showdown.webp'),
    turn: require('../../../assets/howto/pittsburgh/turn.webp'),
    yourturn: require('../../../assets/howto/pittsburgh/yourturn.webp'),
  },
  dice: {
    cards: require('../../../assets/howto/dice/cards.webp'),
    dice: require('../../../assets/howto/dice/dice.webp'),
    rolling: require('../../../assets/howto/dice/rolling.webp'),
    showdown: require('../../../assets/howto/dice/showdown.webp'),
    turn: require('../../../assets/howto/dice/turn.webp'),
  },
  redriver: {
    cards: require('../../../assets/howto/redriver/cards.webp'),
    flop: require('../../../assets/howto/redriver/flop.webp'),
    river: require('../../../assets/howto/redriver/river.webp'),
    showdown: require('../../../assets/howto/redriver/showdown.webp'),
  },
  crucifix: {
    cards: require('../../../assets/howto/crucifix/cards.webp'),
    flop: require('../../../assets/howto/crucifix/flop.webp'),
    river: require('../../../assets/howto/crucifix/river.webp'),
    showdown: require('../../../assets/howto/crucifix/showdown.webp'),
    turn: require('../../../assets/howto/crucifix/turn.webp'),
    yourturn: require('../../../assets/howto/crucifix/yourturn.webp'),
  },
  circle: {
    cards: require('../../../assets/howto/circle/cards.webp'),
    flop: require('../../../assets/howto/circle/flop.webp'),
    river: require('../../../assets/howto/circle/river.webp'),
    showdown: require('../../../assets/howto/circle/showdown.webp'),
    turn: require('../../../assets/howto/circle/turn.webp'),
    yourturn: require('../../../assets/howto/circle/yourturn.webp'),
  },
  memory: {
    cards: require('../../../assets/howto/memory/cards.webp'),
    flop: require('../../../assets/howto/memory/flop.webp'),
    peek: require('../../../assets/howto/memory/peek.webp'),
    river: require('../../../assets/howto/memory/river.webp'),
    showdown: require('../../../assets/howto/memory/showdown.webp'),
    turn: require('../../../assets/howto/memory/turn.webp'),
    yourturn: require('../../../assets/howto/memory/yourturn.webp'),
  },
  beanstalk: {
    cards: require('../../../assets/howto/beanstalk/cards.webp'),
    flop: require('../../../assets/howto/beanstalk/flop.webp'),
    river: require('../../../assets/howto/beanstalk/river.webp'),
    showdown: require('../../../assets/howto/beanstalk/showdown.webp'),
    turn: require('../../../assets/howto/beanstalk/turn.webp'),
    yourturn: require('../../../assets/howto/beanstalk/yourturn.webp'),
  },
  bjholdem: {
    cards: require('../../../assets/howto/bjholdem/cards.webp'),
    flop: require('../../../assets/howto/bjholdem/flop.webp'),
    hit: require('../../../assets/howto/bjholdem/hit.webp'),
    river: require('../../../assets/howto/bjholdem/river.webp'),
    showdown: require('../../../assets/howto/bjholdem/showdown.webp'),
    turn: require('../../../assets/howto/bjholdem/turn.webp'),
    yourturn: require('../../../assets/howto/bjholdem/yourturn.webp'),
  },
  imposter: {
    cards: require('../../../assets/howto/imposter/cards.webp'),
    discuss: require('../../../assets/howto/imposter/discuss.webp'),
    flop: require('../../../assets/howto/imposter/flop.webp'),
    reveal: require('../../../assets/howto/imposter/reveal.webp'),
    river: require('../../../assets/howto/imposter/river.webp'),
    turn: require('../../../assets/howto/imposter/turn.webp'),
    vote: require('../../../assets/howto/imposter/vote.webp'),
    yourturn: require('../../../assets/howto/imposter/yourturn.webp'),
  },
};
