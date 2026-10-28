import { DurableObject } from 'cloudflare:workers';
import {
  buildPartyGame,
  cleanName,
  isNameBlocked,
  newCode,
  newId,
  PARTY_BREAK_SECONDS,
  PARTY_MAX_PLAYERS,
  placePoints,
  type PartyLive,
  type PartySettings,
  type PartyStatus,
  type PartyView,
} from '../src/game';

/** A party is deleted this long after its last change. */
const KEEP_FOR_MS = 2 * 24 * 60 * 60 * 1000;

interface Member {
  id: string;
  deviceId: string;
  name: string;
  emoji: string;
  friendCode?: string;
  twinCode?: string;
  points: number[];
}

interface Stored {
  code: string;
  hostId: string;
  settings: PartySettings;
  status: PartyStatus;
  round: number;
  table: string | null;
  nextAt: number | null;
  members: Member[];
  live: PartyLive[] | null;
  updatedAt: number;
}

export interface PartyPerson {
  name: string;
  emoji: string;
  friendCode?: string;
  twinCode?: string;
}

type Result = { ok: true; view: PartyView } | { ok: false; error: string };

/**
 * One party tournament, addressed by its code. It keeps who's in, the playlist of games and the points,
 * opens a table for each round (a TableRoom, with everyone already seated) and scores it when the table
 * reports it has finished. The leaderboard moves after every hand, because the table reports chips too.
 */
export class PartyRoom extends DurableObject<Env> {
  private data: Stored | null | undefined;

  /** RPC: open a party with its host in it. Returns false if this code is taken. */
  async create(code: string, deviceId: string, person: PartyPerson, settings: PartySettings): Promise<boolean> {
    if (await this.load()) return false;
    const host = this.member(deviceId, person);
    await this.save({ code, hostId: host.id, settings, status: 'lobby', round: -1, table: null, nextAt: null, members: [host], live: null, updatedAt: Date.now() });
    return true;
  }

  /** RPC: what this phone sees of the party. */
  async view(code: string, deviceId: string | null): Promise<PartyView | null> {
    const data = await this.load();
    return data ? this.render(code, data, deviceId) : null;
  }

  async join(code: string, deviceId: string, person: PartyPerson): Promise<Result> {
    const data = await this.load();
    if (!data) return { ok: false, error: 'No party with that code.' };
    const have = data.members.find((m) => m.deviceId === deviceId);
    if (have) {
      Object.assign(have, { name: this.uniqueName(data, cleanName(person.name), have.id), emoji: person.emoji, friendCode: person.friendCode, twinCode: person.twinCode });
    } else {
      if (data.status !== 'lobby') return { ok: false, error: 'That party has already started.' };
      if (data.members.length >= PARTY_MAX_PLAYERS) return { ok: false, error: 'That party is full.' };
      const m = this.member(deviceId, person);
      m.name = this.uniqueName(data, m.name, m.id);
      data.members.push(m);
    }
    await this.save(data);
    return { ok: true, view: this.render(code, data, deviceId) };
  }

  async leave(code: string, deviceId: string): Promise<Result> {
    const data = await this.load();
    if (!data) return { ok: false, error: 'No party with that code.' };
    const me = data.members.find((m) => m.deviceId === deviceId);
    // Once it has started, everyone keeps their place on the board; leaving only matters in the lobby.
    if (me && data.status === 'lobby') {
      data.members = data.members.filter((m) => m !== me);
      if (data.members.length === 0) {
        await this.ctx.storage.deleteAll();
        await this.ctx.storage.deleteAlarm();
        this.data = null;
        return { ok: true, view: { code, status: 'lobby', you: null, hostId: '', settings: data.settings, round: -1, table: null, nextAt: null, members: [], live: null } };
      }
      if (data.hostId === me.id) data.hostId = data.members[0].id;
      await this.save(data);
    }
    return { ok: true, view: this.render(code, data, null) };
  }

  /** The host starts the first game. */
  async start(code: string, deviceId: string): Promise<Result> {
    const data = await this.load();
    if (!data) return { ok: false, error: 'No party with that code.' };
    if (!this.isHost(data, deviceId)) return { ok: false, error: 'Only the host can start the party.' };
    if (data.status !== 'lobby') return { ok: true, view: this.render(code, data, deviceId) };
    const error = await this.startRound(code, data, 0);
    return error ? { ok: false, error } : { ok: true, view: this.render(code, data, deviceId) };
  }

  /** The host doesn't wait out the break between games. */
  async skip(code: string, deviceId: string): Promise<Result> {
    const data = await this.load();
    if (!data) return { ok: false, error: 'No party with that code.' };
    if (!this.isHost(data, deviceId)) return { ok: false, error: 'Only the host can do that.' };
    if (data.status === 'between') await this.nextRound(code, data);
    return { ok: true, view: this.render(code, data, deviceId) };
  }

