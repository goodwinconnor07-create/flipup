// Fuzzes every /api route of the LOCAL worker (npx wrangler dev --port 8799 after `npm run build`). Refuses any other host.
// Reports any 5xx, any non-JSON /api answer, and slow answers. Usage: node scripts/security/fuzz-routes.mjs [http://127.0.0.1:8799]
const BASE = process.argv[2] ?? 'http://127.0.0.1:8799';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) throw new Error('local only');
const DEV = 'dev' + Math.random().toString(36).slice(2, 14);
const paths = [
  '/api/health', '/api/tables', '/api/tables/ACES42', '/api/tables/%00', '/api/tables/' + 'A'.repeat(5000),
  '/api/friends', '/api/friends/123456', '/api/friends/123456/invite', '/api/friends/123456/invites', '/api/friends/123456/uninvite',
  '/api/friends/123456/decline', '/api/friends/123456/request', '/api/friends/123456/requests', '/api/friends/123456/answer',
  '/api/friends/123456/unfriend', '/api/friends/123456/inbox', '/api/friends/123456/username', '/api/friends/%zz', '/api/friends/ABCDE/inbox',
  '/api/usernames/bob', '/api/usernames/' + 'a'.repeat(3000), '/api/usernames/%E0%A4%A', '/api/usernames/..%2f..%2f',
  '/api/parties', '/api/parties/ACES42', '/api/parties/ACES42/join', '/api/parties/ACES42/leave', '/api/parties/ACES42/start',
  '/api/parties/ACES42/skip', '/api/parties/ACES42/settings', '/api/parties/%zz',
  '/api/blackjack', '/api/blackjack/ABCDE/ws', '/api/reports', '/api/boards/bankroll', '/api/boards/daily:9999-99-99', '/api/boards/%zz',
  '/api/daily/score', '/api/daily/%zz', '/api/bankroll/123456', '/api/bankroll/123456/sit', '/api/bankroll/123456/rebuy', '/api/bankroll/12/ws', '/api/bankroll/%zz',
  '/api/premium/verify', '/api/premium/status', '/api/premium/restore', '/api/apple/notifications', '/api/nope', '/', '/%00', '/..%2f..%2fetc/passwd', '/.well-known/apple-app-site-association',
];
const bodies = [
  undefined, '', 'null', '[]', '{}', '"x"', '1', '{', '{"a":', 'x'.repeat(200_000),
  JSON.stringify({ deviceId: DEV }), JSON.stringify({ deviceId: DEV, name: 'x'.repeat(100000), emoji: 'y'.repeat(1000) }),
  JSON.stringify({ deviceId: 1, name: {}, emoji: [], code: null, settings: 5, bots: 'many', to: 'x', kind: 'table' }),
  JSON.stringify({ __proto__: { polluted: 1 }, constructor: { prototype: { polluted: 1 } }, deviceId: DEV }),
  JSON.stringify({ deviceId: DEV, settings: { bigBlind: -1, smallBlind: 1e308, startingStack: NaN, variant: '__proto__', hands: 1e9 }, bots: 9999 }),
  JSON.stringify({ deviceId: DEV, code: '../../x', playlist: new Array(5000).fill('holdem'), games: ['x'], reason: 'x'.repeat(100000), reportee: { x: 1 } }),
  JSON.stringify({ signedTransactionInfo: 'a.b.c', transaction: 'x'.repeat(100000), signedPayload: 'a.b.c', deviceId: DEV }),
];
const methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'];
const bad = new Map();
let n = 0;
const t0 = Date.now();
async function hit(method, path, body, headers = {}) {
  n++;
  const started = Date.now();
  try {
    const res = await fetch(BASE + path, { method, body: method === 'GET' || method === 'HEAD' ? undefined : body, headers: { 'content-type': 'application/json', ...headers }, redirect: 'manual', signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    const ms = Date.now() - started;
    const isApi = path.startsWith('/api');
    let why = '';
    if (res.status >= 500) why = `status ${res.status}`;
    else if (isApi && method !== 'HEAD' && text && !(res.headers.get('content-type') ?? '').includes('json') && res.status !== 101) why = `non-JSON ${res.status} ${(res.headers.get('content-type') ?? '')}`;
    else if (ms > 4000) why = `slow ${ms}ms`;
    if (why) {
      const key = `${why} :: ${method} ${path.slice(0, 80)}`;
      if (!bad.has(key)) bad.set(key, { body: typeof body === 'string' ? body.slice(0, 100) : body, text: text.slice(0, 160) });
    }
  } catch (e) {
    const key = `network ${e.name} :: ${method} ${path.slice(0, 80)}`;
    if (!bad.has(key)) bad.set(key, { body: typeof body === 'string' ? body.slice(0, 100) : body, text: String(e).slice(0, 120) });
  }
}
for (const p of paths) for (const m of methods) for (const b of bodies) {
  if ((m === 'GET' || m === 'HEAD' || m === 'OPTIONS') && b !== undefined && b !== bodies[1]) continue;
  await hit(m, p, b);
}
// header tricks on a few routes
for (const h of [{ origin: 'https://evil.example' }, { origin: 'null' }, { origin: 'http://localhost.evil.example' }, { 'cf-connecting-ip': '1.2.3.4, 5.6.7.8' }, { 'x-forwarded-for': '<script>' }, { host: 'evil.example' }])
  for (const p of ['/api/tables', '/api/reports', '/api/friends/123456/request']) await hit('POST', p, JSON.stringify({ deviceId: DEV }), h);
console.log(`${n} requests in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${bad.size} distinct problems`);
for (const [k, v] of bad) console.log('-', k, '\n    body:', JSON.stringify(v.body), '\n    reply:', JSON.stringify(v.text));
