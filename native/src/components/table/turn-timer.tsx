import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { Game } from '@/engine';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The turn timer wrapped round the rail, as on the web: a bright line that drains back towards the top as time runs
 * out, blue on your turn, gold for anyone else, red for the last five seconds. It drains in one animation on the UI
 * thread from however much time is left, so a phone that joins mid-turn shows the right amount.
 */
export function TurnTimer({ game, mine }: { game: Game; mine: boolean }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [low, setLow] = useState(false);
  const hand = game.hand;
  const live = !!hand?.deadline && !hand.result && game.settings.turnSeconds > 0;
  const deadline = hand?.deadline ?? 0;
  const total = game.settings.turnSeconds * 1000;
  const { w, h } = size;
  const inset = 5.5;
  const r = Math.max(0, (h - inset * 2) / 2);
  const length = 2 * Math.max(0, w - inset * 2 - 2 * r) + 2 * Math.PI * r;
  const left = useSharedValue(0);

  useEffect(() => {
    setLow(false);
    if (!live || !w) return;
    const remaining = Math.max(0, deadline - Date.now());
    left.set(Math.max(0, Math.min(1, remaining / total)));
    left.set(withTiming(0, { duration: remaining, easing: Easing.linear }));
    const lowAt = remaining - 5000;
    if (lowAt <= 0) {
      setLow(true);
      return () => cancelAnimation(left);
    }
    const t = setTimeout(() => setLow(true), lowAt);
    return () => {
      clearTimeout(t);
      cancelAnimation(left);
    };
  }, [live, deadline, total, w]); // eslint-disable-line react-hooks/exhaustive-deps

  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - left.get()) }));
  const d = `M ${w / 2} ${inset} H ${w - inset - r} A ${r} ${r} 0 0 1 ${w - inset - r} ${h - inset} H ${inset + r} A ${r} ${r} 0 0 1 ${inset + r} ${inset} Z`;
  const colour = low ? '#ff3b30' : mine ? '#0a84ff' : '#ffc933';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {live && w > 0 && (
        <Svg width={w} height={h} accessibilityLabel={`${game.settings.turnSeconds} seconds a turn`}>
          <Path d={d} stroke="rgba(255,255,255,0.12)" strokeWidth={5} fill="none" />
          <AnimatedPath d={d} stroke={colour} strokeWidth={5} strokeLinecap="round" fill="none" strokeDasharray={`${length} ${length}`} animatedProps={props} />
        </Svg>
      )}
    </View>
  );
}
