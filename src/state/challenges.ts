// Bot challenges: a small, themed heads-up game against one bot with a goal and up to three stars.
// Nothing here is training: it's the normal game with a twist (short stacks, a bluff quota, a comeback).
// Flavour text stays about the scene, never about how a bot plays, so players still work that out.

import { seededRng } from '../game';
import { handBucket } from '../game/botPlay';
import type { Game } from '../game';
import { read, write } from './persist';

export type Goal =
  | { kind: 'bust' }
  | { kind: 'double'; hands: number }
  | { kind: 'survive'; hands: number }
  | { kind: 'pots'; n: number; hands: number }
  | { kind: 'bluffs'; n: number; hands: number }
  | { kind: 'bigpot'; bb: number; hands: number };

export interface Challenge {
  /** The bot's name: one challenge per bot. */
  bot: string;
  title: string;
  blurb: string;
  /** Starting stacks, in big blinds. */
  you: number;
  them: number;
  bigBlind: number;
  /** Minutes between blind rises (0 = never) and where they stop, in chips. */
  blindMinutes?: number;
  blindCap?: number;
  goal: Goal;
  /** What earns the 2nd and 3rd star: hands used (fewer is better) or, for survive, your final stack against your start. */
  stars: { by: 'hands' | 'ratio'; two: number; three: number };
}

type Make = (bot: string, title: string, blurb: string) => Challenge;

const short = (bb = 10, you = 15, hands: [number, number] = [20, 10]): Make => (bot, title, blurb) => ({
  bot, title, blurb, you, them: you, bigBlind: bb, goal: { kind: 'bust' }, stars: { by: 'hands', two: hands[0], three: hands[1] },
});
const comeback: Make = (bot, title, blurb) => ({
  bot, title, blurb, you: 30, them: 90, bigBlind: 10, goal: { kind: 'bust' }, stars: { by: 'hands', two: 60, three: 35 },
});
const double = (stack = 50, hands = 25, two = 18, three = 10): Make => (bot, title, blurb) => ({
  bot, title, blurb, you: stack, them: stack, bigBlind: 10, goal: { kind: 'double', hands }, stars: { by: 'hands', two, three },
});
const bluff = (n = 3, hands = 30, two = 24, three = 16): Make => (bot, title, blurb) => ({
  bot, title, blurb, you: 100, them: 100, bigBlind: 10, goal: { kind: 'bluffs', n, hands }, stars: { by: 'hands', two, three },
});
const pots = (n = 7, hands = 15, two = 12, three = 9): Make => (bot, title, blurb) => ({
  bot, title, blurb, you: 100, them: 100, bigBlind: 10, goal: { kind: 'pots', n, hands }, stars: { by: 'hands', two, three },
});
const bigpot = (bb = 80, hands = 40, two = 30, three = 20): Make => (bot, title, blurb) => ({
  bot, title, blurb, you: 100, them: 100, bigBlind: 10, goal: { kind: 'bigpot', bb, hands }, stars: { by: 'hands', two, three },
});
const survive = (hands = 25, minutes = 1): Make => (bot, title, blurb) => ({
  bot, title, blurb, you: 40, them: 40, bigBlind: 10, blindMinutes: minutes, blindCap: 400, goal: { kind: 'survive', hands }, stars: { by: 'ratio', two: 1, three: 1.5 },
});
const deep = (hands = 40): Make => (bot, title, blurb) => ({
  bot, title, blurb, you: 200, them: 200, bigBlind: 10, goal: { kind: 'double', hands }, stars: { by: 'hands', two: Math.round(hands * 0.75), three: Math.round(hands * 0.5) },
});

