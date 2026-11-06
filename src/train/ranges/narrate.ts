// "What each street told you", answered two ways for every street of every hand: what is their range now, and what
// do you want to do about it? It replays the hand from each player's preflop chart: every bet, call, check and raise
// narrows that player's range the way players really play (the same ideas as generate.ts: c-bets are wide on boards
// that suit the raiser and selective elsewhere, calls are pairs and draws, second barrels and raises are strong,
// multiway everything is tighter). Each street then says which range the new cards help, what's left in each
// opponent's range after their action, and what your action there is for: value from worse hands, folds from better
// ones, protection, pot control, or a draw at the right price.
//
// It runs on the phone when you answer (a few thousand hand classifications), so hand-written hands get it too.

import { rankOf, type Card } from '../../game/cards';
import { CHARTS } from './charts';
import { classify, texture, type Kind } from './classify';
import { combosOf, expandRange, optionsFor, replay, type Pos, type Scenario, type Step, type Street } from './model';

export interface StreetRead {
  street: Street;
  /** What their range is after what they did on this street. */
  theirs: string;
  /** What you want to do about it, and why (on the decision street: the answer's purpose). */
  ours: string;
}

type Style = 'reg' | 'aggro' | 'passive' | 'loose';
const BLUFFS: Record<Style, number> = { aggro: 1.25, reg: 1, loose: 0.6, passive: 0.2 };
const STICKY: Record<Style, number> = { aggro: 1, reg: 1, loose: 1.3, passive: 1.1 };

const styleOf = (type: string): Style =>
  /passive/i.test(type)
    ? 'passive'
    : /loose|station|live player/i.test(type)
      ? 'loose'
      : /aggress|maniac|lag/i.test(type)
        ? 'aggro'
        : 'reg';

interface Combo {
  cards: [Card, Card];
  w: number;
}

const FLAT = /^BB vs|defend|cold call|Call a 3-bet|limp/i;
const premium = (c: [Card, Card]) => {
  const [a, b] = [rankOf(c[0]), rankOf(c[1])];
  return (a === b && a >= 12) || (Math.min(a, b) === 13 && Math.max(a, b) === 14);
};

function startRange(chart: string, dead: Set<Card>): Combo[] {
  const text = CHARTS[chart];
  if (!text) return [];
  const flat = FLAT.test(chart);
  return expandRange(text)
    .filter((c) => !dead.has(c[0]) && !dead.has(c[1]))
    .map((cards) => ({ cards, w: flat && premium(cards) ? 0.2 : 1 }));
}

const strongDraw = (k: Kind) =>
  k.draw === 'flush draw' || k.draw === 'nut flush draw' || k.draw === 'open-ender' || k.draw === 'combo draw';

// ── How each move narrows a range ───────────────────────────────────────────

interface Ctx {
  street: Street;
  board: Card[];
  style: Style;
  /** Players in the pot when the move is made. */
  players: number;
  /** This player made the last bet or raise on the street before (or preflop): a c-bet or barrel. */
  aggressor: boolean;
  /** Facing a bet or raise. */
  facing: boolean;
  /** Facing a raise (not just a bet). */
  raised: boolean;
}

