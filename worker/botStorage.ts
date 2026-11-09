import { BotStateStore } from '../src/bot_engine/sqlRepository';

/** Trusted TableRoom integration adapter. It adds no public route and broadcasts no bot state. */
export function botStateStore(storage: DurableObjectStorage): BotStateStore {
  return new BotStateStore({
    all: <T>(query: string, ...bindings: (string | number)[]) => storage.sql.exec(query, ...bindings).toArray() as T[],
    transaction: (body) => storage.transactionSync(body),
  });
}
