import { resolve } from 'node:path';
import { SqliteDatabase } from './botSqlite';
import { BotStateStore } from '../src/bot_engine/sqlRepository';
import { BOT_001 } from '../src/bot_engine/identity';
import { createTable, DEFAULT_SETTINGS } from '../src/game/reducer';
import { startHand } from '../src/game/holdem';
import { seededRng } from '../src/game/cards';
import { informationFor } from '../src/bot_engine/information';

const db = new SqliteDatabase(resolve(process.argv[2] ?? '/tmp/flipup-bot-state.sqlite'));
try {
  const store = new BotStateStore(db);
  store.saveProfile(BOT_001);
  const game = createTable({
    hostDeviceId: 'demo',
    name: 'Research',
    emoji: '🃏',
    settings: DEFAULT_SETTINGS,
    bots: 1,
    code: null,
    now: 0,
    rng: seededRng(5),
  });
  game.id = 'persistent-demo';
  game.players.forEach((p, n) => {
    p.id = n ? 'OPPONENT' : 'BOT_001';
    p.bot = false;
  });
  game.buttonSeat = 1; // Hero is button and first to act heads up.
  startHand(game, { now: 0, deviceId: 'demo', rng: seededRng(7) });
  const info = informationFor(game, 'BOT_001');
  const observation = store.ingest({ observerId: 'BOT_001', targetId: 'OPPONENT', tableId: game.id, sequence: 1, foldedToBet: true });
  const decision = store.decide(info);
  console.log(
    JSON.stringify(
      {
        observationApplied: observation.applied,
        cachedDecision: decision.cached,
        samples: observation.memory.opponents.OPPONENT.samples,
        action: decision.trace.action,
        profileSeed: store.profile('BOT_001').seed,
        modelVersion: decision.trace.prediction.modelVersion,
      },
      null,
      2,
    ),
  );
} finally {
  db.close();
}
