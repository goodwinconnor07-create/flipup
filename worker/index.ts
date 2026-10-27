import {
  createTable,
  isCode,
  isDeviceId,
  isEmoji,
  isNameBlocked,
  cleanName,
  newCode,
  parseSettings,
  DEFAULT_SETTINGS,
  MAX_SEATS,
  type CreateTableResponse,
  type Settings,
} from '../src/game';

export { TableRoom } from './room';

const MAX_BODY_CHARS = 16 * 1024;

/**
 * A rough per-address limit, kept in this Worker instance's memory. Instances come and go, so it isn't
 * a hard cap, but it stops a script hammering one spot. The firm version is a Cloudflare rate-limiting
 * rule on /api/tables in the dashboard.
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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
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

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);

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
