// Challenges: scored solo modes against the bots, played on one phone through the ordinary bots-only table.
// This file is the pure part: what each challenge is, the table it opens, what changes between hands, and the
// scores. Rules and tuning: docs/CHALLENGES.md. The Rewind replay and its "how it usually goes" runs are in
// rewind.ts.
//
// Nothing here grades the player. A challenge is a game with a score, not a lesson.

import { BOTS, type StyleId } from './botStyles';
import { hashString, seededRng, shuffle } from './cards';
import { MAX_SEATS } from './holdem';
import { newId } from './ids';
import { recordNet } from './record';
import { createTable } from './reducer';
import type { Game, HandRecord, Player, Settings } from './types';

export type ChallengeId = 'shortStack' | 'detective' | 'rewind';

export interface ChallengeDef {
  id: ChallengeId;
  name: string;
  /** One line under the name. */
  line: string;
  /** How it plays, a few plain lines for the start sheet. */
  rules: string[];
  /** What the score counts, for "Best 42 hands". */
  unit: string;
  /** The highest score there is. */
  max: number;
}

export const SHORT_STACK: {
  seats: number;
  startBb: number;
  firstBigBlind: number;
  growth: number;
  every: number;
  refillBb: number;
  cap: number;
  shoveAt: number;
  /** The bots come only from these styles (null: any). */
  styles: StyleId[] | null;
  /** How much less well the bots play than their style (0 to 1, as at the campaign's easier rooms). */
  dull: number;
} = {
  seats: 6,
  /** Everyone sits down with this many big blinds. */
  startBb: 10,
  /** The first big blind, in chips. */
  firstBigBlind: 100,
  /** The blinds go up about this much... */
  growth: 1.5,
  /** ...every this many hands. */
  every: 6,
  /** A bot that busts is replaced by a new one with this many big blinds. */
  refillBb: 10,
  /** The run ends when you've survived this many hands. */
  cap: 100,
  /** At this many big blinds or fewer, your raise button becomes Shove. */
  shoveAt: 12,
  styles: null,
  dull: 0,
};

export const DETECTIVE = {
  seats: 6,
  stackBb: 100,
  bigBlind: 20,
  hands: 60,
  /** After these hands, "Read the table" asks for a label for every bot. */
  checks: [20, 40, 60] as readonly number[],
  /** Points for a bot you had right from that check on: the first, the second, only the last. */
  points: [30, 20, 10] as readonly number[],
} as const;

export const REWIND = {
  seats: 6,
  stackBb: 100,
  bigBlind: 20,
  hands: 30,
  rewinds: 3,
} as const;

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'shortStack',
    name: 'Short Stack',
    line: 'Ten big blinds. Stay alive.',
    rules: [
      'Six seats, and everyone starts with 10 big blinds.',
      'The blinds go up every 6 hands.',
      'A bot that runs out is replaced by a fresh one.',
      'With 12 big blinds or less, your choices are Fold, Call and Shove.',
      'Your score is how many hands you survive, up to 100.',
    ],
    unit: 'hands',
    max: SHORT_STACK.cap,
  },
  {
    id: 'detective',
    name: 'Style Detective',
    line: 'Five bots. Five ways to play. Who is who?',
    rules: [
      'You and five bots, 100 big blinds each, for 60 hands.',
      'Each bot plays one way: Rock, Shark, Calling Station, Maniac or Trapper.',
      'Tap a seat any time to tag it with a style.',
      'After hands 20, 40 and 60 you name every bot. You only hear how many are right.',
      'The sooner you get one right and keep it, the more it scores. Up to 150.',
    ],
    unit: 'points',
    max: DETECTIVE.points[0] * (DETECTIVE.seats - 1),
  },
  {
    id: 'rewind',
    name: 'Rewind',
    line: 'Three chances to play a hand again.',
    rules: [
      'Six seats, 100 big blinds each, 30 hands.',
      'After a hand you played, you can rewind it to one of your decisions and choose something else.',
      'The same cards come. The new result counts, better or worse.',
      'You get 3 Rewinds.',
      'Your score is your stack at the end, in big blinds.',
    ],
    unit: 'bb',
    max: REWIND.stackBb * REWIND.seats,
  },
];

