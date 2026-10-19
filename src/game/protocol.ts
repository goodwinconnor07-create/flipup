// Messages between the app and the table server (a Cloudflare Durable Object).

import type { Action, Game, Settings, Status } from './types';

/** What the join screen needs to know about a table. */
export interface TableInfo {
  code: string;
  status: Status;
  hostName: string;
  players: { name: string; emoji: string; bot: boolean }[];
  settings: Settings;
  seatsLeft: number;
}

export interface CreateTableRequest {
  deviceId: string;
  name: string;
  emoji: string;
  settings: Settings;
  bots: number;
}

export interface CreateTableResponse {
  code: string;
}

export type ClientMessage =
  /** An action to apply. `id` comes back as `ack` so the app knows it landed. */
  | { t: 'act'; id: string; a: Action }
  /** Ask for the latest state. */
  | { t: 'sync' }
  | { t: 'ping' };

export type ServerMessage = { t: 'state'; game: Game; ack?: string } | { t: 'reject'; id?: string; error: string } | { t: 'pong' };

/** Heartbeats are fixed strings so the server can answer without waking up. */
export const PING = '{"t":"ping"}';
export const PONG = '{"t":"pong"}';
