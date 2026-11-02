// HTTP calls to the FlipUp server (the same Cloudflare Worker as the web app). The address is APP_INFO.apiOrigin;
// EXPO_PUBLIC_API_ORIGIN points a development build at a local server instead.
import type { CreateTableRequest, CreateTableResponse, TableInfo } from '@/engine';

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
