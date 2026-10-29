// Messages between the app and the table server (a Cloudflare Durable Object).

import type { Action, Game, HandLog, Settings, Status } from './types';
import type { CampaignCard } from './campaign';

/** What the join screen needs to know about a table. */
export interface TableInfo {
  code: string;
  status: Status;
  hostName: string;
  players: { name: string; emoji: string; bot: boolean }[];
  settings: Settings;
  seatsLeft: number;
  /** A campaign table with friends: what it costs to sit down, and for a tournament the prize drawn. */
  campaign?: Game['campaign'];
}

export interface CreateTableRequest {
  deviceId: string;
  name: string;
  emoji: string;
  settings: Settings;
  bots: number;
  /** A campaign table for friends: the server sets its stakes (and draws a tournament's prize) from this. */
  campaign?: { kind: 'cash' | 'sng'; id: string };
}

export interface CreateTableResponse {
  code: string;
}

export type ClientMessage =
  /** An action to apply. `id` comes back as `ack` so the app knows it landed. */
  | { t: 'act'; id: string; a: Action }
  /** Ask for the latest state. */
  | { t: 'sync' }
  /** Ask for the hand log. */
  | { t: 'log' }
  | { t: 'ping' };

export type ServerMessage =
  { t: 'state'; game: Game; ack?: string } | { t: 'reject'; id?: string; error: string } | { t: 'log'; logs: HandLog[] } | { t: 'pong' };

/** Heartbeats are fixed strings so the server can answer without waking up. */
export const PING = '{"t":"ping"}';
export const PONG = '{"t":"pong"}';

/** A friend code's public details. */
export interface FriendCardInfo {
  code: string;
  name: string;
  emoji: string;
  /** How their campaign is going, if they've shared it. */
  campaign?: CampaignCard;
}

export interface CreateFriendCardResponse {
  code: string;
}
