// Filler rows, to see how a full board looks while it's empty. Development builds only (or a screenshot build with
// EXPO_PUBLIC_FILLER=1): a release build gets none (tests/board-filler.test.ts). Fixed seed, so they don't move.
import { hash, seeded } from '@train/ranges/daily';

import type { BoardRow } from './bankroll';

const FIRST = ['parker', 'cal', 'sneaky_vincent', 'enzxity', 'louie_lct', 'jake', 'mia', 'tyler', 'ava', 'noah', 'liam', 'zoe', 'max', 'ella', 'owen', 'ruby', 'leo', 'jade', 'finn', 'nate', 'kai', 'sam_', 'dani', 'theo', 'bella', 'cole', 'ivy', 'luca', 'remy', 'gus'];
const FLAGS = ['US', 'US', 'US', 'US', 'US', 'US', 'US', 'CA', 'CA', 'GB', 'GB', 'AU', 'HK', 'DE', 'NZ', 'IE', 'MX', 'SE'];
const EMOJI = ['😎', '🦊', '🐼', '🦁', '🐸', '🤠', '👻', '🐯', '🦄', '🐙', '🔥', '🎩'];

let cache: BoardRow[] | null = null;

/** About 200 made-up rows on a believable curve (a handful over 20,000, most 500 to 5,000, a tail busted). */
export function fillerRows(dev: boolean = __DEV__ || process.env.EXPO_PUBLIC_FILLER === '1'): BoardRow[] {
  if (!dev) return [];
  if (cache) return cache;
  const rng = seeded(hash('filler'));
  const rows: BoardRow[] = [];
  for (let i = 0; i < 200; i++) {
    const base = FIRST[Math.floor(rng() * FIRST.length)];
    const username = rng() < 0.6 ? `${base}${Math.floor(rng() * 9000 + 10)}` : `${base}${rng() < 0.5 ? '' : Math.floor(rng() * 99)}`;
    const busted = i >= 180;
    const score = busted ? 0 : Math.round((i < 6 ? 20000 + rng() * 15000 : 500 * Math.exp(rng() * 2.3)) / 10) * 10;
    rows.push({ code: `F${i}`, username: username.replace(/_$/, ''), emoji: EMOJI[i % EMOJI.length], ...(rng() < 0.85 ? { country: FLAGS[Math.floor(rng() * FLAGS.length)] } : {}), ...(i < 12 && rng() < 0.5 ? { badge: i < 4 ? 'TOP10 OCT' : 'TOP100 OCT' } : {}), score, peak: busted ? Math.round(1000 + rng() * 3000) : score, rebuy: rng() < 0.08, status: busted ? 'busted' : 'alive', pos: null, filler: true });
  }
  cache = rows;
  return rows;
}

/** Real rows and filler rows together, ranked by bankroll (ties share a place; busted and cut under the live ones). */
export function withFiller(real: BoardRow[], dev?: boolean): BoardRow[] {
  const seen = new Set(real.map((r) => r.username));
  const all = [...real, ...fillerRows(dev).filter((r) => !seen.has(r.username))];
  const alive = all.filter((r) => r.status === 'alive').sort((a, b) => b.score - a.score);
  let pos = 0;
  const ranked = alive.map((r, i) => {
    if (i === 0 || r.score !== alive[i - 1].score) pos = i + 1;
    return { ...r, pos };
  });
  return [...ranked, ...all.filter((r) => r.status !== 'alive').sort((a, b) => b.peak - a.peak).map((r) => ({ ...r, pos: null }))];
}
