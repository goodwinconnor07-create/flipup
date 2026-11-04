// HTTP calls to the FlipUp server (the same Cloudflare Worker as the web app). The address is APP_INFO.apiOrigin;
// EXPO_PUBLIC_API_ORIGIN points a development build at a local server instead.
import type { BjInvite, FriendRequest, InviteDeclined, CreateFriendCardResponse, CreateTableRequest, CreateTableResponse, FriendCardInfo, PartySettings, PartyView, ReportRequest, TableInfo } from '@/engine';

import { APP_INFO } from '../../appInfo';
import { deviceId } from './device';

export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || APP_INFO.apiOrigin;

export const socketUrl = (path: string) => API_ORIGIN.replace(/^http/, 'ws') + path;

/** The link a friend opens to join (the web app at the same address). */
export const joinLink = (code: string) => `${APP_INFO.apiOrigin}/${code}`;
/** A party's link, for its QR code: the Join tab reads the /party/ in it. */
export const partyLink = (code: string) => `${APP_INFO.apiOrigin}/party/${code}`;

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

/** The server turned a host away because the game needs FlipUp Premium (HTTP 402). */
export class PremiumRequiredError extends Error {}

/** Opens a table on the server and returns its join code. */
export async function createOnlineTable(body: CreateTableRequest): Promise<string> {
  const res = await request('/api/tables', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (res.status === 402) throw new PremiumRequiredError(await errorText(res, 'Hosting this game needs FlipUp Premium.'));
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

/** Friend requests, invites and the friends list, as the server keeps them for this phone's code. */
export interface Inbox {
  requests: FriendRequest[];
  invites: BjInvite[];
  friends: FriendCardInfo[];
  /** Who you've asked and are still waiting on. A server from before Pending leaves it out. */
  sent?: FriendCardInfo[];
}

/** The cheap check polled every few seconds: one read of your own card, codes only. */
export interface FriendPoll {
  requests: FriendRequest[];
  invites: BjInvite[];
  friends: string[];
  sent: string[];
  /** Friends who said no to your table invites (an older server leaves it out). */
  declined: InviteDeclined[];
}

/** What's waiting for this phone's friend code. Null when the code isn't this phone's (or has gone). */
export async function fetchInbox(code: string, deviceId: string): Promise<Inbox | null> {
  const res = await json(`/api/friends/${encodeURIComponent(code)}/inbox?device=${encodeURIComponent(deviceId)}`, { method: 'GET' });
  if (res.status === 403 || res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, "Couldn't check for friend requests."));
  return (await res.json()) as Inbox;
}

/**
 * The cheap check: requests and invites waiting, your friends' codes and who you've asked. Null when the code isn't
 * this phone's; 'old' when the server is from before this route (it then answers with the full inbox instead).
 */
export async function pollFriendCard(code: string, deviceId: string): Promise<FriendPoll | null | 'old'> {
  const res = await json(`/api/friends/${encodeURIComponent(code)}/requests?device=${encodeURIComponent(deviceId)}`, { method: 'GET' });
  if (res.status === 404) return 'old';
  if (res.status === 403 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, "Couldn't check for friend requests."));
  const box = (await res.json()) as Partial<FriendPoll>;
  return { requests: box.requests ?? [], invites: box.invites ?? [], friends: box.friends ?? [], sent: box.sent ?? [], declined: box.declined ?? [] };
}

/** Sets this phone's username. Throws with the server's sentence (taken, too soon, not allowed). */
export async function setUsernameOnServer(code: string, body: { deviceId: string; username: string }): Promise<string> {
  const res = await json(`/api/friends/${encodeURIComponent(code)}/username`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await errorText(res, "Couldn't save your username. Try again.");
    // A server from before usernames answers the route itself with a bare "Not found."
    throw new Error(text === 'Not found.' ? "Usernames aren't open yet. Try again soon." : text);
  }
  return ((await res.json()) as { username: string }).username;
}

/** The person with this username, or null. */
export async function findUsername(username: string): Promise<FriendCardInfo | null> {
  const res = await json(`/api/usernames/${encodeURIComponent(username)}`, { method: 'GET' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await errorText(res, "Couldn't look that up. Try again."));
  return (await res.json()) as FriendCardInfo;
}

/** Asks `code` to be friends. 'friends' when you already are (or they'd asked you). */
export async function requestFriend(code: string, body: { deviceId: string; fromCode: string }): Promise<'sent' | 'friends'> {
  const res = await json(`/api/friends/${encodeURIComponent(code)}/request`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't send the request. Try again."));
  return ((await res.json()) as { status: 'sent' | 'friends' }).status;
}

export async function answerFriend(myCode: string, body: { deviceId: string; from: string; accept: boolean }): Promise<void> {
  const res = await json(`/api/friends/${encodeURIComponent(myCode)}/answer`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok && res.status !== 404) throw new Error(await errorText(res, "Couldn't answer. Try again."));
}

export async function unfriendOnServer(myCode: string, body: { deviceId: string; other: string }): Promise<void> {
  const res = await json(`/api/friends/${encodeURIComponent(myCode)}/unfriend`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't remove them. Try again."));
}

/** Says no to a friend's table invite: it leaves your card and they hear on their next check. */
export async function declineTableInvite(mine: string, body: { deviceId: string; from: string; table: string }): Promise<void> {
  const res = await json(`/api/friends/${encodeURIComponent(mine)}/decline`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't answer the invite."));
}

/** Takes back your invite to a table you didn't open after all. */
export async function uninviteFromTable(friend: string, body: { deviceId: string; fromCode: string; table: string }): Promise<void> {
  const res = await json(`/api/friends/${encodeURIComponent(friend)}/uninvite`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't take the invite back."));
}

/** Asks a friend to your poker table. */
export async function inviteToTable(friend: string, body: { deviceId: string; fromCode: string; table: string }): Promise<void> {
  const res = await json(`/api/friends/${encodeURIComponent(friend)}/invite`, { method: 'POST', body: JSON.stringify({ ...body, kind: 'table' }) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't send the invite."));
}

export async function createPartyOnServer(body: { deviceId: string; name: string; emoji: string; friendCode?: string; settings: PartySettings }): Promise<string> {
  const res = await request('/api/parties', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, 12_000);
  if (res.status === 402) throw new PremiumRequiredError(await errorText(res, 'Hosting these games needs FlipUp Premium.'));
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

/** Reports a player at your table or party (App Store guideline 1.2). Throws with a sentence to show. */
export async function sendReport(body: ReportRequest): Promise<void> {
  const res = await request('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't send the report. Try again."));
}

/** Shows the server Apple's signed purchase so it ties this phone to it. False when the server won't. */
export async function premiumVerify(signedTransaction: string): Promise<boolean> {
  const res = await json('/api/premium/verify', { method: 'POST', body: JSON.stringify({ deviceId: deviceId(), signedTransaction }) });
  return res.ok;
}

/** Delete my data: the server forgets which purchase this phone is tied to. The purchase stays with Apple. */
export async function premiumForget(): Promise<void> {
  const res = await json('/api/premium/forget', { method: 'POST', body: JSON.stringify({ deviceId: deviceId() }) });
  if (!res.ok) throw new Error(await errorText(res, "Couldn't reach the server."));
}
