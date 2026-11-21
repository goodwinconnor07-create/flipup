import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SqliteDatabase } from '../../scripts/botSqlite';
import { BotStateStore, type SqlDatabase } from './sqlRepository';
import { BOT_001, BotFactory } from './identity';
import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { startHand } from '../game/holdem';
import { seededRng } from '../game/cards';
import { informationFor } from './information';

const directories: string[] = [];
const connections: SqliteDatabase[] = [];
function path() {
  const directory = mkdtempSync(join(tmpdir(), 'flipup-bot-sql-'));
  directories.push(directory);
  return join(directory, 'state.sqlite');
}
function open(file: string) {
  const db = new SqliteDatabase(file);
  connections.push(db);
  return db;
}
afterEach(() => {
  connections.splice(0).forEach((c) => {
    try {
      c.close();
    } catch {
      /* explicitly closed for restart tests */
    }
  });
  directories.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
});
const event = { observerId: 'BOT_001', targetId: 'OPPONENT', tableId: 'table', sequence: 1, foldedToBet: true };
function fixture() {
  const game = createTable({
    hostDeviceId: 'test',
    name: 'Test',
    emoji: '🃏',
    settings: DEFAULT_SETTINGS,
    bots: 1,
    code: null,
    now: 0,
    rng: seededRng(1),
  });
  game.players.forEach((p, n) => {
    p.id = n ? 'OPPONENT' : 'BOT_001';
    p.bot = false;
  });
  game.id = 'table';
  game.buttonSeat = 1;
  startHand(game, { now: 0, deviceId: 'test', rng: seededRng(7) });
  return informationFor(game, 'BOT_001');
}

describe('Transactional bot storage on actual SQLite', () => {
  it('migrates once and preserves identities and memory after closing and reopening', () => {
    const file = path(),
      db = open(file),
      store = new BotStateStore(db);
    store.saveProfile(BOT_001);
    store.ingest(event);
    db.close();
    const restarted = new BotStateStore(open(file));
    expect(restarted.profile('BOT_001')).toEqual(BOT_001);
    expect(restarted.memory('BOT_001', 'table').opponents.OPPONENT.samples).toBe(1);
    expect(restarted.ingest(event).applied).toBe(false);
    expect(restarted.memory('BOT_001', 'table').opponents.OPPONENT.samples).toBe(1);
  });
  it('rejects conflicting identities, duplicate payloads and out-of-order delivery', () => {
    const store = new BotStateStore(open(path()));
    store.saveProfile(BOT_001);
    store.ingest(event);
    expect(() => store.saveProfile(new BotFactory().generate('BOT_001', 999))).toThrow('different parameters');
    expect(() => store.ingest({ ...event, foldedToBet: false })).toThrow('Conflicting duplicate');
    expect(() => store.ingest({ ...event, sequence: 0 })).toThrow('Out-of-order');
    expect(store.memory('BOT_001', 'table').opponents.OPPONENT.samples).toBe(1);
  });
  it('rolls back the posterior when event journaling fails', () => {
    const db = open(path());
    let fail = false;
    const wrapped: SqlDatabase = {
      transaction: (body) => db.transaction(body),
      all: <T>(query: string, ...bindings: (string | number)[]) => {
        if (fail && query.startsWith('INSERT INTO bot_observations')) throw new Error('Injected disk failure');
        return db.all<T>(query, ...bindings);
      },
    };
    const store = new BotStateStore(wrapped);
    store.saveProfile(BOT_001);
    fail = true;
    expect(() => store.ingest(event)).toThrow('Injected disk failure');
    expect(store.memory('BOT_001', 'table').latestSequence).toBe(-1);
    fail = false;
    expect(store.ingest(event).memory.opponents.OPPONENT.samples).toBe(1);
  });
  it('keeps observers and tables independent and journals only allowed public fields', () => {
    const db = open(path()),
      store = new BotStateStore(db);
    store.saveProfile(BOT_001);
    store.saveProfile(new BotFactory().generate('BOT_002', 1002));
    store.ingest({ ...event, hiddenCards: ['As', 'Ah'], deck: ['2s'] } as typeof event);
    expect(store.memory('BOT_002', 'table').opponents).toEqual({});
    expect(store.memory('BOT_001', 'other-table').opponents).toEqual({});
    const journal = db.all<{ event_json: string }>('SELECT event_json FROM bot_observations')[0].event_json;
    expect(journal).not.toMatch(/hiddenCards|deck|As|Ah/);
  });
  it('persists contextual posteriors and strips private extras inside context metadata', () => {
    const file = path(),
      db = open(file),
      store = new BotStateStore(db);
    store.saveProfile(BOT_001);
    const contextual = { ...event, context: { street: 'river', size: 'medium', headsUp: true, hiddenCards: ['As', 'Ah'] } as const };
    store.ingest(contextual);
    db.close();
    const restarted = new BotStateStore(open(file));
    expect(restarted.memory('BOT_001', 'table').contexts?.OPPONENT?.['river|medium|heads-up'].samples).toBe(1);
    expect(JSON.stringify(restarted.memory('BOT_001', 'table'))).not.toMatch(/hiddenCards|As|Ah/);
    expect(restarted.ingest(contextual).applied).toBe(false);
  });
  it('stores idempotent decisions and their original memory snapshot across restarts', () => {
    const file = path(),
      db = open(file),
      store = new BotStateStore(db);
    store.saveProfile(BOT_001);
    const info = fixture();
    const first = store.decide(info);
    expect(first.cached).toBe(false);
    store.ingest(event);
    db.close();
    const restarted = new BotStateStore(open(file));
    const retry = restarted.decide(info);
    expect(retry.cached).toBe(true);
    expect(retry.trace).toEqual(first.trace);
    expect(retry.trace.memory.latestSequence).toBe(-1);
    expect(() => restarted.decide({ ...info, hole: ['As', 'Ah'] })).toThrow('Conflicting duplicate decision');
  });
  it('omits extra private input fields from the provider input and persisted traces', () => {
    const db = open(path()),
      store = new BotStateStore(db);
    store.saveProfile(BOT_001);
    const info = fixture();
    const trace = store.decide({
      ...info,
      deck: ['2s'],
      otherBeliefs: { secret: true },
      players: info.players.map((p) => ({ ...p, cards: ['Ks', 'Kh'] })),
    } as typeof info).trace;
    expect(JSON.stringify(trace.information)).not.toMatch(/deck|otherBeliefs|cards/);
    const saved = db.all<{ trace_json: string }>('SELECT trace_json FROM bot_decisions')[0].trace_json;
    expect(saved).not.toMatch(/otherBeliefs|"deck"/);
  });
  it('refuses to run on an unsupported newer database schema', () => {
    const db = open(path());
    new BotStateStore(db);
    db.all('UPDATE bot_schema_version SET version = 99');
    expect(() => new BotStateStore(db)).toThrow('newer');
  });
  it('reuses the same identity, memory update and decision in a fresh Node process', () => {
    const file = path();
    const run = () => {
      const result = spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/botPersistence.ts'), file], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 20000,
      });
      expect(result.status, result.stderr).toBe(0);
      return JSON.parse(result.stdout);
    };
    const first = run(),
      second = run();
    expect(first.observationApplied).toBe(true);
    expect(first.cachedDecision).toBe(false);
    expect(second.observationApplied).toBe(false);
    expect(second.cachedDecision).toBe(true);
    expect(second.samples).toBe(1);
    expect(second.action).toEqual(first.action);
    expect(second.profileSeed).toBe(1001);
  }, 30000);
});
