import { DurableObject } from 'cloudflare:workers';
import { applyBj, cryptoRng, isDeviceId, parseBjAction, PING, PONG, redactBj, type BjAction, type Blackjack, type BjServerMessage } from '../src/game';

/** Tables are deleted this long after the last change. */
const KEEP_FOR_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGE_CHARS = 2 * 1024;
const RATE_LIMIT = { count: 30, windowMs: 10_000 };

interface SocketMeta {
  deviceId: string;
}

/**
 * One blackjack table with friends, addressed by a code nobody types: friends arrive through an invite. It holds
 * the only copy of the shoe, applies moves with the same applyBj() the phone uses on its own, and its alarm is
 * the table's clock (bots, the dealer's cards, turn timers, the next round). Chips never live here: each phone
 * settles its own bankroll from the table's history.
 */
export class BlackjackRoom extends DurableObject<Env> {
  private game: Blackjack | null | undefined;
  private rate = new WeakMap<WebSocket, { start: number; count: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  /** RPC: store a brand-new table. Returns false if this code is already in use. */
  async create(game: Blackjack): Promise<boolean> {
    if (await this.load()) return false;
    await this.save(game);
    return true;
  }

  /** RPC: whether there's a table here with a free seat, for an invite. */
  async exists(): Promise<boolean> {
    return !!(await this.load());
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const deviceId = new URL(request.url).searchParams.get('device');
    if (!isDeviceId(deviceId)) return new Response('Missing device id', { status: 400 });
    const game = await this.load();
    if (!game) return new Response('Table not found', { status: 404 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [deviceId]);
    server.serializeAttachment({ deviceId } satisfies SocketMeta);
    this.send(server, { t: 'state', game: redactBj(game) });
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
    const { deviceId } = ws.deserializeAttachment() as SocketMeta;
    if (t === 'ping') return this.send(ws, { t: 'pong' });
    const game = await this.load();
    if (!game) {
      ws.close(4404, 'Table not found');
      return;
    }
    if (t === 'sync') return this.send(ws, { t: 'state', game: redactBj(game) });
    if (t !== 'act') return;
    const id = typeof rawId === 'string' && rawId.length <= 40 ? rawId : undefined;
    if (this.overLimit(ws)) return this.send(ws, { t: 'reject', id, error: 'Easy there. Try again in a moment.' });
    const action = parseBjAction(a);
    if (!action) return this.send(ws, { t: 'reject', id, error: "The server didn't understand that." });
    await this.apply(action, deviceId, ws, id);
  }

  private async apply(action: BjAction, deviceId: string, from?: WebSocket, id?: string): Promise<void> {
    const game = await this.load();
    if (!game) return;
    const result = applyBj(game, action, { deviceId, now: Date.now(), rng: cryptoRng });
    if (!result.ok) {
      if (from) this.send(from, { t: 'reject', id, error: result.error });
      return;
    }
    if (!result.changed) {
      if (from) this.send(from, { t: 'state', game: redactBj(game), ack: id });
      return;
    }
    await this.save(result.game);
    const seen = redactBj(result.game);
    for (const socket of this.ctx.getWebSockets()) this.send(socket, { t: 'state', game: seen, ack: socket === from ? id : undefined });
  }

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

  private async syncPresence(closing?: WebSocket): Promise<void> {
    const online = new Set<string>();
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === closing) continue;
      const meta = socket.deserializeAttachment() as SocketMeta | null;
      if (meta) online.add(meta.deviceId);
    }
    await this.apply({ type: 'presence', online: [...online] }, 'server');
  }

  private async load(): Promise<Blackjack | null> {
    if (this.game === undefined) this.game = (await this.ctx.storage.get<Blackjack>('game')) ?? null;
    return this.game;
  }

  private async save(game: Blackjack): Promise<void> {
    this.game = game;
    await this.ctx.storage.put({ game, expireAt: Date.now() + KEEP_FOR_MS });
    await this.scheduleAlarm();
  }

  private async scheduleAlarm(): Promise<void> {
    const game = this.game;
    if (!game) return;
    const expireAt = (await this.ctx.storage.get<number>('expireAt')) ?? Date.now() + KEEP_FOR_MS;
    const at = game.wakeAt !== null ? Math.min(game.wakeAt, expireAt) : expireAt;
    await this.ctx.storage.setAlarm(Math.max(at, Date.now() + 10));
  }

  private send(ws: WebSocket, msg: BjServerMessage): void {
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
