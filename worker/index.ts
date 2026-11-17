import {
  createTable,
  isTableCode,
  newTableCode,
  normalizeTableCode,
  tableCodeProblem,
  isDeviceId,
  isEmoji,
  isNameBlocked,
  cleanName,
  parseSettings,
  DEFAULT_SETTINGS,
  MAX_SEATS,
  type CreateTableResponse,
  isVariant,
  validPartySettings,
  type PartySettings,
  type Settings,
  newId,
  parseReport,
  FREE_BOT_NAMES,
  gamesNeedPremium,
  isFreeBot,
  BOTS,
} from '../src/game';
import { emailReport, type StoredReport } from './reports';
import { forgetDevice, handleNotification, mayHostPremium, verifyPurchase, type VerifyResult } from './premium';
import { waitlistRoute } from './waitlist';
import { isPushToken } from './live';

export { TableRoom } from './room';
export { PartyRoom } from './party';
export { ReportBox } from './reports';
export { Entitlements } from './entitlement';
export { Waitlist } from './waitlist';

const MAX_BODY_CHARS = 16 * 1024;

/**
 * A rough per-address limit, kept in this Worker instance's memory. Instances come and go, so it isn't
 * a hard cap, but it stops a script hammering one spot. The firm version is a Cloudflare rate-limiting
 * rule on /api/tables in the dashboard.
 */
