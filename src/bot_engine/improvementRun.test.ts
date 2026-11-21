import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Bounded background improvement run', () => {
  it('honors an absolute request cutoff instead of starting another five hours after a delayed launch', () => {
    const root = mkdtempSync(join(tmpdir(), 'flipup-deadline-test-'));
    try {
      const request = join(root, 'request.json'),
        output = join(root, 'run');
      writeFileSync(request, JSON.stringify({ deadlineAt: '2000-01-01T00:00:00.000Z', initialRealismHands: 1000 }));
      execFileSync(process.execPath, ['--import', 'tsx', 'scripts/improveBots.ts', '300', output], {
        stdio: 'pipe',
        timeout: 10000,
        env: { ...process.env, BOT_IMPROVE_REQUEST_FILE: request },
      });
      const saved = JSON.parse(readFileSync(join(output, 'status.json'), 'utf8'));
      expect(saved.status).toBe('completed');
      expect(saved.deadlineExpiredAtLaunch).toBe(true);
      expect(saved.durationMinutes).toBe(0);
      expect(saved.initialRealismHands).toBe(1000);
      expect(saved.phases).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('saves its status, stops its child at the deadline and preserves existing results', () => {
    const output = mkdtempSync(join(tmpdir(), 'flipup-improve-test-'));
    try {
      execFileSync(process.execPath, ['--import', 'tsx', 'scripts/improveBots.ts', '0.02', output], {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 12000,
      });
      const saved = JSON.parse(readFileSync(join(output, 'status.json'), 'utf8'));
      expect(saved.status).toBe('completed');
      expect(saved.productionConfigChanged).toBe(false);
      expect(saved.phases.length).toBeGreaterThan(0);
      expect(saved.phases.at(-1).deadlineReached).toBe(true);
      expect(Date.parse(saved.updatedAt)).toBeGreaterThanOrEqual(Date.parse(saved.deadlineAt));
      for (const phase of saved.phases) if (phase.pid) expect(() => process.kill(phase.pid, 0)).toThrow();
      const before = readFileSync(join(output, 'status.json'), 'utf8');
      expect(() =>
        execFileSync(process.execPath, ['--import', 'tsx', 'scripts/improveBots.ts', '0.02', output], { stdio: 'pipe' }),
      ).toThrow();
      expect(readFileSync(join(output, 'status.json'), 'utf8')).toBe(before);
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  }, 15000);
});
