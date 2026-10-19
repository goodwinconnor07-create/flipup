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
  type Action,
  type Game,
  type ServerMessage,
  type TableInfo,
} from '../src/game';

/** Tables are deleted this long after the last change. */
const KEEP_FOR_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_MESSAGE_CHARS = 4 * 1024;
/** Per connection: at most this many actions in each window. */
const RATE_LIMIT = { count: 30, windowMs: 10_000 };

interface SocketMeta {
  deviceId: string;
}

/**
 * One table, addressed by its join code. Holds the only true copy of the game (and the deck),
 * applies actions with the same reducer the app uses, and sends each phone only what it may see.
 * Its alarm moves the game along: bots acting, turn timers, all-in run-outs and the next deal.
 */
export class TableRoom extends DurableObject<Env> {
  private game: Game | null | undefined;
  private rate = new WeakMap<WebSocket, { start: number; count: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Heartbeats are answered by the runtime without waking the object.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  /** RPC: store a brand-new table. Returns false if this code is already in use. */
  async create(game: Game): Promise<boolean> {
    if (await this.load()) return false;
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

  /** WebSocket upgrade, forwarded by the Worker from /api/tables/:code/ws?device=… */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const deviceId = new URL(request.url).searchParams.get('device');
    if (!isDeviceId(deviceId)) return new Response('Missing device id', { status: 400 });
    const game = await this.load();
    if (!game) return new Response('Table not found', { status: 404 });

    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [deviceId]);
    server.serializeAttachment({ deviceId } satisfies SocketMeta);
    this.send(server, { t: 'state', game: redactForDevice(game, deviceId) });
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
    const { deviceId } = ws.deserializeAttachment() as SocketMeta;

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
    await this.apply(action, deviceId, ws, id);
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
    await this.save(result.game);
    for (const socket of this.ctx.getWebSockets()) {
      const meta = socket.deserializeAttachment() as SocketMeta | null;
      if (!meta) continue;
      this.send(socket, { t: 'state', game: redactForDevice(result.game, meta.deviceId), ack: socket === from ? id : undefined });
    }
  }

  /** The table's clock: move the game along if something's due, or forget a table nobody's used for days. */
  async alarm(): Promise<void> {
    const game = await this.load();
    if (!game) return;
    const expireAt = (await this.ctx.storage.get<number>('expireAt')) ?? 0;
    if (Date.now() >= expireAt) {
      for (const ws of this.ctx.getWebSockets()) {
        try {
          ws.close(4410, 'Table expired');
        } catch {
          // Already closed.
        }
      }
      await this.ctx.storage.deleteAll();
      this.game = null;
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
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      ws.close(1011, 'Error');
    } catch {
      // Already closed.
    }
  }

  private async load(): Promise<Game | null> {
    if (this.game === undefined) this.game = (await this.ctx.storage.get<Game>('game')) ?? null;
    return this.game;
  }

  private async save(game: Game): Promise<void> {
    this.game = game;
    await this.ctx.storage.put({ game, expireAt: Date.now() + KEEP_FOR_MS });
    await this.scheduleAlarm();
  }

  /** One alarm covers both jobs: the next timed game event, or clean-up. */
  private async scheduleAlarm(): Promise<void> {
    const game = this.game;
    if (!game) return;
    const expireAt = (await this.ctx.storage.get<number>('expireAt')) ?? Date.now() + KEEP_FOR_MS;
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
