// What your AI twin shows you after a game, worked out from plain counts: no solver, nothing sent
// anywhere. Two parts: the hands that cost you most and what happened in them, and the habits of yours
// that your twin copied, set against what players usually do.

import { heroDecisions, recordNet, type HandRecord, type Street, type TwinProfile } from '../game';
import { handBucket, type Bucket } from '../game/handBucket';
import type { TwinGame, TwinGameHand } from '../state/twinGames';
import type { PlayedHand } from '../state/training';
import { bucketAt, type HandFacts } from './twinFacts';

// ── The game ────────────────────────────────────────────────────────────────

export interface GameSummary {
  hands: number;
  /** Chips you won (or lost, below zero) in all. */
  net: number;
  /** Big blinds won per 100 hands. */
  bbPer100: number;
  /** The share of hands you won chips in. */
  won: number;
}

export function summarize(game: TwinGame): GameSummary {
  const hands = game.hands.length;
  const net = game.hands.reduce((a, h) => a + h.net, 0);
  const wins = game.hands.filter((h) => h.net > 0).length;
  return { hands, net, bbPer100: hands ? (net / Math.max(1, game.bb) / hands) * 100 : 0, won: hands ? wins / hands : 0 };
}

const BUCKET_WORDS: Record<Bucket, string> = {
  monster: 'a very strong hand',
  strong: 'two pair',
  top: 'top pair',
  mid: 'a middle pair',
  draw: 'a draw that missed',
  weak: 'high cards',
  air: 'nothing',
};

const STREET_WORDS = { preflop: 'before the flop', flop: 'on the flop', turn: 'on the turn', river: 'on the river' } as const;

const chipText = (n: number) => Math.round(n).toLocaleString('en-US');

/** In a sentence: what happened to you in a hand you lost chips in. */
export function lossLine(h: PlayedHand): string {
  const r = h.record;
  const lost = Math.max(0, -recordNet(r, h.heroId));
  const folded = heroDecisions(r, h.heroId).find((d) => d.move === 'fold');
  if (folded) {
    if (folded.spot.street === 'preflop') return `You folded before the flop and lost your blind (${chipText(lost)}).`;
    return `You folded ${STREET_WORDS[folded.spot.street]} after putting in ${chipText(lost)}.`;
  }
  if (r.showdown) {
    const mine = r.holes[h.heroId];
    const theirs = r.players.filter((p) => p.id !== h.heroId).map((p) => r.holes[p.id]).find((c) => c && c.length === 2);
    const board = r.board;
    const you = mine && board.length >= 3 ? BUCKET_WORDS[handBucket(mine, board)] : null;
    const them = theirs && board.length >= 3 ? BUCKET_WORDS[handBucket(theirs, board)] : null;
    if (you && them) return `You went to showdown with ${you} and lost ${chipText(lost)} to ${them}.`;
    if (you) return `You went to showdown with ${you} and lost ${chipText(lost)}.`;
    return `You went to showdown and lost ${chipText(lost)}.`;
  }
  return `You lost ${chipText(lost)}.`;
}

export interface LossStory {
  key: string;
  number: number;
  net: number;
  /** What happened, or null once the hand is older than the hand history keeps (and wasn't saved with its facts). */
  line: string | null;
  cards: string[];
  board: string[];
  record: HandRecord | null;
}

const words = (cards: string[], board: string[], street: Street) => BUCKET_WORDS[bucketAt(cards, board, street) as Bucket];

/** In a sentence, from a hand's saved facts: what happened in a hand you lost chips in (and what the twin had). */
export function factsLine(h: TwinGameHand): string | null {
  const f = h.facts;
  if (!f) return null;
  const lost = chipText(Math.max(0, -h.net));
  const theirs = (street: Street) => (f.theirs.length === 2 ? words(f.theirs, f.board, street) : null);
  if (f.fold) {
    if (f.fold === 'preflop') return `You folded before the flop and lost your blind (${lost}).`;
    const them = theirs(f.fold);
    const base = `You folded ${STREET_WORDS[f.fold]} after putting in ${lost}.`;
    if (!them) return base;
    if (f.bluff === 'worked') return `${base} Your twin was bluffing with ${them}${f.better ? ', and you folded the better hand' : ''}.`;
    return `${base} Your twin had ${them}.`;
  }
  if (f.sd) {
    const you = words(f.mine, f.board, f.out);
    const them = theirs(f.out);
    return them ? `You went to showdown with ${you} and lost ${lost} to ${them}.` : `You went to showdown with ${you} and lost ${lost}.`;
  }
  return `You lost ${lost}.`;
}

