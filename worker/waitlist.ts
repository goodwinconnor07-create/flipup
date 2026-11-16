// The launch waitlist on playflipup.com: people leave an email to hear when FlipUp is on the App Store.
// Double opt-in: an address is only kept once its owner taps the link in the confirmation email, so nobody can sign up
// someone else. Every email has a link to leave. The launch email is sent once, by the owner (POST /api/waitlist/launch
// with the WAITLIST_TOKEN secret), and each address is deleted as soon as its launch email has gone. Emails go out
// through Resend with the RESEND_API_KEY secret the report emails already use.
import { DurableObject } from 'cloudflare:workers';

/** An unconfirmed address is forgotten after this long. */
const PENDING_FOR_MS = 7 * 24 * 60 * 60 * 1000;
/** A confirmation email is sent again for the same address at most this often. */
const RESEND_AFTER_MS = 10 * 60 * 1000;
/** Launch emails sent per call, so one call stays well inside a Worker's time. Call again until `left` is 0. */
const LAUNCH_BATCH = 300;
const SITE = 'https://playflipup.com';

type Entry = {
  email: string;
  token: string;
  status: 'pending' | 'confirmed';
  created: number;
  sent: number;
};

/** One instance, named "waitlist", holds every address in SQLite. */
export class Waitlist extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS entries (email TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, status TEXT NOT NULL, created INTEGER NOT NULL, sent INTEGER NOT NULL)',
    );
  }

  private forgetStale(): void {
    this.ctx.storage.sql.exec("DELETE FROM entries WHERE status = 'pending' AND created < ?", Date.now() - PENDING_FOR_MS);
  }

  /** RPC: a new sign-up. Returns the token to email, or null when nothing should be sent (already confirmed, or emailed a moment ago). */
  async join(email: string, token: string): Promise<string | null> {
    this.forgetStale();
    const sql = this.ctx.storage.sql;
    const have = sql.exec<Entry>('SELECT * FROM entries WHERE email = ?', email).toArray()[0];
    const now = Date.now();
    if (have?.status === 'confirmed') return null;
    if (have) {
      if (now - have.sent < RESEND_AFTER_MS) return null;
      sql.exec('UPDATE entries SET sent = ? WHERE email = ?', now, email);
      return have.token;
    }
    sql.exec("INSERT INTO entries (email, token, status, created, sent) VALUES (?, ?, 'pending', ?, ?)", email, token, now, now);
    return token;
  }

  /** RPC: the confirmation link. True when the token matched an address. */
  async confirm(token: string): Promise<boolean> {
    this.forgetStale();
    const sql = this.ctx.storage.sql;
    const found = sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM entries WHERE token = ?', token).one().n > 0;
    if (found) sql.exec("UPDATE entries SET status = 'confirmed' WHERE token = ?", token);
    return found;
  }

  /** RPC: the leave link. The address is deleted. */
  async leave(token: string): Promise<void> {
    this.ctx.storage.sql.exec('DELETE FROM entries WHERE token = ?', token);
  }

  /** RPC: how many are waiting. */
  async counts(): Promise<{ pending: number; confirmed: number }> {
    this.forgetStale();
    const sql = this.ctx.storage.sql;
    const n = (status: string) => sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM entries WHERE status = ?', status).one().n;
    return { pending: n('pending'), confirmed: n('confirmed') };
  }

  /** RPC: the next confirmed addresses for the launch email. */
  async nextBatch(limit: number): Promise<{ email: string; token: string }[]> {
    return this.ctx.storage.sql.exec<{ email: string; token: string }>("SELECT email, token FROM entries WHERE status = 'confirmed' ORDER BY created LIMIT ?", limit).toArray();
  }

  /** RPC: these got their launch email: forget them (the privacy policy says so). */
  async done(emails: string[]): Promise<void> {
    for (const e of emails) this.ctx.storage.sql.exec('DELETE FROM entries WHERE email = ?', e);
  }
}

type Vars = { RESEND_API_KEY?: string; WAITLIST_FROM?: string; REPORT_FROM?: string; WAITLIST_TOKEN?: string };

/** A plain email address check: something@something.something, no spaces, a sane length. */
export function cleanEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[a-z]{2,}$/.test(email) ? email : null;
}

