import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase } from '../src/bot_engine/sqlRepository';

/** Node-only development adapter; Cloudflare supplies its own synchronous SQL engine. */
export class SqliteDatabase implements SqlDatabase {
  private connection: DatabaseSync;
  constructor(path: string) {
    this.connection = new DatabaseSync(path);
    this.connection.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000');
  }
  all<T>(query: string, ...bindings: (string | number)[]): T[] {
    return this.connection.prepare(query).all(...bindings) as T[];
  }
  transaction<T>(body: () => T): T {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const result = body();
      this.connection.exec('COMMIT');
      return result;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }
  close() {
    this.connection.close();
  }
}