const ROWS: [string, Make, string, string][] = [
  ['Luna', pots(), 'Lily pad', 'Hop from pot to pot. Win 7 in 15 hands.'],
  ['Eli', bigpot(), 'Showtime', 'One huge pot is all you need.'],
  ['Remi', comeback, 'Under the bridge', 'Start small, take the lot.'],
  ['Emma', comeback, 'Cornered', 'A third of the chips. Win it back.'],
  ['Anna', survive(), 'Slow and steady', 'Blinds climb. Just keep your seat.'],
  ['Max', short(20, 20, [18, 9]), 'High noon', 'Twenty big blinds, big blinds. No hiding.'],
  ['Zoe', deep(), 'Deep end', 'Lots of chips and plenty of room to play.'],
  ['Theo', pots(6, 12, 10, 8), 'Pride', 'Take the pots, take the crown.'],
  ['Ivy', double(), 'Rainbow', 'Double your stack before the clouds roll in.'],
  ['Kai', bigpot(100, 40, 30, 20), 'Big cat', 'Win one monster pot.'],
  ['Milo', pots(4, 8, 7, 5), 'Fetch', 'Four pots in eight hands. Go get them.'],
  ['Nora', survive(30, 1), 'Night shift', 'A long night with rising blinds.'],
  ['Otis', deep(35), 'Hibernation', 'Everyone starts deep. Wake up with double.'],
  ['Pia', short(), 'Cold open', 'Fifteen big blinds each. Straight to it.'],
  ['Rex', short(20, 10, [12, 6]), 'Big bang', 'Ten big blinds, high stakes, fast.'],
  ['Sage', survive(25, 1), 'Desert', 'The blinds heat up. Last through it.'],
  ['Tess', pots(5, 12, 9, 7), 'Honey pot', 'Five pots in twelve hands.'],
  ['Uma', deep(40), 'Deep dive', 'Two hundred big blinds each. Double up.'],
  ['Vic', bluff(), 'Cool hand', 'Win three pots with nothing to show.'],
  ['Wren', double(40, 15, 11, 7), 'Early bird', 'Double up fast.'],
  ['Yuki', bluff(2, 15, 12, 8), 'Flutter', 'Two quick pots without showing a thing.'],
  ['Ziggy', pots(), 'Stripes', 'Seven pots in fifteen hands.'],
  ['Bea', double(), 'Lucky', 'Double your stack in 25 hands.'],
  ['Cole', comeback, 'Lone wolf', 'Out-chipped three to one. Win anyway.'],
  ['Dot', short(10, 12, [18, 9]), 'Small stakes', 'Twelve big blinds. Every chip counts.'],
  ['Finn', short(), 'Short stack', 'Fifteen big blinds each. First bust loses.'],
  ['Gus', bluff(), 'Bluff school', 'Win three pots without showdown, holding nothing.'],
  ['Hana', double(60, 30, 22, 14), 'In bloom', 'Grow your stack to double.'],
  ['Iggy', short(20, 10, [12, 6]), 'Quick change', 'Ten big blinds and no time.'],
  ['Jax', pots(6, 12, 10, 8), 'Hot streak', 'Six pots in twelve hands.'],
  ['Kiki', comeback, 'Nine lives', 'Down to a third. Land on your feet.'],
  ['Leo', survive(25, 1), 'Head above', 'Blinds rise. Keep your head above water.'],
  ['Mags', bigpot(80, 30, 22, 14), 'Snap', 'One big pot, fast.'],
  ['Ned', pots(4, 8, 7, 5), 'Cheese', 'Nibble four pots in eight hands.'],
  ['Ora', bluff(3, 25, 20, 14), 'Show off', 'Three pots won on pure nerve.'],
  ['Pip', double(25, 20, 14, 8), 'Little steps', 'Twenty-five big blinds. Double up.'],
  ['Quinn', deep(30), 'High flyer', 'Deep stacks. Double before landing.'],
  ['Rosa', comeback, 'Thorns', 'Start behind. Finish on top.'],
  ['Stan', survive(30, 1), 'Stonewall', 'Stand firm while the blinds rise.'],
  ['Tex', short(20, 10, [12, 6]), 'Twister', 'Ten big blinds in a whirlwind.'],
];

export const CHALLENGES: Challenge[] = ROWS.map(([bot, make, title, blurb]) => make(bot, title, blurb));
export const challengeFor = (bot: string): Challenge | undefined => CHALLENGES.find((c) => c.bot === bot);

/** This week's handful: the same six for everyone on a phone until Monday-ish rolls over. */
export function weeklyPicks(now = Date.now(), count = 6): Challenge[] {
  const week = Math.floor(now / (7 * 86_400_000));
  const rng = seededRng(week * 7919 + 13);
  const pool = [...CHALLENGES];
  const out: Challenge[] = [];
  while (out.length < count && pool.length) out.push(...pool.splice(Math.floor(rng() * pool.length), 1));
  return out;
}

export function goalText(g: Goal): string {
  switch (g.kind) {
    case 'bust':
      return 'Win every chip.';
    case 'double':
      return `Double your stack within ${g.hands} hands.`;
    case 'survive':
      return `Still have chips after ${g.hands} hands.`;
    case 'pots':
      return `Win ${g.n} pots within ${g.hands} hands.`;
    case 'bluffs':
      return `Win ${g.n} pots without showdown, holding a weak hand, within ${g.hands} hands.`;
    case 'bigpot':
      return `Win one pot of ${g.bb} big blinds or more within ${g.hands} hands.`;
  }
}

export function starsText(c: Challenge): string {
  return c.stars.by === 'ratio'
    ? `★★ finish with at least what you started with · ★★★ finish with ${c.stars.three}x`
    : `★★ in ${c.stars.two} hands or fewer · ★★★ in ${c.stars.three} or fewer`;
}

// ── Progress ────────────────────────────────────────────────────────────────