const hits = new Map<string, number[]>();
function limitedHere(request: Request, bucket: string, max: number, windowMs: number): boolean {
  const key = `${bucket}:${request.headers.get('cf-connecting-ip') ?? 'unknown'}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
  return recent.length > max;
}

/**
 * The hourly cap above, then Cloudflare's own limiter (the `ratelimits` bindings in wrangler.jsonc), which every
 * Worker instance shares. A missing binding (a test, an old config) leaves just the hourly cap.
 */
async function limited(request: Request, bucket: string, max: number, windowMs: number, edge?: RateLimit): Promise<boolean> {
  if (limitedHere(request, bucket, max, windowMs)) return true;
  if (!edge) return false;
  try {
    return !(await edge.limit({ key: `${bucket}:${request.headers.get('cf-connecting-ip') ?? 'unknown'}` })).success;
  } catch {
    return false; // The limiter is down: the hourly cap still holds, and a player isn't locked out for it.
  }
}

/**
 * Looking up codes that don't exist, per address: a phone typing a code misses a few times, a script scanning for open
 * tables or parties misses thousands. Only misses count, so a whole party on one Wi-Fi polling every 2 seconds is
 * never slowed down.
 */
const misses = new Map<string, number[]>();
const MISS_MAX = 40;
const MISS_WINDOW = 10 * 60_000;
function missKey(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'unknown';
}
function tooManyMisses(request: Request): boolean {
  const now = Date.now();
  const recent = (misses.get(missKey(request)) ?? []).filter((t) => now - t < MISS_WINDOW);
  return recent.length >= MISS_MAX;
}
function noteMiss(request: Request): void {
  const now = Date.now();
  const key = missKey(request);
  const recent = (misses.get(key) ?? []).filter((t) => now - t < MISS_WINDOW);
  recent.push(now);
  misses.set(key, recent);
  if (misses.size > 5000) for (const [k, v] of misses) if (now - v[v.length - 1] > MISS_WINDOW) misses.delete(k);
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
  if (await limited(request, 'create', 20, 60 * 60_000, env.LIMIT_CREATE)) return json({ error: 'Too many tables opened. Try again later.' }, 429);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
  const name = typeof body.name === 'string' ? cleanName(body.name) : '';
  if (!name) return json({ error: 'Add your name first.' }, 400);
  if (isNameBlocked(name)) return json({ error: 'Pick a different name.' }, 400);
  if (!isEmoji(body.emoji)) return json({ error: 'Pick an emoji.' }, 400);
  const settings = parseSettings(body.settings, false);
  if (!settings) return json({ error: "Those table settings don't work." }, 400);
  if (gamesNeedPremium([settings.variant ?? 'holdem']) && !(await mayHostPremium(env, body.deviceId))) {
    return json({ error: 'Hosting this game needs FlipUp Premium.', premium: true }, 402);
  }
  let bots = typeof body.bots === 'number' && Number.isInteger(body.bots) ? Math.max(0, Math.min(MAX_SEATS - 1, body.bots)) : 0;
  // Bots the host picked by name (the setup page's bots row): only names from the roster, one seat each.
  let botNames = Array.isArray(body.botNames)
    ? [...new Set(body.botNames.filter((n): n is string => typeof n === 'string' && BOTS.some((b) => b.name === n)))].slice(0, MAX_SEATS - 1)
    : [];
  // Without Premium the host seats only the free bots, the picked ones and the random fill alike.
  if (!(await mayHostPremium(env, body.deviceId))) {
    if (botNames.some((n) => !isFreeBot(n))) return json({ error: 'Those bots need FlipUp Premium.', premium: true }, 402);
    const open = FREE_BOT_NAMES.filter((n) => !botNames.includes(n));
    botNames = [...botNames, ...open.slice(0, Math.max(0, bots - botNames.length))];
    bots = botNames.length;
  }

  // The host's own code (the lobby's Change): exactly that one, or an answer saying why not.
  let own: string | undefined;
  if (body.code !== undefined) {
    own = typeof body.code === 'string' ? normalizeTableCode(body.code) : '';
    const problem = tableCodeProblem(own) ?? (isNameBlocked(own) ? 'Pick a different code.' : null);
    if (problem) return json({ error: problem }, 400);
  }
  // Random codes are a poker word and two numbers, so a clash is rare. Try a few before giving up.
  for (let attempt = 0; attempt < (own ? 1 : 8); attempt++) {
    const code = own ?? newTableCode();
    const game = createTable({
      hostDeviceId: body.deviceId,
      name,
      emoji: body.emoji,
      settings: { ...DEFAULT_SETTINGS, ...settings } as Settings,
      bots,
      botNames,
      code,
      now: Date.now(),
    });
    const created = await env.TABLE_ROOM.getByName(code).create(game);
    if (created) return json({ code } satisfies CreateTableResponse, 201);
  }
  if (own) return json({ error: 'That code is taken. Try another.' }, 409);
  return json({ error: "Couldn't find a free code. Try again." }, 503);
}

/**
 * A table's Live Activity (worker/live.ts):
 *   POST /api/tables/:code/live        { deviceId, token, sandbox }  this phone's activity and its push token, answers { act }
 *   POST /api/tables/:code/live/stop   { deviceId }                  the phone ended it
 *   POST /api/tables/:code/live/check  { act, hand, seq }            the activity's Check button (no device id: `act` stands in)
 */
async function liveRoute(request: Request, env: Env, code: string, action: string | undefined): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (await limited(request, 'live', 120, 60_000)) return json({ error: 'Slow down a little.' }, 429);
  const body = (await readJson(request, 2048)) as Record<string, unknown> | null;
  if (!body) return json({ error: 'Bad request.' }, 400);
  const room = env.TABLE_ROOM.getByName(code);
  if (action === 'check') {
    const { act, hand, seq } = body;
    if (typeof act !== 'string' || act.length > 40 || !Number.isInteger(hand) || !Number.isInteger(seq)) return json({ error: 'Bad request.' }, 400);
    const result = await room.liveCheck(act, hand as number, seq as number);
    return result.ok ? json({ ok: true }) : json({ error: result.error }, 409);
  }
  if (!isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
  if (action === 'stop') {
    await room.stopLive(body.deviceId);
    return json({ ok: true });
  }
  if (!isPushToken(body.token)) return json({ error: 'Missing push token.' }, 400);
  const reg = await room.registerLive(body.deviceId, body.token, body.sandbox === true);
  return reg ? json(reg) : json({ error: "You're not at this table." }, 404);
}

/** The name and picture a phone sends to host or join a party, or an error sentence. */
function lookFields(body: Record<string, unknown>): { name: string; emoji: string } | { error: string } {
  const name = typeof body.name === 'string' ? cleanName(body.name) : '';
  if (!name) return { error: 'Add your name first.' };
  if (isNameBlocked(name)) return { error: 'Pick a different name.' };
  if (!isEmoji(body.emoji)) return { error: 'Pick an emoji.' };
  return { name, emoji: body.emoji };
}

/** POST /api/parties opens a party. GET /api/parties/:code?device= reads it; POST /api/parties/:code/join|leave|start|skip changes it. */
async function partyRoute(request: Request, env: Env, pathname: string, search: string): Promise<Response> {
  const match = pathname.match(/^\/api\/parties(?:\/([^/]+)(?:\/(join|leave|start|skip|settings))?)?$/);
  if (!match) return json({ error: 'Not found.' }, 404);
  const code = match[1]?.toUpperCase();
  const action = match[2];

  if (!code) {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (await limited(request, 'party-create', 20, 60 * 60_000, env.LIMIT_CREATE)) return json({ error: 'Too many parties opened. Try again later.' }, 429);
    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
    const look = lookFields(body);
    if ('error' in look) return json({ error: look.error }, 400);
    const settings = body.settings as PartySettings | undefined;
    if (!settings || !validPartySettings(settings, isVariant)) return json({ error: "Those party settings don't work." }, 400);
    if (gamesNeedPremium(settings.games) && !(await mayHostPremium(env, body.deviceId))) {
      return json({ error: 'Hosting these games needs FlipUp Premium.', premium: true }, 402);
    }
    const person = { ...look };
    for (let attempt = 0; attempt < 6; attempt++) {
      // Same look as a table's code (ACES42), so a party's code reads like a game's. A code a table already has is skipped,
      // so the Join sheet never has to guess which one a code means.
      const fresh = newTableCode();
      if (await env.TABLE_ROOM.getByName(fresh).info()) continue;
      if (await env.PARTY_ROOM.getByName(fresh).create(fresh, body.deviceId, person, { games: settings.games, startingStack: settings.startingStack, blindHands: settings.blindHands, fillTo: settings.fillTo })) {
        return json({ code: fresh }, 201);
      }
    }
    return json({ error: "Couldn't find a free code. Try again." }, 503);
  }

  if (!isTableCode(code)) return json({ error: "That code doesn't look right." }, 400);
  const room = env.PARTY_ROOM.getByName(code);

  if (!action) {
    if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
    if (tooManyMisses(request)) return json({ error: 'Slow down a little.' }, 429);
    const device = new URL(`http://x/${search}`).searchParams.get('device');
    const view = await room.view(code, isDeviceId(device) ? device : null);
    if (!view) noteMiss(request);
    return view ? json(view) : json({ error: 'No party with that code.' }, 404);
  }

  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (await limited(request, 'party-act', 240, 60_000)) return json({ error: 'Slow down a little.' }, 429);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
  let result;
  if (action === 'join') {
    const look = lookFields(body);
    if ('error' in look) return json({ error: look.error }, 400);
    result = await room.join(code, body.deviceId, { ...look });
  } else if (action === 'leave') result = await room.leave(code, body.deviceId);
  else if (action === 'settings') {
    // The host changes the playlist and rules while everyone is still in the lobby.
    const settings = body.settings as PartySettings | undefined;
    if (!settings || !validPartySettings(settings, isVariant)) return json({ error: "Those party settings don't work." }, 400);
    if (gamesNeedPremium(settings.games) && !(await mayHostPremium(env, body.deviceId))) {
      return json({ error: 'Hosting these games needs FlipUp Premium.', premium: true }, 402);
    }
    result = await room.configure(code, body.deviceId, { games: settings.games, startingStack: settings.startingStack, blindHands: settings.blindHands, fillTo: settings.fillTo });
  } else if (action === 'start') result = await room.start(code, body.deviceId);
  else result = await room.skip(code, body.deviceId);
  return result.ok ? json(result.view) : json({ error: result.error }, result.error.startsWith('No party') ? 404 : 400);
}

