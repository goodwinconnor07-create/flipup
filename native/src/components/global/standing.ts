// The words on the Global tab: where you stand against the Sunday cut, what Play starts, and the lines the header
// cycles through. Pure, so tests/global-standing.test.ts can check them.
import { BANKROLL, daysLeftInSeason, daysToNextCut, seasonName, seasonOf } from '@/engine';

import type { BankrollView, BoardView } from '@/state/bankroll';

export type CutState = 'safe' | 'close' | 'zone';

/**
 * Where a rank sits against the next cut: in the bottom share of players still alive is the cut zone, the band just
 * above it is close, the rest are safe. With too few players for anyone to be cut, everyone is safe.
 */
export function cutState(rank: number | null, alive: number, share: number = BANKROLL.cutShare): CutState | null {
  if (rank === null || alive <= 0) return null;
  const cut = Math.floor(alive * share);
  if (cut === 0) return 'safe';
  if (rank > alive - cut) return 'zone';
  if (rank > alive - cut * 2) return 'close';
  return 'safe';
}

const when = (days: number) => (days <= 1 ? 'tomorrow' : `in ${days} days`);

/** The line under your chips about the next cut, or null once you're out. `warn` turns it gold. */
export function cutLine(now: number, view: BankrollView | null): { text: string; warn: boolean } | null {
  if (view && view.status !== 'alive') return null;
  const days = daysToNextCut(now);
  if (days === null) return { text: 'No more cuts this season', warn: false };
  const base = `Next cut ${when(days)}`;
  const state = view ? cutState(view.rank, view.alive) : null;
  if (state === 'zone') return { text: `${base} · you’re in the cut zone`, warn: true };
  if (state === 'close') return { text: `${base} · you’re close to the cut`, warn: true };
  if (state === 'safe') return { text: `${base} · you’re safe`, warn: false };
  return { text: base, warn: false };
}

/** Hands you can still play today. */
export const handsLeft = (view: BankrollView | null): number => Math.max(0, BANKROLL.handsADay - (view?.handsToday ?? 0));

/**
 * What the Play button says: a title, a line under it, and whether it starts a sitting at all (a spent day, busted or
 * cut still opens the sheet, but the button is drawn quieter). A new player gets "Play your first hand".
 */
export function playButton(view: BankrollView | null): { title: string; line: string; ready: boolean } {
  if (view?.status === 'busted')
    return { title: 'Busted', line: view.rebuyUsed ? 'Out until next month' : 'See your rebuy', ready: !view.rebuyUsed };
  if (view?.status === 'cut') return { title: 'Cut', line: 'Out until next month', ready: false };
  const left = handsLeft(view);
  if (left === 0) return { title: 'Back tomorrow', line: `You’ve played today’s ${BANKROLL.handsADay} hands`, ready: false };
  if (!view || view.hands === 0) return { title: 'Play your first hand', line: `${left} hands to play today`, ready: true };
  return { title: 'Play', line: `${left} of ${BANKROLL.handsADay} hands left today`, ready: true };
}

const n = (v: number) => v.toLocaleString('en-US');

/** The header's lines, in the order they come round: the season, the cut, today, the leader, how many are in. */
export function tickerLines(now: number, view: BankrollView | null, board: BoardView | null, mine?: string | null): string[] {
  const out = [`${seasonName(seasonOf(now))} season ends in ${daysLeftInSeason(now)} days`];
  const days = daysToNextCut(now);
  if (days !== null) out.push(`Next cut ${when(days)}`);
  if (view?.status === 'alive') out.push(handsLeft(view) > 0 ? `${handsLeft(view)} hands left today` : 'Back tomorrow for 50 more hands');
  const top = board?.top[0];
  if (top && !top.filler) out.push(top.code === mine ? 'You’re number 1 in the world' : `@${top.username} leads with ${n(top.score)}`);
  if (board && board.alive > 1) out.push(`${n(board.alive)} players still in`);
  return out.map((l) => l.toUpperCase());
}
