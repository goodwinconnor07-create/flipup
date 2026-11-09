import { INITIAL_SCHEMA } from './migrations/001_initial';
import { validateProfile, type BotProfile } from './identity';
import { emptyMemory, observe, validateMemory, type BotMemory, type ObservationEvent } from './memory';
import { BotService, type DecisionTrace } from './service';
import { copyInformation, type InformationSet } from './information';

/** Matches Cloudflare Durable Object synchronous SQL and transaction semantics. */
export interface SqlDatabase {
  all<T>(query: string, ...bindings: (string | number)[]): T[];
  transaction<T>(body: () => T): T;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export class BotStateStore {
  constructor(
    private db: SqlDatabase,
    private service = new BotService(),
  ) {
    db.transaction(() => {
      db.all('CREATE TABLE IF NOT EXISTS bot_schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)');
      const version = db.all<{ version: number }>('SELECT version FROM bot_schema_version WHERE id = 1')[0]?.version ?? 0;
      if (version > 1) throw new Error('Database schema is newer than this service');
      if (version === 0) {
        INITIAL_SCHEMA.forEach((sql) => db.all(sql));
        db.all('INSERT INTO bot_schema_version (id, version) VALUES (1, 1)');
      }
    });
  }
  saveProfile(profile: BotProfile): void {
    validateProfile(profile);
    const json = canonical(profile);
    this.db.transaction(() => {
      const old = this.db.all<{ profile_json: string }>('SELECT profile_json FROM bot_profiles WHERE bot_id = ?', profile.botId)[0];
      if (old && old.profile_json !== json) throw new Error('Identity already exists with different parameters');
      if (!old) this.db.all('INSERT INTO bot_profiles (bot_id, profile_json) VALUES (?, ?)', profile.botId, json);
    });
  }
  profile(botId: string): BotProfile {
    const row = this.db.all<{ profile_json: string }>('SELECT profile_json FROM bot_profiles WHERE bot_id = ?', botId)[0];
    if (!row) throw new Error('Unknown bot identity');
    const profile = JSON.parse(row.profile_json) as BotProfile;
    validateProfile(profile);
    return profile;
  }
  memory(botId: string, tableId: string): BotMemory {
    const row = this.db.all<{ memory_json: string }>(
      'SELECT memory_json FROM bot_sessions WHERE bot_id = ? AND table_id = ?',
      botId,
      tableId,
    )[0];
    const memory = row ? (JSON.parse(row.memory_json) as BotMemory) : emptyMemory(botId, tableId);
    validateMemory(memory);
    if (memory.botId !== botId || memory.tableId !== tableId) throw new Error('Persisted session mismatch');
    return memory;
  }
  /** Ordered public event ingestion, atomic with posterior update and deduplication. */
  ingest(event: ObservationEvent): { applied: boolean; memory: BotMemory } {
    // Whitelist fields; private cards or other caller extras cannot enter the journal.
    const safe = {
      observerId: event.observerId,
      targetId: event.targetId,
      tableId: event.tableId,
      sequence: event.sequence,
      foldedToBet: event.foldedToBet,
    };
    const json = canonical(safe);
    return this.db.transaction(() => {
      this.profile(safe.observerId);
      const memory = this.memory(safe.observerId, safe.tableId);
      const old = this.db.all<{ event_json: string }>(
        'SELECT event_json FROM bot_observations WHERE bot_id = ? AND table_id = ? AND sequence = ?',
        safe.observerId,
        safe.tableId,
        safe.sequence,
      )[0];
      if (old) {
        if (old.event_json !== json) throw new Error('Conflicting duplicate observation');
        return { applied: false, memory };
      }
      if (safe.sequence <= memory.latestSequence) throw new Error('Out-of-order observation; replay events in order');
      observe(memory, safe);
      this.db.all(
        'INSERT INTO bot_sessions (bot_id, table_id, memory_json, revision) VALUES (?, ?, ?, 1) ON CONFLICT (bot_id, table_id) DO UPDATE SET memory_json = excluded.memory_json, revision = revision + 1',
        safe.observerId,
        safe.tableId,
        canonical(memory),
      );
      this.db.all(
        'INSERT INTO bot_observations (bot_id, table_id, sequence, event_json) VALUES (?, ?, ?, ?)',
        safe.observerId,
        safe.tableId,
        safe.sequence,
        json,
      );
      return { applied: true, memory };
    });
  }
  /** Trusted backend call only. Actor authorization belongs to the table service. */
  decide(information: InformationSet): { cached: boolean; trace: DecisionTrace } {
    const info = copyInformation(information);
    const key = canonical([info.tableId, info.hand, info.sequence, info.heroId]);
    const request = canonical(info);
    return this.db.transaction(() => {
      const old = this.db.all<{ request_json: string; trace_json: string }>(
        'SELECT request_json, trace_json FROM bot_decisions WHERE decision_key = ?',
        key,
      )[0];
      if (old) {
        if (old.request_json !== request) throw new Error('Conflicting duplicate decision');
        return { cached: true, trace: JSON.parse(old.trace_json) as DecisionTrace };
      }
      const profile = this.profile(info.heroId);
      const trace = this.service.decide(info, profile, this.memory(info.heroId, info.tableId), this.service.seedFor(info, profile));
      this.db.all(
        'INSERT INTO bot_decisions (decision_key, bot_id, table_id, request_json, trace_json) VALUES (?, ?, ?, ?, ?)',
        key,
        info.heroId,
        info.tableId,
        request,
        canonical(trace),
      );
      return { cached: false, trace };
    });
  }
}
