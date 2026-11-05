// Bankroll and the boards on the phone. The server holds every number: this only asks for them, sits you down and
// sends the rebuy. Nothing here can set a chip count or write to a board (worker/bankroll.ts, worker/leaderboard.ts).
import { useCallback, useEffect, useState } from 'react';

import { APP_INFO } from '../../appInfo';
import { deviceId } from './device';
import { ensureMyCode, loadPals, myPalCode } from './pals';
import { read, save } from './storage';
import { openBankrollTable } from './session';

const API = process.env.EXPO_PUBLIC_API_ORIGIN || APP_INFO.apiOrigin;

/** What the server says about your month (worker/bankroll.ts `BankrollStatusView`). */
export interface BankrollView {
  season: string;
  bankroll: number;
  peak: number;
  rebuyUsed: boolean;
  status: 'alive' | 'busted' | 'cut';
  cutWeek?: number;
  day: string;
  handsToday: number;
  dayStart: number;
  dayRank: number | null;
  hands: number;
  bust?: { day: number; cards: string[]; by: { name: string; emoji: string; cards: string[] } };
  seated: boolean;
  rank: number | null;
  alive: number;
  players: number;
}

/** A row on a board (worker/leaderboard.ts `RankedRow`). */
export interface BoardRow {
  code: string;
  username: string;
  emoji: string;
  country?: string;
  badge?: string;
  score: number;
  peak: number;
  rebuy: boolean;
  status: 'alive' | 'busted' | 'cut';
  cutWeek?: number;
  pos: number | null;
  /** Filler rows (development builds only). */
  filler?: boolean;
}

export interface BoardView {
  top: BoardRow[];
  me: BoardRow | null;
  friends: BoardRow[];
  players: number;
  alive: number;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path, { ...init, headers: { 'content-type': 'application/json' } });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || 'Something went wrong. Try again.');
  return body;
}

const LAST = 'flipup.bankroll';

/** Your month, from the server (the last copy first, so screens never wait on an empty card). */
export async function fetchBankroll(): Promise<BankrollView> {
  const code = await ensureMyCode();
  const view = await call<BankrollView>(`/api/bankroll/${code}?device=${encodeURIComponent(deviceId())}`);
  save(LAST, view);
  return view;
}

export const lastBankroll = (): BankrollView | null => read<BankrollView | null>(LAST, null);

/** Sits you down: the server sets up the table, and the phone joins it like any online table. */
export async function sitBankroll(): Promise<void> {
  const code = await ensureMyCode();
  await call(`/api/bankroll/${code}/sit`, { method: 'POST', body: JSON.stringify({ deviceId: deviceId() }) });
  openBankrollTable(code);
}

/** The month's one rebuy. `watched` is the ad's answer; skipping it gives the rebuy up. */
export async function rebuyBankroll(watched: boolean): Promise<void> {
  const code = await ensureMyCode();
  await call(`/api/bankroll/${code}/rebuy`, { method: 'POST', body: JSON.stringify({ deviceId: deviceId(), watched }) });
}

/** A board: `bankroll` (this month), `bankroll:2026-10` (an old one) or `daily` (today), with you and your friends. */
export async function fetchBoard(board: string): Promise<BoardView> {
  const code = myPalCode() ?? '';
  const friends = loadPals()
    .map((p) => p.code)
    .join(',');
  return call<BoardView>(`/api/boards/${board}?code=${code}&friends=${friends}`);
}

/** Your month and a board, kept fresh while a screen is open. */
export function useBankroll(): { view: BankrollView | null; error: string; refresh: () => Promise<void> } {
  const [view, setView] = useState<BankrollView | null>(lastBankroll);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setView(await fetchBankroll());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { view, error, refresh };
}

// ── Today's three on the board ──────────────────────────────────────────────

const PICKS = 'flipup.dailypicks';

/** Keeps each answer of today's three as it's made; the third sends all three to be scored on the server. */
export function noteDailyPick(day: string, pick: string): void {
  const all = read<Record<string, string[]>>(PICKS, {});
  const mine = [...(all[day] ?? []), pick].slice(0, 3);
  save(PICKS, { [day]: mine });
  if (mine.length === 3) void submitDaily(day, mine).catch(() => undefined);
}

async function submitDaily(day: string, answers: string[]): Promise<void> {
  const code = await ensureMyCode();
  await call(`/api/daily/${code}`, { method: 'POST', body: JSON.stringify({ deviceId: deviceId(), day, answers }) });
}
