// HTTP calls to the FlipUp server (the Cloudflare Worker in /worker).

import { type BjInvite, type CreateBjResponse, type CampaignCard, type CreateFriendCardResponse, type FriendCardInfo, type FriendRequest, type PartySettings, type PartyView, type CreateTableRequest, type CreateTableResponse, type TableInfo } from '../game';
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

// ── Blackjack with friends ──────────────────────────────────────────────────

/** Opens a blackjack table on the server with this phone seated, and returns its code. */
export async function createBlackjackTable(body: { deviceId: string; name: string; emoji: string }): Promise<string> {
  const res = await jsonRequest('/api/blackjack', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't open a table. Try again."));
  return ((await res.json()) as CreateBjResponse).code;
}

// ── Friend requests ─────────────────────────────────────────────────────────

/** Asks `code` to be friends from this phone's own code. 'friends' when they'd asked you too. Throws a plain sentence. */
export async function sendFriendRequest(code: string, body: { deviceId: string; fromCode: string }): Promise<'sent' | 'friends'> {
  const res = await jsonRequest(`/api/friends/${encodeURIComponent(code)}/request`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't send the request. Try again."));
  return ((await res.json()) as { status: 'sent' | 'friends' }).status;
}

/** Says yes or no to a request waiting on this phone's code. A request that's already gone counts as answered. */
export async function answerFriendRequest(code: string, body: { deviceId: string; from: string; accept: boolean }): Promise<void> {
  const res = await jsonRequest(`/api/friends/${encodeURIComponent(code)}/answer`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok && res.status !== 404) throw new Error(await errorText(res, "Couldn't answer. Try again."));
}

/** Ends a friendship, or an ask either way, on both cards. */
export async function unfriendOnServer(code: string, body: { deviceId: string; other: string }): Promise<void> {
  const res = await jsonRequest(`/api/friends/${encodeURIComponent(code)}/unfriend`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't remove them. Try again."));
}

export interface FriendRequests {
  requests: FriendRequest[];
  /** Codes this phone has asked that haven't answered. */
  sent: string[];
  /** Codes on this phone's server-side friends list. */
  friends: string[];
}

/** The requests waiting on this phone's code, and where its own asks stand. Null if the server says no. */
export async function fetchFriendRequests(code: string, deviceId: string): Promise<FriendRequests | null> {
  const res = await jsonRequest(`/api/friends/${encodeURIComponent(code)}/requests?device=${encodeURIComponent(deviceId)}`, { method: 'GET' });
  if (!res.ok) return null;
  return (await res.json()) as FriendRequests;
}

/** The same, with each friend's card (name, picture, campaign) in one call: for a pull to refresh. */
export async function fetchFriendInbox(code: string, deviceId: string): Promise<{ requests: FriendRequest[]; sent: string[]; friends: FriendCardInfo[] } | null> {
  const res = await jsonRequest(`/api/friends/${encodeURIComponent(code)}/inbox?device=${encodeURIComponent(deviceId)}`, { method: 'GET' });
  if (!res.ok) return null;
  const body = (await res.json()) as { requests?: FriendRequest[]; sent?: string[]; friends?: FriendCardInfo[] };
  return { requests: body.requests ?? [], sent: body.sent ?? [], friends: body.friends ?? [] };
}

/** Asks a friend (by their friend code) to your table. */
export async function sendBjInvite(friend: string, body: { deviceId: string; fromCode: string; table: string }): Promise<void> {
  const res = await jsonRequest(`/api/friends/${encodeURIComponent(friend)}/invite`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't send the invite. Try again."));
}

/** The invites waiting on this phone's friend code. */
export async function fetchBjInvites(code: string, deviceId: string): Promise<BjInvite[]> {
  const res = await jsonRequest(`/api/friends/${encodeURIComponent(code)}/invites?device=${encodeURIComponent(deviceId)}`, { method: 'GET' });
  if (!res.ok) return [];
  // Poker table invites are for the iPhone app's Friends tab; the web's banner is for blackjack.
  return (((await res.json()) as { invites: BjInvite[] }).invites ?? []).filter((i) => !i.kind || i.kind === 'blackjack');
}
