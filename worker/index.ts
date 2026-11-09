import {
  createTable,
  isCode,
  isTableCode,
  newTableCode,
  normalizeTableCode,
  tableCodeProblem,
  isFriendCode,
  isUsername,
  normalizeUsername,
  USERNAME_CHANGE_MS,
  newFriendCode,
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
  campaignTable,
  cashMax,
  cryptoRng,
  drawMultiplier,
  FORMATS,
  parseCampaignCard,
  stakeById,
  venueById,
  type Game,
  createBlackjack,
  type BjInvite,
  type FriendCardInfo,
  type CreateBjResponse,
  newId,
  parseReport,
  gamesNeedPremium,
  BOTS,
} from '../src/game';
import { emailReport, type StoredReport } from './reports';
import { forgetDevice, handleNotification, mayHostPremium, verifyPurchase, type VerifyResult } from './premium';

export { TableRoom } from './room';
export { PartyRoom } from './party';
export { FriendCard } from './friendCard';
import { askToBeFriends, type FriendCardApi } from './friendCard';
export { BlackjackRoom } from './blackjack';
import { safeDecode } from './safeDecode';
export { ReportBox } from './reports';
export { Entitlements } from './entitlement';
export { BankrollRoom } from './bankroll';
export { Leaderboard } from './leaderboard';
import { dayOf, dueCut, isDay, isFriendCode as isPalCode, isSeason, previousSeason, seasonOf } from '../src/game';
import { scoreDaily } from '../src/train/ranges/daily';
import DAILY_KEY from '../src/train/ranges/dailyKey.json';

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
  if (limited(request, 'create', 20, 60 * 60_000)) return json({ error: 'Too many tables opened. Try again later.' }, 429);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
  const name = typeof body.name === 'string' ? cleanName(body.name) : '';
  if (!name) return json({ error: 'Add your name first.' }, 400);
  if (isNameBlocked(name)) return json({ error: 'Pick a different name.' }, 400);
  if (!isEmoji(body.emoji)) return json({ error: 'Pick an emoji.' }, 400);
  let settings = parseSettings(body.settings, false);
  if (!settings) return json({ error: "Those table settings don't work." }, 400);
  if (gamesNeedPremium([settings.variant ?? 'holdem']) && !(await mayHostPremium(env, body.deviceId))) {
    return json({ error: 'Hosting this game needs FlipUp Premium.', premium: true }, 402);
  }
  let bots = typeof body.bots === 'number' && Number.isInteger(body.bots) ? Math.max(0, Math.min(MAX_SEATS - 1, body.bots)) : 0;
  if (settings.humanPoker && bots > MAX_SEATS - 2) return json({ error: 'Leave one bot seat free for BOT_001.' }, 400);
  // Bots the host picked by name (the setup page's bots row): only names from the roster, one seat each.
  let botNames = Array.isArray(body.botNames)
    ? [...new Set(body.botNames.filter((n): n is string => typeof n === 'string' && BOTS.some((b) => b.name === n)))].slice(0, MAX_SEATS - 1)
    : [];
  // A campaign table with friends: the stakes come from the campaign, never from the phone, and the prize is drawn here.
  let campaign: Game['campaign'];
  const pick = body.campaign as { kind?: unknown; id?: unknown } | undefined;
  if (pick !== undefined) {
    const stake = pick?.kind === 'cash' && typeof pick.id === 'string' ? stakeById(pick.id) : undefined;
    const venue = pick?.kind === 'sng' && typeof pick.id === 'string' ? venueById(pick.id) : undefined;
    if (!stake && !venue) return json({ error: "That campaign table doesn't exist." }, 400);
    const table = stake
      ? campaignTable({ kind: 'cash', stake, stack: cashMax(stake) }, true)
      : campaignTable({ kind: 'sng', venue: venue!, prize: venue!.buyIn * drawMultiplier(FORMATS[venue!.format], cryptoRng) }, true);
    settings = table.settings;
    campaign = table.campaign;
    bots = 0;
    botNames = [];
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
    if (campaign) game.campaign = { ...campaign };
    const created = await env.TABLE_ROOM.getByName(code).create(game);
    if (created) return json({ code } satisfies CreateTableResponse, 201);
  }
  if (own) return json({ error: 'That code is taken. Try another.' }, 409);
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
  if (!isFriendCode(code)) return undefined;
  const owner = await env.FRIEND_CARD.getByName(code).owner();
  return owner === deviceId ? code : undefined;
}

