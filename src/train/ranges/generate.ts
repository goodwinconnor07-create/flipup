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
import { classify, texture, type Kind } from './classify';
import {
  analyse,
  bb,
  comboKey,
  expandRange,
  optionsFor,
  replay,
  roleFor,
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
const FLAT = /^BB vs|cold call|Call a 3-bet|limp/i;
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
    .slice(0, 4)
    .map(([n]) => n)
    .join(', ');
}

interface Grouped {
  label: string;
  role: Role;
  small?: Role;
  big?: Role;
  combos: Combo[];
}

function toGroups(list: Grouped[]): RangeGroup[] {
  return list
    .filter((g) => g.combos.length)
    .map((g) => {
      const total = g.combos.reduce((n, c) => n + c.w, 0);
      const weight = Math.round((total / g.combos.length) * 100) / 100;
      return {
        label: `${g.label}: ${examples(g.combos)}`,
        hands: g.combos.map((c) => c.cards.join('')).join(', '),
        role: g.role,
        ...(g.small && g.small !== g.role ? { small: g.small } : {}),
        ...(g.big && g.big !== g.role ? { big: g.big } : {}),
        ...(weight < 0.995 ? { weight: Math.max(0.01, weight) } : {}),
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
  const factor = DEFEND[style] * (players > 1 ? 0.75 : 1);
  const cut = (frac: number) => Math.min(0.95, factor / (1 + frac)) * total;
  const by = new Map<string, Grouped>();
  let acc = 0;
  for (const { c, k } of scored) {
    const above = acc;
    acc += c.w;
    const at = (frac: number): Role => (k.level === 0 || above >= cut(frac) ? 'folds' : k.level >= 9 ? 'raises' : 'calls');
    const r = { role: at(0.75), small: at(0.33), big: at(1.25) };
    const key = `${k.label}|${r.role}|${r.small}|${r.big}`;
    if (!by.has(key)) by.set(key, { label: k.label, ...r, combos: [] });
    by.get(key)!.combos.push(c);
  }
  return toGroups([...by.values()]);
}

/** Groups a range that's just in the pot (a caller in front of you): all `calls`. */
function stayGroups(range: Combo[], board: Card[], before?: Card[]): RangeGroup[] {
  const by = new Map<string, Grouped>();
  for (const c of range) {
    const k = classify(c.cards, board, before);
    if (!by.has(k.label)) by.set(k.label, { label: k.label, role: 'calls', combos: [] });
    by.get(k.label)!.combos.push(c);
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
}

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
    board: d.board,
    actions: d.actions,
    best: 'check',
    clues: meta.clues,
    why: '',
  };
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
const groupName = (g: RangeGroup) => g.label.split(':')[0].toLowerCase();
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** "top pair (24%) and sets (9%)": the biggest kinds of hand in a view that pass `keep`, with their share of the range. */
function biggest(v: OpponentView, keep: (g: GroupView) => boolean, n = 3): string {
  const total = v.groups.reduce((t, g) => t + g.weight, 0) || 1;
  const by = new Map<string, number>();
  for (const g of v.groups) if (keep(g)) by.set(groupName(g.group), (by.get(groupName(g.group)) ?? 0) + g.weight);
  return list(
    [...by.entries()]
      .filter(([, w]) => w / total >= 0.02)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, w]) => `${name} (${pct(w / total)})`),
  );
}

const shareOf = (v: OpponentView, keep: (g: GroupView) => boolean) =>
  v.groups.filter(keep).reduce((t, g) => t + g.weight, 0) / (v.groups.reduce((t, g) => t + g.weight, 0) || 1);

/** "You beat X and lose to Y." for one player's range (only the parts that `keep`). */
function beatWords(v: OpponentView, keep: (g: GroupView) => boolean = () => true): string {
  const ahead = biggest(v, (g) => keep(g) && g.equity >= 0.6);
  const behind = biggest(v, (g) => keep(g) && g.equity <= 0.4);
  if (ahead && behind) return `you beat ${ahead}, and lose to ${behind}`;
  if (ahead) return `you beat almost all of it: ${ahead}`;
  if (behind) return `almost all of it beats you: ${behind}`;
  return 'it’s close against most of it';
}

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
  const parts = [`${heroLine(s, meta.k)}.`];
  for (const v of views) {
    const polar = v.groups.some((g) => g.group.role === 'value' || g.group.role === 'bluff');
    const who = views.length > 1 ? `${v.opponent.pos}: ` : '';
    if (polar) {
      const value = shareOf(v, (g) => g.group.role === 'value');
      const bluffs = biggest(v, (g) => g.group.role === 'bluff', 2);
      parts.push(
        `${who}About ${pct(value)} of their bets here are value (${biggest(v, (g) => g.group.role === 'value', 2)})${bluffs ? `, the rest semi-bluffs and bluffs (${bluffs})` : ', with almost no bluffs'}. Against it, ${beatWords(v)}.`,
      );
    } else parts.push(`${who}They have ${biggest(v, () => true)}: ${beatWords(v)}.`);
  }
  parts.push(
    `Calling costs ${bb(r.toCall)} into a pot of ${bb(r.pot)}, so you need to win ${pct(price)} of the time. You win ${pct(equity)}${s.board.length === 4 ? ' with the river to come' : ''}.`,
  );
  parts.push(equity > price ? 'Call.' : 'Fold.');
  const note = meta.note?.(equity > price ? 'call' : 'fold');
  if (note) parts.push(note);
  return parts.join(' ');
}

