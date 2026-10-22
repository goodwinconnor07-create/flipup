// Plays a list of sessions on one engine and appends one JSON line per session to the output file.
// Usage: npx tsx bot-lab/worker.ts <engine> <plan.json> <out.jsonl>
import { appendFileSync, readFileSync } from 'node:fs';
import { loadEngine, runSession, type SessionConfig } from './sim';

const [engineName, planFile, outFile] = process.argv.slice(2);
const configs: SessionConfig[] = JSON.parse(readFileSync(planFile, 'utf8'));
const engine = await loadEngine(engineName);
for (const cfg of configs) {
  const r = runSession(engine, engineName, cfg);
  appendFileSync(outFile, JSON.stringify(r) + '\n');
}
