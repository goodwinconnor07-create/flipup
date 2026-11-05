import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

import { useReduceMotion } from '@/motion/use-reduce-motion';

/**
 * Text typed out a letter at a time, like a terminal, with a block cursor that blinks a moment and goes. The full
 * text is laid out from the start (the rest invisible), so nothing around it moves. Whole at once under Reduce Motion.
 */
export function TypedText({ text, style, delay = 0, speed = 38, numberOfLines }: { text: string; style?: TextStyle; delay?: number; speed?: number; numberOfLines?: number }) {
  const reduce = useReduceMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  const [cursor, setCursor] = useState(!reduce);
  useEffect(() => {
    if (reduce) {
      setN(text.length);
      setCursor(false);
      return;
    }
    setN(0);
    setCursor(true);
    let i = 0;
    let tick: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      tick = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) {
          clearInterval(tick);
          setTimeout(() => setCursor(false), 900);
        }
      }, speed);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(tick);
    };
  }, [text, reduce, delay, speed]);
  return (
    <Text style={style} numberOfLines={numberOfLines} accessibilityLabel={text}>
      {text.slice(0, n)}
      {cursor ? <Text style={{ opacity: 0.8 }}>▍</Text> : null}
      <Text style={{ opacity: 0 }}>{text.slice(n)}</Text>
    </Text>
  );
}
