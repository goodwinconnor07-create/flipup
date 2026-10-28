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
  isVariant,
  validPartySettings,
  type PartySettings,
  type CreateFriendCardResponse,
  type Settings,
} from '../src/game';

export { TableRoom } from './room';
export { PartyRoom } from './party';
export { FriendCard } from './friendCard';

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

/** The name and picture a phone sends with a party or friend request, or an error sentence. */
function lookFields(body: Record<string, unknown>): { name: string; emoji: string } | { error: string } {
  const name = typeof body.name === 'string' ? cleanName(body.name) : '';
  if (!name) return { error: 'Add your name first.' };
  if (isNameBlocked(name)) return { error: 'Pick a different name.' };
  if (!isEmoji(body.emoji)) return { error: 'Pick an emoji.' };
  return { name, emoji: body.emoji };
}

/** Friend codes shown in a party only count if this phone owns them. */
async function ownedCode(env: Env, code: unknown, deviceId: string): Promise<string | undefined> {
  if (!isCode(code)) return undefined;
  const owner = await env.FRIEND_CARD.getByName(code).owner();
  return owner === deviceId ? code : undefined;
}

/** POST /api/friends claims a friend code. GET and PUT /api/friends/:code look one up and refresh it. */
async function friendRoute(request: Request, env: Env, pathname: string): Promise<Response> {
  const match = pathname.match(/^\/api\/friends(?:\/([^/]+))?$/);
  if (!match) return json({ error: 'Not found.' }, 404);
  const code = match[1]?.toUpperCase();

  if (!code) {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (limited(request, 'friend-create', 20, 60 * 60_000)) return json({ error: 'Too many codes made. Try again later.' }, 429);
    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
    const look = lookFields(body);
    if ('error' in look) return json({ error: look.error }, 400);
    for (let attempt = 0; attempt < 6; attempt++) {
      const fresh = newCode();
      if (await env.FRIEND_CARD.getByName(fresh).create(body.deviceId, look.name, look.emoji)) return json({ code: fresh } satisfies CreateFriendCardResponse, 201);
    }
    return json({ error: "Couldn't find a free code. Try again." }, 503);
  }

  if (!isCode(code)) return json({ error: "That code doesn't look right." }, 400);
  const card = env.FRIEND_CARD.getByName(code);
  if (request.method === 'GET') {
    // Codes are short, so looking them up is slow on purpose.
    if (limited(request, 'friend-get', 60, 10 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
    const info = await card.get(code);
    return info ? json(info) : json({ error: 'No friend with that code.' }, 404);
  }
  if (request.method === 'PUT') {
    if (limited(request, 'friend-change', 120, 60 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
    const look = lookFields(body);
    if ('error' in look) return json({ error: look.error }, 400);
    const result = await card.update(body.deviceId, look.name, look.emoji);
    if (result === 'missing') return json({ error: 'No friend with that code.' }, 404);
    if (result === 'forbidden') return json({ error: 'That code belongs to another phone.' }, 403);
    return json({ ok: true });
  }
  return json({ error: 'Not found.' }, 405);
}

/** POST /api/parties opens a party. GET /api/parties/:code?device= reads it; POST /api/parties/:code/join|leave|start|skip changes it. */
async function partyRoute(request: Request, env: Env, pathname: string, search: string): Promise<Response> {
  const match = pathname.match(/^\/api\/parties(?:\/([^/]+)(?:\/(join|leave|start|skip))?)?$/);
  if (!match) return json({ error: 'Not found.' }, 404);
  const code = match[1]?.toUpperCase();
  const action = match[2];

  if (!code) {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (limited(request, 'party-create', 20, 60 * 60_000)) return json({ error: 'Too many parties opened. Try again later.' }, 429);
    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
    const look = lookFields(body);
    if ('error' in look) return json({ error: look.error }, 400);
    const settings = body.settings as PartySettings | undefined;
    if (!settings || !validPartySettings(settings, isVariant)) return json({ error: "Those party settings don't work." }, 400);
    const person = { ...look, friendCode: await ownedCode(env, body.friendCode, body.deviceId) };
    for (let attempt = 0; attempt < 6; attempt++) {
      const fresh = newCode();
      if (await env.PARTY_ROOM.getByName(fresh).create(fresh, body.deviceId, person, { games: settings.games, startingStack: settings.startingStack, blindHands: settings.blindHands, fillTo: settings.fillTo })) {
        return json({ code: fresh }, 201);
      }
    }
    return json({ error: "Couldn't find a free code. Try again." }, 503);
  }

  if (!isCode(code)) return json({ error: "That code doesn't look right." }, 400);
  const room = env.PARTY_ROOM.getByName(code);

  if (!action) {
    if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
    const device = new URL(`http://x/${search}`).searchParams.get('device');
    const view = await room.view(code, isDeviceId(device) ? device : null);
    return view ? json(view) : json({ error: 'No party with that code.' }, 404);
  }

  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (limited(request, 'party-act', 240, 60_000)) return json({ error: 'Slow down a little.' }, 429);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
  let result;
  if (action === 'join') {
    const look = lookFields(body);
    if ('error' in look) return json({ error: look.error }, 400);
    result = await room.join(code, body.deviceId, { ...look, friendCode: await ownedCode(env, body.friendCode, body.deviceId) });
  } else if (action === 'leave') result = await room.leave(code, body.deviceId);
  else if (action === 'start') result = await room.start(code, body.deviceId);
  else result = await room.skip(code, body.deviceId);
  return result.ok ? json(result.view) : json({ error: result.error }, result.error.startsWith('No party') ? 404 : 400);
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname, search } = new URL(request.url);

    if (pathname === '/api/friends' || pathname.startsWith('/api/friends/')) return friendRoute(request, env, pathname);
    if (pathname === '/api/parties' || pathname.startsWith('/api/parties/')) return partyRoute(request, env, pathname, search);

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