export const challengeById = (id: string): ChallengeDef | undefined => CHALLENGES.find((c) => c.id === id);
export const isChallengeId = (id: unknown): id is ChallengeId => typeof id === 'string' && CHALLENGES.some((c) => c.id === id);

// ── Style Detective's labels ────────────────────────────────────────────────

export type Label = 'rock' | 'shark' | 'station' | 'maniac' | 'trapper';

/** The five plain labels the ten styles fold into, each with the line the bot picker uses for its main style. */
export const LABELS: { id: Label; name: string; blurb: string }[] = [
  { id: 'rock', name: 'Rock', blurb: 'Only plays great hands. When it bets big, believe it.' },
  { id: 'shark', name: 'Shark', blurb: 'Close to perfect poker. Reads you well and adjusts. Hard to rattle.' },
  { id: 'station', name: 'Calling Station', blurb: 'Calls far too much and rarely raises. Bluffing it is a bad idea.' },
  { id: 'maniac', name: 'Maniac', blurb: 'Raises everything and bluffs constantly. Hard to read, easy to trap.' },
  { id: 'trapper', name: 'Trapper', blurb: 'Quiet until it pounces. Slow-plays monsters and check-raises.' },
];

export const isLabel = (id: unknown): id is Label => typeof id === 'string' && LABELS.some((l) => l.id === id);
export const labelName = (id: Label): string => LABELS.find((l) => l.id === id)?.name ?? id;

/** Every style has exactly one label. */
export const STYLE_LABEL: Record<StyleId, Label> = {
  pro: 'shark',
  shark: 'shark',
  tag: 'shark',
  rock: 'rock',
  nervous: 'rock',
  station: 'station',
  gambler: 'station',
  maniac: 'maniac',
  lag: 'maniac',
  trapper: 'trapper',
};

/** The tell for each style, as the bot picker words it (GROUPS in src/screens/BotPicker.tsx). Shown only at the reveal. */
export const STYLE_TELL: Record<StyleId, string> = {
  pro: 'Close to perfect poker. Reads you well and adjusts. Hard to rattle.',
  shark: 'A touch more aggressive, and the quickest to work you out and go after you.',
  tag: 'Few hands, played hard. Bets its good hands big.',
  lag: 'Lots of hands and lots of pressure. Bluffs a fair bit.',
  maniac: 'Raises everything and bluffs constantly. Hard to read, easy to trap.',
  rock: 'Only plays great hands. When it bets big, believe it.',
  station: 'Calls far too much and rarely raises. Bluffing it is a bad idea.',
  gambler: 'Limps, chases every draw and loves a big pot.',
  trapper: 'Quiet until it pounces. Slow-plays monsters and check-raises.',
  nervous: 'Folds to pressure, bets small and gets rattled after losing.',
};

const stylesOf = (label: Label): StyleId[] => (Object.keys(STYLE_LABEL) as StyleId[]).filter((s) => STYLE_LABEL[s] === label);

/** Five styles for a Detective table: four different labels at least, then a style of each at random. */
export function pickSuspects(rng: () => number): StyleId[] {
  const labels = shuffle(
    LABELS.map((l) => l.id),
    rng,
  );
  const five = [...labels.slice(0, 4), labels[Math.floor(rng() * labels.length)]];
  return shuffle(
    five.map((label) => {
      const styles = stylesOf(label);
      return styles[Math.floor(rng() * styles.length)];
    }),
    rng,
  );
}

/**
 * Points for one Style Detective run. `checks` are your answers at each check, in order (player id to label), and
 * `truth` is each bot's real label. A bot scores once: the points of the earliest check from which every answer
 * was right (the last one included).
 */
