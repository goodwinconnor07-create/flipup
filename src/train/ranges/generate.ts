// Builds range training hands from rules, so there can be hundreds of them across every seat and many kinds of
// spot. A hand starts from each player's preflop chart for their seat (charts.ts) and narrows street by street the
// way players really play (from coaching material: raisers c-bet dry high boards a lot and low connected boards
// less, callers continue with pairs and draws, turn barrels are strong hands and good draws, river bets after
// barrelling are polarised between value and missed draws, live players bluff much less, a check caps a range...).
// The groups, clues and explanation come from the resulting ranges and the numbers. A spot is kept only when the
// best play wins clearly (see ranges.test.ts, which checks every generated hand exactly like a hand-written one).
//
// Run `GEN_RANGES=1 npx vitest run src/train/ranges/generate.test.ts` to rebuild generated.json.

import { score, toInt } from '../../game/botEval';
import { fullDeck, rankOf, type Card } from '../../game/cards';
import { CHARTS } from './charts';
import { pack, unpack } from './scenarios';
import { classify, texture, type Kind } from './classify';
import {
  analyse,
  bb,
  callShare,
  comboKey,
  expandRange,
  optionsFor,
  replay,
  spotOf,
  type Clue,
  type GroupView,
  type OpponentView,
  type OptionId,
  type Opponent,
  type Pos,
  type RangeGroup,
  type Role,
  type Scenario,
  type Step,
  type Street,
} from './model';

// ── Players ─────────────────────────────────────────────────────────────────

type Style = 'reg' | 'aggro' | 'passive' | 'loose';
const STYLE_NAME: Record<Style, string> = {
  reg: 'Solid regular',
  aggro: 'Aggressive regular',
  passive: 'Passive live player',
  loose: 'Loose live player',
};
/** How much each style bluffs, next to a solid regular. */
const BLUFFS: Record<Style, number> = { aggro: 1.25, reg: 1, loose: 0.6, passive: 0.2 };
/** How readily each style calls. */
const STICKY: Record<Style, number> = { aggro: 1, reg: 1, loose: 1.3, passive: 1.1 };

// ── Narrowing a range ───────────────────────────────────────────────────────

interface Combo {
  cards: [Card, Card];
  w: number;
}

/** Charts for calling (or limping): the biggest hands would usually have raised, so only a few are trapping. */
const FLAT = /^BB vs|defend|cold call|Call a 3-bet|limp/i;
const premium = (c: [Card, Card]) => {
  const [a, b] = [rankOf(c[0]), rankOf(c[1])];
  return (a === b && a >= 12) || (Math.min(a, b) === 13 && Math.max(a, b) === 14);
};

/** A player's range before the flop. Hands that would have raised are rare in calling ranges (and never the hero's). */
const startRange = (chart: string, dead: Card[]): Combo[] => {
  const gone = new Set(dead);
  const flat = FLAT.test(chart);
  return expandRange(CHARTS[chart])
    .filter((c) => !gone.has(c[0]) && !gone.has(c[1]))
    .map((cards) => ({ cards, w: flat && premium(cards) ? 0.2 : 1 }));
};

/** Keeps each combo with the chance it takes this action, given what it is on this board. */
function narrow(range: Combo[], board: Card[], p: (k: Kind) => number, before?: Card[]): Combo[] {
  return range.map((c) => ({ ...c, w: c.w * Math.max(0, Math.min(1, p(classify(c.cards, board, before)))) })).filter((c) => c.w > 0.01);
}

const strongDraw = (k: Kind) =>
  k.draw === 'flush draw' || k.draw === 'nut flush draw' || k.draw === 'open-ender' || k.draw === 'combo draw';

/** The raiser c-bets the flop: almost everything on dry high boards, a stronger range elsewhere. */
const cbet = (board: Card[], style: Style) => (k: Kind) => {
  const t = texture(board);
  if (t.high && t.dry) return 0.85;
  if (k.level >= 5) return 0.9;
  if (strongDraw(k)) return 0.8;
  if (k.level >= 3) return 0.45;
  return (t.low && t.connected ? 0.25 : 0.4) * Math.min(1.2, BLUFFS[style]);
};
/** Checking the flop back: whatever didn't c-bet. */
const checkBack = (board: Card[], style: Style) => (k: Kind) => 1 - cbet(board, style)(k);

/** Calling a flop bet: pairs and draws, some ace-high and a few floats. Sets and the best draws sometimes raise instead. */
const callFlop = (style: Style) => (k: Kind) => {
  if (k.level >= 8) return 0.6;
  if (k.level >= 3) return 1;
  if (k.draw === 'combo draw') return 0.7;
  if (strongDraw(k)) return 1;
  if (k.draw === 'gutshot') return 0.6;
  return (k.level === 1 ? 0.4 : 0.12) * STICKY[style];
};

/** Barrelling the turn: value, the good draws, and some air (less for passive players). */
const barrel = (style: Style) => (k: Kind) => {
  if (k.level >= 6) return 0.9;
  if (k.level === 5) return 0.6;
  if (k.level === 4) return 0.25;
  if (strongDraw(k)) return 0.75 * Math.min(1.1, BLUFFS[style] + 0.1);
  if (k.level === 3) return 0.1;
  if (k.draw === 'gutshot') return 0.35 * BLUFFS[style];
  return 0.28 * BLUFFS[style];
};
const giveUpTurn = (style: Style) => (k: Kind) => 1 - barrel(style)(k);

/** Calling a turn bet: top pair or better, most middle pairs, the strong draws. */
const callTurn = (style: Style) => (k: Kind) => {
  if (k.level >= 8) return 0.65;
  if (k.level >= 5) return 1;
  if (k.level === 4) return 0.7 * STICKY[style];
  if (k.draw === 'combo draw' || strongDraw(k)) return 0.9;
  if (k.level === 3) return 0.3 * STICKY[style];
  if (k.draw === 'gutshot') return 0.35;
  return 0.04;
};

/** Check-raising the turn: two pair or better, some combo draws, a few flush draws from aggressive players. */
const checkRaiseTurn = (style: Style) => (k: Kind) => {
  if (k.level >= 7) return 0.55;
  if (k.draw === 'combo draw') return 0.45 * BLUFFS[style];
  if (strongDraw(k)) return 0.15 * BLUFFS[style];
  return 0;
};

/** Leading the river into the raiser: value from two pair up, top pair sometimes, and missed draws as bluffs. */
const leadRiver = (style: Style) => (k: Kind) => {
  if (k.level >= 7) return 0.75;
  if (k.level === 6) return 0.35;
  if (k.label.startsWith('Missed')) return 0.3 * BLUFFS[style];
  return 0;
};

// ── River roles ─────────────────────────────────────────────────────────────

/** A river bet after barrelling: value (top pair, good kicker or better) or a bluff with a hand that can't win. */
function riverBettor(k: Kind, style: Style, big: boolean): { role: Role; p: number } | null {
  const valueFrom = style === 'passive' ? 7 : big ? 7 : 6;
  if (k.level >= valueFrom) return { role: 'value', p: 1 };
  if (k.level === 6 && !big) return { role: 'value', p: 0.6 };
  if (k.level <= 1) {
    const missed = k.label.startsWith('Missed') ? 0.55 : 0.2;
    return { role: 'bluff', p: missed * BLUFFS[style] };
  }
  return null;
}

// ── Naming groups ───────────────────────────────────────────────────────────

const RANK_NAME = 'xx23456789TJQKA';
const handName = (c: [Card, Card]) => {
  const [a, b] = [rankOf(c[0]), rankOf(c[1])].sort((x, y) => y - x);
  return `${RANK_NAME[a]}-${RANK_NAME[b]}`;
};

/** Up to four example hands in a group, most common first ("A-K, K-Q, K-J"). */
function examples(combos: Combo[]): string {
  const by = new Map<string, number>();
  for (const c of combos) by.set(handName(c.cards), (by.get(handName(c.cards)) ?? 0) + c.w);
  return [...by.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([n]) => n)
    .join(', ');
}

interface Grouped {
  label: string;
  role: Role;
  small?: Role;
  big?: Role;
  combos: Combo[];
  /** Hands of the same kind that answer differently (see `merge`). */
  parts?: { role: Role; small?: Role; big?: Role; combos: Combo[] }[];
}

/**
 * One group per kind of hand: groups with the same name (the weak pairs that call and the weak pairs that fold) become
 * one group, answering like most of its hands, with the rest kept as `split` parts that answer their own way.
 */
function merge(list: Grouped[]): Grouped[] {
  const by = new Map<string, Grouped[]>();
  for (const g of list) by.set(g.label, [...(by.get(g.label) ?? []), g]);
  return [...by.values()].map((gs) => {
    const sized = gs.map((g) => ({ g, w: g.combos.reduce((t, c) => t + c.w, 0) })).sort((a, b) => b.w - a.w);
    const [main, ...rest] = sized.map((x) => x.g);
    return rest.length ? { ...main, parts: rest.map(({ role, small, big, combos }) => ({ role, small, big, combos })) } : main;
  });
}

function toGroups(list: Grouped[]): RangeGroup[] {
  const pick = (role: Role, r?: Role) => (r && r !== role ? r : undefined);
  return list
    .filter((g) => g.combos.length)
    .map((g) => {
      const all = [...g.combos, ...(g.parts ?? []).flatMap((p) => p.combos)];
      const total = all.reduce((n, c) => n + c.w, 0);
      const weight = Math.round((total / all.length) * 100) / 100;
      const small = pick(g.role, g.small);
      const big = pick(g.role, g.big);
      return {
        label: `${g.label}: ${examples(all)}`,
        hands: g.combos.map((c) => c.cards.join('')).join(', '),
        role: g.role,
        ...(small ? { small } : {}),
        ...(big ? { big } : {}),
        ...(weight < 0.995 ? { weight: Math.max(0.01, weight) } : {}),
        ...(g.parts?.length
          ? {
              split: g.parts.map((p) => {
                const ps = pick(p.role, p.small);
                const pb = pick(p.role, p.big);
                return {
                  hands: p.combos.map((c) => c.cards.join('')).join(', '),
                  role: p.role,
                  ...(ps ? { small: ps } : {}),
                  ...(pb ? { big: pb } : {}),
                };
              }),
            }
          : {}),
      };
    })
    .filter((g) => (g.weight ?? 1) >= 0.01);
}

/** Groups a range for a spot where you face a bet: the bettor's value and bluffs. */
function bettorGroups(range: Combo[], board: Card[], before: Card[], style: Style, big: boolean): RangeGroup[] {
  const by = new Map<string, Grouped>();
  for (const c of range) {
    const k = classify(c.cards, board, before);
    const r = riverBettor(k, style, big);
    if (!r) continue;
    const key = `${k.label}|${r.role}`;
    if (!by.has(key)) by.set(key, { label: k.label, role: r.role, combos: [] });
    by.get(key)!.combos.push({ cards: c.cards, w: c.w * r.p });
  }
  return toGroups([...by.values()].map((g) => ({ ...g, combos: g.combos.filter((c) => c.w > 0.01) })));
}

/**
 * How much of its range each style defends against a river bet, next to the minimum defence that stops any bluff
 * from showing a profit (pot / (pot + bet)). Most players fold a bit too much; loose live players call too much.
 */
const DEFEND: Record<Style, number> = { reg: 0.85, aggro: 0.9, passive: 0.75, loose: 1.15 };

/**
 * Groups a river range by how each part answers a bet of a third, three-quarters or more than the pot: the player
 * calls with the best part of their range, as much of it as the bet size and their style allow (less in a multiway
 * pot, where someone else can call too), and never with no pair at all.
 */
function callerGroups(range: Combo[], board: Card[], before: Card[] | undefined, style: Style, players = 1): RangeGroup[] {
  const scored = range
    .map((c) => ({ c, k: classify(c.cards, board, before), v: score([...c.cards, ...board].map(toInt)) }))
    .sort((x, y) => y.v - x.v);
  const total = scored.reduce((t, x) => t + x.c.w, 0);
  // Multiway, each player defends less: someone else can call too (roughly, the folds have to add up to the same).
  const factor = DEFEND[style] * (players >= 3 ? 0.62 : players === 2 ? 0.75 : 1);
  const cut = (frac: number) => Math.min(0.95, factor / (1 + frac)) * total;
  const by = new Map<string, Grouped>();
  // Hands of equal strength answer alike: `above` counts only the strictly stronger part of the range.
  let acc = 0;
  let above = 0;
  let prev = Infinity;
  for (const { c, k, v } of scored) {
    if (v !== prev) [above, prev] = [acc, v];
    acc += c.w;
    const at = (frac: number): Role => (k.level === 0 || above >= cut(frac) ? 'folds' : k.level >= 9 ? 'raises' : 'calls');
    const r = { role: at(0.75), small: at(0.33), big: at(1.25) };
    const key = `${k.label}|${r.role}|${r.small}|${r.big}`;
    if (!by.has(key)) by.set(key, { label: k.label, ...r, combos: [] });
    by.get(key)!.combos.push(c);
  }
  return toGroups(merge([...by.values()]));
}

/** Groups a range that's just in the pot (a caller in front of you): all `calls`. */
function stayGroups(range: Combo[], board: Card[], before?: Card[]): RangeGroup[] {
  const by = new Map<string, Grouped>();
  for (const c of range) {
    const k = classify(c.cards, board, before);
    const name = k.label;
    if (!by.has(name)) by.set(name, { label: name, role: 'calls', combos: [] });
    by.get(name)!.combos.push(c);
  }
  return toGroups([...by.values()]);
}

// ── Words ───────────────────────────────────────────────────────────────────

const SEAT: Record<Pos, string> = {
  UTG: 'under the gun',
  UTG1: 'UTG+1',
  MP: 'middle position',
  LJ: 'the lojack',
  HJ: 'the hijack',
  CO: 'the cutoff',
  BTN: 'the button',
  SB: 'the small blind',
  BB: 'the big blind',
};
const pct = (x: number) => `${Math.round(x * 100)}%`;
const CARD_NAME: Record<string, string> = {
  A: 'ace',
  K: 'king',
  Q: 'queen',
  J: 'jack',
  T: 'ten',
  '9': 'nine',
  '8': 'eight',
  '7': 'seven',
  '6': 'six',
  '5': 'five',
  '4': 'four',
  '3': 'three',
  '2': 'two',
};

function flopWords(board: Card[]): string {
  const t = texture(board);
  const r = board
    .slice(0, 3)
    .sort((x, y) => rankOf(y) - rankOf(x))
    .map((c) => c[0])
    .join('-');
  const bits = [
    t.mono ? 'all one suit' : t.twoTone ? 'with two of a suit' : 'rainbow',
    t.paired ? 'paired' : t.connected ? 'connected' : t.dry ? 'dry' : 'not connected',
  ];
  return `${r} (${bits.join(', ')})`;
}

/** What the turn or river card did: completed a flush, paired the board, an overcard, or nothing much. */
function cardWords(board: Card[], i: number): string {
  const c = board[i];
  const before = board.slice(0, i);
  const sameSuit = before.filter((x) => x[1] === c[1]).length;
  const name = CARD_NAME[c[0]];
  if (sameSuit === 2) return `The ${name} makes three of a suit: flush draws just got there`;
  if (sameSuit >= 3) return `The ${name} puts four of a suit on the board`;
  if (before.some((x) => x[0] === c[0])) return `The ${name} pairs the board`;
  if (rankOf(c) > Math.max(...before.map(rankOf))) return `The ${name} is a new overcard`;
  const ranksNow = [...new Set([...before, c].map(rankOf))].sort((a, b) => a - b);
  let run = 1;
  let best = 1;
  for (let j = 1; j < ranksNow.length; j++) ((run = ranksNow[j] - ranksNow[j - 1] === 1 ? run + 1 : 1), (best = Math.max(best, run)));
  if (best >= 4) return `The ${name} puts four in a row on the board: straights are possible`;
  // Three ranks inside five in a row: someone can have a straight now.
  const straightable = (rs: number[]) => {
    const set = new Set(rs.flatMap((r) => (r === 14 ? [1, 14] : [r])));
    for (let lo = 1; lo <= 10; lo++) if ([0, 1, 2, 3, 4].filter((x) => set.has(lo + x)).length >= 3) return true;
    return false;
  };
  if (straightable([...before, c].map(rankOf)) && !straightable(before.map(rankOf)))
    return `The ${name} connects the board: a straight is possible now, and more straight draws`;
  return `The ${name} doesn’t change much`;
}

