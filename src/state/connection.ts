// Live link to an online table. Reconnects by itself when the signal comes and goes.

import { PING, type ClientMessage, type ServerMessage } from '../game';
import { fetchTableInfo } from './api';
import { socketUrl } from './platform';

export type ConnStatus = 'connecting' | 'open' | 'offline';

export interface ConnectionHandlers {
  onMessage(msg: ServerMessage): void;
  onStatus(status: ConnStatus): void;
  /** The socket (re)opened: resend anything the server hasn't confirmed. */
  onOpen(): void;
  /** The table no longer exists on the server. */
  onGone(message: string): void;
}

const HEARTBEAT_MS = 20_000;
const STALE_MS = 50_000;
const MAX_RETRY_MS = 10_000;

export class Connection {
  private ws: WebSocket | null = null;
  private failures = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private beatTimer: ReturnType<typeof setInterval> | undefined;
  private lastHeard = 0;
  private closed = false;
  readonly code: string;
  private readonly deviceId: string;
  private readonly h: ConnectionHandlers;

  constructor(code: string, deviceId: string, handlers: ConnectionHandlers) {
    this.code = code;
    this.deviceId = deviceId;
    this.h = handlers;
    window.addEventListener('online', this.reconnectNow);
    window.addEventListener('offline', this.dropNow);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.open();
  }

  send(msg: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  close(): void {
    this.closed = true;
    clearTimeout(this.retryTimer);
    clearInterval(this.beatTimer);
    window.removeEventListener('online', this.reconnectNow);
    window.removeEventListener('offline', this.dropNow);
    document.removeEventListener('visibilitychange', this.onVisibility);
    const ws = this.ws;
    this.ws = null;
    ws?.close(1000, 'Bye');
  }

  private url(): string {
    return socketUrl(`/api/tables/${this.code}/ws?device=${encodeURIComponent(this.deviceId)}`);
  }

  private open = (): void => {
    if (this.closed) return;
    clearTimeout(this.retryTimer);
    this.h.onStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url());
    } catch {
      this.retryLater();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      // A socket that was replaced or closed while it was still connecting must not report in.
      if (this.ws !== ws) {
        ws.close();
        return;
      }
      this.failures = 0;
      this.lastHeard = Date.now();
      this.h.onStatus('open');
      this.h.onOpen();
      this.startHeartbeat();
    };
    ws.onmessage = (event) => {
      // A closing socket can still deliver a last message. It must not reach whatever table the app has moved on to.
      if (this.ws !== ws) return;
      this.lastHeard = Date.now();
      try {
        const msg: unknown = JSON.parse(String(event.data));
        if (typeof msg !== 'object' || msg === null || typeof (msg as { t?: unknown }).t !== 'string') return;
        this.h.onMessage(msg as ServerMessage);
      } catch {
        // Ignore anything that isn't JSON.
      }
    };
    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      clearInterval(this.beatTimer);
      if (event.code === 4404 || event.code === 4410) {
        this.closed = true;
        this.h.onGone(event.code === 4410 ? 'That table has closed.' : 'That table no longer exists.');
        return;
      }
      this.h.onStatus('offline');
      this.retryLater();
    };
  };

  private retryLater(): void {
    if (this.closed) return;
    this.failures += 1;
    // A refused upgrade looks like a network drop, so after a few failures check the table still exists.
    if (this.failures === 3) {
      fetchTableInfo(this.code)
        .then((info) => {
          if (!info && !this.closed) {
            this.closed = true;
            this.h.onGone('That table no longer exists.');
          }
        })
        .catch(() => undefined);
    }
    const delay = Math.min(MAX_RETRY_MS, 500 * 2 ** Math.min(this.failures, 5)) * (0.75 + Math.random() * 0.5);
    this.retryTimer = setTimeout(this.open, delay);
  }

  private startHeartbeat(): void {
    clearInterval(this.beatTimer);
    this.beatTimer = setInterval(() => {
      if (Date.now() - this.lastHeard > STALE_MS) {
        // Nothing heard for too long: the link is dead even if the socket says it's open. Closing a dead
        // socket can take minutes to report back, so let go of it now and reconnect.
        this.dropNow();
        return;
      }
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(PING);
    }, HEARTBEAT_MS);
  }

  private reconnectNow = (): void => {
    if (this.closed) return;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.failures = 0;
      this.open();
    }
  };

  /** The phone says it lost signal: don't wait for the heartbeat to notice. */
  private dropNow = (): void => {
    if (this.closed || !this.ws) return;
    const ws = this.ws;
    this.ws = null;
    clearInterval(this.beatTimer);
    ws.close();
    this.h.onStatus('offline');
    this.retryLater();
  };

  private onVisibility = (): void => {
    if (document.visibilityState !== 'visible') return;
    if (this.ws?.readyState === WebSocket.OPEN) this.send({ t: 'sync' });
    else this.reconnectNow();
  };
}