export function detectiveScore(checks: Record<string, Label>[], truth: Record<string, Label>): number {
  let total = 0;
  for (const id of Object.keys(truth)) total += botPoints(checks, truth[id], id);
  return total;
}

function botPoints(checks: Record<string, Label>[], answer: Label, id: string): number {
  let from = -1;
  for (let i = checks.length - 1; i >= 0 && checks[i][id] === answer; i--) from = i;
  return from < 0 ? 0 : (DETECTIVE.points[from] ?? 0);
}

/** How many of the bots a set of tags has right (all the check sheet ever says). */
export function rightCount(tags: Record<string, Label>, truth: Record<string, Label>): number {
  return Object.keys(truth).filter((id) => tags[id] === truth[id]).length;
}

/** The labels behind a table's bots, by player id. Only the phone's own copy of the table has styles. */
export function truthOf(game: Game): Record<string, Label> {
  const out: Record<string, Label> = {};
  for (const p of game.players) if (p.bot && p.style && Object.hasOwn(STYLE_LABEL, p.style)) out[p.id] = STYLE_LABEL[p.style as StyleId];
  return out;
}

/** What a player did in plain numbers, from public moves only: how often they put chips in before the flop, and raised. */
export function publicStats(records: HandRecord[], playerId: string): { hands: number; played: number; raised: number } {
  let hands = 0;
  let played = 0;
  let raised = 0;
  for (const r of records) {
    if (!r.players.some((p) => p.id === playerId)) continue;
    hands++;
    const pre = r.actions.filter((a) => a.playerId === playerId && a.street === 'preflop' && !a.outOfTurn);
    if (pre.some((a) => a.move === 'call' || a.move === 'bet' || a.move === 'raise' || a.move === 'allin')) played++;
    if (pre.some((a) => a.move === 'bet' || a.move === 'raise' || (a.move === 'allin' && a.to > r.bigBlind))) raised++;
  }
  return { hands, played: hands ? played / hands : 0, raised: hands ? raised / hands : 0 };
}

/** "Played 54% of hands, raised 31%". */
export function statLine(s: { hands: number; played: number; raised: number }): string {
  if (!s.hands) return 'Not dealt in yet.';
  return `Played ${Math.round(s.played * 100)}% of hands, raised ${Math.round(s.raised * 100)}%`;
}

// ── The tables ──────────────────────────────────────────────────────────────

/** One challenge run on this phone: what isn't in the table itself. Lives with the bots-only table. */
export interface ChallengeRun {
  id: ChallengeId;
  /** Seeds the table's random numbers (with the table's version), so the same spot plays the same way. */
  seed: number;
  startedAt: number;
  /** Detective: the label on each bot right now (what you tapped), by player id. */
  tags?: Record<string, Label>;
  /** Detective: your answers at each check so far. */
  checks?: Record<string, Label>[];
  /** Rewind: how many are left. */
  rewindsLeft?: number;
  /** Rewind: the hands you rewound, and how they came out against the first time. */
  rewound?: { hand: number; was: number; now: number }[];
  /** Set once the run is over and scored. */
  score?: number;
}

/** A nice number of chips for a blind: 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 times a power of ten, whichever is closest. */
export function niceBlind(x: number): number {
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const p = 10 ** Math.floor(Math.log10(x));
  let best = steps[0] * p;
  for (const s of steps) if (Math.abs(Math.log(s * p) - Math.log(x)) < Math.abs(Math.log(best) - Math.log(x))) best = s * p;
  return Math.round(best);
}

/** Short Stack's big blind for a hand (hands count from 1). */
export function shortStackBlind(hand: number): number {
  const level = Math.floor(Math.max(0, hand - 1) / SHORT_STACK.every);
  return niceBlind(SHORT_STACK.firstBigBlind * SHORT_STACK.growth ** level);
}

