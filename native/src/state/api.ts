// HTTP calls to the FlipUp server (the same Cloudflare Worker as the web app). The address is APP_INFO.apiOrigin;
// EXPO_PUBLIC_API_ORIGIN points a development build at a local server instead.
import type { CreateFriendCardResponse, CreateTableRequest, CreateTableResponse, FriendCardInfo, PartySettings, PartyView, TableInfo } from '@/engine';

import { APP_INFO } from '../../appInfo';

export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || APP_INFO.apiOrigin;

export const socketUrl = (path: string) => API_ORIGIN.replace(/^http/, 'ws') + path;

/** The link a friend opens to join (the web app at the same address). */
export const joinLink = (code: string) => `${APP_INFO.apiOrigin}/${code}`;

async function request(path: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(API_ORIGIN + path, { ...init, signal: controller.signal });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

async function errorText(res: Response, fallback: string): Promise<string> {
  try {
    return ((await res.json()) as { error?: string }).error || fallback;
  } catch {
    return fallback;
  }
}

/** Opens a table on the server and returns its join code. */
export async function createOnlineTable(body: CreateTableRequest): Promise<string> {
  const res = await request('/api/tables', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't open a table. Try again."));
  return ((await res.json()) as CreateTableResponse).code;
}

/** Join details for a code, or null if there's no such table. */
export async function fetchTableInfo(code: string): Promise<TableInfo | null> {
  const res = await request(`/api/tables/${encodeURIComponent(code)}`);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, 'Something went wrong. Try again.'));
  return (await res.json()) as TableInfo;
}

// Friend codes and parties, the same calls as the web's (src/state/api.ts).

const json = (path: string, init: RequestInit) => request(path, { ...init, headers: { 'content-type': 'application/json' } }, 12_000);

/** Claims a friend code for this phone. */
export async function createFriendCard(body: { deviceId: string; name: string; emoji: string }): Promise<string> {
  const res = await json('/api/friends', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't make your friend code. Try again."));
  return ((await res.json()) as CreateFriendCardResponse).code;
}

/** Sends a new name and picture. Returns false when the code has gone. */
export async function updateFriendCard(code: string, body: { deviceId: string; name: string; emoji: string }): Promise<boolean> {
  const res = await json(`/api/friends/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(body) });
  if (res.status === 404 || res.status === 403) return false;
  if (!res.ok) throw new Error(await errorText(res, "Couldn't update your friend code."));
  return true;
}

/** A friend's name and picture by code, or null if there's none. */
export async function fetchFriendCard(code: string): Promise<FriendCardInfo | null> {
  const res = await json(`/api/friends/${encodeURIComponent(code)}`, { method: 'GET' });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, "Couldn't look that code up. Try again."));
  return (await res.json()) as FriendCardInfo;
}

/** Deletes this phone's friend code on the server ("Delete my data"). A code that's already gone counts as deleted. */
export async function deleteFriendCard(code: string, deviceId: string): Promise<void> {
  const res = await json(`/api/friends/${encodeURIComponent(code)}`, { method: 'DELETE', body: JSON.stringify({ deviceId }) });
  if (!res.ok && res.status !== 404) throw new Error(await errorText(res, "Couldn't delete your friend code. Try again."));
}

export async function createPartyOnServer(body: { deviceId: string; name: string; emoji: string; friendCode?: string; settings: PartySettings }): Promise<string> {
  const res = await json('/api/parties', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't open a party. Try again."));
  return ((await res.json()) as { code: string }).code;
}

/** The party as this phone sees it, or null if there's no such party. */
export async function fetchParty(code: string, deviceId: string): Promise<PartyView | null> {
  const res = await json(`/api/parties/${encodeURIComponent(code)}?device=${encodeURIComponent(deviceId)}`, { method: 'GET' });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, 'Something went wrong. Try again.'));
  return (await res.json()) as PartyView;
}

export async function partyAct(code: string, action: 'join' | 'leave' | 'start' | 'skip', body: Record<string, unknown>): Promise<PartyView> {
  const res = await json(`/api/parties/${encodeURIComponent(code)}/${action}`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, 'Something went wrong. Try again.'));
  return (await res.json()) as PartyView;
}