const heroWords = (k: Kind) =>
  ({
    'Top pair, good kicker': 'top pair, good kicker',
    'Top pair, weak kicker': 'top pair with a weak kicker',
    Overpairs: 'an overpair',
    'Second pair': 'second pair',
    'Weak pairs': 'a weak pair',
    'Ace-high': 'ace-high',
    Nothing: 'nothing',
    'Two pair': 'two pair',
    Sets: 'a set',
    Trips: 'trips',
    Straights: 'a straight',
    Flushes: 'a flush',
    'Full houses': 'a full house',
    'Missed flush draws': 'a missed flush draw',
    'Missed straight draws': 'a missed straight draw',
  })[k.label] ?? k.label.toLowerCase();

// ── Building a hand ─────────────────────────────────────────────────────────

const round = (n: number) => Math.max(1, Math.round(n * 2) / 2);

interface Seat {
  pos: Pos;
  chart: string;
  style: Style;
}

interface Draft {
  table: 6 | 9;
  hero: Seat & { cards: [Card, Card] };
  others: Seat[];
  board: Card[];
  actions: Step[];
  /** Starting stacks (everyone 100bb if not given). */
  stacks?: Partial<Record<Pos, number>>;
  ante?: number;
  format?: 'cash' | 'tournament';
}

/** The table setup a draft adds to a scenario: stacks, ante and format. */
const tableOf = (d: Draft) => ({
  ...(d.stacks ? { stacks: d.stacks } : {}),
  ...(d.ante ? { ante: d.ante } : {}),
  ...(d.format === 'tournament' ? { format: 'tournament' as const } : {}),
});

/** The hand so far, for bet sizes (the actions so far, with the board up to `cards`). */
function replayDraft(d: Draft, cards: number) {
  const s: Scenario = {
    id: 'draft',
    title: '',
    concept: '',
    table: d.table,
    hero: { pos: d.hero.pos, cards: d.hero.cards, pre: d.hero.chart },
    opponents: d.others.map((o) => ({ pos: o.pos, type: '', pre: o.chart, range: [] })),
    stack: 100,
    ...tableOf(d),
    board: d.board.slice(0, cards),
    actions: d.actions,
    best: 'check',
    clues: [],
    why: '',
  };
  return replay(s);
}

const step = (d: Draft, street: Street, who: Pos, move: Step['move'], to?: number) =>
  d.actions.push({ street, who, move, ...(to !== undefined ? { to } : {}) });

/** Bets `frac` of the pot on this street (the board has `cards` cards so far). */
const bet = (d: Draft, street: Street, who: Pos, frac: number, cards: number) => {
  const r = replayDraft(d, cards);
  step(d, street, who, 'bet', Math.min(round(r.pot * frac), (r.stacks[who] ?? 0) + (r.bets[who] ?? 0)));
};

/** Raises to `to`, or all-in if that's more than the player has. */
const raiseTo = (d: Draft, street: Street, who: Pos, to: number, cards: number) => {
  const r = replayDraft(d, cards);
  step(d, street, who, 'raise', Math.min(round(to), (r.stacks[who] ?? 0) + (r.bets[who] ?? 0)));
};

/** Postflop order: is `a` before `b`? */
const ORDER: Pos[] = ['SB', 'BB', 'UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN'];
const firstOf = (a: Pos, b: Pos) => ORDER.indexOf(a) < ORDER.indexOf(b);

const PRE_ORDER: Pos[] = ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

/** Preflop: the opener raises, the rest call (in turn order). */
function openAndCall(d: Draft, opener: Pos, callers: Pos[], size: number) {
  const players = [opener, ...callers].sort((a, b) => PRE_ORDER.indexOf(a) - PRE_ORDER.indexOf(b));
  const after = players.slice(players.indexOf(opener) + 1);
  step(d, 'preflop', opener, 'raise', size);
  for (const p of after) step(d, 'preflop', p, 'call');
  for (const p of players.slice(0, players.indexOf(opener))) step(d, 'preflop', p, 'call');
}

/** Seeded random numbers. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dealBoard(random: () => number, n: number, avoid: Card[] = []): Card[] {
  const deck = fullDeck().filter((c) => !avoid.includes(c));
  const out: Card[] = [];
  while (out.length < n) {
    const c = deck.splice(Math.floor(random() * deck.length), 1)[0];
    out.push(c);
  }
  return out;
}

const MARGIN = 0.035;

interface Meta {
  id: string;
  title: string;
  concept: string;
  clues: Clue[];
  /** What the hero's hand is. */
  k: Kind;
  /** An extra sentence for the explanation, after the numbers. */
  note?: (best: OptionId) => string;
  /** How far equity has to clear the price for a call or fold (more on the turn, where more betting follows). */
  gap?: { call?: number; fold?: number };
}

/** Finishes a draft into a scenario if its best play is clear; null otherwise. */
function finish(d: Draft, opponents: Opponent[], meta: Meta): Scenario | null {
  const s: Scenario = {
    id: meta.id,
    title: meta.title,
    concept: meta.concept,
    ...(d.table === 9 ? { table: 9 as const } : {}),
    hero: { pos: d.hero.pos, cards: d.hero.cards, pre: d.hero.chart },
    opponents,
    stack: 100,
    ...tableOf(d),
    board: d.board,
    actions: d.actions,
    best: 'check',
    clues: meta.clues,
    why: '',
  };
  // Work everything out on the hand exactly as it will be stored (packed ranges deal in their own order).
  s.opponents = unpack(pack([s]))[0].opponents;
  let r;
  try {
    r = replay(s);
  } catch {
    return null;
  }
  if (r.next !== s.hero.pos) return null;
  if (r.toCall > 0 && r.behind.length) return null;
  for (const o of opponents) if (r.live.includes(o.pos) && !o.range.length) return null;
  const spot = spotOf(s, r);
  // Nothing to think about: you never win, or always do.
  if (spot.equity < 0.04 || spot.equity > 0.97) return null;
  if (r.toCall > 0) {
    const gap = spot.equity - spot.price!;
    if (gap > 0 ? gap < (meta.gap?.call ?? MARGIN + 0.01) : -gap < (meta.gap?.fold ?? MARGIN + 0.01)) return null;
    s.best = gap > 0 ? 'call' : 'fold';
    s.why = explainFacing(s, r, spot.equity, spot.price!, meta);
    return s;
  }
  const evs: Partial<Record<OptionId, number>> = { check: spot.evCheck! };
  const bets: Partial<Record<OptionId, Bet>> = {};
  for (const id of ['bet33', 'bet75', 'bet125'] as const) {
    bets[id] = spotOf(s, r, id).bet!;
    evs[id] = bets[id]!.ev;
  }
  const ranked = (Object.entries(evs) as [OptionId, number][]).sort((a, b) => b[1] - a[1]);
  const [bestId, bestEv] = ranked[0];
  const ok = ranked.slice(1).filter(([, v]) => (bestEv - v) / r.pot < MARGIN + 0.01);
  // Too close to call between checking and betting: not a clear lesson.
  if (ok.some(([id]) => (id === 'check') !== (bestId === 'check'))) return null;
  s.best = bestId;
  if (ok.length) s.alsoOk = ok.map(([id]) => id);
  const topBet = ranked.find(([id]) => id !== 'check')![0];
  if (bestId === 'check') s.compare = topBet;
  s.why = explainBetting(s, r, spot.equity, bets[bestId === 'check' ? topBet : bestId]!, bestId, meta);
  return s;
}

type Bet = NonNullable<ReturnType<typeof spotOf>['bet']>;

// ── Explanations, from the numbers ──────────────────────────────────────────

const sizeWord = (id: OptionId) =>
  id === 'bet33' ? 'a third of the pot' : id === 'bet75' ? 'three-quarters of the pot' : id === 'bet125' ? 'more than the pot' : 'nothing';
/** A group's kind of hand, without the "the stronger ones" that splits a kind between answers. */
const groupName = (g: RangeGroup) =>
  g.label
    .split(':')[0]
    .replace(/, (the (strongest|stronger ones|middle ones|weaker ones|weakest)|part \d+)$/, '')
    .toLowerCase();
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** "top pair (24%) and sets (9%)": the biggest kinds of hand in a view that pass `keep`, with their share of the range. */
function biggest(v: OpponentView, keep: (g: GroupView) => boolean | number, n = 3): string {
  const total = v.groups.reduce((t, g) => t + g.weight, 0) || 1;
  const by = new Map<string, number>();
  for (const g of v.groups) {
    const f = Number(keep(g));
    if (f > 0) by.set(groupName(g.group), (by.get(groupName(g.group)) ?? 0) + g.weight * f);
  }
  return list(
    [...by.entries()]
      .filter(([, w]) => w / total >= 0.02)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, w]) => `${name} (${pct(w / total)})`),
  );
}

/** The share of a view that passes `keep` (a number counts that part of each group). */
const shareOf = (v: OpponentView, keep: (g: GroupView) => boolean | number) =>
  v.groups.reduce((t, g) => t + g.weight * Number(keep(g)), 0) / (v.groups.reduce((t, g) => t + g.weight, 0) || 1);

/** The parts of a view you beat and lose to: "ahead of 35% of it (missed flush draws 20%...) and behind 65% (...)". */
function beatWords(v: OpponentView): string {
  const total = v.groups.reduce((t, g) => t + g.weight, 0) || 1;
  const part = (keep: (g: GroupView) => boolean) => {
    const by = new Map<string, number>();
    for (const g of v.groups.filter(keep)) by.set(groupName(g.group), (by.get(groupName(g.group)) ?? 0) + g.weight);
    const share = [...by.values()].reduce((t, w) => t + w, 0) / total;
    const names = [...by.entries()]
      .sort((a, b) => b[1] - a[1])
      .filter(([, w]) => w / total >= 0.03)
      .slice(0, 3)
      .map(([name, w]) => `${name} ${pct(w / total)}`);
    return { share, names: list(names) };
  };
  const ahead = part((g) => g.equity >= 0.6);
  const behind = part((g) => g.equity <= 0.4);
  const close = 1 - ahead.share - behind.share;
  const bits: string[] = [];
  if (ahead.share >= 0.02) bits.push(`ahead of ${pct(ahead.share)} of it${ahead.names ? ` (${ahead.names})` : ''}`);
  if (behind.share >= 0.02) bits.push(`behind ${pct(behind.share)}${behind.names ? ` (${behind.names})` : ''}`);
  if (close >= 0.1) bits.push(`close against the other ${pct(close)}`);
  return bits.length ? `You’re ${list(bits)}` : 'It’s close against all of it';
}

/** Your win rate against one player's range on its own (as if nobody else were in the pot). */
const aloneEquity = (v: OpponentView) =>
  v.groups.reduce((t, g) => t + g.weight * g.equity, 0) / (v.groups.reduce((t, g) => t + g.weight, 0) || 1);

const hasDraw = (s: Scenario, k: Kind) => s.board.length === 4 && k.draw !== 'none';
const MADE: Record<number, string> = { 3: 'a weak pair', 4: 'second pair' };
function heroLine(s: Scenario, k: Kind): string {
  if (hasDraw(s, k)) {
    const made = k.level >= 5 ? heroWords(k) : MADE[k.level];
    return `You have ${made ? `${made} and ` : ''}${k.draw === 'open-ender' ? 'an' : 'a'} ${k.draw}`;
  }
  return `You have ${heroWords(k)}`;
}

function explainFacing(s: Scenario, r: ReturnType<typeof replay>, equity: number, price: number, meta: Meta): string {
  const views = analyse(s, r);
  const multi = views.length > 1;
  const parts = [`${heroLine(s, meta.k)}.`];
  for (const v of views) {
    const polar = v.groups.some((g) => g.group.role === 'value' || g.group.role === 'bluff');
    const who = multi ? `${v.opponent.pos} ${polar ? '(the bettor)' : '(called in front of you)'}: ` : '';
    const mix = polar
      ? `${pct(shareOf(v, (g) => g.group.role === 'value'))} value, ${pct(shareOf(v, (g) => g.group.role === 'bluff'))} bluffs and semi-bluffs. `
      : '';
    parts.push(`${who}${mix}${beatWords(v)}${multi ? `; against them alone you’d win ${pct(aloneEquity(v))}` : ''}.`);
  }
  const call = Math.min(r.toCall, r.stacks[s.hero.pos] ?? r.toCall);
  parts.push(
    `Calling costs ${bb(call)}${call < r.toCall ? ' (all in)' : ''} to win a pot of ${bb(r.pot - (r.toCall - call))}, so you need to win ${pct(price)} of the time. ${multi ? 'Against everyone together' : 'All in all'} you win ${pct(equity)}${s.board.length === 4 ? ' with the river to come' : ''}.`,
  );
  parts.push(equity > price ? 'Call.' : 'Fold.');
  const note = meta.note?.(equity > price ? 'call' : 'fold');
  if (note) parts.push(note);
  return parts.join(' ');
}

function explainBetting(s: Scenario, r: ReturnType<typeof replay>, equity: number, b: Bet, best: OptionId, meta: Meta): string {
  const views = analyse(s, r);
  const multi = views.length > 1;
  const parts = [`${heroLine(s, meta.k)}.`];
  const dead = [...s.hero.cards, ...s.board];
  const callers = (v: OpponentView) => biggest(v, (g) => callShare(g.group, dead, b.id), 3);
  const callWords = views.map((v) => (multi ? `${v.opponent.pos}: ${callers(v) || 'nothing'}` : callers(v))).join('; ');
  const needed = b.amount / (r.pot + b.amount);
  // Multiway, each player's folds multiply: show them, then the chance everyone folds.
  const foldEach = multi
    ? `${list(views.map((v) => `${v.opponent.pos} folds ${pct(shareOf(v, (g) => 1 - callShare(g.group, dead, b.id)))}`))} of the time, so everyone folds only ${pct(b.allFold)}`
    : '';
  if (best === 'check') {
    parts.push(
      b.equityCalled < 0.5
        ? `If you bet ${sizeWord(b.id)}, ${multi ? foldEach : `they fold only ${pct(b.allFold)}`}, and the hands that call (${callWords || 'their best hands'}) leave you winning just ${pct(b.equityCalled)}.`
        : `A bet of ${sizeWord(b.id)} gets called by too little that you beat: ${multi ? foldEach : `they fold ${pct(b.allFold)}`}, and you win ${pct(b.equityCalled)} when called.`,
    );
    parts.push(`Checking keeps your ${pct(equity)} share of the pot at showdown, which is worth more. Check.`);
  } else if (b.equityCalled >= 0.5) {
    parts.push(
      `Bet ${sizeWord(best)} for value. The hands that call it are ${callWords || 'their pairs'}, and you win ${pct(b.equityCalled)} of the time when called.`,
    );
    if (multi) parts.push(`With ${views.length} players in, someone usually has a hand that calls: ${foldEach}.`);
    else if (b.allFold > 0.05) parts.push(`They fold ${pct(b.allFold)}.`);
    if (best === 'bet33') parts.push('A bigger bet would fold out the worse hands that pay you.');
    if (best === 'bet125') parts.push('Their worse hands that call can’t fold even to a big bet, so make it big.');
  } else if (s.board.length === 4 && b.equityCalled > 0.1) {
    // A semi-bluff wins two ways: folds now, and the river when it's called.
    parts.push(
      `Bet ${sizeWord(best)} as a semi-bluff. It wins two ways: ${multi ? foldEach : `they fold ${pct(b.allFold)} of the time`}, and when called you still win ${pct(b.equityCalled)} with the river to come. Together the bet is worth ${bb(Math.round(b.ev * 10) / 10)} on average, against ${bb(Math.round(equity * r.pot * 10) / 10)} for checking.`,
    );
  } else {
    parts.push(
      `Bet ${sizeWord(best)} as a bluff. It risks ${bb(b.amount)} to win ${bb(r.pot)}, so it needs everyone to fold ${pct(needed)} of the time, and ${multi ? foldEach : `they fold ${pct(b.allFold)}`}.`,
    );
    if (equity > 0.05) parts.push(`Checking would only win your ${pct(equity)} share at showdown.`);
  }
  const note = meta.note?.(best);
  if (note) parts.push(note);
  return parts.join(' ');
}

