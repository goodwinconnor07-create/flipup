// The live link to an online table, the web app's Connection on the phone: it reconnects by itself when signal comes
// and goes (backing off up to 10s), sends a heartbeat, treats 50s of silence as a dead link, and asks for the latest
// state when the app comes back to the front.
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import { PING, type ClientMessage, type ServerMessage } from '@/engine';

import { fetchTableInfo, socketUrl } from './api';

export type ConnStatus = 'connecting' | 'open' | 'offline';

export interface ConnectionHandlers {
  onMessage(msg: ServerMessage): void;
  onStatus(status: ConnStatus): void;
  /** The socket (re)opened. */
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
  private appState: NativeEventSubscription;

  constructor(
    readonly code: string,
    private readonly deviceId: string,
    private readonly h: ConnectionHandlers,
  ) {
    this.appState = AppState.addEventListener('change', this.onAppState);
    this.open();
  }

  send(msg: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  /** Try now, instead of waiting out the back-off (the Try again button). */
  retryNow(): void {
    if (this.closed || this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.failures = 0;
    clearTimeout(this.retryTimer);
    this.open();
  }

  close(): void {
    this.closed = true;
    clearTimeout(this.retryTimer);
    clearInterval(this.beatTimer);
    this.appState.remove();
    const ws = this.ws;
    this.ws = null;
    ws?.close(1000, 'Bye');
  }

  private open = (): void => {
    if (this.closed) return;
    clearTimeout(this.retryTimer);
    this.h.onStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(socketUrl(`/api/tables/${this.code}/ws?device=${encodeURIComponent(this.deviceId)}`));
    } catch {
      this.retryLater();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (this.closed || this.ws !== ws) return;
      this.failures = 0;
      this.lastHeard = Date.now();
      this.h.onStatus('open');
      this.h.onOpen();
      this.startHeartbeat();
    };
    ws.onmessage = (event) => {
      if (this.closed || this.ws !== ws) return;
      this.lastHeard = Date.now();
      try {
        this.h.onMessage(JSON.parse(String(event.data)) as ServerMessage);
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
        this.h.onGone(event.code === 4410 ? event.reason || 'That table has closed.' : 'That table no longer exists.');
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
        this.ws?.close();
        return;
      }
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(PING);
    }, HEARTBEAT_MS);
  }

  private onAppState = (status: AppStateStatus): void => {
    if (status !== 'active' || this.closed) return;
    if (this.ws?.readyState === WebSocket.OPEN) this.send({ t: 'sync' });
    else {
      this.failures = 0;
      this.open();
    }
  };
}