/** The table settings each challenge plays at (no clock: it's your table). */
export function challengeSettings(id: ChallengeId): Settings {
  if (id === 'shortStack') {
    const bb = SHORT_STACK.firstBigBlind;
    return { startingStack: bb * SHORT_STACK.startBb, smallBlind: bb / 2, bigBlind: bb, rebuys: false, turnSeconds: 0 };
  }
  const c = id === 'detective' ? DETECTIVE : REWIND;
  return { startingStack: c.bigBlind * c.stackBb, smallBlind: c.bigBlind / 2, bigBlind: c.bigBlind, rebuys: false, turnSeconds: 0 };
}

/** The random numbers a challenge table's next change uses: the same table in the same state always gets the same ones. */
export function challengeRng(game: Game, seed: number): () => number {
  return seededRng(hashString(`${seed}:${game.id}:${game.version}`));
}

/**
 * Opens a challenge's table, in the lobby, with the person seated as the host. Short Stack and Rewind seat five
 * random bots. A Detective bot plays the style it was dealt, under a name and face taken from another bot, so
 * neither gives its style away.
 */
export function openChallenge(id: ChallengeId, opts: { deviceId: string; name: string; emoji: string; now: number; seed: number; fast?: boolean }): { game: Game; run: ChallengeRun } {
  const rng = seededRng(opts.seed);
  const settings = challengeSettings(id);
  const detective = id === 'detective';
  const styles = id === 'shortStack' ? (SHORT_STACK.styles ?? undefined) : undefined;
  const game = createTable({ hostDeviceId: opts.deviceId, name: opts.name, emoji: opts.emoji, settings, bots: detective ? 0 : SHORT_STACK.seats - 1, botStyles: styles, code: null, now: opts.now, rng });
  game.challenge = detective ? { id, quiet: true } : { id };
  if (id === 'shortStack' && SHORT_STACK.dull > 0) for (const p of game.players) if (p.bot) p.dull = SHORT_STACK.dull;
  if (opts.fast || detective) game.fast = true;
  const run: ChallengeRun = { id, seed: opts.seed, startedAt: opts.now };
  if (detective) {
    for (const style of pickSuspects(rng)) seatDisguised(game, style, rng);
    run.tags = {};
    run.checks = [];
  }
  if (id === 'rewind') {
    run.rewindsLeft = REWIND.rewinds;
    run.rewound = [];
  }
  return { game, run };
}

function freeSeat(game: Game): number {
  const taken = new Set(game.players.map((p) => p.seat));
  for (let s = 0; s < MAX_SEATS; s++) if (!taken.has(s)) return s;
  return -1;
}

function botPlayer(game: Game, fields: Pick<Player, 'name' | 'emoji' | 'style' | 'botProfile'>, stack: number): Player {
  return { id: newId(10), deviceId: null, bot: true, seat: freeSeat(game), stack, bought: stack, sittingOut: false, timeouts: 0, leaving: false, ...fields };
}

/** A bot that plays `style` (with the quirks of one of that style's regulars), wearing an unrelated bot's name and face. */
function seatDisguised(game: Game, style: StyleId, rng: () => number): void {
  const names = new Set(game.players.map((p) => p.name.toLowerCase()));
  const faces = new Set(game.players.map((p) => p.emoji));
  const brains = BOTS.filter((b) => b.style === style);
  const brain = brains[Math.floor(rng() * brains.length)];
  const looks = BOTS.filter((b) => !names.has(b.name.toLowerCase()) && !faces.has(b.emoji));
  const look = looks[Math.floor(rng() * looks.length)];
  game.players.push(botPlayer(game, { name: look.name, emoji: look.emoji, style, botProfile: brain.profile.id }, game.settings.startingStack));
}

