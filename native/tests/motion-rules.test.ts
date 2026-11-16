import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { motion } from '@design/tokens';
import { arcPoint, exitMs, FLICK_SPEED, flickSpring, knobStretch, releaseVelocity, rubber, settleSpring, stagger } from '../src/motion/rules';

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
  it('rule 13: a flick spring overshoots only a little (damping ratio 0.8) and a slow release has no speed to hand over', () => {
    const f = flickSpring(1, 300);
    expect(f.damping / (2 * Math.sqrt(300))).toBeCloseTo(0.8);
    expect(releaseVelocity([])).toBe(0);
    expect(releaseVelocity([{ t: 0, v: 100 }])).toBe(0);
    expect(releaseVelocity([{ t: 0, v: 100 }, { t: 50, v: 100 }])).toBe(0);
    expect(releaseVelocity([{ t: 0, v: 100 }, { t: 50, v: 150 }])).toBeCloseTo(1000);
    // Only the last 100ms count: a stop after a long drag is a set-down.
    expect(releaseVelocity([{ t: 0, v: 0 }, { t: 400, v: 300 }, { t: 500, v: 300 }])).toBe(0);
    expect(FLICK_SPEED).toBeGreaterThan(0);
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
  it('rule 13: no springified layout animation (they overshoot); use a timing with EASE_OUT', () => {
    const bad = files.filter(({ text }) => /\.springify\(/.test(text)).map((x) => x.f);
    expect(bad).toEqual([]);
  });
  it('rule 14: the raise slider never tweens its thumb while a finger is down', () => {
    const t = files.find((x) => x.f === 'components/table/raise-slider.tsx')?.text ?? '';
    expect(t).toContain('if (down.current) return;');
    expect(t).toContain('if (down.current) pos.set(f);');
  });
  it('rule 14: a label that shows a changing amount keys its Swap by the label, not the amount', () => {
    const t = files.find((x) => x.f === 'components/table/actions.tsx')?.text ?? '';
    expect(t).toContain('<Swap id={label} kind="text">');
  });
  it('rule 1: nothing eases in on its way onto the screen', () => {
    const bad = files.filter(({ text }) => /Easing\.in\(|Easing\.ease\b/.test(text)).map((x) => x.f);
    expect(bad).toEqual([]);
  });
  it('rule 18: an icon that changes into another, or comes and goes, goes through SwapIcon, never a bare ternary or &&', () => {
    // stepper.tsx picks minus or plus once per button, it never changes in place.
    const bad = files
      .filter(({ f }) => !f.endsWith('components/swap.tsx') && !f.endsWith('components/stepper.tsx'))
      .filter(({ text }) => /<Icon\s+name=\{[^}]*\?[^}]*\}/.test(text) || /&&\s*<Icon\s+name="(checkmark|lock|lock\.fill|xmark)/.test(text) || /\?\s*<Icon\b[^>]*\/>\s*:\s*<Icon\b/.test(text))
      .map((x) => x.f);
    expect(bad).toEqual([]);
  });
  it('rules 16 and 17: the shared buttons swap their labels through Swap', () => {
    const need = ['components/button.tsx', 'components/table/actions.tsx'];
    for (const f of need) expect(files.find((x) => x.f === f)?.text, f).toContain('<Swap ');
  });
  it('rules 6, 10 and 20: the trainer’s result rises out of the answer bar and settles the parts under it', () => {
    const text = files.find((x) => x.f === 'components/range/result-card.tsx')?.text ?? '';
    expect(text).toContain('rise(reduce)');
    expect(text).toContain("transformOrigin: '50% 100%'");
    expect(text).toContain('detail(');
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

describe("the website's stylesheet (the landing page)", () => {
  const text = readFileSync(new URL('../../site/landing.css', import.meta.url), 'utf8');
  it('rule 13: no easing curve overshoots (a y above 1)', () => {
    const bad = [...text.matchAll(/cubic-bezier\(\s*[\d.]+,\s*([\d.]+),\s*[\d.]+,\s*([\d.]+)\s*\)/g)].filter((m) => Number(m[1]) > 1 || Number(m[2]) > 1).map((m) => m[0]);
    expect(bad).toEqual([]);
  });
  it('respects Reduce Motion', () => {
    expect(text).toContain('prefers-reduced-motion: reduce');
  });
});

describe('UI-thread helpers', () => {
  it('are worklets, so an animated style can call them without crashing the app', async () => {
    const src = (await import('node:fs')).readFileSync(new URL('../src/motion/rules.ts', import.meta.url), 'utf8');
    for (const name of ['knobStretch', 'rubber', 'arcPoint']) {
      expect(src).toMatch(new RegExp(`export function ${name}\\([^\\n]*\\{\\n\\s*'worklet';`));
    }
  });
});