function chance(move: Step['move'], k: Kind, c: Ctx): number {
  const { style, players, street } = c;
  const multi = players > 2;
  const t = texture(c.board);
  if (move === 'bet') {
    if (c.aggressor && street === 'flop') {
      if (multi)
        return k.level >= 5
          ? 0.85
          : k.draw === 'combo draw' || k.draw === 'nut flush draw'
            ? 0.75
            : strongDraw(k)
              ? 0.55
              : k.level >= 3
                ? 0.25
                : 0.08 * BLUFFS[style];
      if (t.high && t.dry) return 0.85;
      return k.level >= 5
        ? 0.9
        : strongDraw(k)
          ? 0.8
          : k.level >= 3
            ? 0.45
            : (t.low && t.connected ? 0.25 : 0.4) * Math.min(1.2, BLUFFS[style]);
    }
    if (c.aggressor && street === 'turn')
      return k.level >= 6
        ? 0.9
        : k.level === 5
          ? multi
            ? 0.45
            : 0.6
          : k.level === 4
            ? 0.2
            : strongDraw(k)
              ? (multi ? 0.45 : 0.75) * Math.min(1.1, BLUFFS[style] + 0.1)
              : k.level === 3
                ? 0.08
                : (multi ? 0.05 : 0.28) * BLUFFS[style];
    if (street === 'river')
      return k.level >= 7
        ? 0.95
        : k.level === 6
          ? 0.65
          : k.level === 5
            ? 0.3
            : k.level >= 3
              ? 0.05
              : k.label.startsWith('Missed')
                ? 0.4 * BLUFFS[style]
                : 0.15 * BLUFFS[style];
    // A lead or probe from the player who didn't raise: decent made hands, draws and some stabs.
    return k.level >= 6 ? 0.8 : k.level === 5 ? 0.5 : k.level === 4 ? 0.25 : strongDraw(k) ? 0.5 : (multi ? 0.05 : 0.15) * BLUFFS[style];
  }
  if (move === 'raise') {
    if (street === 'river') return k.level >= 8 ? 0.9 : k.level === 7 ? 0.45 : 0.04 * BLUFFS[style];
    return k.level >= 7 ? 0.6 : k.draw === 'combo draw' ? 0.45 * BLUFFS[style] : strongDraw(k) ? 0.15 * BLUFFS[style] : 0;
  }
  if (move === 'call') {
    if (c.raised)
      return k.level >= 7 ? 0.8 : k.level === 6 ? 0.6 : strongDraw(k) || k.draw === 'combo draw' ? 0.7 : k.level === 5 ? 0.3 : 0.02;
    if (street === 'flop') {
      if (k.level >= 8) return 0.6;
      if (k.level >= 4) return 1;
      if (k.level === 3) return multi ? 0.6 : 1;
      if (strongDraw(k) || k.draw === 'combo draw') return 1;
      if (k.draw === 'gutshot') return multi ? 0.3 : 0.6;
      return (k.level === 1 ? (multi ? 0.12 : 0.4) : multi ? 0.03 : 0.12) * STICKY[style];
    }
    if (street === 'turn') {
      if (k.level >= 8) return 0.65;
      if (k.level >= 5) return 1;
      if (k.level === 4) return 0.6 * STICKY[style];
      if (k.draw === 'combo draw' || strongDraw(k)) return 0.85;
      if (k.level === 3) return (multi ? 0.15 : 0.3) * STICKY[style];
      if (k.draw === 'gutshot') return 0.3;
      return 0.04;
    }
    // River: bluff catchers. Multiway, a call with someone still to come takes a strong hand.
    if (multi) return k.level >= 7 ? 1 : k.level === 6 ? 0.75 : k.level === 5 ? 0.35 : 0.03;
    return k.level >= 5 ? 1 : k.level === 4 ? 0.65 * STICKY[style] : k.level === 3 ? 0.35 * STICKY[style] : k.level === 1 ? 0.08 : 0;
  }
  if (move === 'check') {
    // The raiser checking back gives up the hands it would have bet; anyone else checking keeps almost everything.
    if (c.aggressor && (street === 'flop' || street === 'turn')) return 1 - chance('bet', k, c);
    if (street === 'river' && c.aggressor) return 1 - chance('bet', k, c);
    return k.level >= 7 ? (multi ? 0.4 : 0.6) : k.level === 6 && multi ? 0.75 : k.draw === 'combo draw' && multi ? 0.6 : 1;
  }
  return 0;
}

/** An opponent's range as the hand gives it, combo by combo. */
const actual = (o: Scenario['opponents'][number], dead: Card[]): Combo[] =>
  o.range.flatMap((g) => combosOf(g, dead).map((cards) => ({ cards, w: g.weight ?? 1 })));

function narrow(range: Combo[], board: Card[], p: (k: Kind) => number, before?: Card[]): Combo[] {
  return range.map((c) => ({ ...c, w: c.w * Math.max(0, Math.min(1, p(classify(c.cards, board, before)))) })).filter((c) => c.w > 0.005);
}