/** A new random bot, with this many chips, whose name and face nobody at the table has. */
function seatFresh(game: Game, stack: number, rng: () => number, styles?: StyleId[] | null): void {
  const names = new Set(game.players.map((p) => p.name.toLowerCase()));
  const faces = new Set(game.players.map((p) => p.emoji));
  const pool = BOTS.filter((b) => !names.has(b.name.toLowerCase()) && !faces.has(b.emoji) && (!styles || styles.includes(b.style)));
  const pick = pool[Math.floor(rng() * pool.length)];
  game.players.push(botPlayer(game, { name: pick.name, emoji: pick.emoji, style: pick.style, botProfile: pick.profile.id }, stack));
  if (game.challenge?.id === 'shortStack' && SHORT_STACK.dull > 0) game.players[game.players.length - 1].dull = SHORT_STACK.dull;
}

/** The next tick at `now` would deal a new hand (so `beforeDeal()` goes first). */
export function dealDue(game: Game, now: number): boolean {
  const hand = game.hand;
  return game.status === 'playing' && (!hand || !!hand.result) && game.nextHandAt !== null && now >= game.nextHandAt - 20;
}

/** The number of the next hand to be dealt. */
const nextHand = (game: Game): number => (game.hand?.number ?? 0) + 1;

/** You, at a challenge table. */
export const heroOf = (game: Game): Player | undefined => game.players.find((p) => !p.bot);

/**
 * Whether the run is over before the next deal: you've played the challenge's hands (Short Stack: survived 100).
 * A bust ends Short Stack and Rewind by itself (no rebuys), and the table ends as any table does.
 */
export function runOver(game: Game, run: ChallengeRun): boolean {
  const next = nextHand(game);
  if (run.id === 'shortStack') return next > SHORT_STACK.cap;
  if (run.id === 'detective') return next > DETECTIVE.hands;
  return next > REWIND.hands;
}

/** Detective: the check that's due before the next deal (its index), or -1. */
export function checkDue(game: Game, run: ChallengeRun): number {
  if (run.id !== 'detective' || !game.hand?.result) return -1;
  const i = DETECTIVE.checks.indexOf(game.hand.number);
  return i >= 0 && (run.checks?.length ?? 0) === i ? i : -1;
}

/**
 * What changes between hands, just before the next deal. Returns a new table (the one given is left alone).
 * - Short Stack: the blinds for the next hand, and every bot that ran out is replaced by a fresh one with 10 big blinds.
 * - Style Detective: anyone who ran out gets 100 big blinds again, so all five bots stay to be read.
 * - Rewind: a bot that ran out is replaced by a fresh one with 100 big blinds.
 * Chips that come in this way are counted in `bought`, as a rebuy would be.
 */
export function beforeDeal(input: Game, run: ChallengeRun, rng: () => number): Game {
  const game = structuredClone(input);
  if (game.status !== 'playing') return game;
  const next = nextHand(game);
  if (run.id === 'shortStack') {
    const bb = shortStackBlind(next);
    game.settings.bigBlind = bb;
    game.settings.smallBlind = Math.round(bb / 2);
    game.settings.startingStack = bb * SHORT_STACK.refillBb;
    game.players = game.players.filter((p) => !(p.bot && p.stack === 0));
    while (game.players.length < SHORT_STACK.seats) seatFresh(game, bb * SHORT_STACK.refillBb, rng, SHORT_STACK.styles);
    return game;
  }
  const full = game.settings.bigBlind * (run.id === 'detective' ? DETECTIVE.stackBb : REWIND.stackBb);
  if (run.id === 'detective') {
    for (const p of game.players) {
      if (p.stack > 0) continue;
      p.stack = full;
      p.bought += full;
    }
    return game;
  }
  game.players = game.players.filter((p) => !(p.bot && p.stack === 0));
  while (game.players.length < REWIND.seats) seatFresh(game, full, rng);
  return game;
}

// ── Scores ──────────────────────────────────────────────────────────────────

