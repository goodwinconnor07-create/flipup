// Bot-against-bot tables for tuning and testing the styles: plays thousands of hands with no one
// at the table but bots, and reports how each style really played.

import { decide } from './botPlay';
import { seededRng } from './cards';
import type { StyleId } from './botStyles';
import { createTable, DEFAULT_SETTINGS, applyAction } from './reducer';
import type { Game } from './types';

export interface StyleReport {
  style: StyleId;
  hands: number;
  /** Put money in before the flop by choice. */
  vpip: number;
  /** Raised before the flop. */
  pfr: number;
  /** After the flop: (bets + raises) / calls. */
  aggression: number;
  /** Folded when facing a bet after the flop. */
  foldToBet: number;
  /** Big blinds won per 100 hands. */
  bbPer100: number;
  /** Times it said something. */
  comments: number;
}

export function simulate(styles: StyleId[], hands: number, seed = 1, stackBb = 100): StyleReport[] {
  const bb = 10;
  let clock = 1_000_000;
  const rng = seededRng(seed);
  let game: Game = createTable({
    hostDeviceId: 'sim',
    name: 'Host',
    emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, startingStack: bb * stackBb, smallBlind: bb / 2, bigBlind: bb, turnSeconds: 0, rebuys: true },
    bots: styles.length - 1,
    code: null,
    now: clock,
  });
  // Every seat plays a style. The host stays a person (a table needs one to deal), but the sim
  // makes the host's moves with the same bot brain.
  game.players.forEach((p, i) => {
    p.style = styles[i];
  });
  const hostId = game.players[0].id;
  const step = (deviceId: string, action: Parameters<typeof applyAction>[1]) => {
    const r = applyAction(game, action, { deviceId, now: clock, rng });
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    game = r.game;
  };
  step('sim', { type: 'start' });

  const net = new Map(game.players.map((p) => [p.id, 0]));
  const comments = new Map(game.players.map((p) => [p.id, 0]));
  let seenReactions: Record<string, number> = {};
  let played = 0;
  let lastHand = 0;
  let guard = 0;
  while (played < hands && guard++ < hands * 400) {
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    // Top up anyone who's run out, so the table never shrinks (counted as a loss for them).
    for (const p of game.players) {
      if (p.stack === 0 && (!game.hand || game.hand.result)) {
        p.stack = bb * stackBb;
        p.bought += bb * stackBb;
      }
    }
    const hand = game.hand;
    if (hand && !hand.result && !hand.runout && hand.toAct === hostId) {
      const seat = hand.seats.find((x) => x.playerId === hostId)!;
      const m = decide(game, hand, seat, rng).move;
      const act = (move: typeof m.move, to?: number) =>
        applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move, to }, { deviceId: 'sim', now: clock, rng });
      const r = act(m.move, m.to);
      const fallback = r.ok ? r : act(seat.bet >= hand.currentBet ? 'check' : 'fold');
      if (fallback.ok) game = fallback.game;
      clock -= 1;
    } else step('server', { type: 'tick' });
    for (const [id, r] of Object.entries(game.reactions ?? {})) {
      if ((seenReactions[id] ?? 0) !== r.n) comments.set(id, (comments.get(id) ?? 0) + 1);
    }
    seenReactions = Object.fromEntries(Object.entries(game.reactions ?? {}).map(([id, r]) => [id, r.n]));
    if (game.hand && game.hand.number !== lastHand) {
      lastHand = game.hand.number;
      played++;
    }
  }
  for (const p of game.players) net.set(p.id, p.stack - p.bought);

  return game.players.map((p) => {
    const r = game.reads?.[p.id];
    const h = r?.hands ?? 0;
    return {
      style: p.style as StyleId,
      hands: h,
      vpip: h ? (r!.vpip / h) : 0,
      pfr: h ? (r!.pfr / h) : 0,
      aggression: r && r.calls ? r.aggr / r.calls : r?.aggr ?? 0,
      foldToBet: r && r.betsFaced ? r.foldsToBet / r.betsFaced : 0,
      bbPer100: h ? ((net.get(p.id) ?? 0) / bb / h) * 100 : 0,
      comments: comments.get(p.id) ?? 0,
    };
  });
}
