import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { BotFactory } from '../src/bot_engine/identity';
import { MemoryRepository } from '../src/bot_engine/memory';
import { simulate } from '../src/bot_engine/simulation';
import { evaluatePopulation } from '../src/bot_engine/evaluation';
import { calibratePopulation } from '../src/bot_engine/calibration';

const command = process.argv[2] ?? 'simulate';
const count = Number(process.argv[3] ?? (command === 'generate' ? 20 : 100));
if (!Number.isSafeInteger(count) || count < 1 || count > 10000) throw new Error('Count must be an integer from 1 to 10000');
if (command === 'calibrate') {
  console.log(JSON.stringify(calibratePopulation(count), null, 2));
} else if (command === 'evaluate') {
  console.log(JSON.stringify(evaluatePopulation(count), null, 2));
} else if (command === 'generate') {
  const factory = new BotFactory();
  console.log(
    JSON.stringify(
      {
        generatorVersion: 'latent-1',
        calibrated: false,
        profiles: Array.from({ length: count }, (_, n) => factory.generate(`BOT_${String(n + 1).padStart(3, '0')}`, 1001 + n)),
        warnings: ['Numeric trait diversity only. Behavioral calibration and near-duplicate rejection remain incomplete.'],
      },
      null,
      2,
    ),
  );
} else if (command === 'simulate') {
  const {
    dealChecksums: _privateDealChecksums,
    handReturnsBb: _perHandReturns,
    ...report
  } = simulate(count, 7, Number(process.argv[5] ?? 2));
  const destination = resolve(process.argv[4] ?? '/tmp/flipup-human-poker-memory.json');
  // Single-writer CLI storage; atomic replacement protects an interrupted write.
  let values: Record<string, string> = {};
  try {
    values = JSON.parse(await readFile(destination, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const repository = new MemoryRepository({
    get: async (key) => (Object.hasOwn(values, key) ? values[key] : null),
    put: async (key, value) => {
      Object.defineProperty(values, key, { value, enumerable: true, writable: true, configurable: true });
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination + '.tmp', JSON.stringify(values), { mode: 0o600 });
      await rename(destination + '.tmp', destination);
    },
  });
  for (const memory of report.memories) {
    await repository.save(memory);
    const reloaded = await repository.load(memory.botId, memory.tableId);
    if (JSON.stringify(reloaded) !== JSON.stringify(memory)) throw new Error('Persistence roundtrip failed');
  }
  console.log(JSON.stringify({ ...report, memoryFile: destination, persistenceRoundtrip: 'passed' }, null, 2));
} else throw new Error('Usage: humanPoker.ts simulate|generate [count] [memory-file]');