/**
 * POST /api/friends claims a friend code (six digits). GET and PUT /api/friends/:code look one up and refresh it;
 * DELETE removes it (its owner only). /request, /answer, /unfriend and /inbox are friend requests and the list.
 */
async function friendRoute(request: Request, env: Env, pathname: string, search: string): Promise<Response> {
  const match = pathname.match(/^\/api\/friends(?:\/([^/]+)(?:\/(invite|invites|uninvite|decline|request|requests|answer|unfriend|inbox|username))?)?$/);
  if (!match) return json({ error: 'Not found.' }, 404);
  const code = match[1]?.toUpperCase();
  if (code && (match[2] === 'invite' || match[2] === 'invites' || match[2] === 'uninvite' || match[2] === 'decline')) return inviteRoute(request, env, code, match[2], search);
  if (code && match[2]) return friendshipRoute(request, env, code, match[2], search);

  if (!code) {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (limited(request, 'friend-create', 20, 60 * 60_000)) return json({ error: 'Too many codes made. Try again later.' }, 429);
    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
    const look = lookFields(body);
    if ('error' in look) return json({ error: look.error }, 400);
    for (let attempt = 0; attempt < 6; attempt++) {
      const fresh = newFriendCode();
      if (await env.FRIEND_CARD.getByName(fresh).create(body.deviceId, look.name, look.emoji, fresh)) return json({ code: fresh } satisfies CreateFriendCardResponse, 201);
    }
    return json({ error: "Couldn't find a free code. Try again." }, 503);
  }

  if (!isFriendCode(code)) return json({ error: "That code doesn't look right." }, 400);
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
    // A country is two capital letters, or null to stop showing one.
    const country = body.country === null ? null : typeof body.country === 'string' && /^[A-Z]{2}$/.test(body.country) ? body.country : undefined;
    const result = await card.update(body.deviceId, look.name, look.emoji, parseCampaignCard(body.campaign), country);
    if (result === 'missing') return json({ error: 'No friend with that code.' }, 404);
    if (result === 'forbidden') return json({ error: 'That code belongs to another phone.' }, 403);
    return json({ ok: true });
  }
  if (request.method === 'DELETE') {
    if (limited(request, 'friend-change', 120, 60 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
    if ((await card.owner()) === body.deviceId) await forgetBoards(env, code);
    const result = await card.remove(body.deviceId);
    // Already gone counts as done: the phone wanted it deleted.
    if (result === 'forbidden') return json({ error: 'That code belongs to another phone.' }, 403);
    return json({ ok: true });
  }
  return json({ error: 'Not found.' }, 405);
}

/**
 * POST /api/friends/:code/invite asks that friend to your blackjack table; GET /api/friends/:code/invites?device=
 * is how the code's owner hears about it. The invite carries the name on the inviter's own card, never one the
 * phone sends, and only a phone that owns the code it invites from can send one.
 */
async function inviteRoute(request: Request, env: Env, code: string, kind: string, search: string): Promise<Response> {
  if (!isFriendCode(code)) return json({ error: "That code doesn't look right." }, 400);
  const card = env.FRIEND_CARD.getByName(code);
  if (kind === 'invites') {
    if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
    if (limited(request, 'invites', 120, 10 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
    const device = new URL(`http://x/${search}`).searchParams.get('device');
    const list = isDeviceId(device) ? await card.invites(device) : null;
    return list ? json({ invites: list }) : json({ error: 'That code belongs to another phone.' }, 403);
  }
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (kind === 'decline' || kind === 'uninvite') {
    if (limited(request, 'invite-answer', 120, 10 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
    const body = (await readJson(request)) as Record<string, unknown> | null;
    if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
    if (!isTableCode(body.table)) return json({ error: 'That table has closed.' }, 404);
    if (kind === 'decline') {
      // `code` is the person saying no, who proves it with their device id; the inviter hears on their next check.
      if (!isFriendCode(body.from)) return json({ error: "That code doesn't look right." }, 400);
      const said = await card.decline(body.deviceId, body.from, body.table);
      if (said === 'forbidden') return json({ error: 'That code belongs to another phone.' }, 403);
      if (said === 'ok') await env.FRIEND_CARD.getByName(body.from).noteDeclined(code, body.table);
      return json({ ok: true });
    }
    // The inviter takes an invite back: only from a code their phone owns.
    const from = await ownedCode(env, body.fromCode, body.deviceId);
    if (!from) return json({ error: 'Get your own friend code first.' }, 403);
    await card.uninvite(from, body.table);
    return json({ ok: true });
  }
  if (limited(request, 'invite', 60, 10 * 60_000)) return json({ error: 'Too many invites. Try again later.' }, 429);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
  const from = await ownedCode(env, body.fromCode, body.deviceId);
  if (!from) return json({ error: 'Get your own friend code first.' }, 403);
  const me = await env.FRIEND_CARD.getByName(from).get(from);
  if (!me) return json({ error: 'Get your own friend code first.' }, 403);
  if (!isTableCode(body.table)) return json({ error: 'That table has closed.' }, 404);
  let invite: BjInvite;
  if (body.kind === 'table') {
    // A poker table: only friends can ask each other, and only to a table that's still open.
    if (!(await card.isFriend(from))) return json({ error: "You can only invite friends. Send them a friend request first." }, 403);
    const info = await env.TABLE_ROOM.getByName(body.table).info();
    if (!info || info.status === 'ended') return json({ error: 'That table has closed.' }, 404);
    invite = { from, name: me.name, emoji: me.emoji, table: body.table, at: Date.now(), kind: 'table', game: info.settings.variant ?? 'holdem', ...(info.status === 'lobby' ? { lobby: true } : {}) };
  } else {
    if (!(await env.BLACKJACK_ROOM.getByName(body.table).exists())) return json({ error: 'That table has closed.' }, 404);
    invite = { from, name: me.name, emoji: me.emoji, table: body.table, at: Date.now() };
  }
  return (await card.invite(invite)) ? json({ ok: true }) : json({ error: 'No friend with that code.' }, 404);
}

/**
 * Friend requests, for the code's owner (who proves it with their device id):
 * POST /request {deviceId, fromCode} asks `code` to be friends (if they'd already asked you, you're friends at once);
 * POST /answer {deviceId, from, accept} says yes or no; POST /unfriend {deviceId, other} ends a friendship on both
 * sides; GET /inbox?device= is the requests, the table invites, the friends list and who you've asked (their cards);
 * GET /requests?device= is the cheap one the phones poll every few seconds: requests and table invites waiting, who
 * you've asked and your friends' codes, from one read of one card.
 */
async function friendshipRoute(request: Request, env: Env, code: string, kind: string, search: string): Promise<Response> {
  if (!isFriendCode(code)) return json({ error: "That code doesn't look right." }, 400);
  const card = env.FRIEND_CARD.getByName(code);
  if (kind === 'inbox') {
    if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
    if (limited(request, 'inbox', 240, 10 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
    const device = new URL(`http://x/${search}`).searchParams.get('device');
    const box = isDeviceId(device) ? await card.inbox(device) : null;
    if (!box) return json({ error: 'That code belongs to another phone.' }, 403);
    const friends = (await Promise.all(box.friends.map((f) => env.FRIEND_CARD.getByName(f).get(f)))).filter((f): f is FriendCardInfo => !!f);
    // Who you've asked and are still waiting on, as cards, so the app can show them as Pending.
    const sent = (await Promise.all(box.sent.map((f) => env.FRIEND_CARD.getByName(f).get(f)))).filter((f): f is FriendCardInfo => !!f);
    return json({ requests: box.requests, invites: box.invites, friends, sent });
  }
  if (kind === 'requests') {
    // Polled every few seconds while the app is open, so it's one read of one card with nothing fanned out.
    // Phones at the same party share an address, so the limit is loose.
    if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
    if (limited(request, 'requests', 1200, 10 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
    const device = new URL(`http://x/${search}`).searchParams.get('device');
    const box = isDeviceId(device) ? await card.pending(device) : null;
    return box ? json(box) : json({ error: 'That code belongs to another phone.' }, 403);
  }
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (limited(request, 'friend-ask', 60, 10 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);

  if (kind === 'username') {
    const username = typeof body.username === 'string' ? normalizeUsername(body.username) : '';
    if (!isUsername(username)) return json({ error: 'Usernames are 2 to 20 letters, numbers, dots or underscores, starting with a letter.' }, 400);
    if (isNameBlocked(username)) return json({ error: "That username isn't allowed. Try another." }, 400);
    if ((await card.owner()) !== body.deviceId) return json({ error: 'That code belongs to another phone.' }, 403);
    const wait = await card.usernameFree(USERNAME_CHANGE_MS);
    const have = (await card.get(code))?.username;
    if (have === username) return json({ ok: true, username });
    if (wait > 0) return json({ error: `You can change your username again on ${new Date(Date.now() + wait).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.` }, 429);
    const alias = env.FRIEND_CARD.getByName(`@${username}`);
    if (!(await alias.claimAlias(code))) return json({ error: 'That username is taken. Try another.' }, 409);
    const result = await card.setUsername(body.deviceId, username, USERNAME_CHANGE_MS);
    if (!result.ok) {
      await alias.releaseAlias(code);
      return json({ error: result.forbidden ? 'That code belongs to another phone.' : 'You changed your username recently. Try again later.' }, result.forbidden ? 403 : 429);
    }
    if (result.old) await env.FRIEND_CARD.getByName(`@${result.old}`).releaseAlias(code);
    return json({ ok: true, username });
  }
  if (kind === 'request') {
    // One phone can't keep asking the same code: a handful of asks an hour per person asked.
    if (limited(request, `friend-ask:${code}`, 6, 60 * 60_000)) return json({ error: "You've asked them a few times already. Give them a while." }, 429);
    const from = await ownedCode(env, body.fromCode, body.deviceId);
    if (!from) return json({ error: 'Get your own friend code first.' }, 403);
    const result = await askToBeFriends((c) => env.FRIEND_CARD.getByName(c) as unknown as FriendCardApi, body.deviceId, from, code);
    return 'error' in result ? json({ error: result.error }, result.httpStatus) : json({ status: result.status });
  }
  if (kind === 'answer') {
    if (!isFriendCode(body.from)) return json({ error: "That code doesn't look right." }, 400);
    const result = await card.answer(body.deviceId, body.from, body.accept === true);
    if (result === 'forbidden') return json({ error: 'That code belongs to another phone.' }, 403);
    if (result === 'missing') return json({ error: 'That request has gone.' }, 404);
    // A yes makes them friends on both cards; a no just ends the sender's ask, with nothing sent to tell them.
    if (body.accept === true) await env.FRIEND_CARD.getByName(body.from).befriend(code);
    else await env.FRIEND_CARD.getByName(body.from).forget(code);
    return json({ ok: true });
  }
  if (kind === 'unfriend') {
    if (!isFriendCode(body.other)) return json({ error: "That code doesn't look right." }, 400);
    const result = await card.unfriend(body.deviceId, body.other);
    if (result === 'forbidden') return json({ error: 'That code belongs to another phone.' }, 403);
    await env.FRIEND_CARD.getByName(body.other).drop(code);
    return json({ ok: true });
  }
  return json({ error: 'Not found.' }, 404);
}

/** GET /api/usernames/:name finds the person with that username: their card, with the friend code a request goes to. */
async function usernameRoute(request: Request, env: Env, pathname: string): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
  if (limited(request, 'friend-get', 60, 10 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
  const username = normalizeUsername(safeDecode(pathname.slice('/api/usernames/'.length)));
  if (!isUsername(username)) return json({ error: 'No one has that username.' }, 404);
  const code = await env.FRIEND_CARD.getByName(`@${username}`).aliasOf();
  const info = code ? await env.FRIEND_CARD.getByName(code).get(code) : null;
  return info && info.username === username ? json(info) : json({ error: 'No one has that username.' }, 404);
}

/** POST /api/blackjack opens a blackjack table with this phone seated, and one or two bots. */
async function createBlackjackRoute(request: Request, env: Env): Promise<Response> {
  if (limited(request, 'bj-create', 30, 60 * 60_000)) return json({ error: 'Too many tables opened. Try again later.' }, 429);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
  const look = lookFields(body);
  if ('error' in look) return json({ error: look.error }, 400);
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = newCode();
    const game = createBlackjack({ code, online: true, host: { deviceId: body.deviceId, ...look }, now: Date.now(), rng: cryptoRng });
    if (await env.BLACKJACK_ROOM.getByName(code).create(game)) return json({ code } satisfies CreateBjResponse, 201);
  }
  return json({ error: "Couldn't find a free code. Try again." }, 503);
}

/** POST /api/parties opens a party. GET /api/parties/:code?device= reads it; POST /api/parties/:code/join|leave|start|skip changes it. */
async function partyRoute(request: Request, env: Env, pathname: string, search: string): Promise<Response> {
  const match = pathname.match(/^\/api\/parties(?:\/([^/]+)(?:\/(join|leave|start|skip|settings))?)?$/);
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
    if (gamesNeedPremium(settings.games) && !(await mayHostPremium(env, body.deviceId))) {
      return json({ error: 'Hosting these games needs FlipUp Premium.', premium: true }, 402);
    }
    const person = { ...look, friendCode: await ownedCode(env, body.friendCode, body.deviceId) };
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
  if (limited(request, 'party-act', 240, 60_000)) return json({ error: 'Slow down a little.' }, 429);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId)) return json({ error: 'Missing device id.' }, 400);
  let result;
  if (action === 'join') {
    const look = lookFields(body);
    if ('error' in look) return json({ error: look.error }, 400);
    result = await room.join(code, body.deviceId, { ...look, friendCode: await ownedCode(env, body.friendCode, body.deviceId) });
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
  if (limited(request, 'report', 10, 60 * 60_000)) return json({ error: 'Too many reports. Try again later.' }, 429);
  const report = parseReport(await readJson(request));
  if (!report) return json({ error: "That report isn't complete." }, 400);
  // A board row: the player must be on this month's board (their username is what was shown).
  const boardRow = report.where === 'board' ? await env.LEADERBOARD.getByName(`bankroll:${seasonOf(Date.now())}`).row(report.code) : null;
  const found =
    report.where === 'board'
      ? boardRow && { name: boardRow.username, emoji: boardRow.emoji, deviceId: null, bot: false }
      : report.where === 'table'
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
  if (limited(request, 'premium', 60, 60 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
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


/** Delete my data: this player's rows on this and last month's boards and the last week's daily boards, and their Bankroll rooms. */
async function forgetBoards(env: Env, code: string): Promise<void> {
  const now = Date.now();
  const seasons = [seasonOf(now), previousSeason(seasonOf(now))];
  const days = Array.from({ length: 8 }, (_, i) => dayOf(now - i * 86_400_000));
  await Promise.all([
    ...seasons.map((s) => env.LEADERBOARD.getByName(`bankroll:${s}`).remove(code)),
    ...days.map((d) => env.LEADERBOARD.getByName(`daily:${d}`).remove(code)),
    ...seasons.map((s) => env.BANKROLL_ROOM.getByName(`${code}:${s}`).remove()),
  ]);
}

/** Per friend code, in this instance's memory: a phone can't hammer its own room or the score route. */
const perCode = new Map<string, number[]>();
function codeLimited(code: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (perCode.get(code) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  perCode.set(code, recent);
  if (perCode.size > 5000) for (const [k, v] of perCode) if (now - v[v.length - 1] > windowMs) perCode.delete(k);
  return recent.length > max;
}

/**
 * Bankroll, for the friend code's owner only: GET /api/bankroll/:code?device= (the month so far), POST /sit,
 * POST /rebuy {watched}, and the table's socket /ws?device=. Nothing here lets a phone set a chip count.
 */
async function bankrollRoute(request: Request, env: Env, pathname: string, search: string): Promise<Response> {
  const m = pathname.match(/^\/api\/bankroll\/(\d{6})(?:\/(sit|rebuy|ws))?$/);
  if (!m) return json({ error: 'Not found.' }, 404);
  const [, code, kind] = m;
  const params = new URL(`http://x/${search}`).searchParams;
  const body = request.method === 'POST' ? ((await readJson(request)) as Record<string, unknown> | null) : null;
  const deviceId = body?.deviceId ?? params.get('device');
  if (!isDeviceId(deviceId) || !(await ownedCode(env, code, deviceId))) return json({ error: 'That code belongs to another phone.' }, 403);
  if (kind !== 'ws' && codeLimited(code, 120, 60_000)) return json({ error: 'Slow down a little.' }, 429);
  const season = seasonOf(Date.now());
  const room = env.BANKROLL_ROOM.getByName(`${code}:${season}`);
  if (kind === 'ws') return sameSite(request) ? room.fetch(request) : json({ error: 'Not allowed.' }, 403);
  if (!kind) {
    const card = await env.FRIEND_CARD.getByName(code).get(code);
    const look = card ? { username: card.username ?? '', emoji: card.emoji, name: card.name, ...(card.country ? { country: card.country } : {}), ...(card.badge ? { badge: card.badge } : {}) } : undefined;
    return json(await room.status(code, season, look));
  }
  const error = kind === 'sit' ? await room.sit(deviceId) : await room.rebuy(body?.watched === true);
  return error ? json({ error }, 400) : json({ ok: true });
}

/**
 * GET /api/boards/:board?code=&friends=a,b (board: "bankroll", "bankroll:2026-10", "daily", "daily:2026-11-04"):
 * the top 100, your row and your friends' rows. Reading is public; only the server writes.
 */
async function boardRoute(request: Request, env: Env, pathname: string, search: string): Promise<Response> {
  if (limited(request, 'boards', 600, 10 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
  const [kind, when] = safeDecode(pathname.slice('/api/boards/'.length)).split(':');
  const name = kind === 'bankroll' && (!when || isSeason(when)) ? `bankroll:${when ?? seasonOf(Date.now())}` : kind === 'daily' && (!when || isDay(when)) ? `daily:${when ?? dayOf(Date.now())}` : null;
  if (!name) return json({ error: 'No such board.' }, 404);
  const params = new URL(`http://x/${search}`).searchParams;
  const me = params.get('code');
  const friends = (params.get('friends') ?? '').split(',').filter((c) => isPalCode(c)).slice(0, 200);
  return json(await env.LEADERBOARD.getByName(name).view(isPalCode(me) ? me : null, friends));
}

/** POST /api/daily/:code {deviceId, day, answers}: Today's three, scored here from the answers. The first score of the day counts. */
async function dailyRoute(request: Request, env: Env, pathname: string): Promise<Response> {
  const code = pathname.split('/')[3];
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || !isDeviceId(body.deviceId) || !isPalCode(code) || !(await ownedCode(env, code, body.deviceId))) return json({ error: 'That code belongs to another phone.' }, 403);
  if (codeLimited(`daily:${code}`, 10, 60 * 60_000)) return json({ error: 'Slow down a little.' }, 429);
  // A phone's date can be a day either side of the server's (time zones).
  const day = body.day;
  const near = [-1, 0, 1].map((d) => dayOf(Date.now() + d * 86_400_000));
  if (!isDay(day) || !near.includes(day)) return json({ error: 'That isn’t today.' }, 400);
  const score = scoreDaily(day, body.answers, DAILY_KEY as string[][]);
  if (score === null) return json({ error: "Those answers don't fit today's hands." }, 400);
  const card = await env.FRIEND_CARD.getByName(code).get(code);
  if (!card?.username) return json({ error: 'Pick a username first.' }, 400);
  const board = env.LEADERBOARD.getByName(`daily:${day}`);
  if (await board.row(code)) return json({ score, counted: false });
  await board.report({ code, username: card.username, emoji: card.emoji, ...(card.country ? { country: card.country } : {}), ...(card.badge ? { badge: card.badge } : {}), score, peak: score, rebuy: false, status: 'alive', at: Date.now() });
  return json({ score, counted: true });
}

/** The hourly cron: this week's cut once it's due, and on the 1st, last month's top 100 badges. Both safe to run twice. */
async function scheduled(env: Env): Promise<void> {
  const now = Date.now();
  const due = dueCut(now);
  if (due) await env.LEADERBOARD.getByName(`bankroll:${due.season}`).cut(due.week);
  const last = previousSeason(seasonOf(now));
  const top = await env.LEADERBOARD.getByName(`bankroll:${last}`).close();
  for (const { code, place } of top) await env.FRIEND_CARD.getByName(code).addBadge(last, place);
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
  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(scheduled(env));
  },
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname, search } = new URL(request.url);

    if (pathname === '/.well-known/apple-app-site-association') return appSiteAssociation(env);
    if (pathname.startsWith('/.well-known/')) return env.ASSETS.fetch(request);

    if (pathname.startsWith('/api/bankroll/')) return bankrollRoute(request, env, pathname, search);
    if (pathname.startsWith('/api/boards/')) return request.method === 'GET' ? boardRoute(request, env, pathname, search) : json({ error: 'Use GET.' }, 405);
    if (pathname.startsWith('/api/daily/')) return request.method === 'POST' ? dailyRoute(request, env, pathname) : json({ error: 'Use POST.' }, 405);

    if (pathname.startsWith('/api/premium/') || pathname === '/api/apple/notifications') return premiumRoute(request, env, pathname);

    if (pathname === '/api/friends' || pathname.startsWith('/api/friends/')) return friendRoute(request, env, pathname, search);
    if (pathname.startsWith('/api/usernames/')) return usernameRoute(request, env, pathname);

    if (pathname === '/api/blackjack') return request.method === 'POST' ? createBlackjackRoute(request, env) : json({ error: 'Use POST.' }, 405);
    const bj = pathname.match(/^\/api\/blackjack\/([^/]+)\/ws$/);
    if (bj) {
      const code = bj[1].toUpperCase();
      if (!isCode(code)) return json({ error: "That code doesn't look right." }, 400);
      return sameSite(request) ? env.BLACKJACK_ROOM.getByName(code).fetch(request) : json({ error: 'Not allowed.' }, 403);
    }
    if (pathname === '/api/parties' || pathname.startsWith('/api/parties/')) return partyRoute(request, env, pathname, search);

    if (pathname === '/api/reports') return request.method === 'POST' ? reportRoute(request, env, ctx) : json({ error: 'Use POST.' }, 405);
    if (pathname === '/api/health') return json({ ok: true });
    if (pathname === '/api/tables') {
      return request.method === 'POST' ? createTableRoute(request, env) : json({ error: 'Use POST.' }, 405);
    }

    const match = pathname.match(/^\/api\/tables\/([^/]+)(\/ws)?$/);
    if (match) {
      const code = match[1].toUpperCase();
      if (!isTableCode(code)) return json({ error: "That code doesn't look right." }, 400);
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
