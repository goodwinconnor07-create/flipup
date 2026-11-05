import { DurableObject } from 'cloudflare:workers';
import {
  applyAction,
  BANKROLL,
  bankrollNow,
  createBankrollTable,
  cryptoRng,
  dayOf,
  parseAction,
  PING,
  PONG,
  redactForDevice,
  redactLogs,
  seasonEnd,
  type BankrollStatus,
  type Card,
  type Game,
  type PlayerRead,
  type ServerMessage,
} from '../src/game';
import type { BoardRow } from './leaderboard';

/** What a player's month of Bankroll holds, apart from the live table. */
export interface BankrollRecord {
  code: string;
  season: string;
  bankroll: number;
  peak: number;
  rebuyUsed: boolean;
  status: BankrollStatus;
  cutWeek?: number;
  /** Today (UTC), hands played today, the bankroll at the start of today and the place then. */
  day: string;
  handsToday: number;
  dayStart: number;
  dayRank: number | null;
  /** Hands played this month; nobody is on the board before their first. */
  hands: number;
  /** The hand that busted them, for the busted sheet and its share picture. */
  bust?: { day: number; cards: Card[]; by: { name: string; emoji: string; cards: Card[] } };
  /** How they show on the board. */
  look: { username: string; emoji: string; name: string; country?: string; badge?: string };
}

/** What the start sheet and the Global tab's card show. */
export type BankrollStatusView = Omit<BankrollRecord, 'code' | 'look'> & {
  seated: boolean;
  rank: number | null;
  alive: number;
  players: number;
};

const MAX_MESSAGE_CHARS = 4 * 1024;

/**
 * One player's month of Bankroll, named `<friendCode>:<season>`: their bankroll, today's hands, the rebuy, the cut,
 * the bots' month-long read of them and the live table. The table is an ordinary online table where every other
 * seat is a bot: `applyAction()` runs it, `cryptoRng` deals it, the alarm is its clock, and the phone only ever gets
 * `redactForDevice()`'s view. Chips move only inside the engine; the record takes the stack back when the table closes.
 */
export class BankrollRoom extends DurableObject<Env> {
  private rec: BankrollRecord | null | undefined;
  private game: Game | null | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  private board() {
    return this.env.LEADERBOARD.getByName(`bankroll:${this.rec!.season}`);
  }

  private async load(): Promise<void> {
    if (this.rec === undefined) this.rec = (await this.ctx.storage.get<BankrollRecord>('rec')) ?? null;
    if (this.game === undefined) this.game = (await this.ctx.storage.get<Game>('game')) ?? null;
  }

  /** A new day (UTC) gives back the 50 hands. */
  private rollDay(rec: BankrollRecord, now: number, rank: number | null): void {
    const day = dayOf(now);
    if (rec.day === day) return;
    rec.day = day;
    rec.handsToday = 0;
    rec.dayStart = rec.bankroll;
    rec.dayRank = rank;
  }

  /** RPC: the month so far (made on first look: everyone starts with 1,000). */
  async status(code: string, season: string, look?: BankrollRecord['look']): Promise<BankrollStatusView> {
    await this.load();
    const now = Date.now();
    if (!this.rec) {
      this.rec = { code, season, bankroll: BANKROLL.start, peak: BANKROLL.start, rebuyUsed: false, status: 'alive', day: dayOf(now), handsToday: 0, dayStart: BANKROLL.start, dayRank: null, hands: 0, look: look ?? { username: '', emoji: '🙂', name: 'Player' } };
      await this.ctx.storage.setAlarm(seasonEnd(season) + 60 * 24 * 60 * 60 * 1000);
    }
    if (look) this.rec.look = look;
    const row = this.rec.hands > 0 ? await this.board().row(code) : null;
    if (row?.status === 'cut' && this.rec.status !== 'cut') Object.assign(this.rec, { status: 'cut', cutWeek: row.cutWeek });
    this.rollDay(this.rec, now, row?.pos ?? null);
    await this.ctx.storage.put('rec', this.rec);
    const view = await this.board().view(null);
    const { code: _c, look: _l, ...rest } = this.rec;
    return { ...rest, bankroll: this.game && this.game.status !== 'ended' ? (bankrollNow(this.game) ?? rest.bankroll) : rest.bankroll, seated: !!this.game && this.game.status !== 'ended', rank: row?.pos ?? null, alive: view.alive, players: view.players };
  }

