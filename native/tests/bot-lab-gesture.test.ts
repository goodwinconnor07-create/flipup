import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layout = readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');
const dial = readFileSync(new URL('../src/components/bot-lab/dial-slider.tsx', import.meta.url), 'utf8');

describe('the Bot Lab editor holds still while you turn a dial', () => {
  it('has no swipe back, so a missed slider can not pull the page away', () => {
    const line = layout.split('\n').find((l) => l.includes('name="bot-lab-edit"'));
    expect(line).toBeTruthy();
    expect(line).toContain('gestureEnabled: false');
  });

  it('gives each slider extra touch room above and below', () => {
    expect(dial).toMatch(/reach=\{REACH\}/);
    expect(dial).toMatch(/const REACH = \d+/);
  });
});
