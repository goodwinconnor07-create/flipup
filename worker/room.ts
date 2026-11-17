import { DurableObject } from 'cloudflare:workers';
import {
  applyAction,
  cryptoRng,
  isDeviceId,
  MAX_SEATS,
  parseAction,
  PING,
  PONG,
  redactForDevice,
  redactLogs,
  finishOrder,
  liveOf,
  actionNeedsPremium,
  withoutPremiumLook,
  FREE_BOT_NAMES,
  isFreeBot,
  type Action,
  type Game,
  type ServerMessage,
  type TableInfo,
  closeAt,
  closeReason,
  closeReasonText,
  countsAsPlay,
  newLife,
  type Life,
  liveAlert,
  liveAttributes,
  livePriority,
  liveState,
  newId,
} from '../src/game';
import { canPush, sendLive, type LiveReg } from './live';
import { mayHostPremium } from './premium';

const LIFE_KEY = 'life';
/** Live Activities registered at this table, by device id (worker/live.ts). */
const LIVE_KEY = 'live';
/** Phones a table pushes Live Activities to. One each, so this is everyone with room to spare. */
const MAX_LIVE = 16;
/** An activity with no news for this long greys out its clock, so a table that died quietly doesn't look live. */
const LIVE_STALE_S = 15 * 60;

const MAX_MESSAGE_CHARS = 4 * 1024;
/** Per connection: at most this many actions in each window. */
const RATE_LIMIT = { count: 30, windowMs: 10_000 };

interface SocketMeta {
  deviceId: string;
  /** This phone owns Premium when it connected (or the server isn't enforcing Premium). */
  premium: boolean;
}

/**
 * One table, addressed by its join code. Holds the only true copy of the game (and the deck),
 * applies actions with the same reducer the app uses, and sends each phone only what it may see.
 * Its alarm moves the game along: bots acting, turn timers, all-in run-outs and the next deal.
 */
/** Sockets one table accepts at once. */
const MAX_SOCKETS = 64;

export class TableRoom extends DurableObject<Env> {
  private game: Game | null | undefined;
  private life: Life | undefined;
  private rate = new WeakMap<WebSocket, { start: number; count: number }>();
  private live: Record<string, LiveReg> | undefined;
  /** Live Activity pushes go out one table change at a time, in order. */
  private liveChain: Promise<void> = Promise.resolve();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Heartbeats are answered by the runtime without waking the object.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  /**
   * RPC: store a brand-new table. Returns false if this code is already in use. It closes after 30 minutes without
   * play and at 6 hours at the latest; a party's round passes its party's deadline as `hardCloseAt`.
   */
  async create(game: Game, hardCloseAt?: number): Promise<boolean> {
    if (await this.load()) return false;
    this.life = newLife(Date.now(), { hardCloseAt });
    await this.save(game);
    return true;
  }

  /** RPC: public details for the join screen, or null if there's no table here. */
  async info(): Promise<TableInfo | null> {
    const game = await this.load();
    if (!game) return null;
    const host = game.players.find((p) => p.deviceId === game.hostDeviceId);
    return {
      code: game.code ?? '',
      status: game.status,
      hostName: host?.name ?? '',
      players: game.players.map((p) => ({ name: p.name, emoji: p.emoji, bot: p.bot })),
      settings: game.settings,
      seatsLeft: MAX_SEATS - game.players.length,
    };
  }

  /**
   * RPC: who a report is about, checked against the table: their seat, and whether the reporter sits here too.
   * Never sent to a phone; it goes only into the stored report.
   */
  async reportee(playerId: string, reporter: string): Promise<{ name: string; emoji: string; deviceId: string | null; bot: boolean } | null> {
    const game = await this.load();
    const p = game?.players.find((x) => x.id === playerId);
    if (!game || !p || !game.players.some((x) => x.deviceId === reporter)) return null;
    return { name: p.name, emoji: p.emoji, deviceId: p.deviceId, bot: p.bot };
  }

