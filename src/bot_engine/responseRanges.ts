import type { InformationSet } from './information';
import { responseProbabilities, type ResponseView } from './responseModel';
import { publicRangeLikelihood } from './rangeAnalysis';
import { normalizeRange, type OpponentRange } from './ranges';
import { publicLine } from './handPlan';
import type { ResponsePredictor } from './multiplayerPlanning';

/** Replay only public commitments. Capture the context BEFORE each observed action. */
export function publicResponseContexts(i: InformationSet) {
  const seats = [...i.players].sort((a, b) => a.seat - b.seat),
    button = seats.findIndex((p) => p.id === i.buttonId);
  const sb = seats[(button + (seats.length === 2 ? 0 : 1)) % seats.length].id,
    bb = seats[(button + (seats.length === 2 ? 1 : 2)) % seats.length].id;
  const starting = new Map(seats.map((p) => [p.id, p.stack + p.total]));
  const total = new Map(seats.map((p) => [p.id, Math.min(starting.get(p.id)!, p.id === sb ? i.smallBlind : p.id === bb ? i.bigBlind : 0)]));
  let bets = new Map(total),
    street = 'preflop',
    price = i.bigBlind;
  const live = new Set(seats.map((p) => p.id));
  const acted = new Set<string>();
  let minRaise = i.bigBlind;
  const past = [] as typeof i.actions;
  const records = new Map<string, { view: ResponseView; label: number }[]>();
  for (const a of i.actions) {
    if (street !== a.street) {
      const ranked = [...bets].sort((a, b) => b[1] - a[1]);
      const extra = ranked[0][1] - ranked[1][1];
      if (extra > 0) total.set(ranked[0][0], total.get(ranked[0][0])! - extra);
      street = a.street;
      price = 0;
      minRaise = i.bigBlind;
      acted.clear();
      bets = new Map(seats.map((p) => [p.id, 0]));
    }
    const current = bets.get(a.playerId) ?? 0,
      remaining = Math.max(0, starting.get(a.playerId)! - total.get(a.playerId)!);
    const call = Math.min(remaining, Math.max(0, price - current));
    const aggressive = ['bet', 'raise', 'allin'].includes(a.move) && a.to > price;
    if (a.street !== 'preflop' && !a.outOfTurn) {
      const board = i.board.slice(0, { preflop: 0, flop: 3, turn: 4, river: 5 }[a.street]);
      const prev = a.street === 'river' ? 'turn' : a.street === 'turn' ? 'flop' : 'preflop';
      const previous = publicLine(past, a.playerId, prev, i.bigBlind),
        now = publicLine(past, a.playerId, a.street, i.bigBlind);
      const active = seats.filter((p) => live.has(p.id) && starting.get(p.id)! > total.get(p.id)!);
      const order = seats.map((_, n) => seats[(button + n + 1) % seats.length]).filter((p) => active.some((q) => q.id === p.id));
      const allIn = seats.filter((p) => live.has(p.id) && starting.get(p.id) === total.get(p.id));
      const pot = [...total.values()].reduce((s, v) => s + v, 0),
        cap = total.get(a.playerId)! + call;
      const view: ResponseView = {
        hole: [],
        board,
        previousBoard: board.slice(0, a.street === 'river' ? 4 : a.street === 'turn' ? 3 : 0),
        previousBet: previous.heroBet,
        facingStrength: now.raises >= 2 || (previous.heroBet && now.lastAggressor !== null && now.lastAggressor !== a.playerId),
        inPosition: order.at(-1)?.id === a.playerId,
        initiative: now.lastAggressor === a.playerId,
        drySidePot: allIn.length > 0 && active.every((p) => total.get(p.id)! <= Math.max(...allIn.map((p) => total.get(p.id)!))),
        live: live.size,
        toCall: call,
        eligiblePot: [...total.values()].reduce((s, v) => s + Math.min(v, cap), 0),
        stackToPot: remaining / Math.max(i.bigBlind, pot),
        canRaise: !acted.has(a.playerId) && remaining > call && active.some((p) => p.id !== a.playerId),
      };
      const rows = records.get(a.playerId) ?? [];
      rows.push({ view, label: aggressive ? 2 : a.move === 'fold' ? 0 : 1 });
      records.set(a.playerId, rows);
    }
    if (a.move === 'fold') live.delete(a.playerId);
    else if (a.move !== 'check') {
      if (aggressive && a.to - price >= minRaise) {
        minRaise = a.to - price;
        acted.clear();
      }
      const added = Math.min(remaining, Math.max(0, a.to - current));
      total.set(a.playerId, total.get(a.playerId)! + added);
      bets.set(a.playerId, current + added);
      price = Math.max(price, a.to);
    }
    if (!a.outOfTurn) acted.add(a.playerId);
    past.push(a);
  }
  return records;
}
export function calibratedRanges(
  i: InformationSet,
  ranges: OpponentRange[],
  predictor: ResponsePredictor = responseProbabilities,
): OpponentRange[] {
  const records = publicResponseContexts(i),
    pre = { ...i, actions: i.actions.filter((a) => a.street === 'preflop') };
  return ranges.map((r) => ({
    ...r,
    holdings: normalizeRange(
      r.holdings.map((h) => {
        let weight = publicRangeLikelihood(pre, r.playerId, h.cards);
        for (const row of records.get(r.playerId) ?? [])
          weight *= Math.pow(0.025 + 0.975 * predictor({ ...row.view, hole: h.cards })[row.label], 0.6);
        return { cards: h.cards, weight };
      }),
    ),
  }));
}