  /** RPC from a round's table: chips after a hand. `live` is keyed by device id here. */
  async progress(tableCode: string, round: number, live: PartyLive[]): Promise<void> {
    const data = await this.load();
    if (!data || data.status !== 'playing' || data.table !== tableCode || data.round !== round) return;
    const byDevice = new Map(data.members.map((m) => [m.deviceId, m.id]));
    data.live = live.flatMap((l) => (byDevice.has(l.id) ? [{ ...l, id: byDevice.get(l.id)! }] : []));
    await this.save(data);
  }

  /** RPC from a round's table: it's over. `order` is the people's device ids, best first. */
  async roundEnded(tableCode: string, round: number, order: string[]): Promise<void> {
    const data = await this.load();
    if (!data || data.status !== 'playing' || data.table !== tableCode || data.round !== round) return;
    // Anyone who isn't in the order (they left the table) finishes last.
    const ranked = [...order.filter((d) => data.members.some((m) => m.deviceId === d))];
    for (const m of data.members) if (!ranked.includes(m.deviceId)) ranked.push(m.deviceId);
    for (const m of data.members) {
      while (m.points.length < round) m.points.push(0);
      m.points[round] = placePoints(ranked.indexOf(m.deviceId));
    }
    data.live = null;
    if (round + 1 >= data.settings.games.length) {
      data.status = 'done';
      data.nextAt = null;
    } else {
      data.status = 'between';
      data.nextAt = Date.now() + PARTY_BREAK_SECONDS * 1000;
    }
    await this.save(data);
  }

  /** Moves the party along when the break is over, or forgets one nobody has used for days. */
  async alarm(): Promise<void> {
    const data = await this.load();
    if (!data) return;
    if (Date.now() >= data.updatedAt + KEEP_FOR_MS) {
      await this.ctx.storage.deleteAll();
      this.data = null;
      return;
    }
    if (data.status === 'between' && data.nextAt !== null && Date.now() >= data.nextAt - 50) await this.nextRound(data.code, data);
    await this.save(data);
  }

  // ── Inside ──────────────────────────────────────────────────────────────

  private isHost(data: Stored, deviceId: string): boolean {
    return data.members.find((m) => m.id === data.hostId)?.deviceId === deviceId;
  }

  private member(deviceId: string, person: PartyPerson): Member {
    const name = cleanName(person.name);
    return { id: newId(8), deviceId, name: isNameBlocked(name) ? 'Player' : name, emoji: person.emoji, friendCode: person.friendCode, twinCode: person.twinCode, points: [] };
  }

  private uniqueName(data: Stored, name: string, exceptId: string): string {
    const taken = new Set(data.members.filter((m) => m.id !== exceptId).map((m) => m.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let n = 2; n < 20; n++) {
      const tail = ` ${n}`;
      const candidate = name.slice(0, 10 - tail.length).trimEnd() + tail;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
    return name;
  }

  private async nextRound(code: string, data: Stored): Promise<void> {
    const error = await this.startRound(code, data, data.round + 1);
    // If a table can't be opened, try again shortly rather than leaving everyone stuck.
    if (error) {
      data.nextAt = Date.now() + 5000;
      await this.save(data);
    }
  }

  /** Opens the table for round `n`, with everyone seated. Returns an error sentence, or null when it worked. */
  private async startRound(code: string, data: Stored, n: number): Promise<string | null> {
    const host = data.members.find((m) => m.id === data.hostId) ?? data.members[0];
    const people = [host, ...data.members.filter((m) => m !== host)].map((m) => ({ deviceId: m.deviceId, name: m.name, emoji: m.emoji, twinCode: m.twinCode }));
    for (let attempt = 0; attempt < 6; attempt++) {
      const tableCode = newCode();
      const game = buildPartyGame({ tableCode, partyCode: code, round: n, settings: data.settings, people, now: Date.now() });
      if (!game) return "Couldn't set the table up.";
      if (await this.env.TABLE_ROOM.getByName(tableCode).create(game)) {
        data.status = 'playing';
        data.round = n;
        data.table = tableCode;
        data.nextAt = null;
        data.live = null;
        await this.save(data);
        return null;
      }
    }
    return "Couldn't find a free table code.";
  }

  private render(code: string, data: Stored, deviceId: string | null): PartyView {
    return {
      code,
      status: data.status,
      you: data.members.find((m) => m.deviceId === deviceId)?.id ?? null,
      hostId: data.hostId,
      settings: data.settings,
      round: data.round,
      table: data.table,
      nextAt: data.nextAt,
      members: data.members.map(({ id, name, emoji, friendCode, points }) => ({ id, name, emoji, ...(friendCode ? { friendCode } : {}), points })),
      live: data.live,
    };
  }

  private async load(): Promise<Stored | null> {
    if (this.data === undefined) this.data = (await this.ctx.storage.get<Stored>('party')) ?? null;
    return this.data;
  }

  private async save(data: Stored): Promise<void> {
    data.updatedAt = Date.now();
    this.data = data;
    await this.ctx.storage.put('party', data);
    const at = data.status === 'between' && data.nextAt !== null ? Math.min(data.nextAt, data.updatedAt + KEEP_FOR_MS) : data.updatedAt + KEEP_FOR_MS;
    await this.ctx.storage.setAlarm(Math.max(at, Date.now() + 10));
  }
}
