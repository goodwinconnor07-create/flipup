import { describe, expect, it } from 'vitest';
import { FeelCollector } from './feel';
import { simulate } from './simulation';

// The guard for how Casual tables feel: bots that bet when it's checked to them, c-bet as the raiser, don't slowplay,
// don't fold a pair to a small bet and don't shove with nothing. Bands are looser than `npm run bot:feel` (a short
// sample is noisy); the script is where to tune.
describe('table feel (Casual)', () => {
  it('plays the way an ordinary table does', () => {
    const feel = new FeelCollector();
    for (const seed of [11, 22])
      simulate(250, seed, 6, { agents: Array(6).fill('bot'), everyday: 'casual', experience: true, onAction: (i, a) => feel.observe(i, a) });
    const m = Object.fromEntries(feel.report().map((x) => [x.id, x]));
    const v = (id: string) => m[id].value ?? NaN;
    expect(v('checkedToHU')).toBeGreaterThan(44);
    expect(v('checkedToValue')).toBeGreaterThan(70);
    expect(v('cbetHU')).toBeGreaterThan(48);
    expect(v('slowplay')).toBeLessThan(25);
    expect(v('foldFlopBet')).toBeGreaterThan(28);
    expect(v('foldFlopBet')).toBeLessThan(58);
    expect(v('foldTop')).toBeLessThan(18);
    expect(v('foldMid')).toBeLessThan(48);
    expect(v('trashAllIn')).toBeLessThan(2);
  }, 400_000);
});