  /** RPC: Sit down. Your bankroll (up to the cap) goes on the table with five random bots. Returns an error sentence or null. */
  async sit(deviceId: string): Promise<string | null> {
    await this.load();
    const rec = this.rec;
    if (!rec) return 'Open Bankroll first.';
    if (this.game && this.game.status !== 'ended') return null;
    if (rec.status === 'cut') return `You were cut in week ${rec.cutWeek ?? ''}. Back next month.`;
    if (rec.status === 'busted') return rec.rebuyUsed ? "You're out for the month." : 'Rebuy first.';
    const now = Date.now();
    this.rollDay(rec, now, rec.dayRank);
    if (rec.handsToday >= BANKROLL.handsADay) return 'Back tomorrow.';
    if (!rec.look.username) return 'Pick a username first: it’s how you show on the board.';
    const read = await this.ctx.storage.get<PlayerRead>('read');
    const created = createBankrollTable({ deviceId, name: rec.look.name, emoji: rec.look.emoji, bankroll: rec.bankroll, season: rec.season, day: rec.day, today: rec.handsToday, dayStart: rec.dayStart, read, now, rng: cryptoRng });
    // Your place in the world from the first hand, so it's on the table the moment you sit down.
    const row = rec.hands > 0 ? await this.board().row(rec.code).catch(() => null) : null;
    const counts = await this.board().view(null).catch(() => null);
    Object.assign(created.bankroll!, { ...(row?.pos ? { rank: row.pos } : {}), ...(counts ? { alive: counts.alive, players: counts.players } : {}) });
    const started = applyAction(created, { type: 'start' }, { deviceId, now, rng: cryptoRng });
    if (!started.ok) return started.error;
    await this.ctx.storage.put('owner', deviceId);
    await this.save(started.game);
    return null;
  }

  /** RPC: the rebuy, once a month. `watched` is the phone's word for now. TODO: verify the ad on the server once an ad network is connected. */
  async rebuy(watched: boolean): Promise<string | null> {
    await this.load();
    const rec = this.rec;
    if (!rec || rec.status !== 'busted') return "You're not busted.";
    if (rec.rebuyUsed) return 'The rebuy is used for this month.';
    rec.rebuyUsed = true;
    if (watched) {
      rec.status = 'alive';
      rec.bankroll = BANKROLL.rebuy;
    }
    await this.ctx.storage.put('rec', rec);
    await this.report();
    return null;
  }