function token(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const back = (to: string): Response => new Response(null, { status: 303, headers: { location: `${SITE}/?waitlist=${to}`, 'cache-control': 'no-store' } });

/** The words of every email, kept plain: no tracking pixels, no images. */
function email(to: string, subject: string, lines: string[], leave: string, vars: Vars) {
  const text = [...lines, '', `Don't want these? Leave the list: ${leave}`, '', 'FlipUp · playflipup.com'].join('\n');
  return {
    // The report emails' sender (a domain already verified in Resend), as hello@ on the same domain, unless set.
    from: vars.WAITLIST_FROM ?? (vars.REPORT_FROM?.includes('<') ? vars.REPORT_FROM.replace(/<[^@>]+@/, '<hello@').replace(/^[^<]*</, 'FlipUp <') : 'FlipUp <hello@mail.playflipup.com>'),
    to: [to],
    subject,
    text,
    headers: { 'List-Unsubscribe': `<${leave}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

async function send(vars: Vars, messages: ReturnType<typeof email>[]): Promise<boolean> {
  if (!vars.RESEND_API_KEY || !messages.length) return false;
  const res = await fetch(messages.length === 1 ? 'https://api.resend.com/emails' : 'https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { authorization: `Bearer ${vars.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
  }).catch(() => null);
  return !!res?.ok;
}

/** Constant-time compare for the owner's token. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * /api/waitlist: POST {email} signs up (always answers ok, so it never says who is on the list); GET /confirm?t= and
 * GET or POST /leave?t= come from the emails' links; GET /count and POST /launch {subject?, lines?, url?} are the
 * owner's, with `Authorization: Bearer <WAITLIST_TOKEN>`.
 */
export async function waitlistRoute(request: Request, env: Env, pathname: string, search: string, ctx: ExecutionContext): Promise<Response> {
  const vars = env as unknown as Vars;
  const list = env.WAITLIST.getByName('waitlist');
  const params = new URLSearchParams(search);
  const t = params.get('t') ?? '';
  const validToken = /^[0-9a-f]{48}$/.test(t);

  if (pathname === '/api/waitlist') {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    // A hidden form field people never fill in; scripts often do.
    if (body?.company) return json({ ok: true });
    const address = cleanEmail(body?.email);
    if (!address) return json({ error: 'That email doesn’t look right.' }, 400);
    const toSend = await list.join(address, token());
    if (toSend) {
      const confirm = `${SITE}/api/waitlist/confirm?t=${toSend}`;
      const leave = `${SITE}/api/waitlist/leave?t=${toSend}`;
      ctx.waitUntil(
        send(vars, [
          email(
            address,
            'Confirm your spot on the FlipUp list',
            [
              'Thanks for wanting to hear when FlipUp comes out.',
              '',
              `Tap to confirm: ${confirm}`,
              '',
              "We'll send one email when it's on the App Store, then delete your address. If you didn't ask for this, ignore it and we'll forget your address in a week.",
            ],
            leave,
            vars,
          ),
        ]),
      );
    }
    return json({ ok: true });
  }

  if (pathname === '/api/waitlist/confirm') {
    if (!validToken) return back('expired');
    return back((await list.confirm(t)) ? 'confirmed' : 'expired');
  }

  if (pathname === '/api/waitlist/leave') {
    if (validToken) await list.leave(t);
    // One-click unsubscribe from a mail app is a POST; a tap on the link is a GET.
    return request.method === 'POST' ? json({ ok: true }) : back('left');
  }

  // The owner's two routes.
  const auth = request.headers.get('authorization') ?? '';
  const owner = !!vars.WAITLIST_TOKEN && vars.WAITLIST_TOKEN.length >= 24 && same(auth, `Bearer ${vars.WAITLIST_TOKEN}`);
  if (pathname === '/api/waitlist/count') return owner ? json(await list.counts()) : json({ error: 'Not allowed.' }, 403);
  if (pathname === '/api/waitlist/launch') {
    if (!owner) return json({ error: 'Not allowed.' }, 403);
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (!vars.RESEND_API_KEY) return json({ error: 'RESEND_API_KEY is not set.' }, 503);
    const body = ((await request.json().catch(() => null)) ?? {}) as { subject?: unknown; lines?: unknown; url?: unknown };
    const url = typeof body.url === 'string' && body.url.startsWith('https://') ? body.url : 'https://apps.apple.com/app/id6829639428';
    const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim().slice(0, 120) : 'FlipUp is on the App Store';
    const lines =
      Array.isArray(body.lines) && body.lines.every((l) => typeof l === 'string')
        ? (body.lines as string[]).slice(0, 30)
        : ['FlipUp is out. Poker night on your phones: host a table and your friends join with a code, or play bots on your own.', '', `Get it on the App Store: ${url}`, '', 'This is the only email we send. Your address is now deleted from our list.'];
    const batch = await list.nextBatch(LAUNCH_BATCH);
    let sent = 0;
    // Resend's batch call takes up to 100 emails.
    for (let i = 0; i < batch.length; i += 100) {
      const chunk = batch.slice(i, i + 100);
      const ok = await send(vars, chunk.map((e) => email(e.email, subject, lines, `${SITE}/api/waitlist/leave?t=${e.token}`, vars)));
      if (!ok) return json({ error: 'Resend refused a batch; nothing after it was sent.', sent }, 502);
      await list.done(chunk.map((e) => e.email));
      sent += chunk.length;
    }
    const { confirmed } = await list.counts();
    return json({ sent, left: confirmed });
  }
  return json({ error: 'Not found.' }, 404);
}
