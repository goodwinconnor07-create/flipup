import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ResearchReport } from '../src/research/protocol';
import { parseMetadata, parseResearchHand, researchId, researchKey } from '../src/research/protocol';
import { reviewResearch } from '../src/research/review';
import { replayResearchHand } from '../src/research/replay';
const source = process.argv[2];
if (!source) throw new Error('Usage: npm run bot:review-research -- <download.json | private-review-link> [output.json] [--replay]');
let report: ResearchReport;
if (/^https?:\/\//.test(source)) {
  const url = new URL(source),
    match = url.hash.match(/^#bot-research=([a-f0-9-]+)\.([a-f0-9]+)$/i);
  if (!match || !researchId(match[1]) || !researchKey(match[2]))
    throw new Error('Use the full private review link, including its fragment.');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Remote research links must use HTTPS.');
  const hands: ResearchReport['hands'] = [];
  let after = -1;
  let latest: ResearchReport | undefined;
  for (let page = 0; page < 16; page++) {
    const response = await fetch(`${url.origin}/api/bot-research/${match[1]}?after=${after}`, {
      headers: { authorization: `Bearer ${match[2]}` },
      signal: AbortSignal.timeout(30_000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error(`Research download failed (${response.status}); the link may have expired or network access may be unavailable.`);
    const data = (await response.json()) as ResearchReport & { next: number | null };
    latest = data;
    hands.push(...data.hands);
    if (data.next === null) break;
    if (!Number.isInteger(data.next) || data.next <= after) throw new Error('Invalid research pagination.');
    after = data.next;
  }
  if (!latest) throw new Error('No research report returned.');
  report = { ...latest, hands };
} else report = JSON.parse(await readFile(source, 'utf8'));
const metadata = parseMetadata(report.metadata);
if (!metadata || !Array.isArray(report.hands) || report.hands.some((h) => !parseResearchHand(h, metadata)))
  throw new Error('Invalid research report.');
const summary = {
  ...reviewResearch(report),
  ...(process.argv.includes('--replay') ? { replay: report.hands.map((h) => ({ index: h.index, ...replayResearchHand(h) })) } : {}),
};
const output = process.argv[3] && process.argv[3] !== '--replay' ? process.argv[3] : '/tmp/flipup-research-review.json';
await writeFile(resolve(output), JSON.stringify(summary, null, 2) + '\n');
console.log(
  JSON.stringify({ hands: summary.hands, botDecisions: summary.botDecisions, flagged: summary.flags.length, output: resolve(output) }),
);
