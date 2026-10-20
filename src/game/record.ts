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
    .map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, seat: p.seat, stack: hand.startStacks![p.id] ?? p.stack }));
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
  // `to` is a street total, so a street's contribution is the largest `to` on it.
  const streets: Record<string, Record<string, number>> = { preflop: {} };
  for (const p of r.players) streets.preflop[p.id] = blindFor(r, p.id);
  for (const a of r.actions) {
    if (a.move === 'fold' || a.move === 'check') continue;
    const bets = (streets[a.street] ??= {});
    bets[a.playerId] = Math.max(bets[a.playerId] ?? 0, a.to);
  }
  // A player who folded after betting keeps that bet in the pot, so nothing of it comes back.
  const folded = r.actions.some((a) => a.playerId === playerId && a.move === 'fold');
  let put = 0;
  for (const bets of Object.values(streets)) {
    const mine = bets[playerId] ?? 0;
    // The biggest bet on a street that nobody matched goes back to its owner.
    const others = Object.entries(bets).filter(([id]) => id !== playerId).map(([, v]) => v);
    const second = others.length ? Math.max(...others) : 0;
    put += mine > second && !folded ? second : mine;
  }
  const start = r.players.find((p) => p.id === playerId)?.stack ?? 0;
  return Math.round((r.won[playerId] ?? 0) - Math.min(put, start));
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
