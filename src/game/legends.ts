// The legends: bots in the style of famous players, as the poker world knows them. Each is built the
// way an AI twin is: a set of numbers (how many hands they play, how often they raise, fold to bets,
// bluff, how big they bet) is turned into a bot style by the same fit (`fitStyle`), then given the
// habits they're known for (how fast they play, how they take a bad beat, what they show).
//
// The numbers are our reading of each player's public reputation, not data about them: we have no
// hands of theirs. Every screen that names one says so (`LEGEND_NOTE`). No photos, and nothing here is
// a quote: what they say lives in legendTalk.ts and is original.

import type { Player } from './types';
import type { Style } from './botStyles';
import { LEGEND_VOICES, type LegendId } from './legendTalk';
import { emptyTwin, TWIN_PRIOR, type TwinNumbers, type TwinProfile } from './twin';
import { fitStyle, type TwinBrain } from './twinFit';

export type { LegendId };

export interface Legend {
  id: LegendId;
  /** Their name in full, for profiles. */
  name: string;
  /** What fits in a seat (names are cut to ten characters at a table). */
  short: string;
  emoji: string;
  /** 1 is the easiest, 5 the hardest: the order of the ladder. */
  rung: number;
  /** One line on how they play, in plain words. */
  blurb: string;
  /** Three things they're known for, in plain words, for their profile. */
  signature: string[];
  /** How they play, as the numbers a twin keeps. Anything left out is a typical player's. */
  numbers: Partial<TwinNumbers>;
  /** The habits they're known for, laid over the fitted style. */
  habits: DeepPartial<Style>;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Said on every screen that shows a legend by name. */
export const LEGEND_NOTE = "A style inspired by this player's public reputation. Not their real hands, and not endorsed by or affiliated with them.";

export const LEGENDS: Legend[] = [
  {
    id: 'brunson',
    name: 'Doyle Brunson',
    short: 'Brunson',
    emoji: '🎩',
    rung: 1,
    blurb: 'Old-school and aggressive. Bets big, plays fast, and is happy to put the whole stack in.',
    signature: ['Bets big: three quarters of the pot or more', 'Plays fast and shoves readily', 'Calls loosely, so he pays off a strong hand'],
    numbers: { vpip: 0.31, pfr: 0.23, limp: 0.03, open: 3.5, threeBet: 0.1, foldToRaise: 0.6, foldToBet: 0.36, betFreq: 0.5, cbet: 0.7, bluff: 0.3, aggression: 0.68, showdown: 0.3 },
    habits: {
      post: { sizes: [0.75, 1, 1.5], sense: 0.55, gto: 0.05, tell: 0.3, wobble: 0.11, chase: 0.15, pairs: 0.1 },
      pre: { shove: 1.2 },
      adapt: 0.2,
      mind: { tilt: 0.1, grudge: 0.2 },
      tempo: { speed: 0.85, tank: 0.9, snap: 0.25, hollywood: 0.05 },
      show: { bluffs: 0.1, strong: 0.1, folds: 0.05 },
      talk: { tone: 'friendly', chatty: 0.5 },
    },
  },
  {
    id: 'hellmuth',
    name: 'Phil Hellmuth',
    short: 'Hellmuth',
    emoji: '🧐',
    rung: 2,
    blurb: 'Plays very few hands and waits for the best of them. Folds a lot, says so, and comes apart when he gets outdrawn.',
    signature: ['Folds most hands before the flop', 'Tilts after a bad beat, and plays worse', 'Shows you the good hand he folded'],
    numbers: { vpip: 0.17, pfr: 0.11, limp: 0.03, open: 3, threeBet: 0.05, foldToRaise: 0.78, foldToBet: 0.52, betFreq: 0.36, cbet: 0.55, bluff: 0.14, aggression: 0.48, showdown: 0.3 },
    habits: {
      post: { sense: 0.5, gto: 0.05, wobble: 0.12, scared: 0.8, sticky: -0.12, tell: 0.5, raise: -0.1, bet: -0.04 },
      adapt: 0.15,
      mind: { tilt: 0.9, grudge: 0.7 },
      tempo: { speed: 1.2, tank: 1.6, snap: 0.05, hollywood: 0.4 },
      show: { bluffs: 0, strong: 0.25, folds: 0.5 },
      talk: { tone: 'trash', chatty: 0.8 },
    },
  },
  {
    id: 'negreanu',
    name: 'Daniel Negreanu',
    short: 'Negreanu',
    emoji: '😄',
    rung: 3,
    blurb: 'Small bets, wide calls and a lot of reading. Talks all the time, and folds when his read says so.',
    signature: ['Bets small: a quarter to a half of the pot', 'Calls wide, and folds when his read says so', 'Talks all the time, and adjusts to how you play'],
    numbers: { vpip: 0.3, pfr: 0.17, limp: 0.06, open: 2.3, threeBet: 0.07, foldToRaise: 0.62, foldToBet: 0.44, betFreq: 0.46, cbet: 0.56, bluff: 0.26, aggression: 0.45, showdown: 0.33 },
    habits: {
      post: { sizes: [0.25, 0.4, 0.6], sense: 1, gto: 0.3, tell: 0, wobble: 0.045, trap: 0.15, value: 0.03, raise: -0.03 },
      adapt: 0.85,
      mind: { tilt: 0.15, grudge: 0.3 },
      tempo: { speed: 1, tank: 1.3, snap: 0.1, hollywood: 0.2 },
      show: { bluffs: 0.12, strong: 0.1, folds: 0.3 },
      talk: { tone: 'friendly', chatty: 0.9 },
    },
  },
  {
    id: 'ivey',
    name: 'Phil Ivey',
    short: 'Ivey',
    emoji: '🕶️',
    rung: 4,
    blurb: 'Close to flawless. Balanced, patient and quick to adjust, with no obvious leak to aim at.',
    signature: ['Balanced, with few habits to aim at', 'Adjusts quickly to what you do', 'Quiet, and rarely tilts'],
    numbers: { vpip: 0.3, pfr: 0.23, limp: 0.02, open: 2.5, threeBet: 0.13, foldToRaise: 0.66, foldToBet: 0.42, betFreq: 0.5, cbet: 0.62, bluff: 0.33, aggression: 0.6, showdown: 0.3 },
    habits: {
      post: { sizes: [0.33, 0.75, 1.25], sense: 1, gto: 0.15, tell: 0, wobble: 0.035, trap: 0.15, value: 0.04, bluff: 0.03, raise: 0.04, bet: 0.02 },
      pre: { aggro: 0.25, iso: 0.8, shove: 1.15 },
      adapt: 1,
      mind: { tilt: 0.05, grudge: 0.15 },
      tempo: { speed: 1, tank: 1.2, snap: 0.05, hollywood: 0.05 },
      show: { bluffs: 0, strong: 0, folds: 0.02 },
      talk: { tone: 'friendly', chatty: 0.12 },
    },
  },
  {
    id: 'dwan',
    name: 'Tom Dwan',
    short: 'Dwan',
    emoji: '🎲',
    rung: 5,
    blurb: 'Loose and relentless. Plays lots of hands, bets again and again, and is very hard to put on a hand.',
    signature: ['Plays a lot of hands and raises most of them', 'Bets again on the turn and the river', 'Uses many bet sizes, so a size tells you little'],
    numbers: { vpip: 0.38, pfr: 0.27, limp: 0.03, open: 3, threeBet: 0.14, foldToRaise: 0.55, foldToBet: 0.4, betFreq: 0.53, cbet: 0.66, bluff: 0.36, aggression: 0.7, showdown: 0.3 },
    habits: {
      post: { sizes: [0.5, 0.75, 1.25, 2], sense: 0.55, gto: 0.05, tell: 0.15, wobble: 0.13, bluff: 0.02, scared: 0.3 },
      pre: { shove: 1.2 },
      adapt: 0.7,
      mind: { tilt: 0.2, grudge: 0.5 },
      tempo: { speed: 0.75, tank: 0.8, snap: 0.35, hollywood: 0.1 },
      show: { bluffs: 0.05, strong: 0.02, folds: 0.05 },
      talk: { tone: 'trash', chatty: 0.3 },
    },
  },
  {
    id: 'rampage',
    name: 'Ethan “Rampage” Yau',
    short: 'Rampage',
    emoji: '🎰',
    rung: 6,
    blurb: 'An action player who takes big shots: huge bluffs when he likes the spot, but patient traps and thin value raises too. You never quite know which one it is.',
    signature: ['Makes big bets, sometimes very big ones, with nothing', 'Slow-plays a monster and lets you keep betting', 'Sometimes pushes a bluff further than it should go'],
    // Prototype dials for the fit, not his statistics: nobody has his full hands. Roughly "aggressive, with a
    // taste for big bluffs", on a credible base. See docs/LEGENDS.md.
    numbers: { vpip: 0.34, pfr: 0.25, limp: 0.02, open: 3, threeBet: 0.13, foldToRaise: 0.55, foldToBet: 0.38, betFreq: 0.55, cbet: 0.68, bluff: 0.38, aggression: 0.68, showdown: 0.3 },
    habits: {
      post: { sizes: [0.5, 0.75, 1.25, 2], sense: 0.9, gto: 0.2, wobble: 0.07, bluff: 0.05, bet: 0.02, raise: 0.03, value: 0.04, trap: 0.4, chase: 0.1, tell: 0 },
      pre: { aggro: 0.2, shove: 1.15 },
      adapt: 0.65,
      mind: { tilt: 0.15, grudge: 0.3 },
      tempo: { speed: 0.9, tank: 1.2, snap: 0.15, hollywood: 0.25 },
      show: { bluffs: 0.15, strong: 0.1, folds: 0.05 },
      talk: { tone: 'friendly', chatty: 0.6 },
    },
  },
];

/** How hard each rung is, in a word. */
export const RUNG_WORDS = ['Warm-up', 'Easy', 'Tricky', 'Tough', 'Hard', 'Boss'] as const;

export const legendById = (id: string): Legend | undefined => LEGENDS.find((l) => l.id === id);

/** The counts a twin would have if it had watched this legend for a thousand hands. */
export function legendProfile(l: Legend, hands = 1000): TwinProfile {
  const n: TwinNumbers = { ...TWIN_PRIOR, ...l.numbers };
  const t = emptyTwin();
  const s = t.stats;
  const r = Math.round;
  t.hands = hands;
  s.vpip = r(n.vpip * hands);
  s.pfr = r(n.pfr * hands);
  s.firstIn = r(hands * 0.3);
  s.limps = r(s.firstIn * n.limp);
  s.opens = r(s.firstIn * (n.pfr / Math.max(0.05, n.vpip)) * 0.8);
  s.openBb = n.open * s.opens;
  s.raiseFaced = r(hands * 0.2);
  s.threeBets = r(s.raiseFaced * n.threeBet);
  s.foldsToRaise = r(s.raiseFaced * n.foldToRaise);
  s.betsFaced = r(hands * 0.3);
  s.foldsToBet = r(s.betsFaced * n.foldToBet);
  s.betOpps = r(hands * 0.3);
  s.bets = r(s.betOpps * n.betFreq);
  s.cbetOpps = r(hands * 0.15);
  s.cbets = r(s.cbetOpps * n.cbet);
  s.postAgg = r(hands * 0.3);
  s.postBluffs = r(s.postAgg * n.bluff);
  s.postCalls = r((s.postAgg * (1 - n.aggression)) / Math.max(0.05, n.aggression));
  s.sawFlop = r(hands * 0.4);
  s.showdowns = r(s.sawFlop * n.showdown);
  return t;
}

/** Lays `habits` over `style`, key by key (lists are replaced). */
function overlay<T extends object>(style: T, habits: DeepPartial<T> | undefined): void {
  if (!habits) return;
  const into = style as Record<string, unknown>;
  for (const [k, v] of Object.entries(habits)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && into[k] && typeof into[k] === 'object') overlay(into[k] as object, v as DeepPartial<object>);
    else if (v !== undefined) into[k] = Array.isArray(v) ? [...v] : v;
  }
}

/** The style a legend plays: the fit to their numbers, with their habits on top. */
export function legendStyle(l: Legend): Style {
  const style = fitStyle(legendProfile(l));
  overlay(style, l.habits);
  return style;
}

/** What a bot needs to play as this legend. There are no spots to copy, so it plays its style. */
export function legendBrain(l: Legend): TwinBrain {
  return { style: legendStyle(l), spots: {}, hands: 0 };
}

/** Turns a bot seat into a legend: its name, face, style and voice. */
export function dressAsLegend(player: Player, l: Legend): void {
  const brain = legendBrain(l);
  player.name = l.short;
  player.emoji = l.emoji;
  player.legend = l.id;
  player.style = brain.style.id;
  player.twin = brain;
}

/** Every legend has a voice. */
export const LEGEND_IDS = Object.keys(LEGEND_VOICES) as LegendId[];