// ── Spots ───────────────────────────────────────────────────────────────────

/** A heads-up pot: `opener` is the preflop aggressor (the 3-bettor in a 3-bet pot), `defender` the player who called. */
interface Pair {
  table: 6 | 9;
  opener: Pos;
  openChart: string;
  defender: Pos;
  defendChart: string;
  /** A 3-bet pot: the defender opened, the opener 3-bet to this, and the defender called. */
  threeBet?: number;
  /** A tournament (big blind ante, shorter stacks, smaller opens). */
  format?: 'cash' | 'tournament';
  /** Starting stacks, set per round (`withStacks()`). */
  stacks?: Partial<Record<Pos, number>>;
}

/** A heads-up pot's table setup for its drafts. */
const pairTable = (p: Pair) => ({
  ...(p.stacks ? { stacks: p.stacks } : {}),
  ...(p.format === 'tournament' ? { ante: 1, format: 'tournament' as const } : {}),
});

/** Stacks for a pot: about 100bb online, anything from 60bb to 250bb live, 18bb to 60bb in a tournament. */
function stacksFor(
  random: () => number,
  table: 6 | 9,
  format: 'cash' | 'tournament' | undefined,
  seats: Pos[],
): Partial<Record<Pos, number>> {
  const one = () => {
    if (format === 'tournament') return 18 + Math.round(random() * 42);
    if (table === 9) return 60 + Math.round(random() * 38) * 5;
    const r = random();
    return r < 0.6 ? 100 : [60, 80, 150, 200][Math.floor(random() * 4)];
  };
  return Object.fromEntries(seats.map((p) => [p, one()]));
}
const withStacks = (p: Pair, random: () => number): Pair => ({
  ...p,
  stacks: stacksFor(random, p.table, p.format, [p.opener, p.defender]),
});

/** Tournament pots, nine-handed with a big blind ante. */
const mtt = (opener: Pos, openChart: string, defender: Pos, defendChart: string): Pair => ({
  table: 9,
  opener,
  openChart,
  defender,
  defendChart,
  format: 'tournament',
});
const MTT_PAIRS: Pair[] = [
  mtt('UTG', 'MTT open EP', 'BB', 'MTT BB defend vs early'),
  mtt('UTG1', 'MTT open EP', 'BTN', 'MTT cold call'),
  mtt('MP', 'MTT open MP', 'BB', 'MTT BB defend vs early'),
  mtt('LJ', 'MTT open MP', 'CO', 'MTT cold call'),
  mtt('HJ', 'MTT open MP', 'BB', 'MTT BB defend vs early'),
  mtt('HJ', 'MTT open MP', 'BTN', 'MTT cold call'),
  mtt('CO', 'MTT open CO', 'BB', 'MTT BB defend vs late'),
  mtt('CO', 'MTT open CO', 'BTN', 'MTT cold call'),
  mtt('BTN', 'MTT open BTN', 'BB', 'MTT BB defend vs late'),
  mtt('BTN', 'MTT open BTN', 'SB', 'MTT cold call'),
  mtt('SB', 'SB open', 'BB', 'MTT BB defend vs late'),
];

const pair = (table: 6 | 9, opener: Pos, openChart: string, defender: Pos, defendChart: string): Pair => ({
  table,
  opener,
  openChart,
  defender,
  defendChart,
});

/** Heads-up single-raised pots, every seat against every seat that defends against it. */
const HU_PAIRS: Pair[] = [
  pair(6, 'UTG', 'UTG open', 'BB', 'BB vs early open'),
  pair(6, 'UTG', 'UTG open', 'BTN', 'Cold call'),
  pair(6, 'UTG', 'UTG open', 'CO', 'Cold call'),
  pair(6, 'UTG', 'UTG open', 'SB', 'Cold call'),
  pair(6, 'HJ', 'HJ open', 'BB', 'BB vs middle open'),
  pair(6, 'HJ', 'HJ open', 'CO', 'Cold call'),
  pair(6, 'HJ', 'HJ open', 'BTN', 'Cold call'),
  pair(6, 'HJ', 'HJ open', 'SB', 'Cold call'),
  pair(6, 'CO', 'CO open', 'BB', 'BB vs late open'),
  pair(6, 'CO', 'CO open', 'BTN', 'Cold call'),
  pair(6, 'CO', 'CO open', 'SB', 'Cold call'),
  pair(6, 'BTN', 'BTN open', 'BB', 'BB vs late open'),
  pair(6, 'BTN', 'BTN open', 'SB', 'Cold call'),
  pair(6, 'SB', 'SB open', 'BB', 'BB vs late open'),
  pair(9, 'UTG', 'EP open (9-handed)', 'BB', 'BB vs early open'),
  pair(9, 'UTG1', 'EP open (9-handed)', 'BTN', 'Live cold call'),
  pair(9, 'MP', 'MP open (9-handed)', 'BB', 'BB vs middle open'),
  pair(9, 'LJ', 'MP open (9-handed)', 'CO', 'Live cold call'),
  pair(9, 'LJ', 'MP open (9-handed)', 'BTN', 'Live cold call'),
  pair(9, 'HJ', 'HJ open', 'BB', 'BB vs middle open'),
  pair(9, 'UTG', 'EP open (9-handed)', 'BTN', 'Live cold call'),
  pair(9, 'UTG1', 'EP open (9-handed)', 'BB', 'BB vs early open'),
  pair(9, 'MP', 'MP open (9-handed)', 'CO', 'Live cold call'),
  pair(9, 'LJ', 'MP open (9-handed)', 'BB', 'BB vs middle open'),
  pair(9, 'CO', 'CO open', 'BB', 'BB vs late open'),
  pair(9, 'CO', 'CO open', 'BTN', 'Live cold call'),
  pair(9, 'BTN', 'BTN open', 'BB', 'BB vs late open'),
  pair(9, 'HJ', 'HJ open', 'SB', 'Live cold call'),
  pair(9, 'UTG', 'EP open (9-handed)', 'MP', 'Live cold call'),
  pair(9, 'UTG1', 'EP open (9-handed)', 'LJ', 'Live cold call'),
  pair(9, 'UTG', 'EP open (9-handed)', 'HJ', 'Live cold call'),
  pair(9, 'UTG1', 'EP open (9-handed)', 'CO', 'Live cold call'),
  pair(9, 'MP', 'MP open (9-handed)', 'BTN', 'Live cold call'),
  pair(9, 'LJ', 'MP open (9-handed)', 'SB', 'Live cold call'),
  pair(6, 'UTG', 'UTG open', 'HJ', 'Cold call'),
];

/** 3-bet pots: the opener and the 3-bettor. */
const THREE_BET_PAIRS: { table: 6; opener: Pos; threeBettor: Pos; size: number }[] = [
  { table: 6, opener: 'CO', threeBettor: 'BTN', size: 8 },
  { table: 6, opener: 'HJ', threeBettor: 'CO', size: 8 },
  { table: 6, opener: 'UTG', threeBettor: 'BTN', size: 8 },
  { table: 6, opener: 'BTN', threeBettor: 'SB', size: 11 },
  { table: 6, opener: 'BTN', threeBettor: 'BB', size: 11 },
  { table: 6, opener: 'CO', threeBettor: 'BB', size: 11 },
  { table: 6, opener: 'HJ', threeBettor: 'SB', size: 11 },
];

/** The same 3-bet pots, for the heads-up spots. */
const TB_PAIRS: Pair[] = THREE_BET_PAIRS.map((t) => ({
  table: 6,
  opener: t.threeBettor,
  openChart: '3-bet',
  defender: t.opener,
  defendChart: 'Call a 3-bet',
  threeBet: t.size,
}));

/** The preflop action of a heads-up pot. */
function preflop(d: Draft, p: Pair) {
  if (!p.threeBet) return openAndCall(d, p.opener, [p.defender], openSize(p));
  step(d, 'preflop', p.defender, 'raise', 2.5);
  step(d, 'preflop', p.opener, 'raise', p.threeBet);
  step(d, 'preflop', p.defender, 'call');
}

/** The preflop clue for a heads-up pot, from the hero's side. */
function preWords(p: Pair, heroRaised: boolean): string {
  if (p.threeBet)
    return heroRaised
      ? `${cap(SEAT[p.defender])} opens, you 3-bet from ${SEAT[p.opener]} and they call. Calling a 3-bet: pairs, suited aces, suited broadways and connectors (the biggest hands would 4-bet). In a 3-bet pot the stacks are short next to the pot, so one pair is worth more.`
      : `You open from ${SEAT[p.defender]}, ${SEAT[p.opener]} 3-bets and you call. A 3-bet range is strong and linear-ish: big pairs, A-K, A-Q, good suited broadways, plus suited bluffs like A-5 and suited connectors.`;
  const mtt = p.format === 'tournament' ? 'Tournament, big blind ante. ' : '';
  return heroRaised
    ? `${mtt}You open from ${SEAT[p.opener]} and ${SEAT[p.defender]} calls. ${chartWords(p.defendChart)}`
    : `${mtt}${cap(SEAT[p.opener])} opens and you call from ${SEAT[p.defender]}. ${chartWords(p.openChart)}`;
}

const openSize = (p: Pair) => (p.format === 'tournament' ? (p.opener === 'SB' ? 3 : 2.2) : p.table === 9 ? 3 : p.opener === 'SB' ? 3 : 2.5);
const styleFor = (random: () => number, table: 6 | 9): Style =>
  (table === 9 ? (['passive', 'loose', 'reg'] as Style[]) : (['reg', 'aggro', 'reg', 'passive'] as Style[]))[
    Math.floor(random() * (table === 9 ? 3 : 4))
  ];

/** Hero hands from a range that would play the hero's line, weakest decision first. */
function heroCandidates(range: Combo[], random: () => number, n: number): [Card, Card][] {
  const pool = range.filter((c) => c.w > 0.3).map((c) => c.cards);
  const out: [Card, Card][] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
}

