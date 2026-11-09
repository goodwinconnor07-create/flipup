import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, FeComposite, FeFlood, FeGaussianBlur, FeMerge, FeMergeNode, FeOffset, Filter, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { motion } from '@/theme';

import { GrainBackground } from './grain-background';
import { ICON_COLORS, ICON_RADIUS, ICON_SIZE, MARK, PLACE } from './launch-mark';
import { read, save } from '@/state/storage';

/** The icon's size on the cover: a good deal bigger than the old 120, so it is the whole first impression. */
const TILE = 168;
/** Seen before: the same shimmer, quicker. */
const LAUNCHED = 'flipup.launched';
/** How long the first launch holds the icon (the arrival, then the shimmer crossing it) before handing over to the app. */
const FIRST_MS = 1500;
const RETURNING_MS = 800;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SWEEP = Easing.bezier(0.45, 0, 0.25, 1);

/**
 * The opening screen, over everything while the app starts: the app icon, exactly as it is on the Home Screen, on
 * the moving deep blue field. It eases in, one slow band of light crosses it, then it eases out as the app shows.
 * A later launch does the same, quicker. Under Reduce Motion the icon fades in and out with no moving light. The
 * native splash before it is the same night blue, so nothing flashes.
 */
export function LaunchCover() {
  const [returning] = useState(() => read<boolean>(LAUNCHED, false));
  useEffect(() => {
    save(LAUNCHED, true);
  }, []);
  return <PrintCover total={returning ? RETURNING_MS : FIRST_MS} zIndex={1000} />;
}

/** The app icon on a `TILE` square, drawn on the icon's own 1024 canvas with the icon script's gradient, light and lift shadow. */
function IconArt() {
  const S = ICON_SIZE;
  return (
    <Svg width={TILE} height={TILE} viewBox={`0 0 ${S} ${S}`}>
      <Defs>
        <LinearGradient id="bg" x1="0.25" y1="0" x2="0.75" y2="1">
          <Stop offset="0" stopColor={ICON_COLORS.violetTop} />
          <Stop offset="1" stopColor={ICON_COLORS.violetBottom} />
        </LinearGradient>
        <RadialGradient id="light" cx="0.5" cy="0.08" r="0.75">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="spade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ICON_COLORS.spadeTop} />
          <Stop offset="1" stopColor={ICON_COLORS.spadeBottom} />
        </LinearGradient>
        <Filter id="lift" x="-30%" y="-30%" width="160%" height="160%">
          <FeGaussianBlur in="SourceAlpha" stdDeviation="28" result="b" />
          <FeOffset in="b" dy="24" result="o" />
          <FeFlood floodColor={ICON_COLORS.shadow} floodOpacity="0.5" />
          <FeComposite in2="o" operator="in" result="s" />
          <FeGaussianBlur in="SourceAlpha" stdDeviation="3" result="b2" />
          <FeOffset in="b2" dy="4" result="o2" />
          <FeFlood floodColor={ICON_COLORS.shadow} floodOpacity="0.25" />
          <FeComposite in2="o2" operator="in" result="s2" />
          <FeMerge>
            <FeMergeNode in="s" />
            <FeMergeNode in="s2" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
      </Defs>
      <Rect width={S} height={S} fill="url(#bg)" />
      <Rect width={S} height={S} fill="url(#light)" />
      <G filter="url(#lift)">
        <Path d={MARK} transform={PLACE} fillRule="evenodd" fill="url(#spade)" />
      </G>
    </Svg>
  );
}

/**
 * The cover itself, shared by the launch and the game's deal-in (`DealWipe`): `total` is how long the icon holds
 * before it eases out (the arrival and the shimmer scale with it), `zIndex` where it sits.
 */
export function PrintCover({ total = FIRST_MS, zIndex = 1000 }: { total?: number; zIndex?: number }) {
  const k = total / FIRST_MS;
  const reduce = useReduceMotion();
  const [gone, setGone] = useState(false);
  const arrive = useSharedValue(reduce ? 1 : 0);
  const sweep = useSharedValue(0);
  const leave = useSharedValue(0);
  const cover = useSharedValue(1);

  useEffect(() => {
    if (!reduce) {
      arrive.set(withTiming(1, { duration: motion.base * Math.max(k, 0.6), easing: EASE_OUT }));
      sweep.set(withDelay(260 * k, withTiming(1, { duration: 1400 * k, easing: SWEEP })));
    }
    const started = Date.now();
    // Ready once the first screen has drawn (two frames on) and the icon has had its moment.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const wait = Math.max(0, (reduce ? 300 : total) - (Date.now() - started));
        const done = () => setGone(true);
        timer = setTimeout(() => {
          // The icon eases out in 200ms (rule 15) as the cover fades into the app.
          leave.set(withTiming(1, { duration: motion.exit, easing: EASE_OUT }));
          cover.set(withTiming(0, { duration: motion.exit, easing: EASE_OUT }, (finished) => finished && runOnJS(done)()));
        }, wait);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.get() }));
  // From 95% and a little high, never from nothing (rule 10); the exit lifts and shrinks a touch while it fades.
  const tileStyle = useAnimatedStyle(() => ({
    opacity: arrive.get() * (1 - leave.get()),
    transform: [{ translateY: -12 * (1 - arrive.get()) - 14 * leave.get() }, { scale: (motion.popFrom + (1 - motion.popFrom) * arrive.get()) * (1 - 0.06 * leave.get()) }],
  }));
  // One soft band of light, leaning with the icon's light, crossing from left to right.
  const bandStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (-0.9 + 1.8 * sweep.get()) * TILE }, { skewX: '-16deg' }], opacity: sweep.get() > 0 && sweep.get() < 1 ? 1 : 0 }));

  if (gone) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, zIndex }, coverStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <GrainBackground style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ width: TILE, height: TILE, borderRadius: TILE * ICON_RADIUS, borderCurve: 'continuous', boxShadow: '0 22px 44px -16px rgba(0, 0, 0, 0.7)' }, tileStyle]}>
          <View style={{ flex: 1, borderRadius: TILE * ICON_RADIUS, borderCurve: 'continuous', overflow: 'hidden' }}>
            <IconArt />
            {!reduce && (
              <Animated.View style={[{ position: 'absolute', top: -TILE * 0.1, bottom: -TILE * 0.1, left: 0, width: TILE * 0.7 }, bandStyle]}>
                <Svg width="100%" height="100%" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient id="band" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                      <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.42" />
                      <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#band)" />
                </Svg>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </GrainBackground>
    </Animated.View>
  );
}
