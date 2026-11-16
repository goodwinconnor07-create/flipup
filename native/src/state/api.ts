// HTTP calls to the FlipUp server (the Cloudflare Worker that also serves playflipup.com). The address is APP_INFO.apiOrigin;
// EXPO_PUBLIC_API_ORIGIN points a development build at a local server instead.
import type { CreateTableRequest, CreateTableResponse, PartySettings, PartyView, ReportRequest, TableInfo } from '@/engine';

import { APP_INFO } from '../../appInfo';
import { deviceId } from './device';
import { noteRequestTimeout, REQUEST_TIMEOUT_MS } from './request-timeout';

export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || APP_INFO.apiOrigin;

export const socketUrl = (path: string) => API_ORIGIN.replace(/^http/, 'ws') + path;

/** The link a friend opens to join: the app when it's installed, else playflipup.com's join page. */
export const joinLink = (code: string) => `${APP_INFO.apiOrigin}/${code}`;
/** A party's link, for its QR code: the Join sheet reads the /party/ in it, and `app/party/[code].tsx` opens it. */
export const partyLink = (code: string) => `${APP_INFO.apiOrigin}/party/${code}`;

async function request(path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.min(timeoutMs, REQUEST_TIMEOUT_MS));
  try {
    return await fetch(API_ORIGIN + path, { ...init, signal: controller.signal });
  } catch {
    if (timedOut) noteRequestTimeout();
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

/** The body of an answer that should be JSON. A web page instead (hotel or airport Wi-Fi sign-in, a proxy) gets a sentence, not "Unexpected token '<'". */
async function answerJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw new Error("The server's answer didn't look right. Check your connection and try again.");
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
  return ((await answerJson(res)) as CreateTableResponse).code;
}

/** Join details for a code, or null if there's no such table. */
export async function fetchTableInfo(code: string): Promise<TableInfo | null> {
  const res = await request(`/api/tables/${encodeURIComponent(code)}`);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, 'Something went wrong. Try again.'));
  return (await answerJson(res)) as TableInfo;
}

// Parties.

const json = (path: string, init: RequestInit) => request(path, { ...init, headers: { 'content-type': 'application/json' } });

export async function createPartyOnServer(body: { deviceId: string; name: string; emoji: string; settings: PartySettings }): Promise<string> {
  const res = await request('/api/parties', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (res.status === 402) throw new PremiumRequiredError(await errorText(res, 'Hosting these games needs FlipUp Premium.'));
  if (!res.ok) throw new Error(await errorText(res, "Couldn't open a party. Try again."));
  return ((await answerJson(res)) as { code: string }).code;
}

/** The party as this phone sees it, or null if there's no such party. */
export async function fetchParty(code: string, deviceId: string): Promise<PartyView | null> {
  const res = await json(`/api/parties/${encodeURIComponent(code)}?device=${encodeURIComponent(deviceId)}`, { method: 'GET' });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(await errorText(res, 'Something went wrong. Try again.'));
  return (await answerJson(res)) as PartyView;
}

export async function partyAct(code: string, action: 'join' | 'leave' | 'start' | 'skip' | 'settings', body: Record<string, unknown>): Promise<PartyView> {
  const res = await json(`/api/parties/${encodeURIComponent(code)}/${action}`, { method: 'POST', body: JSON.stringify(body) });
  if (res.status === 402) throw new PremiumRequiredError(await errorText(res, 'Hosting these games needs FlipUp Premium.'));
  if (!res.ok) throw new Error(await errorText(res, 'Something went wrong. Try again.'));
  return (await answerJson(res)) as PartyView;
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
