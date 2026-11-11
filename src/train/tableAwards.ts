// The table's awards for the finish page: the moments friends talk about afterwards. Worked out for every player from
// the table's hand log, using only what everyone could see (the actions, the pots, the hands shown at showdowns), so a
// bluff nobody saw is never "awarded". Pure: give it the records and who sat there.

import type { HandRecord } from '../game';
import { tableStats, type TableStats } from './tableStats';

export type AwardId = 'wins' | 'pot' | 'hand' | 'raiser' | 'caller';

export interface Award {
  id: AwardId;
  /** "Most hands won". */
  title: string;
  /** The player(s) who earned it: one, or two when they tie. */
  ids: string[];
  /** "5 hands", "+1,200", "Full house". */
  detail: string;
}

interface Contest {
  id: AwardId;
  title: string;
  /** A player's number for it (0 or less is never awarded), and the least that's worth an award. */
  value: (s: TableStats) => number;
  least: number;
  detail: (s: TableStats) => string;
}

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

const CONTESTS: Contest[] = [
  { id: 'wins', title: 'Most hands won', value: (s) => s.won, least: 2, detail: (s) => `${s.won} hands` },
  { id: 'pot', title: 'Biggest pot', value: (s) => s.bigWin?.net ?? 0, least: 1, detail: (s) => `+${chips(s.bigWin?.net ?? 0)}` },
  { id: 'hand', title: 'Best hand', value: (s) => s.bestScore, least: 0, detail: (s) => s.bestMade?.name ?? '' },
  { id: 'raiser', title: 'Raised the most', value: (s) => s.bets, least: 4, detail: (s) => `${s.bets} bets and raises` },
  { id: 'caller', title: 'Called the most', value: (s) => s.calls, least: 4, detail: (s) => `${s.calls} calls` },
];

/**
 * Who won each award. A tie between two shares it; a tie among three or more means nobody stood out, so there's no
 * award. Contests nobody reached the minimum in are left out. Order is as in `CONTESTS`.
 */
export function tableAwards(records: HandRecord[], playerIds: string[]): Award[] {
  if (playerIds.length < 2 || records.length === 0) return [];
  const stats = new Map(playerIds.map((id) => [id, tableStats(records, id)] as const));
  const awards: Award[] = [];
  for (const c of CONTESTS) {
    let top = -Infinity;
    for (const s of stats.values()) top = Math.max(top, c.value(s));
    // 'Best hand' counts from score 0 (a hand was made at all); the rest need to reach their minimum.
    if (top < c.least) continue;
    const ids = playerIds.filter((id) => c.value(stats.get(id)!) === top);
    if (ids.length > 2) continue;
    awards.push({ id: c.id, title: c.title, ids, detail: c.detail(stats.get(ids[0])!) });
  }
  return awards;
}