/** The hands that cost you most, worst first. */
export function lossStories(game: TwinGame, find: (key: string) => PlayedHand | null, max = 3): LossStory[] {
  const worst: TwinGameHand[] = game.hands.filter((h) => h.net < 0).sort((a, b) => a.net - b.net).slice(0, max);
  return worst.map((h) => {
    const played = h.facts ? null : find(h.key);
    return {
      key: h.key,
      number: h.number,
      net: h.net,
      line: factsLine(h) ?? (played ? lossLine(played) : null),
      cards: h.facts?.mine ?? played?.record.holes[played.heroId] ?? [],
      board: h.facts?.board ?? played?.record.board ?? [],
      record: played?.record ?? null,
    };
  });
}

// ── How the game went ───────────────────────────────────────────────────────

export interface BluffSummary {
  /** Bluffs that made you fold, and bluffs you called and beat. */
  worked: number;
  caught: number;
  /** Of the ones that worked: you folded a better hand than it had. */
  better: number;
  /** Chips those cost you. */
  lost: number;
  /** The worst few. */
  examples: LossStory[];
}

/** Times your twin bluffed you after the flop, from the hands saved with the twin's cards. Null when there are none. */
export function bluffsOnYou(game: TwinGame, max = 3): BluffSummary | null {
  const marked = game.hands.filter((h) => h.facts?.bluff);
  if (marked.length === 0) return null;
  const worked = marked.filter((h) => h.facts!.bluff === 'worked');
  const examples = [...worked].sort((a, b) => a.net - b.net).slice(0, max).map((h) => ({
    key: h.key,
    number: h.number,
    net: h.net,
    line: bluffLine(h.facts!),
    cards: h.facts!.mine,
    board: h.facts!.board,
    record: null,
  }));
  return {
    worked: worked.length,
    caught: marked.length - worked.length,
    better: worked.filter((h) => h.facts!.better).length,
    lost: worked.reduce((a, h) => a + Math.max(0, -h.net), 0),
    examples,
  };
}

/** One bluff that worked: what it had, what you had, what you did. */
function bluffLine(f: HandFacts): string {
  const street = f.fold ?? 'river';
  const them = words(f.theirs, f.board, street);
  const you = words(f.mine, f.board, street);
  return `Your twin bet with ${them}. You had ${you} and folded${f.better ? ': the better hand' : ''}.`;
}

export interface GameStory {
  showdown: { played: number; won: number } | null;
  /** Chips on the button and off it (the big blind, heads-up), from hands that kept their facts. */
  position: { btn: number; other: number } | null;
  /** The street your losses mostly came on. */
  street: Street | null;
}

/** Showdowns, position and where you lose: from the hands saved with their facts. */
export function gameStory(game: TwinGame): GameStory {
  const known = game.hands.filter((h) => h.facts);
  const sd = known.filter((h) => h.facts!.sd);
  const showdown = sd.length >= 3 ? { played: sd.length, won: sd.filter((h) => h.net > 0).length } : null;
  const position =
    known.length >= 8
      ? {
          btn: known.filter((h) => h.facts!.btn).reduce((a, h) => a + h.net, 0),
          other: known.filter((h) => !h.facts!.btn).reduce((a, h) => a + h.net, 0),
        }
      : null;
  const lostBy = new Map<Street, { chips: number; hands: number }>();
  for (const h of known) {
    if (h.net >= 0) continue;
    const at = lostBy.get(h.facts!.out) ?? { chips: 0, hands: 0 };
    at.chips += -h.net;
    at.hands++;
    lostBy.set(h.facts!.out, at);
  }
  const total = [...lostBy.values()].reduce((a, x) => a + x.chips, 0);
  const worst = [...lostBy.entries()].sort((a, b) => b[1].chips - a[1].chips)[0];
  const street = worst && worst[1].hands >= 3 && worst[1].chips >= total * 0.4 && worst[0] !== 'preflop' ? worst[0] : null;
  return { showdown, position, street };
}

// ── Habits ──────────────────────────────────────────────────────────────────