// ── Describing a range ──────────────────────────────────────────────────────

const pct = (x: number) => `${Math.round(x * 100)}%`;
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const SEAT: Record<Pos, string> = { UTG: 'UTG', UTG1: 'UTG+1', MP: 'MP', LJ: 'LJ', HJ: 'HJ', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB' };

interface Mix {
  strong: number;
  top: number;
  mid: number;
  draws: number;
  air: number;
}

/** A range in five piles on this board: two pair or better, top pair/overpair, other pairs, draws, nothing. */
function mix(range: Combo[], board: Card[], before?: Card[]): Mix {
  const m: Mix = { strong: 0, top: 0, mid: 0, draws: 0, air: 0 };
  let total = 0;
  const river = board.length === 5;
  for (const c of range) {
    const k = classify(c.cards, board, before);
    total += c.w;
    if (k.level >= 7) m.strong += c.w;
    else if (k.level >= 5) m.top += c.w;
    else if (k.level >= 3) m.mid += c.w;
    else if (!river && k.draw !== 'none') m.draws += c.w;
    else m.air += c.w;
  }
  if (total) for (const key of Object.keys(m) as (keyof Mix)[]) m[key] /= total;
  return m;
}

function mixWords(m: Mix, river: boolean): string {
  const parts: [string, number][] = [
    ['two pair or better', m.strong],
    ['top pair or an overpair', m.top],
    ['weaker pairs', m.mid],
    ['draws', m.draws],
    [river ? 'missed draws and air' : 'little or nothing', m.air],
  ];
  const shown = parts.filter(([, v]) => v >= 0.06).sort((a, b) => b[1] - a[1]);
  return list(shown.map(([name, v]) => `${name} ${pct(v)}`));
}

const LEVEL_WORDS: Record<number, string> = {
  0: 'nothing yet',
  1: 'ace-high',
  3: 'a weak pair',
  4: 'second pair',
  5: 'top pair, weak kicker',
  6: 'top pair, good kicker',
  7: 'two pair',
  8: 'a set or trips',
  9: 'a straight',
  10: 'a flush',
  11: 'a full house or better',
};
function handWords(k: Kind, street: Street): string {
  const made = k.level === 6 && /Overpair/.test(k.label) ? 'an overpair' : LEVEL_WORDS[k.level];
  if (street !== 'river' && k.draw !== 'none')
    return k.level >= 3
      ? `${made} plus ${k.draw === 'open-ender' ? 'an' : 'a'} ${k.draw}`
      : `${k.draw === 'open-ender' ? 'an' : 'a'} ${k.draw}`;
  return made;
}

const CARD: Record<string, string> = {
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

/** How much stronger your range is than theirs on this board (strong hands count double). */
const edgeOf = (a: Mix, b: Mix) => 2 * (a.strong - b.strong) + (a.top - b.top);

/** What the new card is, in a few words. */
function cardNews(board: Card[], i: number): string {
  const c = board[i];
  const before = board.slice(0, i);
  const name = CARD[c[0]];
  const suited = before.filter((x) => x[1] === c[1]).length;
  if (suited === 2) return `The ${name} is the third card of its suit: flushes are possible now`;
  if (suited >= 3) return `The ${name} puts a fourth card of one suit out`;
  if (before.some((x) => x[0] === c[0])) return `The ${name} pairs the board`;
  if (rankOf(c) > Math.max(...before.map(rankOf))) return `The ${name} is an overcard`;
  if (rankOf(c) <= 6) return `The ${name} is a low card`;
  return `The ${name} comes`;
}

// ── The replay ──────────────────────────────────────────────────────────────

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
const boardAt = (s: Scenario, st: Street) => s.board.slice(0, st === 'flop' ? 3 : st === 'turn' ? 4 : st === 'river' ? 5 : 0);

/** Every street's two answers: what's their range, and what do you want to do about it. */
export function narrate(s: Scenario): StreetRead[] {
  const dead = new Set<Card>([...s.hero.cards, ...s.board]);
  const hero = s.hero.pos;
  const styles = new Map<Pos, Style>(s.opponents.map((o) => [o.pos, styleOf(o.type)]));
  styles.set(hero, 'reg');
  const ranges = new Map<Pos, Combo[]>([
    [hero, startRange(s.hero.pre, dead)],
    ...s.opponents.map((o) => [o.pos, startRange(o.pre, dead)] as [Pos, Combo[]]),
  ]);
  const folded = new Set<Pos>();
  const decision: Street = s.board.length === 4 ? 'turn' : 'river';
  const streets = STREETS.slice(0, STREETS.indexOf(decision) + 1);
  const out: StreetRead[] = [];
  let aggressor: Pos | null = null;
  let r;
  try {
    r = replay(s);
  } catch {
    return [];
  }

  for (const st of streets) {
    const board = boardAt(s, st);
    const before = st === 'river' ? boardAt(s, 'turn') : undefined;
    const acts = s.actions.filter((a) => a.street === st);
    const live = () => [hero, ...s.opponents.map((o) => o.pos)].filter((p) => !folded.has(p));
    // Before anyone acts: which range does this street's card help?
    const opps = s.opponents.filter((o) => !folded.has(o.pos));
    const heroMix = st === 'preflop' ? null : mix(ranges.get(hero)!, board, before);
    const oppMix =
      st === 'preflop'
        ? null
        : mix(
            opps.flatMap((o) => ranges.get(o.pos)!),
            board,
            before,
          );
    // Play the street's moves.
    let streetAggr: Pos | null = null;
    let bets = 0;
    const moves = new Map<Pos, Step['move'][]>();
    for (const a of acts) {
      moves.set(a.who, [...(moves.get(a.who) ?? []), a.move]);
      if (a.move === 'fold') {
        folded.add(a.who);
        continue;
      }
      if (st !== 'preflop') {
        const ctx: Ctx = {
          street: st,
          board,
          style: styles.get(a.who) ?? 'reg',
          players: live().length,
          aggressor: a.who === aggressor && bets === 0,
          facing: bets > 0,
          raised: bets > 1,
        };
        ranges.set(
          a.who,
          narrow(ranges.get(a.who) ?? [], board, (k) => chance(a.move, k, ctx), before),
        );
      }
      if (a.move === 'bet' || a.move === 'raise') {
        bets++;
        streetAggr = a.who;
      }
    }
    // Players who never act in the log fold preflop: they're gone.
    if (st === 'preflop') for (const o of s.opponents) if (!acts.some((a) => a.who === o.pos)) folded.add(o.pos);

    // On the decision street, their ranges are the hand's own (the ones shown under "Their range now").
    if (st === decision) for (const o of s.opponents) if (!folded.has(o.pos)) ranges.set(o.pos, actual(o, [...dead]));
    out.push({
      street: st,
      theirs: theirsText(s, st, board, before, opps, ranges, moves, folded, oppMix, heroMix),
      ours: oursText(
        s,
        r,
        st,
        board,
        before,
        moves.get(hero) ?? [],
        ranges,
        folded,
        aggressor,
        streetAggr,
        st === decision,
        heroMix,
        oppMix,
      ),
    });
    if (streetAggr) aggressor = streetAggr;
  }
  return out;
}

function theirsText(
  s: Scenario,
  st: Street,
  board: Card[],
  before: Card[] | undefined,
  opps: Scenario['opponents'],
  ranges: Map<Pos, Combo[]>,
  moves: Map<Pos, Step['move'][]>,
  folded: Set<Pos>,
  oppMix: Mix | null,
  heroMix: Mix | null,
): string {
  if (st === 'preflop') {
    const firstMove = (p: Pos) => s.actions.findIndex((a) => a.who === p);
    const still = s.opponents.filter((o) => !folded.has(o.pos)).sort((a, b) => firstMove(a.pos) - firstMove(b.pos));
    return still
      .map((o) => {
        const n = expandRange(CHARTS[o.pre] ?? '').length;
        const verb = preVerb(s, o.pos);
        return `${SEAT[o.pos]} ${verb}: about ${Math.round((n / 1326) * 100)}% of hands (${chartShape(o.pre)})`;
      })
      .join('. ');
  }
  const parts: string[] = [];
  // Which range the new card(s) help.
  if (heroMix && oppMix) {
    // One measure for "who does this card help": strong hands count double (they win the big pots).
    const edge = edgeOf(heroMix, oppMix);
    const theirs = opps.length > 1 ? 'theirs together' : 'theirs';
    const nums = `top pair or better is ${pct(heroMix.strong + heroMix.top)} of your range and ${pct(oppMix.strong + oppMix.top)} of ${theirs}; two pair or better, ${pct(heroMix.strong)} against ${pct(oppMix.strong)}`;
    // Range advantage (more top pair or better) and nut advantage (more of the strongest hands) can point different
    // ways, and they call for different bets: a range edge without the nuts bets small, the nut edge can bet big.
    const range = heroMix.strong + heroMix.top - (oppMix.strong + oppMix.top);
    const nuts = heroMix.strong - oppMix.strong;
    const verdict =
      nuts > 0.03 && range > 0.05
        ? 'favours your range, strongest hands included, so big bets carry weight'
        : nuts > 0.03
          ? 'gives you more of the strongest hands (the nut advantage), even though they have as many pairs'
          : range > 0.06 && nuts > -0.02
            ? 'gives your range more top pairs but not more of the very best hands, which suits small bets'
            : nuts < -0.03
              ? 'gives them more of the strongest hands (sets, two pair, straights): be careful putting in big bets'
              : edge < -0.06
                ? 'is better for their range'
                : 'helps both ranges about the same';
    parts.push(st === 'flop' ? `This flop ${verdict}: ${nums}.` : `${cardNews(board, board.length - 1)}, and it ${verdict}: ${nums}.`);
  }
  // What's left of each opponent's range after what they did.
  for (const o of opps) {
    if (folded.has(o.pos)) {
      parts.push(`${SEAT[o.pos]} folds.`);
      continue;
    }
    const did = moves.get(o.pos) ?? [];
    const phrase = did.length ? did.map((m) => (m === 'raise' ? 'raise' : m)).join('-') : 'still to act';
    const m = mix(ranges.get(o.pos) ?? [], board, before);
    parts.push(`${SEAT[o.pos]} (${phrase}): ${mixWords(m, st === 'river')}.`);
  }
  return parts.join(' ');
}

/** What a player did before the flop, in words: "opened, then called the 3-bet". */
function preVerb(s: Scenario, p: Pos): string {
  const pre = s.actions.filter((a) => a.street === 'preflop');
  const words: string[] = [];
  let raises = 0;
  for (const a of pre) {
    if (a.who === p) {
      if (a.move === 'raise')
        words.push(
          raises === 0
            ? pre.slice(0, pre.indexOf(a)).some((x) => x.move === 'call')
              ? 'raised over the limpers'
              : 'opened'
            : raises === 1
              ? pre.slice(0, pre.indexOf(a)).some((x) => x.move === 'call')
                ? 'squeezed'
                : '3-bet'
              : '4-bet',
        );
      else if (a.move === 'call')
        words.push(
          raises === 0
            ? 'limped'
            : raises === 1
              ? words.length
                ? 'called the raise'
                : 'called'
              : `called the ${raises === 2 ? '3-bet' : 're-raise'}`,
        );
      else if (a.move === 'check') words.push('checked their option');
    }
    if (a.move === 'raise') raises++;
  }
  return words.length > 1 ? `${words.slice(0, -1).join(', ')}, then ${words[words.length - 1]}` : (words[0] ?? 'called');
}

/** A chart in a few words: what kinds of hands are in it. */
function chartShape(chart: string): string {
  if (/Call a 3-bet/.test(chart)) return 'medium pairs, suited aces and broadways';
  if (/3-bet|Squeeze/.test(chart)) return 'big pairs, A-K, A-Q and a few suited aces';
  if (/limp/i.test(chart)) return 'small pairs, suited cards and weak aces, rarely a premium';
  if (/Any two/.test(chart)) return 'any two cards';
  if (/BB vs|BB defend/.test(chart)) return 'a wide range: pairs, suited cards, connectors and offsuit broadways';
  if (/cold call/i.test(chart)) return 'pairs, suited aces, suited broadways and connectors; the biggest hands would have 3-bet';
  const n = expandRange(CHARTS[chart] ?? '').length;
  return n < 300
    ? 'pairs, strong aces and broadways, a few suited connectors'
    : n < 500
      ? 'every pair, suited aces, broadways and suited connectors'
      : 'a wide range, with plenty of suited and offsuit hands';
}

function oursText(
  s: Scenario,
  r: ReturnType<typeof replay>,
  st: Street,
  board: Card[],
  before: Card[] | undefined,
  did: Step['move'][],
  ranges: Map<Pos, Combo[]>,
  folded: Set<Pos>,
  aggressor: Pos | null,
  streetAggr: Pos | null,
  decisionStreet: boolean,
  heroMix: Mix | null,
  oppMix: Mix | null,
): string {
  const hero = s.hero.pos;
  if (st === 'preflop') return preflopPlan(s, did);
  const k = classify(s.hero.cards, board, before);
  const have = `You have ${handWords(k, st)}.`;
  const opps = s.opponents.filter((o) => !folded.has(o.pos));
  const m = mix(
    opps.flatMap((o) => ranges.get(o.pos) ?? []),
    board,
    before,
  );
  const river = st === 'river';
  const ahead = heroMix && oppMix ? edgeOf(heroMix, oppMix) : 0;
  // The decision street: what the answer is for.
  if (decisionStreet) {
    const best = optionsFor(s, r).find((o) => o.id === s.best);
    const label = best?.label.replace(/ \(.*\)$/, '') ?? s.best;
    const why = purpose(s.best, k, m, river, opps.length);
    return s.best.startsWith('bet')
      ? `${have} The play: ${label.toLowerCase()} ${why}`
      : `${have} The play: ${label.toLowerCase()}. ${why}`;
  }
  const last = did[did.length - 1];
  if (!last) return have;
  if (last === 'bet' || last === 'raise') {
    const role = aggressor === hero && st === 'flop' && last === 'bet' ? 'c-bet' : last === 'raise' ? 'raise' : 'bet';
    const range =
      aggressor === hero && ahead > 0.06
        ? ' Your range has more strong hands on this board, so you can bet often and they have to respect it.'
        : '';
    return `${have} You ${role} ${purpose('bet75', k, m, river, opps.length)}${range}`;
  }
  if (last === 'call') return `${have} You call: ${callPurpose(k, m, river)}`;
  if (last === 'check') {
    if (streetAggr && streetAggr !== hero && did.length === 1) return `${have} You check, ${checkPurpose(k, m, river, aggressor === hero)}`;
    return `${have} You check: ${checkPurpose(k, m, river, aggressor === hero)}`;
  }
  return have;
}

/** What a bet (or the decision) is for, against what's in their range. */
function purpose(id: string, k: Kind, m: Mix, river: boolean, players: number): string {
  const worse = m.mid + (k.level >= 7 ? m.top : 0) + (river ? 0 : m.draws);
  const better = m.strong + (k.level < 5 ? m.top : 0);
  const draws = river ? 0 : m.draws;
  const many = players > 1 ? ' With more than one player in, someone usually has something, so bluffs need more folds.' : '';
  if (id === 'fold')
    return `Too much of their range beats you (${pct(better)} is ${k.level < 5 ? 'top pair or better' : 'two pair or better'}), and the price isn’t good enough.`;
  if (id === 'call')
    return `Your hand beats their bluffs and worse made hands, and at this price you only need to be good some of the time.`;
  if (id === 'check')
    return k.level >= 5
      ? `Pot control: you beat their weaker pairs and missed draws, but those won’t pay a bet, while the ${pct(better)} that beats you would. Showdown value is worth more than a bet here.`
      : k.level >= 3
        ? `Pot control: a weak pair wins sometimes at showdown, but a bet only gets called by better.`
        : `Nothing to value bet, and not enough of their range folds to make a bluff pay.${many}`;
  // A bet or raise.
  if (k.level >= 5) {
    const targets: [string, number][] = [
      ...(k.level >= 7 ? ([['top pairs and overpairs', m.top]] as [string, number][]) : []),
      ['weaker pairs', m.mid],
      ...(river ? [] : ([['draws', m.draws]] as [string, number][])),
    ];
    const named = list(targets.filter(([, v]) => v >= 0.05).map(([n, v]) => `${n} (${pct(v)})`));
    return `for value${draws >= 0.12 ? ' and protection' : ''}. You want worse hands to call: ${named || 'the few worse hands they have'}, ${pct(worse)} of their range in all${draws >= 0.12 ? `; the draws should pay to see the next card, not get it free` : ''}.`;
  }
  if (!river && k.draw !== 'none')
    return `as a semi-bluff. You want the ${pct(m.mid + m.air)} of their range that’s weak pairs or nothing to fold, and when they call you still have outs.${many}`;
  if (k.level >= 3) return `for thin value and protection: some worse pairs call, and overcards don’t get a free card to outdraw you.`;
  return `as a bluff. You’re representing the strong hands this board gives your range; it works if enough of their ${pct(m.mid + m.air)} weak pairs and air let go.${many}`;
}

function callPurpose(k: Kind, m: Mix, river: boolean): string {
  if (k.level >= 5)
    return `you’re ahead of their bluffs and weaker pairs. Raising would fold those out and only get called by better, so calling keeps their bluffs in and the pot under control.`;
  if (!river && k.draw !== 'none') return `your draw has the price to see the next card, and when it hits you can win a big pot.`;
  if (k.level >= 3) return `a bluff catcher: their range still has ${pct(m.draws + m.air)} draws and air that your pair beats.`;
  return `a float: you plan to take the pot away later when they show weakness.`;
}

function checkPurpose(k: Kind, m: Mix, river: boolean, wasAggressor: boolean): string {
  if (k.level >= 7)
    return `slow-playing a strong hand: their range is ${pct(m.mid + m.air + m.draws)} weaker hands that can bet or catch up and pay you later, and nothing is likely to outdraw you cheaply.`;
  if (k.level >= 5)
    return `pot control with a good hand: you keep their bluffs and weaker pairs in and don’t face a raise from the hands that beat you.`;
  if (k.level >= 3) return `a weak pair wants a cheap showdown, not a big pot.`;
  if (!river && k.draw !== 'none') return `taking a free card with your draw.`;
  return wasAggressor
    ? `giving up for now: this card is better for their range than yours.`
    : `nothing to bet for value, and their range won’t fold enough yet.`;
}

function preflopPlan(s: Scenario, did: Step['move'][]): string {
  const raises = s.actions.filter((a) => a.street === 'preflop' && a.move === 'raise');
  const mine = did[did.length - 1];
  const first = raises[0]?.who === s.hero.pos;
  if (mine === 'raise' && raises.length >= 2 && raises[raises.length - 1].who === s.hero.pos)
    return `You re-raise: for value with your strong hands, and to take the initiative into a smaller, stronger pot.`;
  if (
    mine === 'raise' &&
    first &&
    s.actions.some((a) => a.street === 'preflop' && a.move === 'call' && s.actions.indexOf(a) < s.actions.indexOf(raises[0]))
  )
    return `You raise over the limpers to isolate their weak, wide ranges and play the pot with the initiative.`;
  if (mine === 'raise' && first)
    return `You open to take the initiative: your range is stronger than the players behind, and you’ll often win the pot with a c-bet.`;
  if (mine === 'call' && raises.length >= 2)
    return `You call the re-raise with a hand that plays well in a big pot: pairs that can flop a set, suited aces and broadways.`;
  if (mine === 'call' && s.hero.pos === 'BB')
    return `You defend the big blind: you close the action and get a good price, so a wide range is profitable.`;
  if (mine === 'call' && raises.length === 0) return `You limp along cheaply with a hand that wants to see a flop.`;
  if (mine === 'call')
    return `You call with a hand that plays well after the flop${['BTN', 'CO'].includes(s.hero.pos) ? ', with position on the raiser' : ''}.`;
  if (mine === 'check') return `You check your option: a free flop with any two cards.`;
  return '';
}
