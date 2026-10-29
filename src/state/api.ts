// HTTP calls to the FlipUp server (the Cloudflare Worker in /worker).

import { type CampaignCard, type CreateFriendCardResponse, type FriendCardInfo, type PartySettings, type PartyView, type CreateTableRequest, type CreateTableResponse, type TableInfo } from '../game';
import { apiUrl } from './platform';

async function request(path: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(apiUrl(path), { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function errorText(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

/** Opens a table on the server and returns its join code. */
export async function createOnlineTable(body: CreateTableRequest): Promise<string> {
  let res: Response;
  try {
    res = await request('/api/tables', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  if (!res.ok) throw new Error(await errorText(res, "Couldn't open a table. Try again."));
  return ((await res.json()) as CreateTableResponse).code;
}

/** Join-screen details for a code, or null if there's no such table. */
export async function fetchTableInfo(code: string): Promise<TableInfo | null> {
  let res: Response;
  try {
    res = await request(`/api/tables/${encodeURIComponent(code)}`);
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, 'Something went wrong. Try again.'));
  return (await res.json()) as TableInfo;
}

// ── Friend codes and parties ────────────────────────────────────────────────

async function jsonRequest(path: string, init: RequestInit): Promise<Response> {
  try {
    return await request(path, { ...init, headers: { 'content-type': 'application/json' } }, 12_000);
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
}

/** Claims a friend code for this phone. */
export async function createFriendCard(body: { deviceId: string; name: string; emoji: string }): Promise<string> {
  const res = await jsonRequest('/api/friends', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't make your friend code. Try again."));
  return ((await res.json()) as CreateFriendCardResponse).code;
}

/** Sends a new name and picture. Returns false when the code has gone. */
export async function updateFriendCard(code: string, body: { deviceId: string; name: string; emoji: string; campaign?: CampaignCard }): Promise<boolean> {
  const res = await jsonRequest(`/api/friends/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(body) });
  if (res.status === 404 || res.status === 403) return false;
  if (!res.ok) throw new Error(await errorText(res, "Couldn't update your friend code."));
  return true;
}

/** A friend's name and picture by code, or null if there's none. */
export async function fetchFriendCard(code: string): Promise<FriendCardInfo | null> {
  const res = await jsonRequest(`/api/friends/${encodeURIComponent(code)}`, { method: 'GET' });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, "Couldn't look that code up. Try again."));
  return (await res.json()) as FriendCardInfo;
}

export async function createPartyOnServer(body: { deviceId: string; name: string; emoji: string; friendCode?: string; twinCode?: string; settings: PartySettings }): Promise<string> {
  const res = await jsonRequest('/api/parties', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't open a party. Try again."));
  return ((await res.json()) as { code: string }).code;
}

/** The party as this phone sees it, or null if there's no such party. */
export async function fetchParty(code: string, deviceId: string): Promise<PartyView | null> {
  const res = await jsonRequest(`/api/parties/${encodeURIComponent(code)}?device=${encodeURIComponent(deviceId)}`, { method: 'GET' });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, 'Something went wrong. Try again.'));
  return (await res.json()) as PartyView;
}

export async function partyAct(code: string, action: 'join' | 'leave' | 'start' | 'skip', body: Record<string, unknown>): Promise<PartyView> {
  const res = await jsonRequest(`/api/parties/${encodeURIComponent(code)}/${action}`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, 'Something went wrong. Try again.'));
  return (await res.json()) as PartyView;
}