/** Your stack after each recorded hand you were dealt into, with that hand's big blind. */
function stacksAfter(records: HandRecord[], heroId: string): { number: number; stack: number; bb: number; start: number }[] {
  const out: { number: number; stack: number; bb: number; start: number }[] = [];
  for (const r of records) {
    const me = r.players.find((p) => p.id === heroId);
    if (!me) continue;
    out.push({ number: r.number, start: me.stack, stack: me.stack + recordNet(r, heroId), bb: r.bigBlind });
  }
  return out;
}

/** Short Stack's score: hands you were dealt into and came out of with chips, up to 100. */
export function shortStackScore(records: HandRecord[], heroId: string): number {
  return Math.min(SHORT_STACK.cap, stacksAfter(records, heroId).filter((h) => h.stack > 0).length);
}

export interface ShortStackStats {
  survived: number;
  /** Times you moved all in when you could have just called or checked (a shove, not an all-in call). */
  shoves: number;
  /** Shoves in hands you came out ahead in. */
  shovesWon: number;
  /** Shoves that everyone folded to. */
  foldedTo: number;
  /** Your biggest stack, in big blinds of the hand it was in. */
  peakBb: number;
}

/** Short Stack's end screen, worked out from the hand log. */
export function shortStackStats(records: HandRecord[], heroId: string): ShortStackStats {
  let shoves = 0;
  let shovesWon = 0;
  let foldedTo = 0;
  let peakBb: number = SHORT_STACK.startBb;
  for (const h of stacksAfter(records, heroId)) peakBb = Math.max(peakBb, h.start / h.bb, h.stack / h.bb);
  for (const r of records) {
    if (!r.players.some((p) => p.id === heroId)) continue;
    let shoved = false;
    for (const street of ['preflop', 'flop', 'turn', 'river'] as const) {
      // The biggest street total so far, blinds included, to tell a shove from an all-in call.
      let top = street === 'preflop' ? r.bigBlind : 0;
      for (const a of r.actions) {
        if (a.street !== street) continue;
        if (a.playerId === heroId && a.move === 'allin' && a.to > top) shoved = true;
        if (a.move !== 'fold' && a.move !== 'check') top = Math.max(top, a.to);
      }
    }
    if (!shoved) continue;
    shoves++;
    if (recordNet(r, heroId) > 0) shovesWon++;
    if (!r.showdown && (r.won[heroId] ?? 0) > 0) foldedTo++;
  }
  return { survived: shortStackScore(records, heroId), shoves, shovesWon, foldedTo, peakBb: Math.round(peakBb * 10) / 10 };
}

/** Rewind's score: your stack in big blinds (0 if you went bust). */
export function rewindScore(game: Game): number {
  const me = heroOf(game);
  return me ? Math.round(me.stack / game.settings.bigBlind) : 0;
}

/** The score a finished run gets: the records are this table's hand log, as the phone sees it. */
export function scoreRun(game: Game, run: ChallengeRun, records: HandRecord[]): number {
  const me = heroOf(game);
  if (!me) return 0;
  if (run.id === 'shortStack') return shortStackScore(records, me.id);
  if (run.id === 'rewind') return rewindScore(game);
  return detectiveScore(run.checks ?? [], truthOf(game));
}

/** A finished run beats the best so far (a first run with any score counts as a best too). */
export function isNewBest(score: number, best: { best: number; plays: number } | undefined): boolean {
  return !best || best.plays === 0 ? score > 0 : score > best.best;
}

/** The text a run shares: the challenge and the score, plainly. */
export function shareText(id: ChallengeId, score: number, extra?: string): string {
  const c = challengeById(id)!;
  const what = id === 'shortStack' ? `survived ${score} hand${score === 1 ? '' : 's'}` : id === 'detective' ? `scored ${score} of ${c.max}` : `finished with ${score} big blinds`;
  return `I ${what} in ${c.name} on FlipUp.${extra ? ` ${extra}` : ''}`;
}
