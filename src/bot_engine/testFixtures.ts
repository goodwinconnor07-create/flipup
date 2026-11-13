import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { dealNextStreet, makeMove, startHand } from '../game/holdem';
import { seededRng } from '../game/cards';
import { informationFor } from './information';
import type { Move } from '../game/types';
import type { Card } from '../game/cards';

export function decisionFixture(stacksBb: number[], line: (Move | number)[] = []) {
  const ctx = { now: 0, deviceId: 'fixture', rng: seededRng(77) };
  const game = createTable({
    hostDeviceId: 'fixture',
    name: 'Fixture',
    emoji: '🃏',
    settings: DEFAULT_SETTINGS,
    bots: stacksBb.length - 1,
    code: null,
    now: 0,
    rng: ctx.rng,
  });
  game.players.forEach((p, k) => {
    p.bot = false;
    p.stack = stacksBb[k] * game.settings.bigBlind;
  });
  startHand(game, ctx);
  for (const move of line) {
    const error = makeMove(game, typeof move === 'number' ? 'raise' : move, typeof move === 'number' ? move : undefined, ctx);
    if (error) throw new Error(error);
  }
  return { game, ctx, info: informationFor(game, game.hand!.toAct!) };
}

export const RECORDED_FLOP: Card[] = ['Js', 'Ac', 'Td'];

/**
 * The hand from the owner's recording (13 Nov 2026), five-handed at 10/20: a limp, the small blind raises to 70 with
 * pocket nines, the big blind calls with fives, the limper calls. A-J-10 flop, the small blind checks, the big blind bets
 * 20 into 210, the limper calls, and it's back to the nines (`upTo: 'flop'` stops as the flop lands, the small blind to
 * act). Returns null for seeds where the person landed in a blind.
 */
export function recordedHand(seed: number, hole: Card[] = ['9h', '9d'], flopBet = 20, upTo: 'flop' | 'facing' = 'facing') {
  const ctx = { now: 0, deviceId: 'host', rng: seededRng(seed) };
  const game = createTable({
    hostDeviceId: 'host',
    name: 'You',
    emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, smallBlind: 10, bigBlind: 20 },
    bots: 4,
    code: null,
    now: 0,
    rng: ctx.rng,
  });
  game.players.forEach((p) => (p.stack = 10000));
  startHand(game, ctx);
  const h = game.hand!;
  const me = game.players[0].id,
    sb = h.sbId!,
    bb = h.bbId!;
  if (sb === me || bb === me || h.buttonId === me) return null;
  const seat = (id: string) => h.seats.find((s) => s.playerId === id)!;
  seat(me).cards = ['6d', '3d'];
  seat(sb).cards = hole;
  seat(bb).cards = ['5h', '5c'];
  const used = new Set([...hole, '6d', '3d', '5h', '5c', ...RECORDED_FLOP, '8c']);
  for (const s of h.seats) if (s.cards.some((c) => used.has(c)) && ![me, sb, bb].includes(s.playerId)) s.cards = ['2h', '2c'];
  const act = (m: Move, to?: number) => {
    const e = makeMove(game, m, to, ctx);
    if (e) throw new Error(e);
  };
  while (h.street === 'preflop' && h.toAct) {
    const id = h.toAct;
    if (id === me) act('call');
    else if (id === sb && h.currentBet < 70) act('raise', 70);
    else if (id === sb || id === bb) act('call');
    else act('fold');
  }
  const rest = h.deck.filter((c) => !used.has(c) && !['2h', '2c'].includes(c));
  h.deck = [...rest.slice(0, 1), ...RECORDED_FLOP, ...rest.slice(1, 2), '8c', ...rest.slice(2)];
  dealNextStreet(game, ctx);
  if (h.board.join() !== RECORDED_FLOP.join()) throw new Error(`rigged flop came out ${h.board.join()}`);
  if (upTo === 'flop') return { game, sb, bb };
  act('check');
  act('bet', flopBet);
  act('call');
  if (h.toAct !== sb) throw new Error('expected the small blind to act');
  return { game, sb, bb };
}
