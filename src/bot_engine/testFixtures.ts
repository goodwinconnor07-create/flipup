import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { makeMove, startHand } from '../game/holdem';
import { seededRng } from '../game/cards';
import { informationFor } from './information';
import type { Move } from '../game/types';

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
