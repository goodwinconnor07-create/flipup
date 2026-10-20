import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForJob } from './api';

const reply = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('waiting for a coach job', () => {
  it('stops with an error when a job is done but has no answer, instead of asking for ever', async () => {
    const fetchMock = vi.fn(async () => reply({ status: 'done', progress: 1, total: 1, result: null }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(waitForJob('j1')).rejects.toThrow(/without an answer/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('carries on past one dropped poll', async () => {
    vi.useFakeTimers();
    let n = 0;
    vi.stubGlobal('fetch', async () => {
      n += 1;
      if (n === 1) throw new Error('offline');
      return reply(n === 2 ? { status: 'running', progress: 0, total: 1, result: null } : { status: 'done', progress: 1, total: 1, result: { ok: true } });
    });
    const done = waitForJob<{ ok: boolean }>('j2');
    await vi.runAllTimersAsync();
    await expect(done).resolves.toEqual({ ok: true });
  });

  it('gives up after repeated failures and reports a failed job', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline');
    });
    const failed = waitForJob('j3');
    const check = expect(failed).rejects.toThrow(/Couldn't reach/);
    await vi.runAllTimersAsync();
    await check;
    vi.stubGlobal('fetch', async () => reply({ status: 'error', progress: 0, total: 1, result: null, error: 'Solver crashed' }));
    await expect(waitForJob('j4')).rejects.toThrow('Solver crashed');
  });
});