  /** WebSocket from the owner's phone (the route has checked the friend code is theirs). */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    await this.load();
    const deviceId = new URL(request.url).searchParams.get('device') ?? '';
    if (!this.game || (await this.ctx.storage.get<string>('owner')) !== deviceId) return new Response('No table', { status: 404 });
    if (this.ctx.getWebSockets().length >= 8) return new Response('Busy', { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ deviceId });
    this.send(server, { t: 'state', game: redactForDevice(this.game, deviceId) });
    await this.apply({ type: 'presence', online: [deviceId] }, 'server');
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_CHARS) return;
    let msg: { t?: unknown; id?: unknown; a?: unknown };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const { deviceId } = ws.deserializeAttachment() as { deviceId: string };
    await this.load();
    if (!this.game) return ws.close(4404, 'Table not found');
    if (msg.t === 'sync') return this.send(ws, { t: 'state', game: redactForDevice(this.game, deviceId) });
    if (msg.t === 'log') return this.send(ws, { t: 'log', logs: redactLogs(this.game, deviceId) });
    if (msg.t !== 'act') return;
    const id = typeof msg.id === 'string' && msg.id.length <= 40 ? msg.id : undefined;
    const action = parseAction(msg.a);
    if (!action) return this.send(ws, { t: 'reject', id, error: "The server didn't understand that." });
    await this.apply(action, deviceId, ws, id);
  }

  async webSocketClose(): Promise<void> {
    await this.load();
    if (this.game && this.game.status === 'playing' && this.ctx.getWebSockets().length <= 1) await this.apply({ type: 'presence', online: [] }, 'server');
  }

  async alarm(): Promise<void> {
    await this.load();
    const game = this.game;
    if (game && game.status === 'playing' && game.wakeAt !== null) {
      if (Date.now() >= game.wakeAt - 20) await this.apply({ type: 'tick' }, 'server');
      else await this.ctx.storage.setAlarm(game.wakeAt);
      return;
    }
    // The season is long over: the room goes.
    if (this.rec && Date.now() > seasonEnd(this.rec.season) + 59 * 24 * 60 * 60 * 1000) await this.remove();
  }

  /** RPC: Delete my data. */
  async remove(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) ws.close(4410, 'Deleted');
    await this.ctx.storage.deleteAll();
    this.rec = null;
    this.game = null;
  }

  private async apply(action: Parameters<typeof applyAction>[1], deviceId: string, from?: WebSocket, id?: string): Promise<void> {
    const game = this.game;
    if (!game) return;
    const r = applyAction(game, action, { deviceId, now: Date.now(), rng: cryptoRng });
    if (!r.ok) {
      if (from) this.send(from, { t: 'reject', id, error: r.error });
      return;
    }
    if (!r.changed) {
      if (from) this.send(from, { t: 'state', game: redactForDevice(game, deviceId), ack: id });
      return;
    }
    await this.afterChange(game, r.game);
    for (const socket of this.ctx.getWebSockets()) {
      const meta = socket.deserializeAttachment() as { deviceId: string } | null;
      if (meta) this.send(socket, { t: 'state', game: redactForDevice(this.game!, meta.deviceId), ack: socket === from ? id : undefined });
    }
  }

  /** After every change: a finished hand moves the record on and goes to the board; a closed table settles. */
  private async afterChange(before: Game, game: Game): Promise<void> {
    const rec = this.rec!;
    const tag = game.bankroll!;
    const person = game.players.find((p) => !p.bot);
    const handDone = !!game.hand?.result && !(before.hand?.result && before.hand.number === game.hand.number);
    if (handDone || game.status === 'ended') {
      rec.day = tag.day;
      rec.handsToday = tag.today + tag.played;
      rec.dayStart = tag.dayStart;
      const now = bankrollNow(game) ?? rec.bankroll;
      rec.peak = Math.max(rec.peak, now);
      if (person && game.reads?.[person.id]) await this.ctx.storage.put('read', game.reads[person.id]);
    }
    if (handDone) {
      rec.hands += 1;
      const hand = game.hand!;
      // The hand that busts you: your cards, and the bot who took the last chip.
      if (person && person.stack === 0 && tag.bank === 0) {
        const winner = game.players.find((p) => p.id === Object.keys(hand.result!.won).find((w) => w !== person.id));
        const seat = (id?: string) => hand.seats.find((s) => s.playerId === id);
        rec.bust = { day: new Date().getUTCDate(), cards: seat(person.id)?.cards ?? [], by: { name: winner?.name ?? 'a bot', emoji: winner?.emoji ?? '🤖', cards: seat(winner?.id)?.shown ? seat(winner?.id)!.cards : [] } };
      }
      rec.bankroll = bankrollNow(game) ?? rec.bankroll;
      const res = await this.report();
      if (res) {
        Object.assign(tag, { rank: res.pos ?? undefined, alive: res.alive, players: res.players });
        if (rec.dayRank === null) rec.dayRank = res.pos;
        if (res.status === 'cut') tag.stop = 'cut';
      }
    }
    if (game.status === 'ended') {
      rec.bankroll = tag.bank + (person?.stack ?? 0);
      if (rec.bankroll <= 0) rec.status = 'busted';
      if (tag.closed === 'cut') rec.status = 'cut';
      await this.report();
    }
    await this.ctx.storage.put('rec', rec);
    await this.save(game);
  }

  /** The player's row on this month's board. Nobody is on it before their first hand. */
  private async report() {
    const rec = this.rec!;
    if (rec.hands === 0 || !rec.look.username) return null;
    const row: BoardRow = { code: rec.code, username: rec.look.username, emoji: rec.look.emoji, ...(rec.look.country ? { country: rec.look.country } : {}), ...(rec.look.badge ? { badge: rec.look.badge } : {}), score: rec.bankroll, peak: rec.peak, rebuy: rec.rebuyUsed && rec.status === 'alive', status: rec.status, at: Date.now() };
    try {
      return await this.board().report(row);
    } catch {
      return null;
    }
  }

  private async save(game: Game): Promise<void> {
    this.game = game;
    await this.ctx.storage.put('game', game);
    if (game.status === 'playing' && game.wakeAt !== null) await this.ctx.storage.setAlarm(Math.max(game.wakeAt, Date.now() + 10));
    else if (this.rec) await this.ctx.storage.setAlarm(seasonEnd(this.rec.season) + 60 * 24 * 60 * 60 * 1000);
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Closed; it resyncs on reconnect.
    }
  }
}
