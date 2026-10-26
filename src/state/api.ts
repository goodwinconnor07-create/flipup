// HTTP calls to the GTODuel server (the Cloudflare Worker in /worker).

import { IDEMPOTENCY_HEADER, sanitizeTwin, type CreateTableRequest, type CreateTableResponse, type CreateTwinShareResponse, type SharedTwin, type TableInfo, type TwinProfile } from '../game';
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

/** A failure where we can't tell whether the server did the work: no answer, or its own error. Worth trying again with the same key. */
export class UnsureError extends Error {}

/**
 * POST that makes something, sent with its idempotency key on every try. A try that gets no answer, or a 5xx, is
 * tried once more with the same key a moment later: if the first one did get through, the server hands back what it
 * made instead of making it twice. Throws an UnsureError when the answer is still unknown after that.
 */
async function postKeyed(path: string, body: unknown, key: string, timeoutMs: number, unreachable: string): Promise<Response> {
  const init = { method: 'POST', headers: { 'content-type': 'application/json', [IDEMPOTENCY_HEADER]: key }, body: JSON.stringify(body) };
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null;
    try {
      res = await request(path, init, timeoutMs);
    } catch {
      // No answer.
    }
    if (res && res.status < 500) return res;
    if (attempt === 1) throw new UnsureError(res ? await errorText(res, unreachable) : unreachable);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

/** Opens a table on the server and returns its join code. `key` is this attempt's idempotency key. */
export async function createOnlineTable(body: CreateTableRequest, key: string): Promise<string> {
  const res = await postKeyed('/api/tables', body, key, 8000, "Couldn't reach the server. Check your connection and try again.");
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
export async function createTwinShare(body: { deviceId: string; name: string; emoji: string; profile: TwinProfile }, key: string): Promise<CreateTwinShareResponse> {
  const res = await postKeyed('/api/twins', body, key, 12_000, "Couldn't reach the server. Check your connection and try again.");
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
