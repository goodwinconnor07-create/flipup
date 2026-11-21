// A number of chips that counts to its new value over 0.6s (ease-out), green while it rises and red while it falls,
// as on the web (useCountUp and Count in src/ui/components.tsx). Under Reduce Motion it jumps straight there.
import { useEffect, useRef, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePlainColors } from '@/theme';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

export function useCountUp(target: number, ms = 600): { value: number; dir: 'up' | 'down' | null } {
  const reduce = useReduceMotion();
  const [value, setValue] = useState(target);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  const shown = useRef(target);
  useEffect(() => {
    if (shown.current === target) return;
    if (reduce) {
      shown.current = target;
      return;
    }
    const from = shown.current;
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      shown.current = t >= 1 ? target : Math.round(from + (target - from) * eased);
      setDir(t < 1 ? (target > from ? 'up' : 'down') : null);
      setValue(shown.current);
      if (t < 1) raf = requestAnimationFrame(frame);
      else setDir(null);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);
  return reduce ? { value: target, dir: null } : { value, dir };
}

/** `up`/`down` override the rising and falling colours (the pot pill uses paler ones on the felt). */
export function Count({
  value,
  style,
  up,
  down,
}: {
  value: number;
  style?: TextStyle;
  up?: string;
  down?: string;
}) {
  const c = usePlainColors();
  const { value: v, dir } = useCountUp(value);
  const colour = dir === 'up' ? (up ?? c.green) : dir === 'down' ? (down ?? c.red) : undefined;
  return (
    <Text maxFontSizeMultiplier={1.2} style={[{ fontVariant: ['tabular-nums'] }, style, colour ? { color: colour } : null]}>
      {chips(v)}
    </Text>
  );
}
