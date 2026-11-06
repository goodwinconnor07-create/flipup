import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { motion } from '@design/tokens';
import { arcPoint, exitMs, knobStretch, rubber, settleSpring, stagger } from '../src/motion/rules';

// "The 20 rules" in docs/MOTION.md, as checks. The first half tests the numbers; the second half reads the source
// so new code can't quietly break the rules that can be seen in text. If one fails, fix the animation, not the test.

describe('the numbers', () => {
  it('rule 15: exits are 20% shorter than entrances', () => {
    expect(exitMs(motion.base)).toBe(motion.exit);
    expect(motion.exit).toBe(200);
  });
  it('rules 3 and 6: stagger is 30ms a step and stops at 8 steps', () => {
    expect(stagger(0)).toBe(0);
    expect(stagger(1)).toBe(30);
    expect(stagger(5)).toBe(150);
    expect(stagger(40)).toBe(240);
  });
  it('rule 10: nothing starts from 0', () => {
    expect(motion.popFrom).toBe(0.95);
  });
  it('rule 2: dropdowns open in 150 to 250ms', () => {
    expect(motion.dropdown).toEqual({ min: 150, max: 250 });
    expect(motion.base).toBeGreaterThanOrEqual(motion.dropdown.min);
    expect(motion.base).toBeLessThanOrEqual(motion.dropdown.max);
  });
  it('rule 4: a press dips to 0.97', () => {
    expect(motion.pressScale).toBe(0.97);
  });
  it('rule 5: a moving knob stretches 12% and keeps its area', () => {
    const k = knobStretch(1);
    expect(k.x).toBeCloseTo(1.12);
    expect(k.x * k.y).toBeCloseTo(1);
    expect(knobStretch(0)).toEqual({ x: 1, y: 1 });
  });
  it('rule 7: an arc bows 32px off the straight line at its middle and ends where it should', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };
    expect(arcPoint(0, a, b)).toEqual(a);
    expect(arcPoint(1, a, b)).toEqual(b);
    expect(arcPoint(0.5, a, b).y).toBeCloseTo(-32);
  });
  it('rule 13: the settle spring is critically damped', () => {
    const s = settleSpring(1, 300);
    expect(s.damping).toBeCloseTo(2 * Math.sqrt(300));
  });
  it('rule 19: a drag follows the finger to the limit, then meets diminishing resistance', () => {
    expect(rubber(30, 50)).toBe(30);
    expect(rubber(-50, 50)).toBe(-50);
    const a = rubber(100, 50) - 50;
    const b = rubber(200, 50) - rubber(100, 50);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeLessThan(100); // 100 more points of finger moves it less than 100
    expect(rubber(10_000, 50)).toBeLessThan(100.01); // and it never goes further than limit + room
    expect(rubber(-100, 50)).toBe(-rubber(100, 50));
  });
});

const NATIVE = new URL('../src/', import.meta.url);
const files = (readdirSync(NATIVE, { recursive: true }) as string[])
  .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('motion/presets.ts') && !f.endsWith('motion/rules.ts'))
  .map((f) => ({ f, text: readFileSync(new URL(f, NATIVE), 'utf8') }));

describe('the app source', () => {
  it('rules 10 and 13: no ZoomIn, ZoomOut, bounce or elastic animation (use popIn() and SETTLE from motion/presets)', () => {
    const bad = files.filter(({ text }) => /\b(ZoomIn|ZoomOut|BounceIn|BounceOut|Easing\.bounce|Easing\.elastic)\b/.test(text)).map((x) => x.f);
    expect(bad).toEqual([]);
  });
  it('rule 1: nothing eases in on its way onto the screen', () => {
    const bad = files.filter(({ text }) => /Easing\.in\(|Easing\.ease\b/.test(text)).map((x) => x.f);
    expect(bad).toEqual([]);
  });
  it('rule 13: every spring written out in numbers is damped enough not to wobble', () => {
    const bad: string[] = [];
    for (const { f, text } of files) {
      for (const m of text.matchAll(/mass:\s*([\d.]+),\s*stiffness:\s*([\d.]+),\s*damping:\s*([\d.]+)/g)) {
        const ratio = Number(m[3]) / (2 * Math.sqrt(Number(m[1]) * Number(m[2])));
        if (ratio < 0.7) bad.push(`${f}: ${m[0]} (damping ratio ${ratio.toFixed(2)})`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('the web stylesheets', () => {
  const css = ['global', 'table', 'screens', 'premium', 'home'].map((n) => ({ n, text: readFileSync(new URL(`../../src/styles/${n}.css`, import.meta.url), 'utf8') }));
  it('rule 13: no easing curve overshoots (a y above 1)', () => {
    const bad: string[] = [];
    for (const { n, text } of css) {
      for (const m of text.matchAll(/cubic-bezier\(\s*[\d.]+,\s*([\d.]+),\s*[\d.]+,\s*([\d.]+)\s*\)/g)) if (Number(m[1]) > 1 || Number(m[2]) > 1) bad.push(`${n}.css: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });
  it('rule 10: pop starts from the --pop-from token, not from a tiny scale', () => {
    const g = css[0].text;
    expect(g).toContain('--pop-from: 0.95');
    expect(g).not.toMatch(/@keyframes pop \{\s*0% \{\s*transform: scale\(0\./);
  });
});