function explainBetting(s: Scenario, r: ReturnType<typeof replay>, equity: number, b: Bet, best: OptionId, meta: Meta): string {
  const views = analyse(s, r);
  const parts = [`${heroLine(s, meta.k)}.`];
  const callers = (v: OpponentView) => biggest(v, (g) => roleFor(g.group, b.id) !== 'folds', 3);
  const callWords = views.map((v) => (views.length > 1 ? `${v.opponent.pos} ${callers(v) || 'nothing'}` : callers(v))).join('; ');
  const needed = b.amount / (r.pot + b.amount);
  if (best === 'check') {
    parts.push(
      b.equityCalled < 0.5
        ? `If you bet ${sizeWord(b.id)}, ${views.length > 1 ? 'everyone folds' : 'they fold'} only ${pct(b.allFold)} of the time, and the hands that call (${callWords || 'their best hands'}) leave you winning just ${pct(b.equityCalled)}.`
        : `A bet of ${sizeWord(b.id)} gets called by too little that you beat: ${views.length > 1 ? 'everyone folds' : 'they fold'} ${pct(b.allFold)}, and you win ${pct(b.equityCalled)} when called.`,
    );
    parts.push(`Checking keeps your ${pct(equity)} share of the pot at showdown, which is worth more. Check.`);
  } else if (b.equityCalled >= 0.5) {
    parts.push(
      `Bet ${sizeWord(best)} for value. The hands that call it are ${callWords || 'their pairs'}, and you win ${pct(b.equityCalled)} of the time when called.${b.allFold > 0.05 ? ` They fold ${pct(b.allFold)}.` : ''}`,
    );
    if (best === 'bet33') parts.push('A bigger bet would fold out the worse hands that pay you.');
    if (best === 'bet125') parts.push('Their worse hands that call can’t fold even to a big bet, so make it big.');
  } else {
    parts.push(
      `Bet ${sizeWord(best)} as a ${s.board.length === 4 && meta.k.draw !== 'none' ? 'semi-bluff' : 'bluff'}. It risks ${bb(b.amount)} to win ${bb(r.pot)}, so it needs folds ${pct(needed)} of the time, and ${views.length > 1 ? 'everyone folds' : 'they fold'} ${pct(b.allFold)}.`,
    );
    if (s.board.length === 4 && b.equityCalled > 0.1) parts.push(`When called you still win ${pct(b.equityCalled)}.`);
    else if (equity > 0.05) parts.push(`Checking would only win your ${pct(equity)} share at showdown.`);
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
}

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
  return heroRaised
    ? `You open from ${SEAT[p.opener]} and ${SEAT[p.defender]} calls. ${chartWords(p.defendChart)}`
    : `${cap(SEAT[p.opener])} opens and you call from ${SEAT[p.defender]}. ${chartWords(p.openChart)}`;
}

const openSize = (p: Pair) => (p.table === 9 ? 3 : p.opener === 'SB' ? 3 : 2.5);
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
        title: k.level >= 6 ? 'Value on the river' : k.level <= 1 ? 'The river after your draw missed' : 'One pair on the river',
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
function turnGroups(range: Combo[], board: Card[], style: Style): RangeGroup[] {
  const scored = range.map((c) => ({ c, k: classify(c.cards, board), v: score([...c.cards, ...board].map(toInt)) }));
  scored.sort((x, y) => turnStrength(y.k) - turnStrength(x.k) || y.v - x.v);
  const total = scored.reduce((t, x) => t + x.c.w, 0);
  const cut = (frac: number) => Math.min(0.95, DEFEND[style] / (1 + frac)) * total;
  const by = new Map<string, Grouped>();
  let acc = 0;
  for (const { c, k } of scored) {
    const above = acc;
    acc += c.w;
    const at = (frac: number): Role => (turnStrength(k) === 0 || above >= cut(frac) ? 'folds' : k.level >= 8 ? 'raises' : 'calls');
    const r = { role: at(0.75), small: at(0.33), big: at(1.25) };
    const key = `${k.label}|${r.role}|${r.small}|${r.big}`;
    if (!by.has(key)) by.set(key, { label: k.label, ...r, combos: [] });
    by.get(key)!.combos.push(c);
  }
  return toGroups([...by.values()]);
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

// ── All of them ─────────────────────────────────────────────────────────────

/** Every generated hand, deterministic. Rounds over each seat pairing build up the set. */
export function generateScenarios(rounds = 4): Scenario[] {
  const out: Scenario[] = [];
  for (let round = 0; round < rounds; round++) {
    const random = rng(1000 + round * 7919);
    [...HU_PAIRS, ...TB_PAIRS].forEach((p, i) => {
      const id = round * 100 + i;
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
      for (const spot of spots) out.push(...spot(p, random, id));
    });
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
