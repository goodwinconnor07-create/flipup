// HTTP calls to the GTODuel server (the Cloudflare Worker in /worker).

import { sanitizeTwin, type CreateFriendCardResponse, type FriendCardInfo, type PartySettings, type PartyView, type CreateTableRequest, type CreateTableResponse, type CreateTwinShareResponse, type SharedTwin, type TableInfo, type TwinProfile } from '../game';
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

// ── Shared twins ────────────────────────────────────────────────────────────

async function twinRequest(path: string, init: RequestInit): Promise<Response> {
  try {
    return await request(path, { ...init, headers: { 'content-type': 'application/json' } }, 12_000);
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
}

/** Starts sharing a twin: returns the code friends use and the secret only this phone keeps. */
export async function createTwinShare(body: { deviceId: string; name: string; emoji: string; profile: TwinProfile }): Promise<CreateTwinShareResponse> {
  const res = await twinRequest('/api/twins', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't share your twin. Try again."));
  return (await res.json()) as CreateTwinShareResponse;
}

/** Sends new numbers. Returns false when the share has gone (expired or stopped). */
export async function updateTwinShare(code: string, body: { secret: string; name: string; emoji: string; profile: TwinProfile }): Promise<boolean> {
  const res = await twinRequest(`/api/twins/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(body) });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(await errorText(res, "Couldn't update your shared twin."));
  return true;
}

/** Stops sharing and deletes the copy on the server. */
export async function deleteTwinShare(code: string, secret: string): Promise<void> {
  const res = await twinRequest(`/api/twins/${encodeURIComponent(code)}`, { method: 'DELETE', body: JSON.stringify({ secret }) });
  if (!res.ok && res.status !== 404) throw new Error(await errorText(res, "Couldn't stop sharing."));
}

/** A friend's shared twin by its code, or null if there's none with that code. */
export async function fetchSharedTwin(code: string): Promise<SharedTwin | null> {
  const res = await twinRequest(`/api/twins/${encodeURIComponent(code)}`, { method: 'GET' });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, "Couldn't look that code up. Try again."));
  const twin = (await res.json()) as SharedTwin;
  return { ...twin, profile: sanitizeTwin(twin.profile) };
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
export async function updateFriendCard(code: string, body: { deviceId: string; name: string; emoji: string }): Promise<boolean> {
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
