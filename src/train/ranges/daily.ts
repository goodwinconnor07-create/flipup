// Today's three: the same three hands on every phone for a date, and how the server scores them. Shared by the app
// (native/src/state/range-logic.ts) and the Worker, which scores from the small answer key (dailyKey.json).

/** A small, stable hash (FNV-1a), so the same day or hand always picks the same thing on every phone. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A seeded random number generator (mulberry32), for shuffles that have to come out the same. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DAILY_SIZE = 3;

/** Today's three hand ids, the same on every phone for that date ("2026-11-04"), from every hand id in order. */
export function dailyIdsOf(day: string, ids: readonly string[]): string[] {
  const out = [...ids];
  const rng = seeded(hash(`daily:${day}`));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, Math.min(DAILY_SIZE, out.length));
}

/** Points for a daily answer: the best play 100, a fine one 60, a miss 0 (Range training's own points). */
export const DAILY_POINTS = { best: 100, ok: 60, mistake: 0 } as const;

/** Scores three answers against the key (`[id, best, ...alsoOk]` per hand). Null if they don't fit the day. */
export function scoreDaily(day: string, answers: unknown, key: readonly (readonly string[])[]): number | null {
  if (!Array.isArray(answers) || answers.length !== DAILY_SIZE) return null;
  const ids = dailyIdsOf(
    day,
    key.map((k) => k[0]),
  );
  let score = 0;
  for (let i = 0; i < ids.length; i++) {
    const row = key.find((k) => k[0] === ids[i]);
    const pick = answers[i];
    if (!row || typeof pick !== 'string') return null;
    score += pick === row[1] ? DAILY_POINTS.best : row.slice(2).includes(pick) ? DAILY_POINTS.ok : DAILY_POINTS.mistake;
  }
  return score;
}
