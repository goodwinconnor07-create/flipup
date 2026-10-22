// Runs a plan on an engine with a bounded number of worker processes.
// Usage: npx tsx bot-lab/run.ts <phase: pilot|dev|confirm> <engine> <out.jsonl> [--workers N] [--scale X] [--only id,id] [--limit-minutes M]
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildPlan, handsIn, type Phase } from './plan';

const args = process.argv.slice(2);
const flag = (name: string, d?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : d;
};
const [phase, engine, out] = args as [Phase, string, string];
const workers = Math.max(1, Number(flag('workers', '3')));
const scale = Number(flag('scale', '1'));
const only = flag('only')?.split(',');
const planFile = flag('plan');
let plan = planFile ? JSON.parse(readFileSync(planFile, 'utf8')) : buildPlan(phase, scale);
if (only) plan = plan.filter((c: { scenario: string }) => only.includes(c.scenario));
mkdirSync(dirname(out), { recursive: true });
const done = new Set<string>();
if (existsSync(out)) for (const line of readFileSync(out, 'utf8').split('\n')) if (line) done.add(JSON.parse(line).config.id);
plan = plan.filter((c: { id: string }) => !done.has(c.id));
const t0 = Date.now();
const log = `${dirname(new URL(import.meta.url).pathname)}/commands.log`;
appendFileSync(log, `npx tsx bot-lab/run.ts ${args.join(' ')}   # ${new Date().toISOString()} engine=${engine} sessions=${plan.length} hands=${handsIn(plan)} workers=${workers}\n`);
console.log(`${engine}: ${plan.length} sessions, ${handsIn(plan)} hands, ${workers} workers`);

// Longest sessions first, dealt round-robin into one list per worker.
const sorted = [...plan].sort((a: { hands: number; seats: string[] }, b: { hands: number; seats: string[] }) => b.hands * b.seats.length - a.hands * a.seats.length);
const lists: unknown[][] = Array.from({ length: workers }, () => []);
sorted.forEach((c, i) => lists[i % workers].push(c));
let running = 0;
await Promise.all(
  lists.map(
    (list, i) =>
      new Promise<void>((resolve, reject) => {
        if (!list.length) return resolve();
        const file = `${out}.plan${i}.json`;
        writeFileSync(file, JSON.stringify(list));
        running++;
        const child = spawn('npx', ['tsx', 'bot-lab/worker.ts', engine, file, `${out}.part${i}`], { stdio: 'inherit' });
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`worker ${i} exited ${code}`))));
      }),
  ),
);
// Merge the parts into the output file.
for (let i = 0; i < workers; i++) {
  const part = `${out}.part${i}`;
  if (existsSync(part)) appendFileSync(out, readFileSync(part, 'utf8'));
  for (const f of [part, `${out}.plan${i}.json`]) if (existsSync(f)) rmSync(f);
}
const secs = (Date.now() - t0) / 1000;
console.log(`done in ${secs.toFixed(0)}s (${(handsIn(plan) / secs).toFixed(0)} hands/s overall)`);
appendFileSync(log, `#   -> ${engine} ${phase}: ${handsIn(plan)} hands in ${secs.toFixed(0)}s wall with ${workers} workers\n`);
void running;
