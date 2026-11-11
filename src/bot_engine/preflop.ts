import charts from '../game/botCharts.json';
import { rankOf } from '../game/cards';
import type { InformationSet } from './information';

type Step = { actor: number; move: 'fold' | 'call' | 'raise' };
export type PreflopLookup =
  { matched: false; reason: string } | { matched: true; bank: string; spot: string; call: number; raise: number; raiseTo?: number };

/** Paths and sizing mirror export_bot_charts.py and the default preflop solver tree.
 * Frequencies collapse normal raises and jams; they do not preserve a sizing mix or EVs. */
function pathFor(key: string, n: number): { path: Step[]; hero: number } {
  const [kind, a, b] = key.split('.');
  const first = Number(a),
    second = Number(b);
  const folds = (from: number, to: number): Step[] => Array.from({ length: to - from }, (_, k) => ({ actor: from + k, move: 'fold' }));
  if (kind === 'rfi') return { path: folds(0, first), hero: first };
  if (kind === 'limp') {
    const sb = n === 2 ? 0 : n - 2;
    return { path: [...folds(0, sb), { actor: sb, move: 'call' }], hero: n - 1 };
  }
  const opener = kind === '4bet' ? second : first;
  const raiser = kind === '4bet' ? first : second;
  const open: Step[] = [...folds(0, opener), { actor: opener, move: 'raise' }, ...folds(opener + 1, raiser)];
  if (kind === 'open') return { path: open, hero: raiser };
  const three: Step[] = [...open, { actor: raiser, move: 'raise' }, ...folds(raiser + 1, n)];
  return kind === '3bet' ? { path: three, hero: opener } : { path: [...three, { actor: opener, move: 'raise' }], hero: raiser };
}

export function preflopLookup(i: InformationSet): PreflopLookup {
  const miss = (reason: string): PreflopLookup => ({ matched: false, reason });
  if (i.street !== 'preflop') return miss('not-preflop');
  const players = [...i.players].sort((a, b) => a.seat - b.seat),
    n = players.length;
  if (n > 6) return miss('unsupported-player-count');
  if (i.smallBlind * 2 !== i.bigBlind) return miss('unsupported-blind-ratio');
  if (new Set(players.map((p) => p.seat)).size !== n) return miss('invalid-position');
  const button = players.findIndex((p) => p.id === i.buttonId);
  if (button < 0) return miss('invalid-position');
  const order = players.map((_, k) => players[(button + (n === 2 ? 0 : 3) + k) % n]);
  const depth = (order[0].stack + order[0].total) / i.bigBlind;
  if (!order.every((p) => (p.stack + p.total) / i.bigBlind === depth)) return miss('unequal-starting-stacks');
  const bankKey = `${n}p${depth}`;
  const bank = (charts.charts as Record<string, { names: string[]; spots: Record<string, string> }>)[bankKey];
  if (!bank) return miss('unsupported-stack-depth');
  if (i.actions.some((a) => a.street !== 'preflop' || a.outOfTurn)) return miss('unsupported-action-history');
  const candidate = Object.keys(bank.spots)
    .map((spot) => ({ spot, ...pathFor(spot, n) }))
    .find(
      ({ path, hero }) =>
        order[hero].id === i.heroId &&
        path.length === i.actions.length &&
        path.every((s, k) => {
          const a = i.actions[k];
          return a.playerId === order[s.actor].id && (a.move === s.move || (s.move === 'raise' && a.move === 'allin'));
        }),
    );
  if (!candidate) return miss('unsupported-action-history');
  const bets = order.map((_, k) => (k === n - 1 ? i.bigBlind : k === (n === 2 ? 0 : n - 2) ? i.smallBlind : 0));
  const folded = order.map(() => false);
  let current = i.bigBlind,
    lastRaise = i.bigBlind,
    raises = 0,
    lastRaiser = -1,
    limpers = 0;
  const rank = (p: number) => (n === 2 ? (p === 0 ? 1 : 0) : p === n - 2 ? 0 : p === n - 1 ? 1 : p + 2);
  const targetFor = (p: number) => {
    const ip = lastRaiser >= 0 && rank(p) > rank(lastRaiser);
    const name = bank.names[p];
    const open =
      name === 'BB' ? 3.5 : name === 'SB' ? (depth > 40 ? 3 : 2.5) : name === 'BTN' ? (depth > 40 ? 2.5 : 2) : depth > 40 ? 2.3 : 2;
    const raw =
      raises === 0
        ? (p === n - 1 && limpers ? 3.5 + limpers - 1 : open + limpers) * i.bigBlind
        : raises === 1
          ? current * (ip ? 3 : 4)
          : raises === 2
            ? current * (ip ? 2.2 : 2.4)
            : depth * i.bigBlind;
    const target = Math.max(raw, current + lastRaise);
    return target >= 0.45 * depth * i.bigBlind ? depth * i.bigBlind : Math.round(target);
  };
  for (let k = 0; k < candidate.path.length; k++) {
    const { actor, move } = candidate.path[k],
      actual = i.actions[k];
    if (move === 'fold') folded[actor] = true;
    else if (move === 'call') {
      if (actual.to !== current) return miss('off-tree-call-size');
      bets[actor] = current;
      limpers++;
    } else {
      const target = targetFor(actor);
      if (actual.to !== target || (actual.move === 'allin' && target !== depth * i.bigBlind)) return miss('off-tree-raise-size');
      bets[actor] = target;
      lastRaise = target - current;
      current = target;
      lastRaiser = actor;
      raises++;
    }
  }
  if (
    i.currentBet !== current ||
    order.some((p, k) => p.bet !== bets[k] || p.total !== bets[k] || p.folded !== folded[k] || p.allIn !== (p.stack === 0))
  )
    return miss('inconsistent-public-state');
  const hole = [...i.hole].sort((a, b) => rankOf(b) - rankOf(a));
  const cls = hole[0][0] + hole[1][0] + (hole[0][0] === hole[1][0] ? '' : hole[0][1] === hole[1][1] ? 's' : 'o');
  const index = charts.classes.indexOf(cls),
    encoded = bank.spots[candidate.spot],
    digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  if (index < 0 || encoded.length !== 338) return miss('invalid-chart-row');
  const call = digits.indexOf(encoded[index * 2]) / 35,
    raise = digits.indexOf(encoded[index * 2 + 1]) / 35;
  if (call < 0 || raise < 0 || call + raise > 1.03) return miss('invalid-chart-row');
  const raiseTo = targetFor(candidate.hero);
  if (raise > 0 && (!i.legal.canRaise || raiseTo < i.legal.minTo || raiseTo > i.legal.maxTo)) return miss('unsupported-raise-bounds');
  return { matched: true, bank: bankKey, spot: candidate.spot, call, raise, ...(i.legal.canRaise ? { raiseTo } : {}) };
}