export interface Progress {
  hands: number;
  pots: number;
  bluffs: number;
  bigPot: boolean;
  /** Your stack when it began, to measure doubling and the final ratio. */
  start: number;
  /** The last hand counted, so a hand is never counted twice. */
  last: number;
}

export interface Running {
  bot: string;
  progress: Progress;
  /** Set once the challenge has been won or lost; the game carries on as a plain one. */
  over?: { won: boolean; stars: number };
}

export const newRunning = (bot: string, start: number): Running => ({ bot, progress: { hands: 0, pots: 0, bluffs: 0, bigPot: false, start, last: 0 } });

/** A hand you won without showdown counts as a bluff when what you held was weak. */
function weak(hole: string[], board: string[]): boolean {
  if (hole.length !== 2) return false;
  if (board.length >= 3) {
    const b = handBucket(hole, board);
    return b === 'air' || b === 'weak';
  }
  const r = hole.map((c) => '23456789TJQKA'.indexOf(c[0]));
  return r[0] !== r[1] && Math.min(...r) < 8;
}

export function progressText(c: Challenge, p: Progress): string {
  const g = c.goal;
  switch (g.kind) {
    case 'bust':
      return `Hand ${p.hands}`;
    case 'double':
      return `Hand ${p.hands} of ${g.hands}`;
    case 'survive':
      return `Hand ${p.hands} of ${g.hands}`;
    case 'pots':
      return `${p.pots} of ${g.n} pots · hand ${p.hands} of ${g.hands}`;
    case 'bluffs':
      return `${p.bluffs} of ${g.n} bluffs · hand ${p.hands} of ${g.hands}`;
    case 'bigpot':
      return `${p.bigPot ? 'Done' : 'Not yet'} · hand ${p.hands} of ${g.hands}`;
  }
}

/** Counts a finished hand and says whether the challenge is now won or lost. Mutates `run.progress`. */
export function countHand(run: Running, c: Challenge, game: Game, deviceId: string): void {
  const hand = game.hand;
  const me = game.players.find((p) => p.deviceId === deviceId);
  if (!hand?.result || !me || run.over || hand.number <= run.progress.last) return;
  const p = run.progress;
  p.last = hand.number;
  p.hands += 1;
  const total = hand.result.pots.reduce((a, x) => a + x.amount, 0);
  const won = (hand.result.won[me.id] ?? 0) > 0;
  const seat = hand.seats.find((s) => s.playerId === me.id);
  if (won) {
    p.pots += 1;
    if (!hand.result.showdown && seat && weak(seat.cards, hand.board)) p.bluffs += 1;
    if (c.goal.kind === 'bigpot' && total >= c.goal.bb * c.bigBlind) p.bigPot = true;
  }
  const bot = game.players.find((x) => x.bot);
  const busted = me.stack === 0;
  const botOut = (bot?.stack ?? 1) === 0;
  const g = c.goal;
  let result: 'won' | 'lost' | null = null;
  // However the goal reads, taking every chip wins and losing yours loses: the table ends either way.
  if (botOut) result = 'won';
  else if (busted) result = 'lost';
  else if (g.kind === 'bust') result = null;
  else if (g.kind === 'double') result = me.stack >= 2 * p.start ? 'won' : p.hands >= g.hands ? 'lost' : null;
  else if (g.kind === 'survive') result = p.hands >= g.hands ? 'won' : null;
  else if (g.kind === 'pots') result = p.pots >= g.n ? 'won' : p.hands >= g.hands ? 'lost' : null;
  else if (g.kind === 'bluffs') result = p.bluffs >= g.n ? 'won' : p.hands >= g.hands ? 'lost' : null;
  else if (g.kind === 'bigpot') result = p.bigPot ? 'won' : p.hands >= g.hands ? 'lost' : null;
  if (!result) return;
  if (result === 'lost') {
    run.over = { won: false, stars: 0 };
    return;
  }
  const metric = c.stars.by === 'ratio' ? me.stack / p.start : p.hands;
  const stars = c.stars.by === 'ratio' ? 1 + (metric >= c.stars.two ? 1 : 0) + (metric >= c.stars.three ? 1 : 0) : 1 + (metric <= c.stars.two ? 1 : 0) + (metric <= c.stars.three ? 1 : 0);
  run.over = { won: true, stars };
}

// ── Saved results ───────────────────────────────────────────────────────────

export type Results = Record<string, { stars: number; at: number }>;

export function loadResults(): Results {
  const r = read<Results>('flipup.challenges');
  return r && typeof r === 'object' ? r : {};
}

/** Keeps the best stars per bot. */
export function saveResult(bot: string, stars: number): void {
  const all = loadResults();
  if ((all[bot]?.stars ?? 0) >= stars) return;
  write('flipup.challenges', { ...all, [bot]: { stars, at: Date.now() } });
}
