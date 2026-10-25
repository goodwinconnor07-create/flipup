import { beforeEach, expect, it } from 'vitest';
import { loadHistory } from './training';
const storage = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) };
beforeEach(() => storage.clear());
it('expires game history and its reports after 24 hours', () => {
  const day = 86400000, now = 3 * day;
  storage.set('flipup.history', JSON.stringify([{ key: 'old', heroId: 'me', record: { at: now - day } }, { key: 'new', heroId: 'me', record: { at: now - 1000 } }]));
  storage.set('flipup.reviews', JSON.stringify({ old: { key: 'old' }, new: { key: 'new' } }));
  expect(loadHistory(now).map(h => h.key)).toEqual(['new']);
  expect(JSON.parse(storage.get('flipup.reviews')!)).toEqual({ new: { key: 'new' } });
});
