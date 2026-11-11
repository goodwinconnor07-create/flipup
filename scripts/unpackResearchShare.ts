import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { decodeResearchPacket } from '../src/research/share';
const args = process.argv.slice(2),
  out = args.indexOf('--out');
const output = out < 0 ? '/tmp/flipup-research-unpacked.json' : args[out + 1];
const files = out < 0 ? args : args.slice(0, out);
if (!output || !files.length) throw new Error('Usage: npm run bot:unpack-research -- <part1.txt> [part2.txt ...] [--out report.json]');
const report = await decodeResearchPacket(await Promise.all(files.map((f) => readFile(f, 'utf8'))));
await writeFile(resolve(output), JSON.stringify(report) + '\n', { mode: 0o600 });
console.log(
  JSON.stringify({
    hands: report.hands.length,
    engine: report.metadata.engine,
    output: resolve(output),
    kind: 'format' in report ? 'review' : 'full',
  }),
);
