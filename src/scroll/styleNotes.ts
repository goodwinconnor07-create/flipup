// How Scroll talks about a bot's style. Cards in the feed name the style on purpose (this is teaching, unlike
// the normal game where players work it out). The numbers are what the graders assume about the bot, taken from
// the bot lab's results in docs/BOTS.md (heads-up and mixed tables run a little different, close enough to teach with).

import type { StyleId } from '../game/botStyles';
import type { Habits } from '../game/judge';

export interface StyleNote {
  /** The name on the intro popup. */
  label: string;
  /** One line about how it plays. */
  line: string;
  habits: Habits;
}

export const STYLE_NOTES: Record<StyleId, StyleNote> = {
  pro: {
    label: 'Solid regular',
    line: 'Plays close to perfect and adjusts to you. Few leaks to hit.',
    habits: { vpip: 0.27, pfr: 0.18, foldToBet: 0.45, aggression: 1.9, bluffy: 0.25 },
  },
  shark: {
    label: 'Shark',
    line: 'Sharp and a little aggressive. It works out your habits fast.',
    habits: { vpip: 0.29, pfr: 0.2, foldToBet: 0.44, aggression: 1.5, bluffy: 0.26 },
  },
  tag: {
    label: 'Tight and aggressive',
    line: 'Plays few hands and plays them hard. Big bets usually mean a big hand.',
    habits: { vpip: 0.21, pfr: 0.15, foldToBet: 0.41, aggression: 2.3, bluffy: 0.2 },
  },
  lag: {
    label: 'Loose and aggressive',
    line: 'Plays a lot of hands and keeps the pressure on. It bluffs a fair bit.',
    habits: { vpip: 0.35, pfr: 0.24, foldToBet: 0.38, aggression: 2.7, bluffy: 0.33 },
  },
  maniac: {
    label: 'Maniac',
    line: 'Raises almost everything and bluffs all the time. It calls a lot too.',
    habits: { vpip: 0.5, pfr: 0.34, foldToBet: 0.34, aggression: 3.8, bluffy: 0.5 },
  },
  rock: {
    label: 'Rock',
    line: 'Only plays strong hands, and folds without them. When it bets big, believe it.',
    habits: { vpip: 0.14, pfr: 0.1, foldToBet: 0.53, aggression: 1.8, bluffy: 0.1 },
  },
  station: {
    label: 'Calling station',
    line: 'Calls far too much and almost never raises. Bluffing it is a bad idea.',
    habits: { vpip: 0.37, pfr: 0.11, foldToBet: 0.18, aggression: 0.5, bluffy: 0.21 },
  },
  gambler: {
    label: 'Gambler',
    line: 'Limps, chases every draw and loves a big pot. It folds less than it should.',
    habits: { vpip: 0.44, pfr: 0.15, foldToBet: 0.26, aggression: 1.3, bluffy: 0.36 },
  },
  trapper: {
    label: 'Trapper',
    line: "Slow-plays its big hands and pounces later. A quiet table with a trapper isn't safe.",
    habits: { vpip: 0.24, pfr: 0.14, foldToBet: 0.37, aggression: 1.4, bluffy: 0.22 },
  },
  nervous: {
    label: 'Nervous player',
    line: 'Bets small and folds to pressure. It gets rattled after losing.',
    habits: { vpip: 0.26, pfr: 0.14, foldToBet: 0.6, aggression: 1.4, bluffy: 0.3 },
  },
};
