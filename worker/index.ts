import {
  createTable,
  isCode,
  isDeviceId,
  isEmoji,
  isNameBlocked,
  sanitizeTwin,
  shareableTwin,
  cleanName,
  codeFromKey,
  isIdempotencyKey,
  newCode,
  parseSettings,
  DEFAULT_SETTINGS,
  MAX_SEATS,
  type CreateTableResponse,
  type CreateTwinShareResponse,
  type Settings,
} from '../src/game';

import { hashSecret } from './twinShare';

export { TableRoom } from './room';
export { TwinShare } from './twinShare';

const MAX_BODY_CHARS = 16 * 1024;
/** A shared twin is a few dozen KB of counters. */
const MAX_TWIN_CHARS = 160 * 1024;

/**
 * A rough per-address limit, kept in this Worker instance's memory. Instances come and go, so it isn't
 * a hard cap, but it stops a script hammering one spot. The firm version is a Cloudflare rate-limiting
 * rule on /api/tables and /api/gto in the dashboard.
 */
const hits = new Map<string, number[]>();
function limited(request: Request, bucket: string, max: number, windowMs: number): boolean {
  const key = `${bucket}:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
  return recent.length > max;
}

/** A browser opening a socket says which site it's on. Anything but this app (or a local copy) is turned away. */
function sameSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === new URL(request.url).hostname || host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

async function readJson(request: Request, max = MAX_BODY_CHARS): Promise<unknown> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > max) return null;
  const text = await request.text();
  if (text.length > max) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * The Idempotency-Key header of a request that makes something: undefined when there isn't one, null when it's no good.
 * With a key, a retry of the same request (same device, same key) gets the first try's table or share back.
 */
function idempotencyKey(request: Request): string | undefined | null {
  const key = request.headers.get('idempotency-key');
  if (key === null) return undefined;
  return isIdempotencyKey(key) ? key : null;
}

/** POST /api/tables: open a new table with this phone as host, and give it a join code. */
async function createTableRoute(request: Request, env: Env): Promise<Response> {
  if (limited(request, 'create', 20, 60 * 60_000)) return json({ error: 'Too many tables opened. Try again later.' }, 429);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
  const name = typeof body.name === 'string' ? cleanName(body.name) : '';
  if (!name) return json({ error: 'Add your name first.' }, 400);
  if (isNameBlocked(name)) return json({ error: 'Pick a different name.' }, 400);
  if (!isEmoji(body.emoji)) return json({ error: 'Pick an emoji.' }, 400);
  const settings = parseSettings(body.settings, false);
  if (!settings) return json({ error: "Those table settings don't work." }, 400);
  const bots = typeof body.bots === 'number' && Number.isInteger(body.bots) ? Math.max(0, Math.min(MAX_SEATS - 1, body.bots)) : 0;
  // Showing a twin code means owning it: anything else is quietly left off.
  const twinCode = isCode(body.twinCode) && (await env.TWIN_SHARE.getByName(body.twinCode).owner()) === body.deviceId ? body.twinCode : undefined;

  const key = idempotencyKey(request);
  if (key === null) return json({ error: 'That Idempotency-Key is not valid.' }, 400);

  // Codes are random, so a clash is rare. Try a few before giving up. With a key they aren't random: the same
  // key tries the same codes in the same order, so a retry lands on the table its first try made.
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = key ? await codeFromKey('table', body.deviceId, key, attempt) : newCode();
    const game = createTable({
      hostDeviceId: body.deviceId,
      name,
      emoji: body.emoji,
      settings: { ...DEFAULT_SETTINGS, ...settings } as Settings,
      bots,
      twinCode,
      code,
      now: Date.now(),
    });
    const made = await env.TABLE_ROOM.getByName(code).create(game, key ? `${body.deviceId}:${key}` : undefined);
    if (made === 'created') return json({ code } satisfies CreateTableResponse, 201);
    if (made === 'replay') return json({ code } satisfies CreateTableResponse, 200, { 'idempotent-replayed': 'true' });
  }
  return json({ error: "Couldn't find a free code. Try again." }, 503);
}

/** /api/gto/*: passed through to the GTO coach service, so the app talks to one origin. */
async function gtoProxy(request: Request, env: Env, pathname: string, search: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Not found.' }, 405);
  if (limited(request, 'gto', 120, 60_000)) return json({ error: 'Slow down a little.' }, 429);
  const base = (env.GTO_URL ?? '').replace(/\/$/, '');
  if (!base) return json({ error: "The GTO coach isn't connected yet." }, 503);
  const init: RequestInit = { method: request.method, headers: { 'content-type': 'application/json' } };
  if (request.method === 'POST') {
    const body = await request.text();
    if (body.length > 256 * 1024) return json({ error: 'That request is too big.' }, 413);
    init.body = body;
  }
  try {
    const res = await fetch(`${base}${pathname.slice('/api/gto'.length)}${search}`, init);
    return new Response(res.body, { status: res.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  } catch {
    return json({ error: "Couldn't reach the GTO coach." }, 502);
  }
}

/** The parts of a share request that every route checks: who it's from, and the twin's name, picture and numbers. */
function twinFields(body: Record<string, unknown>): { name: string; emoji: string; profile: ReturnType<typeof sanitizeTwin> } | { error: string } {
  const name = typeof body.name === 'string' ? cleanName(body.name) : '';
  if (!name) return { error: 'Add your name first.' };
  if (isNameBlocked(name)) return { error: 'Pick a different name.' };
  if (!isEmoji(body.emoji)) return { error: 'Pick an emoji.' };
  // Whatever a phone sends, only counters are kept: no list of hands, and only the spots seen most.
  const profile = shareableTwin(sanitizeTwin(body.profile));
  if (profile.hands <= 0) return { error: "There's nothing to share yet." };
  return { name, emoji: body.emoji, profile };
}

/** POST /api/twins starts sharing a twin. GET, PUT and DELETE /api/twins/:code read, refresh and stop it. */
async function twinRoute(request: Request, env: Env, pathname: string): Promise<Response> {
  const match = pathname.match(/^\/api\/twins(?:\/([^/]+))?$/);
  if (!match) return json({ error: 'Not found.' }, 404);
  const code = match[1]?.toUpperCase();

  if (!code) {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (limited(request, 'twin-create', 20, 60 * 60_000)) return json({ error: 'Too many shares started. Try again later.' }, 429);
    const body = (await readJson(request, MAX_TWIN_CHARS)) as Record<string, unknown> | null;
    if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
    const fields = twinFields(body);
    if ('error' in fields) return json({ error: fields.error }, 400);
    const key = idempotencyKey(request);
    if (key === null) return json({ error: 'That Idempotency-Key is not valid.' }, 400);
    // A retry gets a fresh secret and the share swaps to it: the first try's answer never reached the phone.
    const secret = `${newCode()}${newCode()}${newCode()}${newCode()}`.toLowerCase();
    const secretHash = await hashSecret(secret);
    for (let attempt = 0; attempt < 6; attempt++) {
      const fresh = key ? await codeFromKey('twin', body.deviceId, key, attempt) : newCode();
      const made = await env.TWIN_SHARE.getByName(fresh).create(body.deviceId, secretHash, fields.name, fields.emoji, fields.profile, key ? `${body.deviceId}:${key}` : undefined);
      if (made === 'created') return json({ code: fresh, secret } satisfies CreateTwinShareResponse, 201);
      if (made === 'replay') return json({ code: fresh, secret } satisfies CreateTwinShareResponse, 200, { 'idempotent-replayed': 'true' });
    }
    return json({ error: "Couldn't find a free code. Try again." }, 503);
  }

  if (!isCode(code)) return json({ error: "That code doesn't look right." }, 400);
  const share = env.TWIN_SHARE.getByName(code);

  if (request.method === 'GET') {
    // Codes are short, so looking one up is slow on purpose.
    if (limited(request, 'twin-get', 40, 10 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
    const twin = await share.get(code);
    return twin ? json(twin) : json({ error: 'No twin with that code.' }, 404);
  }

  if (request.method === 'PUT' || request.method === 'DELETE') {
    if (limited(request, 'twin-change', 120, 60 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
    const body = (await readJson(request, MAX_TWIN_CHARS)) as Record<string, unknown> | null;
    if (!body || typeof body.secret !== 'string' || body.secret.length < 8 || body.secret.length > 128) return json({ error: 'Missing secret.' }, 400);
    const secretHash = await hashSecret(body.secret);
    let result: 'ok' | 'missing' | 'forbidden';
    if (request.method === 'DELETE') result = await share.remove(secretHash);
    else {
      const fields = twinFields(body);
      if ('error' in fields) return json({ error: fields.error }, 400);
      result = await share.update(secretHash, fields.name, fields.emoji, fields.profile);
    }
    if (result === 'missing') return json({ error: 'No twin with that code.' }, 404);
    if (result === 'forbidden') return json({ error: 'That twin belongs to another phone.' }, 403);
    return json({ ok: true });
  }
  return json({ error: 'Not found.' }, 405);
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname, search } = new URL(request.url);

    if (pathname.startsWith('/api/gto/')) return gtoProxy(request, env, pathname, search);

    if (pathname === '/api/twins' || pathname.startsWith('/api/twins/')) return twinRoute(request, env, pathname);

    if (pathname === '/api/health') return json({ ok: true });
    if (pathname === '/api/tables') {
      return request.method === 'POST' ? createTableRoute(request, env) : json({ error: 'Use POST.' }, 405);
    }

    const match = pathname.match(/^\/api\/tables\/([^/]+)(\/ws)?$/);
    if (match) {
      const code = match[1].toUpperCase();
      if (!isCode(code)) return json({ error: "That code doesn't look right." }, 400);
      const room = env.TABLE_ROOM.getByName(code);
      if (match[2]) return sameSite(request) ? room.fetch(request) : json({ error: 'Not allowed.' }, 403);
      if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
      const info = await room.info();
      return info ? json(info) : json({ error: 'No table with that code.' }, 404);
    }

    return json({ error: 'Not found.' }, 404);
  },
} satisfies ExportedHandler<Env>;
