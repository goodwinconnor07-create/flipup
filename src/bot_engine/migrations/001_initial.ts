/** Additive, transactional migration shared by SQLite and Durable Object SQL adapters. */
export const INITIAL_SCHEMA = [
  'CREATE TABLE bot_profiles (bot_id TEXT PRIMARY KEY, profile_json TEXT NOT NULL)',
  'CREATE TABLE bot_sessions (bot_id TEXT NOT NULL REFERENCES bot_profiles(bot_id), table_id TEXT NOT NULL, memory_json TEXT NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY (bot_id, table_id))',
  'CREATE TABLE bot_observations (bot_id TEXT NOT NULL, table_id TEXT NOT NULL, sequence INTEGER NOT NULL, event_json TEXT NOT NULL, PRIMARY KEY (bot_id, table_id, sequence), FOREIGN KEY (bot_id, table_id) REFERENCES bot_sessions(bot_id, table_id))',
  'CREATE TABLE bot_decisions (decision_key TEXT PRIMARY KEY, bot_id TEXT NOT NULL REFERENCES bot_profiles(bot_id), table_id TEXT NOT NULL, request_json TEXT NOT NULL, trace_json TEXT NOT NULL)',
  'CREATE INDEX bot_decisions_by_session ON bot_decisions (bot_id, table_id)',
];
