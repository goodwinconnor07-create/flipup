import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutUp } from 'react-native-reanimated';

import { useReduceMotion } from '@/motion/use-reduce-motion';

/** How long each line stays up. */
const HOLD_MS = 3800;

/**
 * The Global header's one-line announcements: a line at a time in small capitals, the next one sliding up into its
 * place every few seconds (a fade under Reduce Motion), paused while the tab is out of sight. A fixed height, so the
 * title under it never moves. VoiceOver reads every line at once.
 */
export function Ticker({ lines, style }: { lines: string[]; style: TextStyle }) {
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const [at, setAt] = useState(0);
  const count = lines.length;
  useEffect(() => {
    if (!focused || count < 2) return;
    const t = setInterval(() => setAt((i) => (i + 1) % count), HOLD_MS);
    return () => clearInterval(t);
  }, [focused, count]);
  const line = lines[at % Math.max(1, count)] ?? '';
  const height = (style.lineHeight ?? 18) as number;
  return (
    <View accessible accessibilityLabel={lines.join('. ')} style={{ height, overflow: 'hidden' }}>
      <Animated.View
        key={`${at}-${line}`}
        entering={reduce ? FadeIn.duration(300) : FadeInDown.duration(380)}
        exiting={reduce ? FadeOut.duration(200) : FadeOutUp.duration(260)}
        style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
      >
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={style}>
          {line}
        </Text>
      </Animated.View>
    </View>
  );
}
