import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Bounded background improvement run', () => {
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