/** POST /api/reports: a player reports someone at their table or party. Stored, then emailed to support. */
async function reportRoute(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (await limited(request, 'report', 10, 60 * 60_000, env.LIMIT_REPORT)) return json({ error: 'Too many reports. Try again later.' }, 429);
  const report = parseReport(await readJson(request));
  if (!report) return json({ error: "That report isn't complete." }, 400);
  const found =
    report.where === 'table'
      ? await env.TABLE_ROOM.getByName(report.code).reportee(report.playerId, report.deviceId)
      : await env.PARTY_ROOM.getByName(report.code).reportee(report.playerId, report.deviceId);
  if (!found) return json({ error: "We couldn't find that player at your table." }, 404);
  const stored: StoredReport = { ...report, id: newId(10), at: Date.now(), found };
  if (!(await env.REPORT_BOX.getByName('reports').add(stored))) return json({ error: "You've sent a lot of reports today. We'll look at those first." }, 429);
  ctx.waitUntil(emailReport(env, stored));
  return json({ ok: true }, 201);
}

const verifyJson = (r: VerifyResult): Response => (r.ok ? json({ ok: true }) : json({ error: r.error, ...(r.revoked ? { revoked: true } : {}) }, r.status));

/** POST /api/premium/verify (ties a phone to its purchase), /forget (Delete my data); POST /api/apple/notifications is Apple's own webhook. */
async function premiumRoute(request: Request, env: Env, pathname: string): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  // Apple's own notifications come from Apple's addresses and are checked by their signature, so only phones are limited.
  if (pathname !== '/api/apple/notifications' && (await limited(request, 'premium', 60, 60 * 60_000, env.LIMIT_PREMIUM))) return json({ error: 'Slow down a little.' }, 429);
  const body = (await readJson(request, 24 * 1024)) as Record<string, unknown> | null;
  if (!body) return json({ error: 'Bad request.' }, 400);
  if (pathname === '/api/apple/notifications') return (await handleNotification(env, body)) ? json({ ok: true }) : json({ error: 'Not from Apple.' }, 400);
  if (pathname === '/api/premium/verify') return verifyJson(await verifyPurchase(env, body));
  if (pathname === '/api/premium/forget' && isDeviceId(body.deviceId)) {
    await forgetDevice(env, body.deviceId);
    return json({ ok: true });
  }
  return json({ error: 'Not found.' }, 404);
}


