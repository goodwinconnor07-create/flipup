// Turns the demo data (scripts/demoData.ts) into SQL for expo-sqlite's localStorage database, which the app reads
// `flipup.*` keys from on iPhone (Documents/SQLite/ExpoSQLiteStorage, table `storage`). Screenshot runs only.
//   node native/scripts/seedSql.mjs demo.json | sqlite3 <container>/Documents/SQLite/ExpoSQLiteStorage
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const lines = ['CREATE TABLE IF NOT EXISTS storage (key TEXT PRIMARY KEY NOT NULL, value TEXT);', 'BEGIN;'];
for (const [key, value] of Object.entries(data)) lines.push(`INSERT OR REPLACE INTO storage (key, value) VALUES (${q(key)}, ${q(JSON.stringify(value))});`);
lines.push('COMMIT;');
process.stdout.write(lines.join('\n') + '\n');
