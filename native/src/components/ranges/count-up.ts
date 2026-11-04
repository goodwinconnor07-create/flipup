import { useEffect, useState } from 'react';

import { useReduceMotion } from '@/motion/use-reduce-motion';

/**
 * A number that counts from `from` up (or down) to `target` once it's shown, easing out over `ms` after `delay`.
 * Decimals are kept (a pot of 4.2 counts 0.0, 0.1... 4.2). Under Reduce Motion it's there at once.
 */
export function useCountTo(target: number, { from = 0, ms = 900, delay = 0 }: { from?: number; ms?: number; delay?: number } = {}): number {
  const reduce = useReduceMotion();
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let start = 0;
    const frame = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    const wait = setTimeout(() => (raf = requestAnimationFrame(frame)), delay);
    return () => {
      clearTimeout(wait);
      cancelAnimationFrame(raf);
    };
  }, [target, from, ms, delay, reduce]);
  return reduce ? target : value;
}