/**
 * /.well-known/apple-app-site-association: tells iOS which links open the FlipUp app instead of Safari. A table's
 * link is `/ACES42` (six characters, or the older five), a party's is `/party/ABCDE`. It needs the team id, so
 * until `APPLE_TEAM_ID` is set in wrangler.jsonc there is no file and links keep opening the web app.
 */
function appSiteAssociation(env: Env): Response {
  const team = env.APPLE_TEAM_ID;
  if (!/^[A-Z0-9]{10}$/.test(team)) return json({ error: 'Not set up.' }, 404);
  const body = {
    applinks: {
      details: [
        {
          appIDs: [`${team}.${env.APPLE_BUNDLE_ID}`],
          components: [{ '/': '/??????' }, { '/': '/?????' }, { '/': '/party/?????' }, { '/': '/party/??????' }],
        },
      ],
    },
  };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } });
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname, search } = new URL(request.url);

    if (pathname === '/.well-known/apple-app-site-association') return appSiteAssociation(env);
    if (pathname.startsWith('/.well-known/')) return env.ASSETS.fetch(request);

    if (pathname.startsWith('/api/premium/') || pathname === '/api/apple/notifications') return premiumRoute(request, env, pathname);

    if (pathname === '/api/parties' || pathname.startsWith('/api/parties/')) return partyRoute(request, env, pathname, search);

    if (pathname === '/api/reports') return request.method === 'POST' ? reportRoute(request, env, ctx) : json({ error: 'Use POST.' }, 405);
    if (pathname === '/api/health') return json({ ok: true });
    if (pathname === '/api/waitlist' || pathname.startsWith('/api/waitlist/')) {
      // Each sign-up sends an email, so a few an hour from one address is plenty.
      if (pathname === '/api/waitlist' && request.method === 'POST' && (await limited(request, 'waitlist', 6, 3_600_000, env.LIMIT_WAITLIST))) return json({ error: 'Too many tries. Try again in a while.' }, 429);
      return waitlistRoute(request, env, pathname, search, ctx);
    }
    if (pathname === '/api/tables') {
      return request.method === 'POST' ? createTableRoute(request, env) : json({ error: 'Use POST.' }, 405);
    }

    const match = pathname.match(/^\/api\/tables\/([^/]+)(\/ws|\/live(?:\/(check|stop))?)?$/);
    if (match) {
      const code = match[1].toUpperCase();
      if (!isTableCode(code)) return json({ error: "That code doesn't look right." }, 400);
      if (match[2]?.startsWith('/live')) return liveRoute(request, env, code, match[3]);
      const room = env.TABLE_ROOM.getByName(code);
      if (match[2]) {
        if (!sameSite(request)) return json({ error: 'Not allowed.' }, 403);
        // Opening a socket to a table that isn't there is the same scan as asking for its info, so it counts as a miss too.
        if (tooManyMisses(request)) return json({ error: 'Slow down a little.' }, 429);
        const res = await room.fetch(request);
        if (res.status === 404) noteMiss(request);
        return res;
      }
      if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
      if (tooManyMisses(request)) return json({ error: 'Slow down a little.' }, 429);
      const info = await room.info();
      if (!info) noteMiss(request);
      return info ? json(info) : json({ error: 'No table with that code.' }, 404);
    }

    return json({ error: 'Not found.' }, 404);
  },
} satisfies ExportedHandler<Env>;