  /** WebSocket upgrade, forwarded by the Worker from /api/tables/:code/ws?device=… */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const deviceId = new URL(request.url).searchParams.get('device');
    if (!isDeviceId(deviceId)) return new Response('Missing device id', { status: 400 });
    const game = await this.load();
    if (!game) return new Response('Table not found', { status: 404 });
    // A table seats at most MAX_SEATS; a few sockets each for reconnects is plenty. A script opening thousands of
    // sockets to one table would make every move fan out to all of them.
    if (this.ctx.getWebSockets().length >= MAX_SOCKETS) return new Response('Table is busy', { status: 503 });

    const premium = await mayHostPremium(this.env, deviceId);
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [deviceId]);
    server.serializeAttachment({ deviceId, premium } satisfies SocketMeta);
    this.send(server, { t: 'state', game: redactForDevice(game, deviceId) });
    await this.syncPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_CHARS) return;
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof msg !== 'object' || msg === null) return;
    const { t, id: rawId, a } = msg as { t?: unknown; id?: unknown; a?: unknown };
    const { deviceId, premium } = ws.deserializeAttachment() as SocketMeta;

    if (t === 'ping') return this.send(ws, { t: 'pong' });

    const game = await this.load();
    if (!game) {
      ws.close(4404, 'Table not found');
      return;
    }
    if (t === 'sync') return this.send(ws, { t: 'state', game: redactForDevice(game, deviceId) });
    if (t === 'log') return this.send(ws, { t: 'log', logs: redactLogs(game, deviceId) });
    if (t !== 'act') return;

    const id = typeof rawId === 'string' && rawId.length <= 40 ? rawId : undefined;
    if (this.overLimit(ws)) return this.send(ws, { t: 'reject', id, error: 'Easy there. Try again in a moment.' });

    const action = parseAction(a);
    if (!action) return this.send(ws, { t: 'reject', id, error: "The server didn't understand that." });
    // Opening a Premium game is for Premium hosts: changing the table's mode (or playing again in another) needs it too, not only opening the table.
    if (premium === false && actionNeedsPremium(action)) return this.send(ws, { t: 'reject', id, error: 'Hosting this game needs FlipUp Premium.' });
    // A host without Premium seats only the free bots.
    if (premium === false) {
      // Bot Lab is Premium (the owner, 17 Nov 2026): its bots aren't seated for a host without it.
      if (action.type === 'addBot' && action.lab) return this.send(ws, { t: 'reject', id, error: 'Bot Lab bots need FlipUp Premium.' });
      if (action.type === 'addBot') {
        if (action.name !== undefined && !isFreeBot(action.name)) {
          return this.send(ws, { t: 'reject', id, error: 'That bot needs FlipUp Premium.' });
        }
        // No name asked for: pick a free bot that isn't seated yet, never a random Premium one.
        if (action.name === undefined) {
          const seated = new Set(game.players.map((p) => p.name));
          const name = FREE_BOT_NAMES.find((n) => !seated.has(n));
          if (!name) return this.send(ws, { t: 'reject', id, error: 'All the free bots are already seated.' });
          action.name = name;
        }
      }
    }
    // A phone that doesn't own Premium gets the plain look: the Premium bubble and card back are dropped, the name and emoji kept.
    await this.apply(premium !== false ? action : withoutPremiumLook(action), deviceId, ws, id);
  }

  /** Applies an action, saves, and sends everyone their view of the result. */
  private async apply(action: Action, deviceId: string, from?: WebSocket, id?: string): Promise<void> {
    const game = await this.load();
    if (!game) return;
    const result = applyAction(game, action, { deviceId, now: Date.now(), rng: cryptoRng });
    if (!result.ok) {
      if (from) this.send(from, { t: 'reject', id, error: result.error });
      return;
    }
    if (!result.changed) {
      if (from) this.send(from, { t: 'state', game: redactForDevice(game, deviceId), ack: id });
      return;
    }
    // A person playing keeps the table open; bots, the clock and a phone connecting don't.
    if (countsAsPlay(action.type, deviceId === 'server')) (await this.lifeOf()).activeAt = Date.now();
    await this.save(result.game);
    if (result.game.party) this.ctx.waitUntil(this.reportToParty(result.game));
    this.queueLive(result.game);
    for (const socket of this.ctx.getWebSockets()) {
      const meta = socket.deserializeAttachment() as SocketMeta | null;
      if (!meta) continue;
      this.send(socket, { t: 'state', game: redactForDevice(result.game, meta.deviceId), ack: socket === from ? id : undefined });
    }
  }

  /** A party round tells its party how the chips stand after each hand, and when it's over. Never throws. */
  private async reportToParty(game: Game): Promise<void> {
    const party = game.party;
    if (!party) return;
    try {
      const done = game.status === 'ended';
      // One report per finished hand, and one at the end.
      const key = `${done ? 'ended' : game.hand?.result ? game.hand.number : 'x'}`;
      if (key === 'x' || key === (await this.ctx.storage.get<string>('reported'))) return;
      const room = this.env.PARTY_ROOM.getByName(party.code);
      const code = game.code ?? '';
      const activeAt = (await this.lifeOf()).activeAt;
      if (done) {
        await room.roundEnded(code, party.round, finishOrder(game).flatMap((p) => (p.deviceId ? [p.deviceId] : [])), activeAt);
      } else {
        const ids = Object.fromEntries(game.players.flatMap((p) => (p.deviceId ? [[p.deviceId, p.deviceId]] : [])));
        await room.progress(code, party.round, liveOf(game, ids), activeAt);
      }
      await this.ctx.storage.put('reported', key);
    } catch {
      // The party will hear about the next hand.
    }
  }

  /** The table's clock: move the game along if something's due, or close a table nobody's playing or that has run its time. */
  async alarm(): Promise<void> {
    const game = await this.load();
    if (!game) return;
    const reason = closeReason(await this.lifeOf(), Date.now());
    if (reason) {
      // Every Live Activity on this table says so and leaves the Lock Screen a minute later.
      await this.queueLive(game, closeReasonText(reason));
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.close(4410, closeReasonText(reason));
        } catch {
          // Already closed.
        }
      }
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      this.game = null;
      this.life = undefined;
      this.live = undefined;
      return;
    }
    if (game.wakeAt !== null && Date.now() >= game.wakeAt - 20) await this.apply({ type: 'tick' }, 'server');
    await this.scheduleAlarm();
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {
      // Already closed.
    }
    await this.syncPresence(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close(1011, 'Error');
    } catch {
      // Already closed.
    }
    await this.syncPresence(ws);
  }

  /** Tells the game which phones are connected, so a dropped player is shown as offline and their clock shortens. */
  private async syncPresence(closing?: WebSocket): Promise<void> {
    const online = new Set<string>();
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === closing) continue;
      const meta = socket.deserializeAttachment() as SocketMeta | null;
      if (meta) online.add(meta.deviceId);
    }
    await this.apply({ type: 'presence', online: [...online] }, 'server');
  }

  /**
   * RPC: a phone at this table started a Live Activity and has its push token. Returns the key its Check button sends
   * back, or null when the phone has no seat here. The current state is pushed at once.
   */
  async registerLive(deviceId: string, token: string, sandbox: boolean): Promise<{ act: string; pushes: boolean } | null> {
    const game = await this.load();
    if (!game || !game.players.some((p) => p.deviceId === deviceId)) return null;
    const live = await this.liveRegs();
    const old = live[deviceId];
    if (!old && Object.keys(live).length >= MAX_LIVE) return null;
    // A new token for the same phone (iOS rotates them) keeps its key, and the next push is sent whatever it holds.
    live[deviceId] = { token, act: old?.act ?? newId(24), sandbox, last: null };
    await this.ctx.storage.put(LIVE_KEY, live);
    this.queueLive(game);
    return { act: live[deviceId].act, pushes: canPush(this.env) };
  }

  /** RPC: the phone ended its Live Activity (it left, or turned them off). */
  async stopLive(deviceId: string): Promise<void> {
    const live = await this.liveRegs();
    if (!live[deviceId]) return;
    delete live[deviceId];
    await this.ctx.storage.put(LIVE_KEY, live);
  }

  /**
   * RPC: the Check button on a Live Activity. `act` is the key that activity was given; it only ever checks, only on
   * the turn it was shown on (`hand`, `seq`), and only when a check is free.
   */
  async liveCheck(act: string, hand: number, seq: number): Promise<{ ok: true } | { ok: false; error: string }> {
    const live = await this.liveRegs();
    const deviceId = Object.keys(live).find((d) => live[d].act === act);
    const game = await this.load();
    if (!deviceId || !game) return { ok: false, error: 'This table has closed.' };
    const state = liveState(game, deviceId, Date.now(), act);
    if (!state || state.phase !== 'turn' || state.hand !== hand || state.seq !== seq) return { ok: false, error: "It's not your turn any more." };
    if (!state.canCheck) return { ok: false, error: 'Checking is not free here. Open FlipUp to play.' };
    const before = this.game?.version;
    await this.apply({ type: 'act', hand, seq, move: 'check' }, deviceId);
    return this.game?.version !== before ? { ok: true } : { ok: false, error: "That didn't go through. Open FlipUp to play." };
  }

  /** Queues this table's Live Activity pushes after a change (or, with `closing`, the last one as the table closes). */
  private queueLive(game: Game, closing?: string): Promise<void> {
    const run = this.liveChain.then(() => this.pushLive(game, closing)).catch(() => {});
    this.liveChain = run;
    this.ctx.waitUntil(run);
    return run;
  }

  /** Sends each registered phone its own view, when it changed. A phone no longer seated gets an end push and is dropped. */
  private async pushLive(game: Game, closing?: string): Promise<void> {
    const live = await this.liveRegs();
    const devices = Object.keys(live);
    if (!devices.length || !canPush(this.env)) return;
    const now = Date.now();
    const attrs = liveAttributes(game);
    let dirty = false;
    await Promise.all(
      devices.map(async (deviceId) => {
        const reg = live[deviceId];
        const state = liveState(game, deviceId, now, reg.act);
        if (closing || !state) {
          const last = state ?? reg.last;
          if (last) {
            const words = closing ?? 'You left the table';
            await sendLive(this.env, reg, { event: 'end', state: { ...last, phase: last.phase === 'ended' ? 'ended' : 'waiting', line: words, turnStart: null, turnEnd: null }, priority: 10, dismissAt: Math.floor(now / 1000) + 60 });
          }
          delete live[deviceId];
          dirty = true;
          return;
        }
        if (reg.last && JSON.stringify(reg.last) === JSON.stringify(state)) return;
        const outcome = await sendLive(this.env, reg, {
          event: 'update',
          state,
          priority: livePriority(reg.last, state),
          alert: liveAlert(reg.last, state, attrs),
          staleAt: Math.floor(now / 1000) + LIVE_STALE_S,
        });
        if (outcome === 'gone') delete live[deviceId];
        else if (outcome === 'sent') reg.last = state;
        dirty = true;
      }),
    );
    if (dirty && !closing) await this.ctx.storage.put(LIVE_KEY, live);
  }

  private async liveRegs(): Promise<Record<string, LiveReg>> {
    this.live ??= (await this.ctx.storage.get<Record<string, LiveReg>>(LIVE_KEY)) ?? {};
    return this.live;
  }

  private async load(): Promise<Game | null> {
    if (this.game === undefined) this.game = (await this.ctx.storage.get<Game>('game')) ?? null;
    return this.game;
  }

  private async save(game: Game): Promise<void> {
    this.game = game;
    await this.ctx.storage.put({ game, [LIFE_KEY]: await this.lifeOf() });
    await this.scheduleAlarm();
  }

  /** When the table opened, was last played and must be gone by. A table saved before this existed starts its clock when first loaded. */
  private async lifeOf(): Promise<Life> {
    this.life ??= (await this.ctx.storage.get<Life>(LIFE_KEY)) ?? newLife(Date.now());
    return this.life;
  }

  /** One alarm covers both jobs: the next timed game event, or closing the table. */
  private async scheduleAlarm(): Promise<void> {
    const game = this.game;
    if (!game) return;
    const expireAt = closeAt(await this.lifeOf());
    const at = game.wakeAt !== null ? Math.min(game.wakeAt, expireAt) : expireAt;
    await this.ctx.storage.setAlarm(Math.max(at, Date.now() + 10));
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // The socket closed while we were working. It will resync when it reconnects.
    }
  }

  private overLimit(ws: WebSocket): boolean {
    const now = Date.now();
    const r = this.rate.get(ws);
    if (!r || now - r.start > RATE_LIMIT.windowMs) {
      this.rate.set(ws, { start: now, count: 1 });
      return false;
    }
    r.count += 1;
    return r.count > RATE_LIMIT.count;
  }
}
