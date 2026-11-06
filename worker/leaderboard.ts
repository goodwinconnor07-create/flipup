import { DurableObject } from 'cloudflare:workers';
import { isNameBlocked, isUsername, pickCut, type BankrollStatus } from '../src/game';

/** One player on a board. Keyed by friend code. Written only by the server (BankrollRoom, the daily score route). */
export interface BoardRow {
  code: string;
  username: string;
  emoji: string;
  country?: string;
  badge?: string;
  /** Bankroll (or today's points). */
  score: number;
  peak: number;
  rebuy: boolean;
  status: BankrollStatus;
  cutWeek?: number;
  at: number;
}

/** A row as phones get it: with its position (tied scores share one; busted and cut rows have none). */
export type RankedRow = BoardRow & { pos: number | null };

export interface BoardView {
  top: RankedRow[];
  me: RankedRow | null;
  friends: RankedRow[];
  players: number;
  alive: number;
}

const KEEP_MS = 366 * 24 * 60 * 60 * 1000;

/** A row may be shown on a world board only with a clean username. */
const showable = (r: BoardRow) => isUsername(r.username) && !isNameBlocked(r.username);

/**
 * One board, named `<board>:<season>` ("bankroll:2026-11", "daily:2026-11-05"). Rows sit in storage as `row:<code>`
 * and are ranked in memory on read (alive by score, then busted and cut by peak). Deleted a year after the last write.
 */
export class Leaderboard extends DurableObject<Env> {
  private rows: Map<string, BoardRow> | null = null;
  private sorted: RankedRow[] | null = null;

  private async load(): Promise<Map<string, BoardRow>> {
    if (!this.rows) {
      const all = await this.ctx.storage.list<BoardRow>({ prefix: 'row:' });
      this.rows = new Map([...all.values()].map((r) => [r.code, r]));
    }
    return this.rows;
  }

  private async ranked(): Promise<RankedRow[]> {
    if (this.sorted) return this.sorted;
    const rows = [...(await this.load()).values()];
    const alive = rows.filter((r) => r.status === 'alive').sort((a, b) => b.score - a.score || a.at - b.at);
    const out = rows.filter((r) => r.status !== 'alive').sort((a, b) => b.peak - a.peak);
    let pos = 0;
    const ranked: RankedRow[] = alive.map((r, i) => {
      if (i === 0 || r.score !== alive[i - 1].score) pos = i + 1;
      return { ...r, pos };
    });
    this.sorted = [...ranked, ...out.map((r) => ({ ...r, pos: null }))];
    return this.sorted;
  }

  /** RPC (server only): write a row. A cut is for the month: a later write can't undo it. */
  async report(row: BoardRow): Promise<{ pos: number | null; alive: number; players: number; status: BankrollStatus }> {
    const rows = await this.load();
    const have = rows.get(row.code);
    const next: BoardRow = have?.status === 'cut' ? { ...row, status: 'cut', cutWeek: have.cutWeek, score: have.score } : row;
    next.peak = Math.max(next.peak, have?.peak ?? 0);
    rows.set(row.code, next);
    this.sorted = null;
    await this.ctx.storage.put(`row:${row.code}`, next);
    await this.ctx.storage.setAlarm(Date.now() + KEEP_MS);
    const ranked = await this.ranked();
    const mine = ranked.find((r) => r.code === row.code);
    return { pos: mine?.pos ?? null, alive: ranked.filter((r) => r.status === 'alive').length, players: ranked.length, status: next.status };
  }

  /** RPC: the top 100 (clean usernames only), your row, and your friends' rows. */
  async view(me: string | null, friends: string[] = []): Promise<BoardView> {
    const ranked = await this.ranked();
    const shown = ranked.filter(showable);
    const set = new Set(friends);
    return {
      top: shown.slice(0, 100),
      me: ranked.find((r) => r.code === me) ?? null,
      friends: shown.filter((r) => set.has(r.code) || r.code === me),
      players: ranked.length,
      alive: ranked.filter((r) => r.status === 'alive').length,
    };
  }

  /** RPC: one player's row and position. */
  async row(code: string): Promise<RankedRow | null> {
    return (await this.ranked()).find((r) => r.code === code) ?? null;
  }

  /** RPC (cron): the Sunday cut for `week`. Safe to run twice: a week already cut does nothing. Returns who was cut. */
  async cut(week: number): Promise<string[]> {
    if (await this.ctx.storage.get<boolean>(`cut:${week}`)) return [];
    const rows = await this.load();
    const gone = pickCut([...rows.values()]);
    for (const r of gone) {
      const next = { ...r, status: 'cut' as const, cutWeek: week };
      rows.set(r.code, next);
      await this.ctx.storage.put(`row:${r.code}`, next);
    }
    await this.ctx.storage.put(`cut:${week}`, true);
    this.sorted = null;
    return gone.map((r) => r.code);
  }

  /** RPC (cron, once): the season is over. Returns the top 100 still alive, in place order. */
  async close(): Promise<{ code: string; place: number }[]> {
    if (await this.ctx.storage.get<boolean>('closed')) return [];
    await this.ctx.storage.put('closed', true);
    return (await this.ranked()).filter((r) => r.pos !== null && r.pos <= 100).map((r) => ({ code: r.code, place: r.pos! }));
  }

  /** RPC: Delete my data. */
  async remove(code: string): Promise<void> {
    (await this.load()).delete(code);
    this.sorted = null;
    await this.ctx.storage.delete(`row:${code}`);
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
    this.rows = new Map();
    this.sorted = null;
  }
}
