import { DurableObject } from 'cloudflare:workers';
import { parseMetadata, parseResearchHand, researchId, researchKey, type ResearchMetadata } from '../src/research/protocol';
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BYTES = 1024 * 1024;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
async function digest(key: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)))]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}
async function boundedJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > MAX_BYTES || !request.body) return null;
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) {
      bytes.set(c, at);
      at += c.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
export class BotResearchRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS research_hands (idx INTEGER PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL)',
    );
  }
  async initialize(keyHash: string, metadata: ResearchMetadata): Promise<number> {
    if (await this.ctx.storage.get('expired')) return 410;
    const old = await this.ctx.storage.get<{ keyHash: string; metadata: ResearchMetadata; expiresAt: number }>('session');
    if (old)
      return old.expiresAt <= Date.now()
        ? 410
        : old.keyHash === keyHash && JSON.stringify(old.metadata) === JSON.stringify(metadata)
          ? 200
          : 409;
    const expiresAt = Date.now() + KEEP_MS;
    await this.ctx.storage.put('session', { keyHash, metadata, expiresAt });
    await this.ctx.storage.setAlarm(expiresAt);
    return 201;
  }
  async authorized(keyHash: string) {
    const session = await this.ctx.storage.get<{ keyHash: string; metadata: ResearchMetadata; expiresAt: number }>('session');
    return session?.keyHash === keyHash && session.expiresAt > Date.now() ? session : null;
  }
  async putHand(keyHash: string, index: number, revision: number, payload: unknown): Promise<number> {
    const session = await this.authorized(keyHash);
    if (!session) return 403;
    const hand = parseResearchHand(payload, session.metadata);
    if (!hand || hand.index !== index) return 400;
    const body = JSON.stringify(hand);
    // SQLite stores a hand as one row, beyond the KV per-value limit; revision checks stay atomic.
    return this.ctx.storage.transactionSync(() => {
      const old = this.ctx.storage.sql
        .exec<{ revision: number; body: string }>('SELECT revision, body FROM research_hands WHERE idx = ?', index)
        .toArray()[0];
      if (old && (old.revision > revision || (old.revision === revision && old.body !== body))) return 409;
      if (!old || old.revision < revision)
        this.ctx.storage.sql.exec('INSERT OR REPLACE INTO research_hands (idx, revision, body) VALUES (?, ?, ?)', index, revision, body);
      return 200;
    });
  }
  async report(keyHash: string, after = -1) {
    const session = await this.authorized(keyHash);
    if (!session) return null;
    const rows = this.ctx.storage.sql
      .exec<{ idx: number; body: string }>('SELECT idx, body FROM research_hands WHERE idx > ? ORDER BY idx LIMIT 8', after)
      .toArray();
    return {
      metadata: session.metadata,
      expiresAt: session.expiresAt,
      hands: rows.map((r) => JSON.parse(r.body)),
      next: rows.length === 8 ? rows.at(-1)!.idx : null,
    };
  }
  async remove(keyHash: string): Promise<boolean> {
    if (!(await this.authorized(keyHash))) return false;
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.put('expired', true);
    await this.ctx.storage.deleteAlarm();
    return true;
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.put('expired', true);
  }
}
export async function botResearchRoute(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/api/bot-research') {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    const body = (await boundedJson(request)) as Record<string, unknown> | null;
    const metadata = parseMetadata(body?.metadata);
    if (!body || !researchId(body.id) || !researchKey(body.key) || !metadata) return json({ error: 'Invalid research session.' }, 400);
    const status = await env.BOT_RESEARCH.getByName(body.id).initialize(await digest(body.key), metadata);
    return json(status < 300 ? { id: body.id } : { error: 'This research session cannot be opened.' }, status);
  }
  const match = path.match(/^\/api\/bot-research\/([^/]+)(?:\/hands\/(\d+))?$/);
  if (!match || !researchId(match[1])) return json({ error: 'Unknown research session.' }, 404);
  const key = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!researchKey(key)) return json({ error: 'A private review key is required.' }, 401);
  const hash = await digest(key),
    room = env.BOT_RESEARCH.getByName(match[1]);
  if (match[2] !== undefined) {
    if (request.method !== 'PUT') return json({ error: 'Use PUT.' }, 405);
    if (!(await room.authorized(hash))) return json({ error: 'Unknown or expired research session.' }, 403);
    const body = (await boundedJson(request)) as { revision?: unknown; hand?: unknown } | null;
    if (!body || !Number.isInteger(body.revision) || (body.revision as number) < 1 || (body.revision as number) > 1000)
      return json({ error: 'Invalid hand revision.' }, 400);
    const status = await room.putHand(hash, Number(match[2]), body.revision as number, body.hand);
    return json(status === 200 ? { saved: true, revision: body.revision } : { error: 'The hand could not be saved.' }, status);
  }
  if (request.method === 'DELETE')
    return (await room.remove(hash)) ? json({ deleted: true }) : json({ error: 'Unknown research session.' }, 403);
  if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
  const after = Number(new URL(request.url).searchParams.get('after') ?? -1);
  if (!Number.isInteger(after) || after < -1 || after >= 120) return json({ error: 'Invalid report page.' }, 400);
  const report = await room.report(hash, after);
  return report ? json(report) : json({ error: 'Unknown or expired research session.' }, 403);
}
