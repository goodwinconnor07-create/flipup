import { spawn } from 'node:child_process';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CURRENT_STRATEGY_VERSION } from '../src/bot_engine/strategy';

const minutes = Number(process.argv[2] ?? 300);
const output = resolve(process.argv[3] ?? '/tmp/flipup-bot-improvement');
const request = process.env.BOT_IMPROVE_REQUEST_FILE
  ? (JSON.parse(readFileSync(resolve(process.env.BOT_IMPROVE_REQUEST_FILE), 'utf8')) as {
      deadlineAt?: string;
      initialRealismHands?: number;
    })
  : null;
const initialRealismHands = Number(process.env.BOT_IMPROVE_REALISM_HANDS ?? request?.initialRealismHands ?? 50);
if (!Number.isSafeInteger(initialRealismHands) || initialRealismHands < 20 || initialRealismHands > 1000)
  throw new Error('BOT_IMPROVE_REALISM_HANDS must be 20..1000');
if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 300)
  throw new Error('Duration must be greater than zero and at most 300 minutes');
mkdirSync(output, { recursive: true });
const started = Date.now();
const requestedDeadline = request?.deadlineAt === undefined ? started + minutes * 60000 : Date.parse(request.deadlineAt);
if (!Number.isFinite(requestedDeadline)) throw new Error('Invalid experiment deadline');
const deadline = Math.min(started + minutes * 60000, requestedDeadline);
const statusPath = resolve(output, 'status.json');
if (existsSync(statusPath)) throw new Error('Use a new output directory; saved runs are never overwritten');
type Phase = {
  kind: string;
  batch: number;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number | null;
  deadlineReached?: boolean;
  report?: string;
  pid?: number;
};
const state = {
  protocol: 'timed-bot-improvement-1',
  runId: process.env.BOT_IMPROVE_RUN_ID ?? `local-${started}`,
  sourceCommit: process.env.BOT_IMPROVE_SOURCE_COMMIT ?? null,
  pid: process.pid,
  startedAt: new Date(started).toISOString(),
  deadlineAt: new Date(deadline).toISOString(),
  updatedAt: '',
  status: 'running',
  completedBatches: 0,
  completedCycles: 0,
  durationMinutes: Math.max(0, (deadline - started) / 60000),
  requestedMinutes: minutes,
  deadlineExpiredAtLaunch: deadline <= started,
  productionConfigChanged: false,
  model: CURRENT_STRATEGY_VERSION,
  initialRealismHands,
  phases: [] as Phase[],
  latestCandidate: null as unknown,
  error: null as string | null,
};
const save = () => {
  state.updatedAt = new Date().toISOString();
  writeFileSync(statusPath + '.tmp', JSON.stringify(state, null, 2) + '\n');
  renameSync(statusPath + '.tmp', statusPath);
};
let interrupted = false;
let active: ReturnType<typeof spawn> | null = null;
const stop = () => {
  interrupted = true;
  const child = active;
  child?.kill('SIGTERM');
  if (child) setTimeout(() => child.kill('SIGKILL'), 5000).unref();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
save();
const heartbeat = setInterval(save, 15000);
const run = async (kind: string, batch: number, script: string, args: string[], report: string) => {
  if (Date.now() >= deadline || interrupted) return false;
  const phase: Phase = { kind, batch, startedAt: new Date().toISOString(), report };
  state.phases.push(phase);
  save();
  const fd = openSync(resolve(output, `${kind}-${batch}.log`), 'a');
  let expired = false;
  try {
    const child = spawn(process.execPath, ['--import', 'tsx', script, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, BOT_TRAIN_PAIRS: '100' },
      stdio: ['ignore', fd, fd],
    });
    active = child;
    phase.pid = child.pid;
    save();
    let force: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(
      () => {
        expired = true;
        child.kill('SIGTERM');
        force = setTimeout(() => child.kill('SIGKILL'), 5000);
      },
      Math.max(1, deadline - Date.now()),
    );
    try {
      const code = await new Promise<number | null>((resolveExit, reject) => {
        child.once('error', reject);
        child.once('close', resolveExit);
      });
      phase.exitCode = code;
      phase.deadlineReached = expired;
      if (code !== 0 && !expired && !interrupted) throw new Error(`${kind} failed (${code}); see ${kind}-${batch}.log`);
    } finally {
      clearTimeout(timer);
      if (force) clearTimeout(force);
      active = null;
    }
  } finally {
    closeSync(fd);
    phase.finishedAt = new Date().toISOString();
    save();
  }
  return !expired && !interrupted;
};

try {
  const training = resolve(output, 'training');
  const ranges = resolve(output, 'range-analysis.json');
  if (await run('ranges', 0, 'scripts/analyseBotRanges.ts', [ranges], ranges)) {
    for (let batch = 1; Date.now() < deadline && !interrupted; batch++) {
      const report = resolve(training, 'report.json');
      if (!(await run('training', batch, 'scripts/trainBot.ts', ['2', training], report))) break;
      const result = JSON.parse(readFileSync(report, 'utf8'));
      copyFileSync(report, resolve(output, `training-report-${batch}.json`));
      state.completedBatches++;
      state.completedCycles = result.completedCycles;
      state.latestCandidate = {
        config: result.candidate,
        syntheticGatePassed: result.syntheticGatePassed,
        syntheticMeanGain: result.holdout.meanGain,
        poker: result.poker,
      };
      save();
      console.log(JSON.stringify({ batch, completedCycles: state.completedCycles, deadlineAt: state.deadlineAt }));
      // Fixed-seed regression checks are repeated monitoring, not fresh independent evidence.
      if (batch === 1 || batch % 10 === 0) {
        const comparison = resolve(output, `planning-${batch}.json`);
        const script = CURRENT_STRATEGY_VERSION === 'baseline-7' ? 'scripts/evaluateRealism.ts' : 'scripts/evaluatePlanning.ts';
        if (!(await run('planning', batch, script, [String(batch === 1 ? initialRealismHands : 50), comparison, 'holdout'], comparison)))
          break;
      }
    }
  }
  state.status = interrupted ? 'cancelled' : 'completed';
} catch (error) {
  state.status = 'failed';
  state.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  clearInterval(heartbeat);
  const checkpoint = resolve(output, 'training/checkpoint.json');
  if (existsSync(checkpoint)) {
    const saved = JSON.parse(readFileSync(checkpoint, 'utf8'));
    state.completedCycles = saved.nextCycle;
  }
  save();
  console.log(JSON.stringify({ status: state.status, completedCycles: state.completedCycles, statusPath }));
}