export interface Habit {
  id: string;
  /** The coach's line about it, with your number in it. */
  line: string;
  /** One thing to try. */
  tip: string;
  /** For "Show me the numbers": your number, how many times, and where most players sit. */
  numbers: string;
  /** How far outside the usual range it is, for sorting. */
  weight: number;
}

interface Rule {
  id: string;
  /** Your number and how many chances it's from, or null. */
  read: (t: TwinProfile) => { hits: number; of: number } | null;
  /** Fewest chances before it counts. */
  enough: number;
  /** Where most players sit, and how far outside counts as one point of weight. */
  band: [number, number];
  scale: number;
  what: string;
  high?: { line: (p: string) => string; tip: string };
  low?: { line: (p: string) => string; tip: string };
}

const RULES: Rule[] = [
  {
    id: 'hands',
    read: (t) => ({ hits: t.stats.vpip, of: t.hands }),
    enough: 50,
    band: [0.18, 0.36],
    scale: 0.08,
    what: 'hands you play before the flop',
    high: { line: (p) => `You play ${p} of your hands. Your twin does too, so you both end up in a lot of tough spots with weak cards.`, tip: 'Fold the weakest hands before the flop. You\'ll miss less and lose less.' },
    low: { line: (p) => `You only play ${p} of your hands. Your twin folds just as much, and it picks up your blinds while you wait.`, tip: 'Defend your big blind with a few more hands.' },
  },
  {
    id: 'raise',
    read: (t) => (t.stats.vpip >= 20 ? { hits: t.stats.pfr, of: t.stats.vpip } : null),
    enough: 20,
    band: [0.55, 1],
    scale: 0.15,
    what: 'hands you play that you raise',
    low: { line: (p) => `Of the hands you play, you only raise ${p}. The rest you just call, and your twin copies that.`, tip: 'Raise your strong hands instead of calling. It wins the pot right there, or builds it.' },
  },
  {
    id: 'limp',
    read: (t) => ({ hits: t.stats.limps, of: t.stats.firstIn }),
    enough: 15,
    band: [0, 0.12],
    scale: 0.08,
    what: 'times you limp when first in',
    high: { line: (p) => `When you're first in, you limp ${p} of the time. Your twin limps too, and a raise from it takes the pot.`, tip: 'Raise or fold. A limp is the weakest way to start a hand.' },
  },
  {
    id: 'fold-to-raise',
    read: (t) => ({ hits: t.stats.foldsToRaise, of: t.stats.raiseFaced }),
    enough: 12,
    band: [0.5, 0.8],
    scale: 0.12,
    what: 'raises before the flop you fold to',
    high: { line: (p) => `You fold ${p} of the time when someone raises before the flop. Your twin does too, so a raise from it takes your blinds.`, tip: 'Call or re-raise with a few more hands when it raises.' },
  },
  {
    id: 'three-bet',
    read: (t) => ({ hits: t.stats.threeBets, of: t.stats.raiseFaced }),
    enough: 12,
    band: [0.04, 0.15],
    scale: 0.05,
    what: 'raises before the flop you re-raise',
    low: { line: (p) => `You almost never re-raise before the flop (${p}). Your twin doesn't either, so raises against you are easy to call.`, tip: 'Re-raise your best hands now and then, so your raises can\'t be called so lightly.' },
  },
  {
    id: 'fold-to-bet',
    read: (t) => ({ hits: t.stats.foldsToBet, of: t.stats.betsFaced }),
    enough: 15,
    band: [0.32, 0.52],
    scale: 0.1,
    what: 'bets after the flop you fold to',
    high: { line: (p) => `You fold to a bet ${p} of the time after the flop. Your twin copies that, so its bets win pots on their own.`, tip: 'Call a bit lighter with any pair or a draw.' },
    low: { line: (p) => `You fold to a bet only ${p} of the time after the flop. Your twin calls just as much, and you both pay off big hands.`, tip: 'Let go of a weak pair when someone bets big.' },
  },
  {
    id: 'bet',
    read: (t) => ({ hits: t.stats.bets, of: t.stats.betOpps }),
    enough: 20,
    band: [0.3, 0.55],
    scale: 0.1,
    what: 'times you bet when nobody has bet before you',
    high: { line: (p) => `When nobody has bet, you bet ${p} of the time. Your twin keeps firing too, and it's easy to call down.`, tip: 'Check back some of your weaker hands.' },
    low: { line: (p) => `When nobody has bet, you only bet ${p} of the time. Your twin checks along, so the hand stays small, or the other player sees a free card.`, tip: 'Bet your good hands and your draws instead of checking them.' },
  },
  {
    id: 'cbet',
    read: (t) => ({ hits: t.stats.cbets, of: t.stats.cbetOpps }),
    enough: 10,
    band: [0.4, 0.75],
    scale: 0.12,
    what: 'flops you bet after raising before it',
    high: { line: (p) => `After you raise before the flop, you bet the flop ${p} of the time. Your twin does too, so a bet on its own doesn't say much.`, tip: 'Check back some hands that would fold to a raise anyway.' },
    low: { line: (p) => `After you raise before the flop, you only bet the flop ${p} of the time. You hand the pot back to anyone who called.`, tip: 'Bet the flop more often when you raised, even when you missed.' },
  },
  {
    id: 'bluff',
    read: (t) => ({ hits: t.stats.postBluffs, of: t.stats.postAgg }),
    enough: 15,
    band: [0.15, 0.4],
    scale: 0.1,
    what: 'bets and raises after the flop that were with a weak hand or a draw',
    high: { line: (p) => `Of your bets and raises after the flop, ${p} were with a weak hand or a draw. Your twin bluffs just as often.`, tip: 'Pick bluffs that tell a story, like a draw that could get there.' },
    low: { line: (p) => `Only ${p} of your bets after the flop are bluffs. Your twin is just as honest, so a bet from either of you says "I've got it".`, tip: 'Add a bluff now and then with a draw.' },
  },
  {
    id: 'showdown',
    read: (t) => ({ hits: t.stats.showdowns, of: t.stats.sawFlop }),
    enough: 20,
    band: [0.2, 0.42],
    scale: 0.08,
    what: 'flops you see that go to showdown',
    high: { line: (p) => `You go to showdown ${p} of the time you see a flop. You call a lot of bets all the way to the end, and your twin does too.`, tip: 'Folding on the river to a big bet is allowed.' },
  },
];

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Your habits that sit outside the usual range, biggest first. Empty when nothing stands out (or it hasn't seen enough). */
export function habitsOf(twin: TwinProfile, max = 3): Habit[] {
  const out: Habit[] = [];
  for (const rule of RULES) {
    const r = rule.read(twin);
    if (!r || r.of < rule.enough) continue;
    const value = r.hits / r.of;
    const [lo, hi] = rule.band;
    const side = value > hi ? rule.high : value < lo ? rule.low : null;
    if (!side) continue;
    const weight = (value > hi ? value - hi : lo - value) / rule.scale;
    if (weight < 0.5) continue;
    out.push({
      id: rule.id,
      line: side.line(pct(value)),
      tip: side.tip,
      numbers: `${pct(value)} of ${r.of} ${rule.what}. Most players land between ${pct(lo)} and ${pct(hi)}.`,
      weight,
    });
  }
  const tell = sizeTell(twin);
  if (tell) out.push(tell);
  return out.sort((a, b) => b.weight - a.weight).slice(0, max);
}

/** Whether the size of your bets gives your hand away: how much bigger you bet with a good hand than with a weak one (or the other way round). */
function sizeTell(twin: TwinProfile): Habit | null {
  const mean = (idx: number[]) => {
    const n = idx.reduce((a, i) => a + twin.stats.sizeN[i], 0);
    return n >= 4 ? idx.reduce((a, i) => a + twin.stats.sizeSum[i], 0) / n : null;
  };
  const strong = mean([4, 5, 6]);
  const weak = mean([0, 1, 2, 3]);
  if (strong === null || weak === null) return null;
  const diff = strong - weak;
  if (Math.abs(diff) < 0.3) return null;
  const big = diff > 0;
  return {
    id: 'size-tell',
    line: big
      ? `Your bets are bigger with a good hand (${pct(strong)} of the pot) than with a weak one (${pct(weak)}). Your twin copies that, and it folds when you size up.`
      : `You bet bigger with a weak hand (${pct(weak)} of the pot) than with a good one (${pct(strong)}). Your twin copies that, and it calls you down when you bet small.`,
    tip: 'Use the same size with your good hands and your bluffs, so a bet says nothing.',
    numbers: `${pct(strong)} of the pot with top pair or better, ${pct(weak)} with less (from your bets when nobody had bet). Hands that bet about the same size either way give nothing away.`,
    weight: (Math.abs(diff) - 0.3) / 0.15 + 0.5,
  };
}
