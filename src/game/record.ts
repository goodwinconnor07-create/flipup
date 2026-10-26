// A finished hand as plain data (players, stacks, every move, board, results) for the GTO review
// and the training screens. Built from whatever hand the caller can see, so a phone's copy only
// holds its own hole cards and any that were shown.

import type { Game, Hand, HandRecord } from './types';

/** The hand as a record, or null if it isn't finished or predates move recording. */
export function handRecord(game: Game, hand: Hand, now: number): HandRecord | null {
  if (!hand.result || !hand.actions || !hand.startStacks) return null;
  const ids = hand.seats.map((s) => s.playerId);
  const players = ids
    .map((id) => game.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, seat: p.seat, stack: hand.startStacks![p.id] ?? p.stack, ...(p.twinCode ? { twinCode: p.twinCode } : {}) }));
  return {
    tableId: game.id,
    number: hand.number,
    at: now,
    smallBlind: game.settings.smallBlind,
    bigBlind: game.settings.bigBlind,
    buttonId: hand.buttonId,
    players,
    actions: hand.actions.map((a) => ({ ...a })),
    board: [...hand.board],
    holes: Object.fromEntries(hand.seats.filter((s) => s.cards.length === 2).map((s) => [s.playerId, [...s.cards]])),
    won: { ...hand.result.won },
    showdown: hand.result.showdown,
  };
}

/** Chips a player won or lost in a recorded hand. */
export function recordNet(r: HandRecord, playerId: string): number {
  const start = r.players.find((p) => p.id === playerId)?.stack ?? 0;
  return Math.round((r.won[playerId] ?? 0) - Math.min(putIn(r, playerId), start));
}

/** What everyone put in on one street (`to` is a street total, so the largest `to`), blinds included. */
function streetPuts(r: HandRecord, street: string): Map<string, number> {
  const put = new Map<string, number>();
  if (street === 'preflop') for (const p of r.players) if (blindFor(r, p.id)) put.set(p.id, blindFor(r, p.id));
  for (const a of r.actions) {
    if (a.street !== street || a.move === 'fold' || a.move === 'check') continue;
    put.set(a.playerId, Math.max(put.get(a.playerId) ?? 0, a.to));
  }
  return put;
}

/** Chips a player really put in: on each street, the part of the biggest bet nobody matched came back. */
function putIn(r: HandRecord, playerId: string): number {
  let total = 0;
  for (const street of ['preflop', 'flop', 'turn', 'river']) {
    const puts = streetPuts(r, street);
    const mine = puts.get(playerId) ?? 0;
    const others = Math.max(0, ...[...puts].filter(([id]) => id !== playerId).map(([, v]) => v));
    total += Math.min(mine, others);
  }
  return total;
}

/** The blind a player posted (0 for everyone else). */
export function blindFor(r: HandRecord, playerId: string): number {
  const order = [...r.players].sort((a, b) => a.seat - b.seat);
  const bi = order.findIndex((p) => p.id === r.buttonId);
  const n = order.length;
  const sb = n === 2 ? bi : (bi + 1) % n;
  const bb = (sb + 1) % n;
  if (order[sb]?.id === playerId) return Math.min(r.smallBlind, order[sb].stack);
  if (order[bb]?.id === playerId) return Math.min(r.bigBlind, order[bb].stack);
  return 0;
}
