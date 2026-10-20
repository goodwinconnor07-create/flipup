import {
  createTable,
  isCode,
  isDeviceId,
  isEmoji,
  isNameBlocked,
  cleanName,
  stripInvisible,
  newCode,
  parseSettings,
  DEFAULT_SETTINGS,
  MAX_SEATS,
  type CreateTableResponse,
  type Settings,
} from '../src/game';

export { TableRoom } from './room';

const MAX_BODY_CHARS = 16 * 1024;
/** Hand histories for a session review are the biggest thing the app sends the coach. */
const MAX_GTO_BODY_CHARS = 512 * 1024;
const GTO_TIMEOUT_MS = 25_000;

const HEADERS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...HEADERS },
  });
}

/** The request body as text, or null if it's bigger than `max` (checked as it streams in, not just from the header). */
async function readText(request: Request, max: number): Promise<string | null> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (!(length <= max)) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > max) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function readJson(request: Request): Promise<unknown> {
  const text = await readText(request, MAX_BODY_CHARS);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** POST /api/tables: open a new table with this phone as host, and give it a join code. */
async function createTableRoute(request: Request, env: Env): Promise<Response> {
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
  const name = typeof body.name === 'string' && body.name.length <= 64 ? cleanName(stripInvisible(body.name)) : '';
  if (!name) return json({ error: 'Add your name first.' }, 400);
  if (isNameBlocked(name)) return json({ error: 'Pick a different name.' }, 400);
  if (!isEmoji(body.emoji)) return json({ error: 'Pick an emoji.' }, 400);
  const settings = parseSettings(body.settings, false);
  if (!settings) return json({ error: "Those table settings don't work." }, 400);
  const bots = typeof body.bots === 'number' && Number.isInteger(body.bots) ? Math.max(0, Math.min(MAX_SEATS - 1, body.bots)) : 0;

  // Codes are random, so a clash is rare. Try a few before giving up.
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = newCode();
    const game = createTable({
      hostDeviceId: body.deviceId,
      name,
      emoji: body.emoji,
      settings: { ...DEFAULT_SETTINGS, ...settings } as Settings,
      bots,
      code,
      now: Date.now(),
    });
    const created = await env.TABLE_ROOM.getByName(code).create(game);
    if (created) return json({ code } satisfies CreateTableResponse, 201);
  }
  return json({ error: "Couldn't find a free code. Try again." }, 503);
}

/** The only coach calls the app makes. Everything else the service offers (docs, heavy solvers) stays closed to the public. */
const GTO_ROUTES: { method: string; path: RegExp }[] = [
  { method: 'POST', path: /^\/(review\/session|analyze|custom\/spot)$/ },
  { method: 'GET', path: /^\/(library|library\/[A-Za-z0-9_-]{1,64}\/drill|jobs\/[A-Za-z0-9_-]{1,64})$/ },
];

/** /api/gto/*: passed through to the GTO coach service, so the app talks to one origin. */
async function gtoProxy(request: Request, env: Env, pathname: string, search: string): Promise<Response> {
  const base = (env.GTO_URL ?? '').replace(/\/$/, '');
  if (!base) return json({ error: "The GTO coach isn't connected yet." }, 503);
  const path = pathname.slice('/api/gto'.length);
  if (!GTO_ROUTES.some((r) => r.method === request.method && r.path.test(path))) return json({ error: 'Not found.' }, 404);
  const init: RequestInit = { method: request.method, headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(GTO_TIMEOUT_MS) };
  if (request.method === 'POST') {
    const body = await readText(request, MAX_GTO_BODY_CHARS);
    if (body === null) return json({ error: 'That request is too big.' }, 413);
    init.body = body;
  }
  try {
    const res = await fetch(`${base}${path}${search}`, init);
    return new Response(res.body, { status: res.status, headers: { 'content-type': 'application/json; charset=utf-8', ...HEADERS } });
  } catch {
    return json({ error: "Couldn't reach the GTO coach." }, 502);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname, search } = new URL(request.url);

    if (pathname.startsWith('/api/gto/')) return gtoProxy(request, env, pathname, search);

    if (pathname === '/api/health') return json({ ok: true });
    if (pathname === '/api/tables') {
      return request.method === 'POST' ? createTableRoute(request, env) : json({ error: 'Use POST.' }, 405);
    }

    const match = pathname.match(/^\/api\/tables\/([^/]+)(\/ws)?$/);
    if (match) {
      const code = match[1].toUpperCase();
      if (!isCode(code)) return json({ error: "That code doesn't look right." }, 400);
      const room = env.TABLE_ROOM.getByName(code);
      if (match[2]) return room.fetch(request);
      if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
      const info = await room.info();
      return info ? json(info) : json({ error: 'No table with that code.' }, 404);
    }

    return json({ error: 'Not found.' }, 404);
  },
} satisfies ExportedHandler<Env>;
