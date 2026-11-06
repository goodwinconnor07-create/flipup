// The Train tab's Stats view: how you're going, worked out from what the phone already keeps (your latest grade on
// every hand, the points by day and the totals). Pure, so tests/train-stats.test.ts can check it.
import { flameOf, type RangePlay } from '@/state/ranges';

import { FAMILY, trickOf, type Family } from '../ranges/words';
import { UNITS, lastWeek } from './path';

type Grade = 'best' | 'ok' | 'mistake';

export interface UnitStat {
  family: Family;
  name: string;
  played: number;
  best: number;
  /** Best plays over hands played, or null before you've played one. */
  accuracy: number | null;
}

export interface TrainStats {
  played: number;
  best: number;
  ok: number;
  mistake: number;
  accuracy: number | null;
  points: number;
  rounds: number;
  roundBest: number;
  blitzBest: number;
  streak: number;
  /** Points for each of the last seven days, oldest first. */
  week: { letter: string; xp: number; today: boolean }[];
  units: UnitStat[];
}

export function trainStats(
  grades: Record<string, Grade>,
  hands: readonly { id: string; concept: string }[],
  play: RangePlay,
  now = new Date(),
): TrainStats {
  const byUnit = new Map<Family, { played: number; best: number }>(UNITS.map((f) => [f, { played: 0, best: 0 }]));
  let best = 0;
  let ok = 0;
  let mistake = 0;
  for (const h of hands) {
    const g = grades[h.id];
    if (!g) continue;
    if (g === 'best') best++;
    else if (g === 'ok') ok++;
    else mistake++;
    const u = byUnit.get(trickOf(h.concept).family);
    if (u) {
      u.played++;
      if (g === 'best') u.best++;
    }
  }
  const played = best + ok + mistake;
  const keys = lastWeek(now);
  return {
    played,
    best,
    ok,
    mistake,
    accuracy: played ? best / played : null,
    points: play.points,
    rounds: play.rounds,
    roundBest: play.roundBest,
    blitzBest: play.blitzBest,
    streak: flameOf(play, now).days,
    week: keys.map((d) => ({ letter: d.letter, xp: play.xp[d.key] ?? 0, today: d.today })),
    units: UNITS.map((family) => {
      const u = byUnit.get(family)!;
      return { family, name: FAMILY[family].name, played: u.played, best: u.best, accuracy: u.played ? u.best / u.played : null };
    }),
  };
}
