import { DurableObject } from 'cloudflare:workers';
import { REPORT_REASONS, type ReportRequest } from '../src/game';

/** Reports are kept this long, then deleted (the privacy policy says so). */
const KEEP_FOR_MS = 180 * 24 * 60 * 60 * 1000;

export interface StoredReport extends ReportRequest {
  id: string;
  at: number;
  /** What the server found at that table or party when the report came in. */
  found: { name: string; emoji: string; deviceId: string | null; bot?: boolean };
}

/**
 * Player reports (App Store guideline 1.2). One instance, named "reports", holds every report in SQLite and
 * forgets them after KEEP_FOR_MS. The Worker emails each new one to the support address.
 */
export class ReportBox extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, at INTEGER NOT NULL, reporter TEXT NOT NULL, body TEXT NOT NULL)');
  }

  /** RPC: store a report. Returns false when this phone has sent too many today. */
  async add(report: StoredReport): Promise<boolean> {
    const sql = this.ctx.storage.sql;
    sql.exec('DELETE FROM reports WHERE at < ?', Date.now() - KEEP_FOR_MS);
    const today = sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM reports WHERE reporter = ? AND at > ?', report.deviceId, Date.now() - 24 * 60 * 60 * 1000).one().n;
    if (today >= 20) return false;
    sql.exec('INSERT INTO reports (id, at, reporter, body) VALUES (?, ?, ?, ?)', report.id, report.at, report.deviceId, JSON.stringify(report));
    return true;
  }
}

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

/**
 * Emails a report to the support address through Resend. Needs the `RESEND_API_KEY` secret and `REPORT_TO`
 * (and optionally `REPORT_FROM`, an address on a domain verified in Resend). Without them the report is only stored.
 */
export async function emailReport(env: Env, r: StoredReport): Promise<void> {
  const vars = env as unknown as { RESEND_API_KEY?: string; REPORT_TO?: string; REPORT_FROM?: string };
  if (!vars.RESEND_API_KEY || !vars.REPORT_TO) return;
  const lines = [
    `Reason: ${reasonLabel(r.reason)}`,
    `Where: ${r.where} ${r.code}`,
    `Reported: ${r.found.emoji} ${r.found.name}${r.found.bot ? ' (a bot)' : ''} (seat ${r.playerId}, device ${r.found.deviceId ?? 'none'})`,
    `Shown to the reporter as: ${r.emoji} ${r.name}`,
    `Reporter device: ${r.deviceId}`,
    `Report id: ${r.id}, ${new Date(r.at).toISOString()}`,
    '',
    'Answer or act within 24 hours (docs/APP_STORE.md, 1.2).',
  ];
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${vars.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: vars.REPORT_FROM ?? 'FlipUp reports <onboarding@resend.dev>',
      to: [vars.REPORT_TO],
      subject: `FlipUp report: ${reasonLabel(r.reason)} (${r.where} ${r.code})`,
      text: lines.join('\n'),
    }),
  }).catch(() => undefined);
}
