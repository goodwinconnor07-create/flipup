import { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/motion/use-reduce-motion';

const EARTH = require('../../../assets/images/earth.jpg');

/**
 * The Global tab's Earth: the map (`assets/images/earth.jpg`, drawn by `scripts/makeEarth.mjs` from Natural Earth's
 * coastlines) slides sideways behind a round mask, under sphere shading (sunlit top left, dark limb) and a thin blue
 * atmosphere, so it reads as a globe turning (one turn every 80 seconds). Transform only, on the UI thread; still
 * under Reduce Motion.
 */
export function Globe({ size = 220 }: { size?: number }) {
  const reduce = useReduceMotion();
  const x = useSharedValue(0);
  const width = size * 2;
  useEffect(() => {
    if (reduce) return;
    x.set(withRepeat(withTiming(-width, { duration: 80_000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(x);
  }, [reduce, width, x]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const pad = size * 0.08;
  return (
    <View accessible={false} style={{ width: size + pad * 2, height: size + pad * 2, alignItems: 'center', justifyContent: 'center' }}>
      {/* The atmosphere, just outside the edge. */}
      <Svg width={size + pad * 2} height={size + pad * 2} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="air" cx="50%" cy="50%" r="50%">
            <Stop offset="0.82" stopColor="#5b9bff" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#5b9bff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2 + pad} cy={size / 2 + pad} r={size / 2 + pad} fill="url(#air)" />
      </Svg>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#0a2440' }}>
        <Animated.View style={[{ flexDirection: 'row', width: width * 2, height: size }, slide]}>
          <Image source={EARTH} style={{ width, height: size }} />
          <Image source={EARTH} style={{ width, height: size }} />
        </Animated.View>
        {/* Sunlight from the top left and the dark limb. */}
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id="shade" cx="38%" cy="32%" r="72%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
              <Stop offset="0.45" stopColor="#000000" stopOpacity="0" />
              <Stop offset="0.85" stopColor="#000814" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#000814" stopOpacity="0.85" />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#shade)" />
        </Svg>
      </View>
    </View>
  );
}