/** The river line where the raiser bets every street and you call down: call or fold the last bet. */
function threeBarrels(p: Pair, random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  const style = styleFor(random, p.table);
  const big = random() < 0.3;
  for (let tries = 0; tries < 6 && out.length < 2; tries++) {
    const board = dealBoard(random, 5);
    const t = texture(board);
    // Your range: a defender that calls the flop and the turn.
    let mine = startRange(p.defendChart, board);
    mine = narrow(mine, board.slice(0, 3), callFlop('reg'));
    mine = narrow(mine, board.slice(0, 4), callTurn('reg'));
    mine = mine.filter((c) => {
      const k = classify(c.cards, board, board.slice(0, 4));
      return k.level >= 1 && k.level <= 6;
    });
    for (const cards of heroCandidates(mine, random, 6)) {
      const dead = [...cards, ...board];
      let theirs = startRange(p.openChart, dead);
      theirs = narrow(theirs, board.slice(0, 3), cbet(board, style));
      theirs = narrow(theirs, board.slice(0, 4), barrel(style));
      const groups = bettorGroups(theirs, board, board.slice(0, 4), style, big);
      if (!groups.some((g) => g.role === 'value')) continue;
      const d: Draft = {
        table: p.table,
        ...pairTable(p),
        hero: { pos: p.defender, chart: p.defendChart, style: 'reg', cards },
        others: [{ pos: p.opener, chart: p.openChart, style }],
        board,
        actions: [],
      };
      preflop(d, p);
      const heroFirst = firstOf(p.defender, p.opener);
      const flopSize = t.dry && t.high ? 0.33 : 0.6;
      for (const [street, cards_, frac] of [
        ['flop', 3, flopSize],
        ['turn', 4, 0.7],
        ['river', 5, big ? 1.25 : 0.75],
      ] as const) {
        if (heroFirst) step(d, street, p.defender, 'check');
        bet(d, street, p.opener, frac, cards_);
        if (street !== 'river') step(d, street, p.defender, 'call');
      }
      const k = classify(cards, board, board.slice(0, 4));
      const s = finish(d, [{ pos: p.opener, type: STYLE_NAME[style], pre: p.openChart, range: groups }], {
        id: `gen-barrels-${idx}-${tries}`,
        title: big ? `An overbet after two barrels` : `Three barrels from ${SEAT[p.opener]}`,
        concept: big ? 'Polarised overbets' : 'Bluff catching',
        clues: [
          { street: 'preflop', text: preWords(p, false) },
          {
            street: 'flop',
            text: `${flopWords(board)}. ${t.dry && t.high ? 'A small c-bet on a dry, high board: they bet almost everything here, so it tells you little.' : 'A bigger c-bet on this board is more selective: good pairs, draws and some air.'} You call.`,
          },
          {
            street: 'turn',
            text: `${cardWords(board, 3)}. A second, bigger bet narrows them to strong pairs, sets and two pair, and the draws that want to win now.`,
          },
          {
            street: 'river',
            text: `${cardWords(board, 4)}. ${big ? 'A bet bigger than the pot is very polarised: the nuts or nothing.' : 'A third bet is polarised: the hands that kept betting for value, and the draws that missed.'} ${style === 'passive' ? 'This player rarely bluffs.' : style === 'aggro' ? 'This player bluffs a lot.' : ''}`,
          },
        ],
        k,
        note: (best) =>
          style === 'passive' && best === 'fold'
            ? 'Passive live players rarely turn a hand into a river bluff.'
            : style === 'aggro' && best === 'call'
              ? 'Aggressive players get to the river with plenty of missed draws, and bet them.'
              : '',
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const chartWords = (chart: string) => {
  const n = expandRange(CHARTS[chart]).length;
  const share = Math.round((n / 1326) * 100);
  if (/open/.test(chart)) return `They open about ${share}% of hands from there.`;
  if (/^BB vs/.test(chart)) return `The big blind defends about ${share}% of hands against that seat.`;
  if (/BB defend/.test(chart))
    return `With the ante in the pot and a small raise, the big blind gets a great price and defends about ${share}% of hands.`;
  if (/cold call/i.test(chart)) return 'Cold-calling ranges are pairs, suited cards and good broadways; the biggest hands usually 3-bet.';
  return '';
};

/** You raised and bet twice; the river is checked to you (or you're first): bet for value, bet as a bluff, or check. */
function riverDecision(p: Pair, random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  const style = styleFor(random, p.table);
  for (let tries = 0; tries < 6 && out.length < 2; tries++) {
    const board = dealBoard(random, 5);
    const t = texture(board);
    let mine = startRange(p.openChart, board);
    mine = narrow(mine, board.slice(0, 3), cbet(board, 'reg'));
    mine = narrow(mine, board.slice(0, 4), barrel('reg'));
    for (const cards of heroCandidates(mine, random, 8)) {
      const dead = [...cards, ...board];
      let theirs = startRange(p.defendChart, dead);
      theirs = narrow(theirs, board.slice(0, 3), callFlop(style));
      theirs = narrow(theirs, board.slice(0, 4), callTurn(style));
      const groups = callerGroups(theirs, board, board.slice(0, 4), style);
      const d: Draft = {
        table: p.table,
        ...pairTable(p),
        hero: { pos: p.opener, chart: p.openChart, style: 'reg', cards },
        others: [{ pos: p.defender, chart: p.defendChart, style }],
        board,
        actions: [],
      };
      preflop(d, p);
      const theyFirst = firstOf(p.defender, p.opener);
      const flopSize = t.dry && t.high ? 0.33 : 0.6;
      for (const [street, cards_, frac] of [
        ['flop', 3, flopSize],
        ['turn', 4, 0.7],
      ] as const) {
        if (theyFirst) step(d, street, p.defender, 'check');
        bet(d, street, p.opener, frac, cards_);
        step(d, street, p.defender, 'call');
      }
      if (theyFirst) step(d, 'river', p.defender, 'check');
      const k = classify(cards, board, board.slice(0, 4));
      const s = finish(d, [{ pos: p.defender, type: STYLE_NAME[style], pre: p.defendChart, range: groups }], {
        id: `gen-river-${idx}-${tries}`,
        title: k.level >= 6 ? 'A strong hand on the river' : k.level <= 1 ? 'The river after your draw missed' : 'One pair on the river',
        concept: k.level >= 7 ? 'Value betting' : k.level <= 1 ? 'River bluffs' : 'Thin value',
        clues: [
          { street: 'preflop', text: preWords(p, true) },
          { street: 'flop', text: `${flopWords(board)}. You c-bet and they call: pairs, draws and some ace-high.` },
          {
            street: 'turn',
            text: `${cardWords(board, 3)}. You bet again and they call again: now mostly top pair or better, good middle pairs and the strong draws.`,
          },
          {
            street: 'river',
            text: `${cardWords(board, 4)}. ${theyFirst ? 'They check to you. With their strongest hands many players would bet or check-raise, so their range is mostly one pair and missed draws.' : 'You’re last to act.'}`,
          },
        ],
        k,
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** The raiser checks back the turn; out of position, you lead the river or check. Or in position, you face their lead. */
function checkedTurn(p: Pair, random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  if (!firstOf(p.defender, p.opener)) return out;
  const style = styleFor(random, p.table);
  for (let tries = 0; tries < 6 && out.length < 1; tries++) {
    const board = dealBoard(random, 5);
    // You're the defender: lead the river into a range that checked the turn back.
    let mine = startRange(p.defendChart, board);
    mine = narrow(mine, board.slice(0, 3), callFlop('reg'));
    for (const cards of heroCandidates(mine, random, 8)) {
      const dead = [...cards, ...board];
      let theirs = startRange(p.openChart, dead);
      theirs = narrow(theirs, board.slice(0, 3), cbet(board, style));
      theirs = narrow(theirs, board.slice(0, 4), giveUpTurn(style));
      const groups = callerGroups(theirs, board, board.slice(0, 4), style);
      const d: Draft = {
        table: p.table,
        ...pairTable(p),
        hero: { pos: p.defender, chart: p.defendChart, style: 'reg', cards },
        others: [{ pos: p.opener, chart: p.openChart, style }],
        board,
        actions: [],
      };
      preflop(d, p);
      step(d, 'flop', p.defender, 'check');
      bet(d, 'flop', p.opener, 0.4, 3);
      step(d, 'flop', p.defender, 'call');
      step(d, 'turn', p.defender, 'check');
      step(d, 'turn', p.opener, 'check');
      const k = classify(cards, board, board.slice(0, 4));
      const s = finish(d, [{ pos: p.opener, type: STYLE_NAME[style], pre: p.openChart, range: groups }], {
        id: `gen-checked-${idx}-${tries}`,
        title: 'They checked back the turn',
        concept: 'Capped ranges',
        clues: [
          { street: 'preflop', text: preWords(p, false) },
          { street: 'flop', text: `${flopWords(board)}. They c-bet, you call.` },
          {
            street: 'turn',
            text: `${cardWords(board, 3)}. You check and they check back. With a strong hand or a good draw they’d usually bet again, so their range is now capped: one-pair hands that want a showdown, ace-high and give-ups.`,
          },
          { street: 'river', text: `${cardWords(board, 4)}. You’re first to act.` },
        ],
        k,
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** You're the raiser in position; they check-call the flop, then check-raise your turn bet. */
function turnCheckRaise(p: Pair, random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  if (!firstOf(p.defender, p.opener)) return out;
  const style = styleFor(random, p.table);
  for (let tries = 0; tries < 6 && out.length < 1; tries++) {
    const board = dealBoard(random, 4);
    let mine = startRange(p.openChart, board);
    mine = narrow(mine, board.slice(0, 3), cbet(board, 'reg'));
    mine = narrow(mine, board, barrel('reg')).filter((c) => classify(c.cards, board).level >= 4);
    for (const cards of heroCandidates(mine, random, 6)) {
      const dead = [...cards, ...board];
      let theirs = startRange(p.defendChart, dead);
      theirs = narrow(theirs, board.slice(0, 3), callFlop(style));
      theirs = narrow(theirs, board, checkRaiseTurn(style));
      const by = new Map<string, Grouped>();
      for (const c of theirs) {
        const k = classify(c.cards, board);
        const role: Role = k.level >= 7 ? 'value' : 'bluff';
        const key = `${k.label}|${role}`;
        if (!by.has(key)) by.set(key, { label: k.label, role, combos: [] });
        by.get(key)!.combos.push(c);
      }
      const groups = toGroups([...by.values()]);
      if (!groups.length) continue;
      const d: Draft = {
        table: p.table,
        ...pairTable(p),
        hero: { pos: p.opener, chart: p.openChart, style: 'reg', cards },
        others: [{ pos: p.defender, chart: p.defendChart, style }],
        board,
        actions: [],
      };
      preflop(d, p);
      step(d, 'flop', p.defender, 'check');
      bet(d, 'flop', p.opener, 0.5, 3);
      step(d, 'flop', p.defender, 'call');
      step(d, 'turn', p.defender, 'check');
      bet(d, 'turn', p.opener, 0.66, 4);
      const facing = d.actions[d.actions.length - 1].to!;
      raiseTo(d, 'turn', p.defender, facing * 3.2, 4);
      const k = classify(cards, board);
      const s = finish(d, [{ pos: p.defender, type: STYLE_NAME[style], pre: p.defendChart, range: groups }], {
        id: `gen-xr-${idx}-${tries}`,
        title: 'Check-raised on the turn',
        concept: 'Turn check-raises',
        clues: [
          { street: 'preflop', text: preWords(p, true) },
          { street: 'flop', text: `${flopWords(board)}. You c-bet half the pot and they call.` },
          {
            street: 'turn',
            text: `${cardWords(board, 3)}. You bet again and they check-raise. A turn check-raise is one of the strongest lines in poker: two pair or better, plus ${style === 'passive' ? 'almost no' : style === 'aggro' ? 'quite a few' : 'some'} big draws.`,
          },
        ],
        k,
        gap: { call: 0.08 },
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** 3-bet pots: you 3-bet and c-bet twice, then decide on the river; or they 3-bet and barrel and you call down. */
function threeBetPots(random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  for (const [j, tb] of THREE_BET_PAIRS.entries()) {
    const style = styleFor(random, 6);
    for (const heroIs3b of [true, false]) {
      for (let tries = 0; tries < 6; tries++) {
        const board = dealBoard(random, 5);
        const heroPos = heroIs3b ? tb.threeBettor : tb.opener;
        const villPos = heroIs3b ? tb.opener : tb.threeBettor;
        const heroChart = heroIs3b ? '3-bet' : 'Call a 3-bet';
        const villChart = heroIs3b ? 'Call a 3-bet' : '3-bet';
        let mine = startRange(heroChart, board);
        mine = heroIs3b
          ? narrow(narrow(mine, board.slice(0, 3), cbet(board, 'reg')), board.slice(0, 4), barrel('reg'))
          : narrow(narrow(mine, board.slice(0, 3), callFlop('reg')), board.slice(0, 4), callTurn('reg')).filter(
              (c) => classify(c.cards, board, board.slice(0, 4)).level >= 1 && classify(c.cards, board, board.slice(0, 4)).level <= 6,
            );
        const cards = heroCandidates(mine, random, 1)[0];
        if (!cards) continue;
        const dead = [...cards, ...board];
        let theirs = startRange(villChart, dead);
        theirs = heroIs3b
          ? narrow(narrow(theirs, board.slice(0, 3), callFlop(style)), board.slice(0, 4), callTurn(style))
          : narrow(narrow(theirs, board.slice(0, 3), cbet(board, style)), board.slice(0, 4), barrel(style));
        const groups = heroIs3b
          ? callerGroups(theirs, board, board.slice(0, 4), style)
          : bettorGroups(theirs, board, board.slice(0, 4), style, false);
        if (!groups.length || (!heroIs3b && !groups.some((g) => g.role === 'value'))) continue;
        const d: Draft = {
          table: 6,
          hero: { pos: heroPos, chart: heroChart, style: 'reg', cards },
          others: [{ pos: villPos, chart: villChart, style }],
          board,
          actions: [],
        };
        step(d, 'preflop', tb.opener, 'raise', 2.5);
        step(d, 'preflop', tb.threeBettor, 'raise', tb.size);
        step(d, 'preflop', tb.opener, 'call');
        const aggressor = tb.threeBettor;
        const caller = tb.opener;
        const callerFirst = firstOf(caller, aggressor);
        for (const [street, n, frac] of [
          ['flop', 3, 0.33],
          ['turn', 4, 0.6],
        ] as const) {
          if (callerFirst) step(d, street, caller, 'check');
          bet(d, street, aggressor, frac, n);
          step(d, street, caller, 'call');
        }
        if (heroIs3b) {
          if (callerFirst) step(d, 'river', caller, 'check');
        } else {
          if (callerFirst) step(d, 'river', caller, 'check');
          bet(d, 'river', aggressor, 0.75, 5);
        }
        const k = classify(cards, board, board.slice(0, 4));
        const s = finish(d, [{ pos: villPos, type: STYLE_NAME[style], pre: villChart, range: groups }], {
          id: `gen-3bet-${idx}-${j}-${heroIs3b ? 'a' : 'b'}-${tries}`,
          title: heroIs3b ? 'The river in your 3-bet pot' : 'Called down in a 3-bet pot',
          concept: '3-bet pots',
          clues: [
            {
              street: 'preflop',
              text: `${cap(SEAT[tb.opener])} opens and ${SEAT[tb.threeBettor]} 3-bets. ${heroIs3b ? 'They call: pairs, suited aces, suited broadways and connectors (the biggest hands would 4-bet).' : 'You call. A 3-bet range is strong: big pairs, A-K, A-Q, plus some suited bluffs like A-5.'}`,
            },
            {
              street: 'flop',
              text: `${flopWords(board)}. In a 3-bet pot the stacks are shorter compared to the pot, so one pair is worth more. A small c-bet, called.`,
            },
            { street: 'turn', text: `${cardWords(board, 3)}. A second bet, called again.` },
            {
              street: 'river',
              text: `${cardWords(board, 4)}. ${heroIs3b ? (callerFirst ? 'They check to you.' : 'Your move.') : 'They bet three-quarters of the pot: strong pairs and better, or a missed draw.'}`,
            },
          ],
          k,
        });
        if (s) {
          out.push(s);
          break;
        }
      }
    }
  }
  return out;
}

/** Three-way pots: the raiser bets, one player calls, and you close the action; or two players check to you. */
const THREE_WAY: { table: 6 | 9; opener: Pos; openChart: string; caller: Pos; callChart: string; last: Pos; lastChart: string }[] = [
  { table: 6, opener: 'UTG', openChart: 'UTG open', caller: 'CO', callChart: 'Cold call', last: 'BB', lastChart: 'BB vs early open' },
  { table: 6, opener: 'HJ', openChart: 'HJ open', caller: 'BTN', callChart: 'Cold call', last: 'BB', lastChart: 'BB vs middle open' },
  { table: 6, opener: 'CO', openChart: 'CO open', caller: 'BTN', callChart: 'Cold call', last: 'BB', lastChart: 'BB vs late open' },
  { table: 6, opener: 'BTN', openChart: 'BTN open', caller: 'SB', callChart: 'Cold call', last: 'BB', lastChart: 'BB vs late open' },
  {
    table: 9,
    opener: 'UTG1',
    openChart: 'EP open (9-handed)',
    caller: 'HJ',
    callChart: 'Live cold call',
    last: 'BB',
    lastChart: 'BB vs early open',
  },
  {
    table: 9,
    opener: 'LJ',
    openChart: 'MP open (9-handed)',
    caller: 'BTN',
    callChart: 'Live cold call',
    last: 'SB',
    lastChart: 'Live cold call',
  },
];

function threeWay(random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  for (const [j, w] of THREE_WAY.entries()) {
    const style = styleFor(random, w.table);
    const style2 = styleFor(random, w.table);
    // (a) The raiser barrels, the middle player calls along, you're last and face the river bet and call.
    for (let tries = 0; tries < 8; tries++) {
      const board = dealBoard(random, 5);
      const heroPos = w.last === 'BB' || w.last === 'SB' ? w.last : w.last;
      let mine = startRange(w.lastChart, board);
      mine = narrow(narrow(mine, board.slice(0, 3), callFlop('reg')), board.slice(0, 4), callTurn('reg')).filter((c) => {
        const l = classify(c.cards, board, board.slice(0, 4)).level;
        return l >= 4 && l <= 7;
      });
      const cards = heroCandidates(mine, random, 1)[0];
      if (!cards) continue;
      const dead = [...cards, ...board];
      const bettor = narrow(narrow(startRange(w.openChart, dead), board.slice(0, 3), cbet(board, style)), board.slice(0, 4), barrel(style));
      const groups = bettorGroups(bettor, board, board.slice(0, 4), style, false);
      // The middle player called three bets: top pair or better, mostly.
      let mid = narrow(narrow(startRange(w.callChart, dead), board.slice(0, 3), callFlop(style2)), board.slice(0, 4), callTurn(style2));
      mid = narrow(mid, board, (k) => (k.level >= 6 ? 1 : k.level === 5 ? 0.5 : 0));
      if (!groups.some((g) => g.role === 'value') || !mid.length) continue;
      const d: Draft = {
        table: w.table,
        hero: { pos: heroPos, chart: w.lastChart, style: 'reg', cards },
        others: [
          { pos: w.opener, chart: w.openChart, style },
          { pos: w.caller, chart: w.callChart, style: style2 },
        ],
        board,
        actions: [],
      };
      openAndCall(d, w.opener, [w.caller, w.last], w.table === 9 ? 3 : 2.5);
      const order = [w.opener, w.caller, w.last].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
      for (const [street, n, frac] of [
        ['flop', 3, 0.4],
        ['turn', 4, 0.65],
        ['river', 5, 0.75],
      ] as const) {
        const before = order.slice(0, order.indexOf(w.opener));
        for (const p of before) step(d, street, p, 'check');
        bet(d, street, w.opener, frac, n);
        const after = [...order.slice(order.indexOf(w.opener) + 1), ...before];
        for (const p of after) if (!(street === 'river' && p === heroPos)) step(d, street, p, 'call');
      }
      const k = classify(cards, board, board.slice(0, 4));
      const s = finish(
        d,
        [
          { pos: w.opener, type: STYLE_NAME[style], pre: w.openChart, range: groups },
          { pos: w.caller, type: STYLE_NAME[style2], pre: w.callChart, range: stayGroups(mid, board, board.slice(0, 4)) },
        ],
        {
          id: `gen-3way-call-${idx}-${j}-${tries}`,
          title: 'A bet and a call before you',
          concept: 'Multiway bluff catching',
          clues: [
            {
              street: 'preflop',
              text: `${cap(SEAT[w.opener])} opens, ${SEAT[w.caller]} calls and you call from ${SEAT[heroPos]}. Three players see the flop.`,
            },
            {
              street: 'flop',
              text: `${flopWords(board)}. A c-bet into two players, and both of you call. Multiway, people bluff much less, because everyone has to fold.`,
            },
            {
              street: 'turn',
              text: `${cardWords(board, 3)}. A second bet into two players is strong. ${cap(SEAT[w.caller])} calls again.`,
            },
            {
              street: 'river',
              text: `${cardWords(board, 4)}. Another bet, and ${SEAT[w.caller]} calls in front of you. A player who calls a river bet with someone still to act behind almost always has a real hand.`,
            },
          ],
          k,
          note: () =>
            'With a player calling in front of you, you have to beat both of them, and callers with someone left to act rarely have air.',
        },
      );
      if (s) {
        out.push(s);
        break;
      }
    }
    // (b) The raiser c-bets, both call, the turn checks through and the river is checked to you (on the button or last).
    for (let tries = 0; tries < 8; tries++) {
      const board = dealBoard(random, 5);
      const order = [w.opener, w.caller, w.last].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
      const heroPos = order[2];
      const heroChart = heroPos === w.opener ? w.openChart : heroPos === w.caller ? w.callChart : w.lastChart;
      let mine = startRange(heroChart, board);
      mine = narrow(mine, board.slice(0, 3), heroPos === w.opener ? cbet(board, 'reg') : callFlop('reg'));
      const cards = heroCandidates(mine, random, 1)[0];
      if (!cards) continue;
      const dead = [...cards, ...board];
      const others = order.slice(0, 2);
      const ranges = others.map((pos) => {
        const chart = pos === w.opener ? w.openChart : pos === w.caller ? w.callChart : w.lastChart;
        const st = pos === w.opener ? style : style2;
        let r = startRange(chart, dead);
        r = narrow(r, board.slice(0, 3), pos === w.opener ? cbet(board, st) : callFlop(st));
        // Everyone checked the turn: nobody has much they'd bet for value.
        r = narrow(r, board.slice(0, 4), (k) => (k.level >= 7 ? 0.25 : k.level >= 6 ? 0.5 : 1));
        r = narrow(r, board, (k) => (k.level >= 8 ? 0.4 : 1));
        return { pos, chart, st, groups: callerGroups(r, board, board.slice(0, 4), st, 2) };
      });
      const d: Draft = {
        table: w.table,
        hero: { pos: heroPos, chart: heroChart, style: 'reg', cards },
        others: ranges.map((x) => ({ pos: x.pos, chart: x.chart, style: x.st })),
        board,
        actions: [],
      };
      openAndCall(d, w.opener, [w.caller, w.last], w.table === 9 ? 3 : 2.5);
      for (const p of order.slice(0, order.indexOf(w.opener))) step(d, 'flop', p, 'check');
      bet(d, 'flop', w.opener, 0.4, 3);
      for (const p of [...order.slice(order.indexOf(w.opener) + 1), ...order.slice(0, order.indexOf(w.opener))]) step(d, 'flop', p, 'call');
      for (const p of order) step(d, 'turn', p, 'check');
      for (const p of order.slice(0, 2)) step(d, 'river', p, 'check');
      const k = classify(cards, board, board.slice(0, 4));
      const s = finish(
        d,
        ranges.map((x) => ({ pos: x.pos, type: STYLE_NAME[x.st], pre: x.chart, range: x.groups })),
        {
          id: `gen-3way-river-${idx}-${j}-${tries}`,
          title: 'Two checks to you on the river',
          concept: k.level <= 1 ? 'Bluffing multiway' : 'Value betting multiway',
          clues: [
            {
              street: 'preflop',
              text: `${cap(SEAT[w.opener])} opens, ${SEAT[w.caller]} and ${SEAT[w.last]} call. Three players see the flop.`,
            },
            { street: 'flop', text: `${flopWords(board)}. A c-bet, and everyone calls.` },
            {
              street: 'turn',
              text: `${cardWords(board, 3)}. Everyone checks. In a three-way pot, a strong hand would usually bet the turn to protect itself, so nobody is showing much.`,
            },
            {
              street: 'river',
              text: `${cardWords(board, 4)}. Both players check to you. When a multiway pot checks down, the ranges are usually weak, but a bluff needs both players to fold.`,
            },
          ],
          k,
        },
      );
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** Live limped pots (nine-handed): a few limpers, you bet the flop, and the river decides it. */
const LIMPERS: { limpers: Pos[]; hero: Pos }[] = [
  { limpers: ['UTG1', 'LJ'], hero: 'BTN' },
  { limpers: ['MP', 'HJ'], hero: 'CO' },
  { limpers: ['UTG', 'LJ', 'CO'], hero: 'BTN' },
  { limpers: ['UTG1', 'HJ'], hero: 'SB' },
  { limpers: ['MP', 'CO'], hero: 'BB' },
];

function limpedPots(random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  for (const [j, l] of LIMPERS.entries()) {
    for (let tries = 0; tries < 8; tries++) {
      const board = dealBoard(random, 5);
      const heroChart = l.hero === 'BB' ? 'Any two cards' : 'Live limp';
      const mine = startRange(heroChart, board).filter((c) => {
        const lv = classify(c.cards, board.slice(0, 3)).level;
        return lv >= 4;
      });
      const cards = heroCandidates(mine, random, 1)[0];
      if (!cards) continue;
      const dead = [...cards, ...board];
      const players = [...l.limpers, l.hero, ...(l.hero === 'BB' || l.hero === 'SB' ? [] : []), 'BB' as Pos].filter(
        (p, i, a) => a.indexOf(p) === i,
      );
      const inHand = players.includes('BB') ? players : [...players, 'BB' as Pos];
      const order = inHand.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
      // Everyone limps (the small blind completes when it's the hero), the big blind checks.
      const d: Draft = {
        table: 9,
        hero: { pos: l.hero, chart: heroChart, style: 'reg', cards },
        others: order
          .filter((p) => p !== l.hero)
          .map((p) => ({ pos: p, chart: p === 'BB' ? 'Any two cards' : 'Live limp', style: 'loose' as Style })),
        board,
        actions: [],
      };
      for (const p of [...order].sort((a, b) => PRE_ORDER.indexOf(a) - PRE_ORDER.indexOf(b)))
        step(d, 'preflop', p, p === 'BB' ? 'check' : 'call');
      // Flop: checked to you, you bet, two players call and the rest fold.
      const heroAt = order.indexOf(l.hero);
      for (const p of order.slice(0, heroAt)) step(d, 'flop', p, 'check');
      bet(d, 'flop', l.hero, 0.5, 3);
      const rest = [...order.slice(heroAt + 1), ...order.slice(0, heroAt)];
      const stay = rest.slice(0, 2);
      for (const p of rest) step(d, 'flop', p, stay.includes(p) ? 'call' : 'fold');
      const live = order.filter((p) => p === l.hero || stay.includes(p));
      // Turn and river: checked through to the river decision (you act last or first).
      for (const p of live) step(d, 'turn', p, 'check');
      for (const p of live.slice(0, live.indexOf(l.hero))) step(d, 'river', p, 'check');
      const opponents: Opponent[] = d.others.map((o) => {
        if (!stay.includes(o.pos)) return { pos: o.pos, type: STYLE_NAME.loose, pre: o.chart, range: [] };
        let r = startRange(o.chart, dead);
        r = narrow(r, board.slice(0, 3), callFlop('loose'));
        r = narrow(r, board.slice(0, 4), (k) => (k.level >= 7 ? 0.3 : 1));
        if (live.indexOf(o.pos) < live.indexOf(l.hero)) r = narrow(r, board, (k) => (k.level >= 7 ? 0.4 : 1));
        return { pos: o.pos, type: STYLE_NAME.loose, pre: o.chart, range: callerGroups(r, board, board.slice(0, 4), 'loose', 2) };
      });
      const k = classify(cards, board, board.slice(0, 4));
      const s = finish(d, opponents, {
        id: `gen-limp-${idx}-${j}-${tries}`,
        title: `A ${order.length}-way limped pot`,
        concept: 'Limped pots',
        clues: [
          {
            street: 'preflop',
            text: `A live limped pot: ${list(l.limpers.map((p) => SEAT[p]))} limp${l.hero === 'BB' ? ' and you check your option' : ', and you limp too'}. Limpers have wide, weak ranges: lots of suited cards, small pairs and weak aces, rarely a premium.`,
          },
          {
            street: 'flop',
            text: `${flopWords(board)}. You bet half the pot and ${stay.map((p) => SEAT[p]).join(' and ')} call. Loose players call with any pair, any draw and some overcards.`,
          },
          {
            street: 'turn',
            text: `${cardWords(board, 3)}. Everyone checks. With a big hand these players would usually bet or raise by now.`,
          },
          {
            street: 'river',
            text: `${cardWords(board, 4)}. ${live.indexOf(l.hero) === live.length - 1 ? 'It’s checked to you.' : 'You’re first to act.'}`,
          },
        ],
        k,
        note: (best) =>
          best === 'check'
            ? 'Against loose live players, bet for value and rarely bluff.'
            : 'Loose live players call too much, so value bets get paid.',
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** How a turn hand ranks for calling: made hands by strength, with draws slotted in by how often they get there. */
function turnStrength(k: Kind): number {
  const draw =
    k.draw === 'combo draw'
      ? 5.5
      : k.draw === 'nut flush draw'
        ? 4.6
        : k.draw === 'flush draw' || k.draw === 'open-ender'
          ? 3.6
          : k.draw === 'gutshot'
            ? 2
            : 0;
  return Math.max(k.level, draw) + (k.level >= 3 && draw ? 0.5 : 0);
}

/**
 * Groups a turn range by how it answers each bet size: like the river (callerGroups), the best part of the range
 * calls, as much as the size and style allow, but draws count as strong hands here, and air never calls.
 */
function turnGroups(range: Combo[], board: Card[], style: Style, players = 1): RangeGroup[] {
  const scored = range.map((c) => ({ c, k: classify(c.cards, board), v: score([...c.cards, ...board].map(toInt)) }));
  scored.sort((x, y) => turnStrength(y.k) - turnStrength(x.k) || y.v - x.v);
  const total = scored.reduce((t, x) => t + x.c.w, 0);
  const factor = DEFEND[style] * (players >= 3 ? 0.62 : players === 2 ? 0.75 : 1);
  const cut = (frac: number) => Math.min(0.95, factor / (1 + frac)) * total;
  const by = new Map<string, Grouped>();
  // Hands of equal strength answer alike: `above` counts only the strictly stronger part of the range.
  let acc = 0;
  let above = 0;
  let prev = '';
  for (const { c, k, v } of scored) {
    const tier = `${turnStrength(k)}|${v}`;
    if (tier !== prev) [above, prev] = [acc, tier];
    acc += c.w;
    const at = (frac: number): Role => (turnStrength(k) === 0 || above >= cut(frac) ? 'folds' : k.level >= 8 ? 'raises' : 'calls');
    const r = { role: at(0.75), small: at(0.33), big: at(1.25) };
    const key = `${k.label}|${r.role}|${r.small}|${r.big}`;
    if (!by.has(key)) by.set(key, { label: k.label, ...r, combos: [] });
    by.get(key)!.combos.push(c);
  }
  return toGroups(merge([...by.values()]));
}

/** The raiser checked back the flop; out of position, you're first on the turn: probe-bet or check. */
function probeTurn(p: Pair, random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  if (!firstOf(p.defender, p.opener)) return out;
  const style = styleFor(random, p.table);
  for (let tries = 0; tries < 6 && out.length < 1; tries++) {
    const board = dealBoard(random, 4);
    const mine = startRange(p.defendChart, board);
    for (const cards of heroCandidates(mine, random, 8)) {
      const dead = [...cards, ...board];
      const theirs = narrow(startRange(p.openChart, dead), board.slice(0, 3), checkBack(board, style));
      const groups = turnGroups(theirs, board, style);
      const d: Draft = {
        table: p.table,
        ...pairTable(p),
        hero: { pos: p.defender, chart: p.defendChart, style: 'reg', cards },
        others: [{ pos: p.opener, chart: p.openChart, style }],
        board,
        actions: [],
      };
      preflop(d, p);
      step(d, 'flop', p.defender, 'check');
      step(d, 'flop', p.opener, 'check');
      const k = classify(cards, board);
      const t = texture(board);
      const s = finish(d, [{ pos: p.opener, type: STYLE_NAME[style], pre: p.openChart, range: groups }], {
        id: `gen-probe-${idx}-${tries}`,
        title: 'They checked back the flop',
        concept: 'Probe bets',
        clues: [
          { street: 'preflop', text: preWords(p, false) },
          {
            street: 'flop',
            text: `${flopWords(board)}. You check and they check back. ${t.high && t.dry ? 'On a dry, high board the raiser bets almost everything, so a check here is very weak.' : 'Raisers bet their strong hands and best draws on most flops, so a check back is mostly medium pairs that want a showdown, and hands that gave up.'}`,
          },
          { street: 'turn', text: `${cardWords(board, 3)}. You’re first to act.` },
        ],
        k,
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** You c-bet, then checked back the turn; the caller leads the river into you. */
function riverLead(p: Pair, random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  if (!firstOf(p.defender, p.opener)) return out;
  const style = styleFor(random, p.table);
  const frac = random() < 0.5 ? 0.5 : 0.8;
  for (let tries = 0; tries < 6 && out.length < 1; tries++) {
    const board = dealBoard(random, 5);
    const before = board.slice(0, 4);
    let mine = startRange(p.openChart, board);
    mine = narrow(narrow(mine, board.slice(0, 3), cbet(board, 'reg')), before, giveUpTurn('reg')).filter((c) => {
      const l = classify(c.cards, board, before).level;
      return l >= 3 && l <= 6;
    });
    for (const cards of heroCandidates(mine, random, 6)) {
      const dead = [...cards, ...board];
      let theirs = narrow(startRange(p.defendChart, dead), board.slice(0, 3), callFlop(style));
      theirs = narrow(theirs, before, (k) => (k.level >= 7 ? 0.6 : 1)); // the biggest hands sometimes bet the turn
      theirs = narrow(theirs, board, leadRiver(style), before);
      const by = new Map<string, Grouped>();
      for (const c of theirs) {
        const kk = classify(c.cards, board, before);
        const role: Role = kk.level >= 6 ? 'value' : 'bluff';
        const key = `${kk.label}|${role}`;
        if (!by.has(key)) by.set(key, { label: kk.label, role, combos: [] });
        by.get(key)!.combos.push(c);
      }
      const groups = toGroups([...by.values()]);
      if (!groups.some((g) => g.role === 'value')) continue;
      const d: Draft = {
        table: p.table,
        ...pairTable(p),
        hero: { pos: p.opener, chart: p.openChart, style: 'reg', cards },
        others: [{ pos: p.defender, chart: p.defendChart, style }],
        board,
        actions: [],
      };
      preflop(d, p);
      step(d, 'flop', p.defender, 'check');
      bet(d, 'flop', p.opener, 0.4, 3);
      step(d, 'flop', p.defender, 'call');
      step(d, 'turn', p.defender, 'check');
      step(d, 'turn', p.opener, 'check');
      bet(d, 'river', p.defender, frac, 5);
      const k = classify(cards, board, before);
      const s = finish(d, [{ pos: p.defender, type: STYLE_NAME[style], pre: p.defendChart, range: groups }], {
        id: `gen-lead-${idx}-${tries}`,
        title: 'A river lead into you',
        concept: 'Facing a lead',
        clues: [
          { street: 'preflop', text: preWords(p, true) },
          { street: 'flop', text: `${flopWords(board)}. You c-bet small and they call: pairs, draws and some ace-high.` },
          {
            street: 'turn',
            text: `${cardWords(board, 3)}. They check, and you check back to get to showdown with a medium hand. That tells them your range is capped.`,
          },
          {
            street: 'river',
            text: `${cardWords(board, 4)}. They lead ${frac > 0.6 ? 'big' : 'half the pot'}. Out of position, a lead after the raiser checked back is ${style === 'passive' ? 'almost always value from this player' : 'value they think beats a capped range, or a missed draw that can only win by betting'}.`,
          },
        ],
        k,
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** The raiser c-bets and barrels the turn; you call or fold with a pair or a draw. */
function turnBarrel(p: Pair, random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  const style = styleFor(random, p.table);
  const frac = random() < 0.5 ? 0.5 : 0.8;
  for (let tries = 0; tries < 6 && out.length < 1; tries++) {
    const board = dealBoard(random, 4);
    const t = texture(board);
    let mine = narrow(startRange(p.defendChart, board), board.slice(0, 3), callFlop('reg'));
    mine = mine.filter((c) => {
      const k = classify(c.cards, board);
      return (k.level >= 3 && k.level <= 5) || (k.level <= 1 && k.draw !== 'none');
    });
    for (const cards of heroCandidates(mine, random, 6)) {
      const dead = [...cards, ...board];
      let theirs = narrow(startRange(p.openChart, dead), board.slice(0, 3), cbet(board, style));
      theirs = narrow(theirs, board, barrel(style));
      const by = new Map<string, Grouped>();
      for (const c of theirs) {
        const kk = classify(c.cards, board);
        const role: Role = kk.level >= 5 ? 'value' : 'bluff';
        const key = `${kk.label}|${role}`;
        if (!by.has(key)) by.set(key, { label: kk.label, role, combos: [] });
        by.get(key)!.combos.push(c);
      }
      const groups = toGroups([...by.values()]);
      if (!groups.some((g) => g.role === 'value')) continue;
      const d: Draft = {
        table: p.table,
        ...pairTable(p),
        hero: { pos: p.defender, chart: p.defendChart, style: 'reg', cards },
        others: [{ pos: p.opener, chart: p.openChart, style }],
        board,
        actions: [],
      };
      preflop(d, p);
      const heroFirst = firstOf(p.defender, p.opener);
      if (heroFirst) step(d, 'flop', p.defender, 'check');
      bet(d, 'flop', p.opener, t.dry && t.high ? 0.33 : 0.6, 3);
      step(d, 'flop', p.defender, 'call');
      if (heroFirst) step(d, 'turn', p.defender, 'check');
      bet(d, 'turn', p.opener, frac, 4);
      const k = classify(cards, board);
      const drawing = k.level <= 1 && k.draw !== 'none';
      const s = finish(d, [{ pos: p.opener, type: STYLE_NAME[style], pre: p.openChart, range: groups }], {
        id: `gen-turn-${idx}-${tries}`,
        title: drawing ? 'A draw facing the second barrel' : 'One pair facing the second barrel',
        concept: drawing ? 'Pot odds for draws' : 'Turn defence',
        clues: [
          { street: 'preflop', text: preWords(p, false) },
          { street: 'flop', text: `${flopWords(board)}. They c-bet and you call.` },
          {
            street: 'turn',
            text: `${cardWords(board, 3)}. They bet again, ${frac > 0.6 ? 'big' : 'half the pot'}. Second barrels are much stronger than c-bets: good pairs and better, and the draws that want to win now.${style === 'passive' ? ' A passive player rarely barrels without a hand.' : ''}`,
          },
        ],
        k,
        gap: { call: 0.08, fold: drawing ? 0.1 : MARGIN + 0.01 },
        note: (best) =>
          drawing && best === 'fold'
            ? 'Even counting what you win when you hit, the gap is too big for later bets to make up.'
            : best === 'call'
              ? 'More bets can come on the river, so a turn call needs a clear edge, and this has one.'
              : '',
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** Groups a betting range into value (top pair or better) and bluffs, with each combo's chance of betting. */
function betGroups(range: Combo[], board: Card[], before: Card[] | undefined, p: (k: Kind) => number, valueFrom = 5): RangeGroup[] {
  const by = new Map<string, Grouped>();
  for (const c of range) {
    const k = classify(c.cards, board, before);
    const w = c.w * Math.max(0, Math.min(1, p(k)));
    if (w <= 0.01) continue;
    const role: Role = k.level >= valueFrom ? 'value' : 'bluff';
    const key = `${k.label}|${role}`;
    if (!by.has(key)) by.set(key, { label: k.label, role, combos: [] });
    by.get(key)!.combos.push({ cards: c.cards, w });
  }
  return toGroups([...by.values()]);
}

/** The turn checks through; you check the river and the raiser bets. A stab after giving up is thin value or a bluff. */
function riverStab(p: Pair, random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  if (!firstOf(p.defender, p.opener)) return out;
  const style = styleFor(random, p.table);
  const frac = random() < 0.5 ? 0.5 : 0.75;
  for (let tries = 0; tries < 6 && out.length < 1; tries++) {
    const board = dealBoard(random, 5);
    const before = board.slice(0, 4);
    const t = texture(board);
    const mine = narrow(startRange(p.defendChart, board), board.slice(0, 3), callFlop('reg')).filter((c) => {
      const l = classify(c.cards, board, before).level;
      return l >= 1 && l <= 6;
    });
    for (const cards of heroCandidates(mine, random, 6)) {
      const dead = [...cards, ...board];
      const theirs = narrow(narrow(startRange(p.openChart, dead), board.slice(0, 3), cbet(board, style)), before, giveUpTurn(style));
      const groups = betGroups(theirs, board, before, (k) =>
        k.level >= 7
          ? 0.9
          : k.level === 6
            ? 0.7
            : k.level === 5
              ? 0.45
              : k.level >= 3
                ? 0.05
                : k.label.startsWith('Missed')
                  ? 0.45 * BLUFFS[style]
                  : 0.25 * BLUFFS[style],
      );
      if (!groups.some((g) => g.role === 'value')) continue;
      const d: Draft = {
        table: p.table,
        ...pairTable(p),
        hero: { pos: p.defender, chart: p.defendChart, style: 'reg', cards },
        others: [{ pos: p.opener, chart: p.openChart, style }],
        board,
        actions: [],
      };
      preflop(d, p);
      step(d, 'flop', p.defender, 'check');
      bet(d, 'flop', p.opener, t.dry && t.high ? 0.33 : 0.55, 3);
      step(d, 'flop', p.defender, 'call');
      step(d, 'turn', p.defender, 'check');
      step(d, 'turn', p.opener, 'check');
      step(d, 'river', p.defender, 'check');
      bet(d, 'river', p.opener, frac, 5);
      const k = classify(cards, board, before);
      const s = finish(d, [{ pos: p.opener, type: STYLE_NAME[style], pre: p.openChart, range: groups }], {
        id: `gen-stab-${idx}-${tries}`,
        title: 'A river bet after a checked turn',
        concept: 'Delayed river bets',
        clues: [
          { street: 'preflop', text: preWords(p, false) },
          { street: 'flop', text: `${flopWords(board)}. They c-bet and you call.` },
          {
            street: 'turn',
            text: `${cardWords(board, 3)}. You check and they check back. Most strong hands and good draws would bet again, so the raiser’s range is now medium pairs and hands that gave up.`,
          },
          {
            street: 'river',
            text: `${cardWords(board, 4)}. You check and they bet ${frac > 0.6 ? 'three-quarters of the pot' : 'half the pot'}. After giving up on the turn, this is a pair hoping it’s good (thin value), a hand that slow-played, or a bluff with something that can’t win a showdown.${style === 'passive' ? ' Passive players rarely bluff here.' : ''}`,
          },
        ],
        k,
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** You raised, checked back the flop, and the caller checks the turn to you again: bet now (a delayed c-bet) or check. */
function delayedCbet(p: Pair, random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  if (!firstOf(p.defender, p.opener)) return out;
  const style = styleFor(random, p.table);
  for (let tries = 0; tries < 6 && out.length < 1; tries++) {
    const board = dealBoard(random, 4);
    const mine = narrow(startRange(p.openChart, board), board.slice(0, 3), checkBack(board, 'reg'));
    for (const cards of heroCandidates(mine, random, 8)) {
      const dead = [...cards, ...board];
      // They check twice: their best hands and draws sometimes lead the turn instead.
      const theirs = narrow(startRange(p.defendChart, dead), board, (k) => (k.level >= 7 ? 0.5 : strongDraw(k) ? 0.7 : 1));
      const groups = turnGroups(theirs, board, style);
      const d: Draft = {
        table: p.table,
        ...pairTable(p),
        hero: { pos: p.opener, chart: p.openChart, style: 'reg', cards },
        others: [{ pos: p.defender, chart: p.defendChart, style }],
        board,
        actions: [],
      };
      preflop(d, p);
      step(d, 'flop', p.defender, 'check');
      step(d, 'flop', p.opener, 'check');
      step(d, 'turn', p.defender, 'check');
      const k = classify(cards, board);
      const s = finish(d, [{ pos: p.defender, type: STYLE_NAME[style], pre: p.defendChart, range: groups }], {
        id: `gen-delayed-${idx}-${tries}`,
        title: 'Checked to you again on the turn',
        concept: 'Delayed c-bets',
        clues: [
          { street: 'preflop', text: preWords(p, true) },
          {
            street: 'flop',
            text: `${flopWords(board)}. They check, and you check back: the flop didn’t suit your range, or your hand wanted a free card or some pot control.`,
          },
          {
            street: 'turn',
            text: `${cardWords(board, 3)}. They check again. A player who flopped well would often bet this turn (a probe), so their range is mostly one pair, draws and air, and fewer strong hands.`,
          },
        ],
        k,
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** You raised and checked back the flop; the caller bets the turn into you. */
function facingProbe(p: Pair, random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  if (!firstOf(p.defender, p.opener)) return out;
  const style = styleFor(random, p.table);
  const frac = random() < 0.5 ? 0.5 : 0.75;
  for (let tries = 0; tries < 6 && out.length < 1; tries++) {
    const board = dealBoard(random, 4);
    const mine = narrow(startRange(p.openChart, board), board.slice(0, 3), checkBack(board, 'reg')).filter((c) => {
      const k = classify(c.cards, board);
      return (k.level >= 1 && k.level <= 6) || k.draw !== 'none';
    });
    for (const cards of heroCandidates(mine, random, 6)) {
      const dead = [...cards, ...board];
      const groups = betGroups(startRange(p.defendChart, dead), board, undefined, (k) =>
        k.level >= 6
          ? 0.85
          : k.level === 5
            ? 0.6
            : k.level === 4
              ? 0.3
              : k.draw === 'combo draw'
                ? 0.8
                : strongDraw(k)
                  ? 0.55 * Math.min(1.1, BLUFFS[style] + 0.2)
                  : k.draw === 'gutshot'
                    ? 0.3 * BLUFFS[style]
                    : k.level === 3
                      ? 0.15
                      : 0.2 * BLUFFS[style],
      );
      if (!groups.some((g) => g.role === 'value')) continue;
      const d: Draft = {
        table: p.table,
        ...pairTable(p),
        hero: { pos: p.opener, chart: p.openChart, style: 'reg', cards },
        others: [{ pos: p.defender, chart: p.defendChart, style }],
        board,
        actions: [],
      };
      preflop(d, p);
      step(d, 'flop', p.defender, 'check');
      step(d, 'flop', p.opener, 'check');
      bet(d, 'turn', p.defender, frac, 4);
      const k = classify(cards, board);
      const drawing = k.level <= 1 && k.draw !== 'none';
      const s = finish(d, [{ pos: p.defender, type: STYLE_NAME[style], pre: p.defendChart, range: groups }], {
        id: `gen-probed-${idx}-${tries}`,
        title: 'They bet the turn into you',
        concept: 'Facing a probe',
        clues: [
          { street: 'preflop', text: preWords(p, true) },
          {
            street: 'flop',
            text: `${flopWords(board)}. They check and you check back. That tells them your range is weaker: you’d usually bet your strong hands.`,
          },
          {
            street: 'turn',
            text: `${cardWords(board, 3)}. They bet ${frac > 0.6 ? 'three-quarters of the pot' : 'half the pot'} into you. Probe bets after a check-back are wider than a normal lead: any decent pair, draws, and some hands that just want to take the pot from a weak range.`,
          },
        ],
        k,
        gap: { call: 0.08, fold: drawing ? 0.1 : MARGIN + 0.01 },
      });
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

/** Four-way pots: the raiser c-bets, everyone calls, the turn checks through, and it's checked to you on the river. */
const FOUR_WAY: { table: 6 | 9; seats: { pos: Pos; chart: string }[] }[] = [
  {
    table: 6,
    seats: [
      { pos: 'CO', chart: 'CO open' },
      { pos: 'BTN', chart: 'Cold call' },
      { pos: 'SB', chart: 'Cold call' },
      { pos: 'BB', chart: 'BB vs late open' },
    ],
  },
  {
    table: 6,
    seats: [
      { pos: 'UTG', chart: 'UTG open' },
      { pos: 'CO', chart: 'Cold call' },
      { pos: 'BTN', chart: 'Cold call' },
      { pos: 'BB', chart: 'BB vs early open' },
    ],
  },
  {
    table: 6,
    seats: [
      { pos: 'HJ', chart: 'HJ open' },
      { pos: 'CO', chart: 'Cold call' },
      { pos: 'SB', chart: 'Cold call' },
      { pos: 'BB', chart: 'BB vs middle open' },
    ],
  },
  {
    table: 9,
    seats: [
      { pos: 'UTG1', chart: 'EP open (9-handed)' },
      { pos: 'LJ', chart: 'Live cold call' },
      { pos: 'BTN', chart: 'Live cold call' },
      { pos: 'BB', chart: 'BB vs early open' },
    ],
  },
  {
    table: 9,
    seats: [
      { pos: 'MP', chart: 'MP open (9-handed)' },
      { pos: 'CO', chart: 'Live cold call' },
      { pos: 'SB', chart: 'Live cold call' },
      { pos: 'BB', chart: 'BB vs middle open' },
    ],
  },
  {
    table: 9,
    seats: [
      { pos: 'LJ', chart: 'MP open (9-handed)' },
      { pos: 'HJ', chart: 'Live cold call' },
      { pos: 'CO', chart: 'Live cold call' },
      { pos: 'BB', chart: 'BB vs middle open' },
    ],
  },
];

function fourWay(random: () => number, idx: number): Scenario[] {
  const out: Scenario[] = [];
  for (const [j, w] of FOUR_WAY.entries()) {
    const opener = w.seats[0];
    const order = w.seats.map((x) => x.pos).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    const heroSeat = w.seats.find((x) => x.pos === order[order.length - 1])!;
    const styles = w.seats.map(() => styleFor(random, w.table));
    for (let tries = 0; tries < 8; tries++) {
      const board = dealBoard(random, 5);
      const before = board.slice(0, 4);
      const mine = narrow(startRange(heroSeat.chart, board), board.slice(0, 3), heroSeat === opener ? cbet(board, 'reg') : callFlop('reg'));
      const cards = heroCandidates(mine, random, 1)[0];
      if (!cards) continue;
      const dead = [...cards, ...board];
      const others = w.seats.filter((x) => x !== heroSeat);
      const ranges = others.map((x) => {
        const st = styles[w.seats.indexOf(x)];
        let r = narrow(startRange(x.chart, dead), board.slice(0, 3), x === opener ? cbet(board, st) : callFlop(st));
        r = narrow(r, before, (k) => (k.level >= 7 ? 0.2 : k.level >= 6 ? 0.45 : 1));
        if (order.indexOf(x.pos) < order.length - 1) r = narrow(r, board, (k) => (k.level >= 8 ? 0.4 : 1));
        return { ...x, st, groups: callerGroups(r, board, before, st, 3) };
      });
      const d: Draft = {
        table: w.table,
        hero: { pos: heroSeat.pos, chart: heroSeat.chart, style: 'reg', cards },
        others: ranges.map((x) => ({ pos: x.pos, chart: x.chart, style: x.st })),
        board,
        actions: [],
      };
      openAndCall(
        d,
        opener.pos,
        w.seats.slice(1).map((x) => x.pos),
        w.table === 9 ? 3 : 2.5,
      );
      const oi = order.indexOf(opener.pos);
      for (const p of order.slice(0, oi)) step(d, 'flop', p, 'check');
      bet(d, 'flop', opener.pos, 0.33, 3);
      for (const p of [...order.slice(oi + 1), ...order.slice(0, oi)]) step(d, 'flop', p, 'call');
      for (const p of order) step(d, 'turn', p, 'check');
      for (const p of order.slice(0, -1)) step(d, 'river', p, 'check');
      const k = classify(cards, board, before);
      const s = finish(
        d,
        ranges.map((x) => ({ pos: x.pos, type: STYLE_NAME[x.st], pre: x.chart, range: x.groups })),
        {
          id: `gen-4way-${idx}-${j}-${tries}`,
          title: 'Three checks to you on the river',
          concept: k.level <= 1 ? 'Bluffing multiway' : 'Value betting multiway',
          clues: [
            {
              street: 'preflop',
              text: `${cap(SEAT[opener.pos])} opens and ${list(
                w.seats
                  .slice(1)
                  .filter((x) => x !== heroSeat)
                  .map((x) => SEAT[x.pos]),
              )} call${heroSeat === opener ? '' : `, and so do you from ${SEAT[heroSeat.pos]}`}. Four players see the flop.`,
            },
            {
              street: 'flop',
              text: `${flopWords(board)}. A small c-bet, and everyone calls. Four-way, a c-bet has to be strong: everybody has to fold for a bluff to work.`,
            },
            {
              street: 'turn',
              text: `${cardWords(board, 3)}. It checks round. With a big hand in a four-way pot, most players bet the turn so draws pay, so nobody is showing strength.`,
            },
            {
              street: 'river',
              text: `${cardWords(board, 4)}. Everyone checks to you. Three ranges that checked twice are weak, but someone usually has a pair, and a bluff needs all three to fold.`,
            },
          ],
          k,
          note: (best) =>
            best === 'check' && k.level <= 1
              ? 'Three players each folding most of the time still adds up to someone calling too often.'
              : '',
        },
      );
      if (s) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

// ── Multiway pots ───────────────────────────────────────────────────────────
//
// Three to five players see the flop. What changes multiway (from solver work on three-way pots and coaching on
// live games): the raiser c-bets much less often and smaller, mostly strong hands and strong draws; players in the
// middle call tighter than the one who closes the action; a second bet into several players is very strong; river
// bets are value-heavy and bluffs need everyone to fold; a caller with someone still to act behind has a real hand.

/** The raiser's c-bet into two or more players: strong hands and strong draws, much less air. */
const mwCbet = (players: number, style: Style) => (k: Kind) => {
  if (k.level >= 5) return 0.85;
  if (k.draw === 'combo draw' || k.draw === 'nut flush draw') return 0.75;
  if (strongDraw(k)) return 0.55;
  if (k.level >= 3) return 0.25;
  return (players >= 3 ? 0.05 : 0.12) * BLUFFS[style];
};
/** Calling a multiway flop bet: tighter in the middle, a little wider when you close the action. */
const mwCallFlop = (style: Style, closing: boolean) => (k: Kind) => {
  if (k.level >= 8) return 0.7;
  if (k.level >= 4) return 1;
  if (k.level === 3) return closing ? 0.85 : 0.6;
  if (strongDraw(k) || k.draw === 'combo draw') return 1;
  if (k.draw === 'gutshot') return closing ? 0.45 : 0.25;
  if (k.level === 1) return (closing ? 0.25 : 0.1) * STICKY[style];
  return 0.03 * STICKY[style];
};
/** A second barrel into several players: value-heavy, the best draws, almost no air. */
const mwBarrel = (style: Style) => (k: Kind) => {
  if (k.level >= 6) return 0.9;
  if (k.level === 5) return 0.45;
  if (k.draw === 'combo draw') return 0.7;
  if (strongDraw(k)) return 0.4 * Math.min(1.2, BLUFFS[style] + 0.2);
  if (k.level === 4) return 0.1;
  return 0.05 * BLUFFS[style];
};
/** Calling a multiway turn bet with someone still to act: good made hands and strong draws. */
const mwCallTurn = (style: Style) => (k: Kind) => {
  if (k.level >= 8) return 0.7;
  if (k.level >= 6) return 1;
  if (k.level === 5) return 0.7 * STICKY[style];
  if (k.draw === 'combo draw' || k.draw === 'nut flush draw') return 0.9;
  if (strongDraw(k)) return 0.7;
  if (k.level === 4) return 0.25 * STICKY[style];
  return 0.02;
};
/** The river bet after betting the turn into several players. */
const mwRiverBet = (style: Style) => (k: Kind) => {
  if (k.level >= 7) return 0.95;
  if (k.level === 6) return 0.6;
  if (k.label.startsWith('Missed')) return 0.3 * BLUFFS[style];
  if (k.level <= 1) return 0.08 * BLUFFS[style];
  return 0;
};
/** Overcalling a river bet with a player still to act behind: only strong hands. */
const overcall = (k: Kind) => (k.level >= 7 ? 1 : k.level === 6 ? 0.7 : k.level === 5 ? 0.2 : 0);
/** Checking a street in a multiway pot: the biggest hands often bet instead (to charge the draws). */
const mwCheck = (k: Kind) => (k.level >= 7 ? 0.35 : k.level === 6 ? 0.7 : k.draw === 'combo draw' ? 0.6 : 1);

interface MwSeat {
  pos: Pos;
  /** The chart for how they got in (for a squeeze pot, calling the 3-bet). */
  chart: string;
  /** A second chart the hand has to be in too (the opener's chart, for an opener who calls a squeeze). */
  also?: string;
}

interface MwSetup {
  key: string;
  table: 6 | 9;
  format?: 'cash' | 'tournament';
  /** Seats in the hand, the preflop aggressor (or the flop bettor in a limped pot) first. */
  seats: MwSeat[];
  /** The kind of pot, for titles and clues. */
  pot: 'raised' | 'squeeze' | 'iso' | 'limped';
  /** Plays the preflop action. */
  pre: (d: Draft) => void;
  /** The preflop clue (from the hero's seat). */
  preText: (hero: Pos) => string;
}

const seatName = (p: Pos, hero: Pos) => (p === hero ? 'you' : SEAT[p]);

/** What a multiway flop does to the ranges, by its texture. */
function mwFlopWords(board: Card[]): string {
  const t = texture(board);
  if (t.paired) return 'On a paired board hardly anyone has trips: the betting is mostly about who holds the best pair, and draws are few.';
  if (t.mono)
    return 'On a one-suit board anyone with a big card of that suit has a draw; made flushes are rare but real, and one pair plays carefully.';
  if (t.high && t.dry)
    return 'A dry, high board suits the raiser: callers continue with a pair of the top card, good underpairs and the odd gutshot.';
  if (t.low && t.connected)
    return 'A low, connected board hits the callers (small pairs, suited connectors, the big blind’s wide range) harder than the raiser, so straights and two pair are live.';
  if (t.twoTone && t.connected)
    return 'A wet board: plenty of flush and straight draws keep calling, so the pot will grow with hands that are not made yet.';
  return 'Calls come from pairs and draws; the players in the middle need a bit more than the one who closes the action.';
}

/** A raised pot: the opener raises to `size`, the rest call. */
function raised(table: 6 | 9, opener: [Pos, string], callers: [Pos, string][], size: number, format?: 'tournament'): MwSetup {
  const seats = [opener, ...callers].map(([pos, chart]) => ({ pos, chart }));
  return {
    key: `r-${table}-${seats.map((x) => x.pos).join('')}${format ? '-t' : ''}`,
    table,
    format,
    seats,
    pot: 'raised',
    pre: (d) =>
      openAndCall(
        d,
        opener[0],
        callers.map((c) => c[0]),
        size,
      ),
    preText: (hero) =>
      `${format ? 'Tournament, big blind ante. ' : ''}${cap(seatName(opener[0], hero))} ${opener[0] === hero ? 'open' : 'opens'} to ${bb(size)}, and ${list(callers.map((c) => seatName(c[0], hero)))} ${callers.length === 1 && callers[0][0] !== hero ? 'calls' : 'call'}. ${seats.length} players see the flop. ${
        callers.some((c) => /cold call/i.test(c[1]))
          ? 'Cold-callers have pairs, suited cards and good broadways; they’d 3-bet most of their biggest hands. '
          : ''
      }${callers.some((c) => /^BB|BB defend/.test(c[1])) ? 'The big blind closes the action with a good price, so it calls the widest.' : ''}`,
  };
}

/** A squeeze: the opener raises, a player calls, a third player 3-bets, and both call. */
function squeeze(open: [Pos, string], caller: [Pos, string], squeezer: Pos, size: number): MwSetup {
  return {
    key: `sq-${open[0]}${caller[0]}${squeezer}`,
    table: 6,
    seats: [
      { pos: squeezer, chart: 'Squeeze' },
      { pos: open[0], chart: 'Call a 3-bet', also: open[1] },
      { pos: caller[0], chart: 'Call a 3-bet', also: caller[1] },
    ],
    pot: 'squeeze',
    pre: (d) => {
      const order = [open[0], caller[0], squeezer].sort((a, b) => PRE_ORDER.indexOf(a) - PRE_ORDER.indexOf(b));
      for (const p of order) {
        if (p === open[0]) step(d, 'preflop', p, 'raise', 2.5);
        else if (p === caller[0]) step(d, 'preflop', p, 'call');
        else step(d, 'preflop', p, 'raise', size);
      }
      for (const p of [open[0], caller[0]]) step(d, 'preflop', p, 'call');
    },
    preText: (hero) =>
      `${cap(seatName(open[0], hero))} ${open[0] === hero ? 'open' : 'opens'}, ${seatName(caller[0], hero)} ${caller[0] === hero ? 'call' : 'calls'}, and ${seatName(squeezer, hero)} ${squeezer === hero ? 'squeeze' : 'squeezes'} to ${bb(size)}. Both call. A squeeze over a raise and a call is strong and linear: big pairs, A-K, A-Q, A-J suited, plus a few suited aces. The callers have medium pairs, suited broadways and connectors (they’d 4-bet their best hands). With so much in the pot the stacks are shallow: top pair is often good enough to get it all in.`,
  };
}

/** A live iso-raise: limpers, a raise over them, and calls. */
function iso(limpers: Pos[], raiser: Pos, size: number, callers: [Pos, string][]): MwSetup {
  const seats: MwSeat[] = [
    { pos: raiser, chart: 'Live iso-raise' },
    ...callers.map(([pos, chart]) => ({ pos, chart })),
    ...limpers.map((pos) => ({ pos, chart: 'Live limp' })),
  ];
  return {
    key: `iso-${limpers.join('')}${raiser}${callers.map((c) => c[0]).join('')}`,
    table: 9,
    seats,
    pot: 'iso',
    pre: (d) => {
      for (const p of [...limpers, raiser, ...callers.map((c) => c[0])].sort((a, b) => PRE_ORDER.indexOf(a) - PRE_ORDER.indexOf(b))) {
        if (limpers.includes(p)) step(d, 'preflop', p, 'call');
        else if (p === raiser) step(d, 'preflop', p, 'raise', size);
        else step(d, 'preflop', p, 'call');
      }
      for (const p of limpers) step(d, 'preflop', p, 'call');
    },
    preText: (hero) =>
      `Live cash. ${cap(list(limpers.map((p) => seatName(p, hero))))} ${limpers.includes(hero) && limpers.length === 1 ? 'limp' : limpers.length > 1 ? 'limp' : 'limps'}, ${seatName(raiser, hero)} ${raiser === hero ? 'raise' : 'raises'} to ${bb(size)} to isolate, and ${list([...callers.map((c) => seatName(c[0], hero)), ...limpers.map((p) => seatName(p, hero))])} call. Limpers have wide, weak ranges (small pairs, suited cards, weak aces) and rarely a premium; live players almost never fold after limping.`,
  };
}

type MwKind = 'turnFacing' | 'riverFacing' | 'turnToYou' | 'riverToYou' | 'riverFirst' | 'turnFirst' | 'turnMiddle' | 'riverMiddle';

const MW_SETUPS: MwSetup[] = [
  // Six-handed cash.
  raised(
    6,
    ['UTG', 'UTG open'],
    [
      ['CO', 'Cold call'],
      ['BB', 'BB vs early open'],
    ],
    2.5,
  ),
  raised(
    6,
    ['UTG', 'UTG open'],
    [
      ['BTN', 'Cold call'],
      ['BB', 'BB vs early open'],
    ],
    2.5,
  ),
  raised(
    6,
    ['HJ', 'HJ open'],
    [
      ['CO', 'Cold call'],
      ['BTN', 'Cold call'],
    ],
    2.5,
  ),
  raised(
    6,
    ['HJ', 'HJ open'],
    [
      ['BTN', 'Cold call'],
      ['SB', 'Cold call'],
    ],
    2.5,
  ),
  raised(
    6,
    ['CO', 'CO open'],
    [
      ['BTN', 'Cold call'],
      ['BB', 'BB vs late open'],
    ],
    2.5,
  ),
  raised(
    6,
    ['CO', 'CO open'],
    [
      ['SB', 'Cold call'],
      ['BB', 'BB vs late open'],
    ],
    2.5,
  ),
  raised(
    6,
    ['BTN', 'BTN open'],
    [
      ['SB', 'Cold call'],
      ['BB', 'BB vs late open'],
    ],
    2.5,
  ),
  raised(
    6,
    ['UTG', 'UTG open'],
    [
      ['HJ', 'Cold call'],
      ['BTN', 'Cold call'],
      ['BB', 'BB vs early open'],
    ],
    2.5,
  ),
  raised(
    6,
    ['HJ', 'HJ open'],
    [
      ['CO', 'Cold call'],
      ['BTN', 'Cold call'],
      ['BB', 'BB vs middle open'],
    ],
    2.5,
  ),
  raised(
    6,
    ['CO', 'CO open'],
    [
      ['BTN', 'Cold call'],
      ['SB', 'Cold call'],
      ['BB', 'BB vs late open'],
    ],
    2.5,
  ),
  // Nine-handed live cash: bigger opens, more callers.
  raised(
    9,
    ['UTG', 'EP open (9-handed)'],
    [
      ['MP', 'Live cold call'],
      ['BTN', 'Live cold call'],
      ['BB', 'BB vs early open'],
    ],
    4,
  ),
  raised(
    9,
    ['UTG1', 'EP open (9-handed)'],
    [
      ['CO', 'Live cold call'],
      ['BB', 'BB vs early open'],
    ],
    3,
  ),
  raised(
    9,
    ['MP', 'MP open (9-handed)'],
    [
      ['HJ', 'Live cold call'],
      ['BTN', 'Live cold call'],
    ],
    4,
  ),
  raised(
    9,
    ['LJ', 'MP open (9-handed)'],
    [
      ['CO', 'Live cold call'],
      ['SB', 'Live cold call'],
      ['BB', 'BB vs middle open'],
    ],
    3,
  ),
  raised(
    9,
    ['HJ', 'HJ open'],
    [
      ['BTN', 'Live cold call'],
      ['BB', 'BB vs middle open'],
    ],
    5,
  ),
  raised(
    9,
    ['CO', 'CO open'],
    [
      ['BTN', 'Live cold call'],
      ['SB', 'Live cold call'],
    ],
    4,
  ),
  raised(
    9,
    ['UTG1', 'EP open (9-handed)'],
    [
      ['LJ', 'Live cold call'],
      ['CO', 'Live cold call'],
      ['BTN', 'Live cold call'],
      ['BB', 'BB vs early open'],
    ],
    3,
  ),
  // Squeezed pots.
  squeeze(['CO', 'CO open'], ['BTN', 'Cold call'], 'SB', 12),
  squeeze(['HJ', 'HJ open'], ['CO', 'Cold call'], 'BB', 13),
  squeeze(['UTG', 'UTG open'], ['BTN', 'Cold call'], 'BB', 14),
  squeeze(['HJ', 'HJ open'], ['BTN', 'Cold call'], 'SB', 12),
  // Live iso-raised pots.
  iso(['UTG1', 'LJ'], 'BTN', 7, [['BB', 'BB vs middle open']]),
  iso(['MP'], 'CO', 5, [['BB', 'BB vs middle open']]),
  iso(['UTG', 'HJ'], 'CO', 7, [['BTN', 'Live cold call']]),
  iso(['LJ'], 'BTN', 5, [
    ['SB', 'Live cold call'],
    ['BB', 'BB vs late open'],
  ]),
  // Tournaments.
  raised(
    9,
    ['UTG1', 'MTT open EP'],
    [
      ['BTN', 'MTT cold call'],
      ['BB', 'MTT BB defend vs early'],
    ],
    2.2,
    'tournament',
  ),
  raised(
    9,
    ['LJ', 'MTT open MP'],
    [
      ['CO', 'MTT cold call'],
      ['BB', 'MTT BB defend vs early'],
    ],
    2.2,
    'tournament',
  ),
  raised(
    9,
    ['CO', 'MTT open CO'],
    [
      ['BTN', 'MTT cold call'],
      ['BB', 'MTT BB defend vs late'],
    ],
    2.2,
    'tournament',
  ),
  raised(
    9,
    ['BTN', 'MTT open BTN'],
    [
      ['SB', 'MTT cold call'],
      ['BB', 'MTT BB defend vs late'],
    ],
    2.2,
    'tournament',
  ),
  raised(
    9,
    ['HJ', 'MTT open MP'],
    [
      ['CO', 'MTT cold call'],
      ['BTN', 'MTT cold call'],
      ['BB', 'MTT BB defend vs early'],
    ],
    2.2,
    'tournament',
  ),
];

/** A seat's starting range: its chart (and the second chart, if any), less the cards you can see. */
const seatRange = (x: MwSeat, dead: Card[]) => {
  const r = startRange(x.chart, dead);
  if (!x.also) return r;
  const ok = new Set(expandRange(CHARTS[x.also]).map(comboKey));
  return r.filter((c) => ok.has(comboKey(c.cards)));
};

function mwSpot(w: MwSetup, kind: MwKind, random: () => number, idx: number): Scenario[] {
  const order = w.seats.map((x) => x.pos).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const n = order.length;
  const bettor = w.seats[0].pos;
  const bi = order.indexOf(bettor);
  const facing = kind === 'turnFacing' || kind === 'riverFacing';
  const middle = kind === 'turnMiddle' || kind === 'riverMiddle';
  const heroPos = facing
    ? order[(bi - 1 + n) % n]
    : kind === 'turnToYou' || kind === 'riverToYou'
      ? order[n - 1]
      : middle
        ? order[1]
        : order[0];
  if (facing && heroPos === bettor) return [];
  if ((kind === 'riverFirst' || kind === 'turnFirst') && heroPos === bettor) return [];
  const heroSeat = w.seats.find((x) => x.pos === heroPos)!;
  const river = kind.startsWith('river');
  const cards = river ? 5 : 4;
  const styles = new Map(w.seats.map((x) => [x.pos, styleFor(random, w.table)] as const));
  const stacks: Partial<Record<Pos, number>> =
    w.format === 'tournament'
      ? Object.fromEntries(order.map((p) => [p, 25 + Math.round(random() * 35)]))
      : Object.fromEntries(order.map((p) => [p, w.table === 9 ? 80 + Math.round(random() * 34) * 5 : 100]));
  if (w.format === 'tournament' || w.pot === 'squeeze') {
    // Even stacks where the money goes in fast (tournaments, squeezed pots): the effective stack is what matters, and
    // it keeps side pots out of it.
    const eff = w.pot === 'squeeze' ? [70, 100, 100, 150][Math.floor(random() * 4)] : Math.min(...(Object.values(stacks) as number[]));
    for (const p of order) stacks[p] = eff;
  } else if (w.table === 6 && random() < 0.4) for (const p of order) stacks[p] = [80, 120, 150, 200][Math.floor(random() * 4)];
  // The turn: in the facing spots the bettor fires again; elsewhere it either checks through or (river spots) gets a bet and calls.
  const turnBet =
    kind === 'riverFacing' ||
    kind === 'turnFacing' ||
    ((kind === 'riverToYou' || kind === 'riverFirst' || kind === 'riverMiddle') && random() < 0.4);
  const out: Scenario[] = [];
  for (let tries = 0; tries < 8 && !out.length; tries++) {
    const board = dealBoard(random, cards);
    const flop = board.slice(0, 3);
    const turn = board.slice(0, 4);
    const before = river ? turn : undefined;
    const t = texture(board);
    const flopFrac = t.dry && t.high ? 0.25 : 0.33;
    // Each other player's range, street by street, and what they do on the decision street.
    const lineRange = (x: MwSeat, dead: Card[]) => {
      const st = styles.get(x.pos)!;
      const closing = order.indexOf(x.pos) === (bi - 1 + n) % n;
      let r = seatRange(x, dead);
      r = narrow(r, flop, x.pos === bettor ? mwCbet(n - 1, st) : mwCallFlop(st, closing));
      if (turnBet) r = narrow(r, turn, x.pos === bettor ? mwBarrel(st) : mwCallTurn(st));
      else if (cards === 5 || order.indexOf(x.pos) < order.indexOf(heroPos))
        r = narrow(r, turn, x.pos === bettor ? (k) => 1 - mwBarrel(st)(k) : mwCheck);
      return r;
    };
    // Your hand: one that played your line and has a real decision.
    const heroStyle: Style = 'reg';
    let mine = seatRange(heroSeat, board);
    mine = narrow(
      mine,
      flop,
      heroPos === bettor ? mwCbet(n - 1, heroStyle) : mwCallFlop(heroStyle, order.indexOf(heroPos) === (bi - 1 + n) % n),
    );
    if (turnBet && cards === 5) mine = narrow(mine, turn, heroPos === bettor ? mwBarrel(heroStyle) : mwCallTurn(heroStyle));
    else if (cards === 5) mine = narrow(mine, turn, heroPos === bettor ? (k) => 1 - mwBarrel(heroStyle)(k) : mwCheck);
    mine = mine.filter((c) => {
      const k = classify(c.cards, board, before);
      return facing ? (k.level >= (river ? 4 : 3) && k.level <= (river ? 8 : 7)) || (!river && k.draw !== 'none') : true;
    });
    const heroCards = heroCandidates(mine, random, 1)[0];
    if (!heroCards) continue;
    const dead = [...heroCards, ...board];
    const others = w.seats.filter((x) => x.pos !== heroPos);
    const d: Draft = {
      table: w.table,
      hero: { pos: heroPos, chart: heroSeat.chart, style: heroStyle, cards: heroCards },
      others: others.map((x) => ({ pos: x.pos, chart: x.chart, style: styles.get(x.pos)! })),
      board,
      actions: [],
      stacks,
      ...(w.format === 'tournament' ? { ante: 1, format: 'tournament' as const } : {}),
    };
    w.pre(d);
    // Flop: checks to the bettor, a small bet, everyone calls.
    for (const p of order.slice(0, bi)) step(d, 'flop', p, 'check');
    bet(d, 'flop', bettor, flopFrac, 3);
    for (const p of [...order.slice(bi + 1), ...order.slice(0, bi)]) step(d, 'flop', p, 'call');
    // Turn.
    const folders = new Set<Pos>();
    const between = [...order.slice(bi + 1), ...order.slice(0, bi)].filter((p) => p !== heroPos);
    if (turnBet) {
      for (const p of order.slice(0, bi)) step(d, 'turn', p, 'check');
      bet(d, 'turn', bettor, kind === 'turnFacing' ? (random() < 0.5 ? 0.5 : 0.66) : 0.55, 4);
      if (kind === 'turnFacing') {
        for (const p of between) {
          const fold = n >= 4 && !folders.size && random() < 0.4;
          if (fold) folders.add(p);
          step(d, 'turn', p, fold ? 'fold' : 'call');
        }
      } else for (const p of [...order.slice(bi + 1), ...order.slice(0, bi)]) step(d, 'turn', p, 'call');
    } else if (kind === 'turnToYou') {
      for (const p of order.slice(0, -1)) step(d, 'turn', p, 'check');
    } else if (kind === 'riverToYou' || kind === 'riverFirst' || kind === 'riverMiddle') {
      for (const p of order) step(d, 'turn', p, 'check');
    } else if (kind === 'turnMiddle') {
      step(d, 'turn', order[0], 'check');
    }
    // River.
    if (kind === 'riverFacing') {
      for (const p of order.slice(0, bi)) step(d, 'river', p, 'check');
      bet(d, 'river', bettor, random() < 0.5 ? 0.6 : 0.8, 5);
      for (const p of between) {
        const fold = random() < 0.5;
        if (fold) folders.add(p);
        step(d, 'river', p, fold ? 'fold' : 'call');
      }
    } else if (kind === 'riverToYou') {
      for (const p of order.slice(0, -1)) step(d, 'river', p, 'check');
    } else if (kind === 'riverMiddle') {
      step(d, 'river', order[0], 'check');
    }
    // Ranges at the decision.
    const live = n - 1 - folders.size;
    const opponents: Opponent[] = others.map((x) => {
      const st = styles.get(x.pos)!;
      const type = STYLE_NAME[st];
      if (folders.has(x.pos)) return { pos: x.pos, type, pre: x.chart, range: [] };
      let r = lineRange(x, dead);
      let range: RangeGroup[];
      if (kind === 'riverFacing') {
        if (x.pos === bettor) range = betGroups(r, board, before, mwRiverBet(st), 6);
        else range = stayGroups(narrow(r, board, overcall, before), board, before);
      } else if (kind === 'turnFacing') {
        range = x.pos === bettor ? betGroups(r, board, undefined, () => 1, 5) : stayGroups(r, board);
      } else {
        // You can bet: the players who checked to you on the river are weaker still.
        if (river && order.indexOf(x.pos) < order.indexOf(heroPos)) r = narrow(r, board, mwCheck, before);
        range = river ? callerGroups(r, board, before, st, live) : turnGroups(r, board, st, live);
      }
      return { pos: x.pos, type, pre: x.chart, range };
    });
    if (opponents.some((o) => !folders.has(o.pos) && !o.range.length)) continue;
    if (facing && !opponents.find((o) => o.pos === bettor)!.range.some((g) => g.role === 'value')) continue;
    const k = classify(heroCards, board, before);
    const potWord = { raised: '', squeeze: 'squeezed ', iso: 'iso-raised ', limped: 'limped ' }[w.pot];
    const ways = `${n}-way`;
    const titleOf: Record<MwKind, string> = {
      turnFacing: `A turn bet in a ${ways} ${potWord}pot`,
      riverFacing: `A river bet in a ${ways} ${potWord}pot`,
      turnToYou: `Checked to you on the turn, ${ways}`,
      riverToYou: `Checked to you on the river, ${ways}`,
      riverFirst: `First to act on the river, ${ways}`,
      turnFirst: `First to act on the turn, ${ways}`,
      turnMiddle: `Checked to you, players behind, ${ways}`,
      riverMiddle: `Checked to you on the river, players behind, ${ways}`,
    };
    const concept = facing
      ? !river && k.level <= 1
        ? 'Multiway draws'
        : 'Multiway bluff catching'
      : k.level <= 1 && (river || k.draw === 'none')
        ? 'Bluffing multiway'
        : 'Value betting multiway';
    const bettorName = (hero: Pos) => (bettor === hero ? 'You' : cap(SEAT[bettor]));
    const flopText = `${flopWords(board)}. ${bettorName(heroPos)} ${bettor === heroPos ? 'c-bet' : 'c-bets'} ${flopFrac < 0.3 ? 'a quarter' : 'a third'} of the pot and everyone calls. Into ${n - 1} players a c-bet is small and selective: good pairs, strong draws, very few bluffs. ${mwFlopWords(board)}`;
    const turnText = turnBet
      ? `${cardWords(board, 3)}. ${bettorName(heroPos)} ${bettor === heroPos ? 'bet' : 'bets'} again. A second bet into ${n - 1} players is mostly top pair or better and the best draws.${kind === 'turnFacing' ? (folders.size ? ` ${cap(SEAT[[...folders][0]])} folds.` : '') + (between.filter((p) => !folders.has(p)).length ? ` ${cap(list(between.filter((p) => !folders.has(p)).map((p) => SEAT[p])))} ${between.filter((p) => !folders.has(p)).length > 1 ? 'call' : 'calls'} in front of you: calling with someone still to act behind takes a real hand or a good draw.` : '') : ' Everyone calls.'}`
      : kind === 'turnToYou'
        ? `${cardWords(board, 3)}. It’s checked to you. In a ${ways} pot, players with a strong hand often bet the turn to charge the draws, so the checks take some strength out of their ranges, though slow-plays are possible.`
        : kind === 'turnFirst'
          ? `${cardWords(board, 3)}. You’re first to act, with ${n - 1} players behind you.`
          : kind === 'turnMiddle'
            ? `${cardWords(board, 3)}. ${cap(SEAT[order[0]])} checks to you, with ${n - 2} still to act behind you. A bet has to get past players who haven’t shown any weakness yet.`
            : `${cardWords(board, 3)}. Everyone checks. Multiway, a strong hand usually bets the turn, so nobody is showing much.`;
    const riverText = !river
      ? ''
      : kind === 'riverFacing'
        ? `${cardWords(board, 4)}. ${bettorName(heroPos)} bets a third time. Three bets into a multiway pot is a value-heavy line: the misses that bluff are few.${between.length ? ` ${between.map((p) => `${cap(SEAT[p])} ${folders.has(p) ? 'folds' : 'calls'}`).join(', ')}.` : ''}${between.some((p) => !folders.has(p)) ? ' A call with you still to act behind is a strong hand.' : ''}`
        : kind === 'riverToYou'
          ? `${cardWords(board, 4)}. Everyone checks to you. Checked-down multiway rivers are weak, but someone usually has a pair, and a bluff has to get through ${n - 1 === 2 ? 'both' : `all ${n - 1}`} of them.`
          : kind === 'riverMiddle'
            ? `${cardWords(board, 4)}. ${cap(SEAT[order[0]])} checks to you, with ${n - 2} still to act behind you.`
            : `${cardWords(board, 4)}. You’re first to act, with ${n - 1} players behind you.`;
    const clues: Clue[] = [
      { street: 'preflop', text: w.preText(heroPos) },
      { street: 'flop', text: flopText },
      { street: 'turn', text: turnText },
      ...(river ? [{ street: 'river' as const, text: riverText }] : []),
    ];
    const drawing = !river && k.level <= 1 && k.draw !== 'none';
    const s = finish(d, opponents, {
      id: `gen-mw-${w.key}-${kind}-${idx}-${tries}`,
      title: titleOf[kind],
      concept,
      clues,
      k,
      ...(facing && !river ? { gap: { call: 0.07, fold: drawing ? 0.1 : MARGIN + 0.01 } } : {}),
      note: (best) =>
        facing
          ? best === 'call'
            ? live > 1
              ? 'Multiway the pot lays you a bigger price, which is why calls can still be right with someone else in.'
              : ''
            : 'Multiway, one-pair hands lose value fast: someone often has you beat.'
          : best === 'check' && k.level <= 1
            ? 'Multiway, bluffs rarely work: each player has to fold, and the folds multiply.'
            : '',
    });
    if (s) out.push(s);
  }
  return out;
}

const MW_KINDS: MwKind[] = ['turnFacing', 'riverFacing', 'turnToYou', 'riverToYou', 'riverFirst', 'turnFirst', 'turnMiddle', 'riverMiddle'];

// ── All of them ─────────────────────────────────────────────────────────────

/** Every generated hand, deterministic. Rounds over each seat pairing build up the set. */
export function generateScenarios(rounds = 4): Scenario[] {
  const out: Scenario[] = [];
  const spots = [
    threeBarrels,
    riverDecision,
    checkedTurn,
    turnCheckRaise,
    probeTurn,
    riverLead,
    turnBarrel,
    riverStab,
    delayedCbet,
    facingProbe,
  ];
  for (let round = 0; round < rounds; round++) {
    const random = rng(1000 + round * 7919);
    // Heads-up: cash pots (single-raised and 3-bet) on the first rounds, tournament pots on every round.
    const pairs = [...(round < Math.min(2, rounds) ? [...HU_PAIRS, ...TB_PAIRS] : []), ...MTT_PAIRS];
    pairs.forEach((p0, i) => {
      const p = withStacks(p0, random);
      const id = round * 100 + i;
      for (const spot of spots) out.push(...spot(p, random, id));
    });
    // Multiway, every setup and every kind of decision, each round.
    for (const w of MW_SETUPS) for (const kind of MW_KINDS) out.push(...mwSpot(w, kind, random, round));
    out.push(...threeBetPots(random, round), ...threeWay(random, round), ...fourWay(random, round), ...limpedPots(random, round));
  }
  // One of each id.
  const seen = new Set<string>();
  const unique = out.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
  // Folding is right more often than calling in these spots; keep the two close, so "fold" isn't a safe guess.
  const calls = unique.filter((s) => s.best === 'call').length;
  const folds = unique.filter((s) => s.best === 'fold');
  const keep = Math.min(folds.length, Math.ceil(calls * 1.2));
  const kept = new Set(
    folds.filter((_, i) => Math.floor(((i + 1) * keep) / folds.length) > Math.floor((i * keep) / folds.length)).map((s) => s.id),
  );
  return unique.filter((s) => s.best !== 'fold' || kept.has(s.id));
}

/** Option labels for a generated hand (for the docs). */
export const optionLabel = (s: Scenario, id: OptionId) => optionsFor(s).find((o) => o.id === id)?.label ?? id;
export { comboKey };
