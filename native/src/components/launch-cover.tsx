import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, FeComposite, FeFlood, FeGaussianBlur, FeMerge, FeMergeNode, FeOffset, Filter, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { motion, useScheme } from '@/theme';

import { GrainBackground } from './grain-background';
import { ICON_COLORS, ICON_COLORS_DARK, ICON_RADIUS, ICON_SIZE, MARK, PLACE } from './launch-mark';
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
 * a moving blue field that follows the phone's look (a light blue by day, a very dark blue-black at night, like
 * Flighty's), with "Shuffling the deck" and its three dots under the icon and the version in small type at the
 * bottom. It eases in, one slow band of light crosses the icon, then it eases out as the app shows. A later launch
 * does the same, quicker. Under Reduce Motion the icon fades in and out with no moving light. The native splash
 * before it is the same first colour in each mode, so nothing flashes.
 */
export function LaunchCover() {
  const [returning] = useState(() => read<boolean>(LAUNCHED, false));
  useEffect(() => {
    save(LAUNCHED, true);
  }, []);
  return <PrintCover total={returning ? RETURNING_MS : FIRST_MS} zIndex={1000} launch />;
}

/** The app icon on a `TILE` square, drawn on the icon's own 1024 canvas with the icon script's gradient, light and lift shadow. */
function IconArt({ dark = false }: { dark?: boolean }) {
  const S = ICON_SIZE;
  // At night the icon is its dark look (the one iOS shows on a dark Home Screen), a night-blue gradient.
  const top = dark ? ICON_COLORS_DARK.violetTop : ICON_COLORS.violetTop;
  const bottom = dark ? ICON_COLORS_DARK.violetBottom : ICON_COLORS.violetBottom;
  return (
    <Svg width={TILE} height={TILE} viewBox={`0 0 ${S} ${S}`}>
      <Defs>
        <LinearGradient id="bg" x1="0.25" y1="0" x2="0.75" y2="1">
          <Stop offset="0" stopColor={top} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
        <RadialGradient id="light" cx="0.5" cy="0.08" r="0.75">
          <Stop offset="0" stopColor={dark ? ICON_COLORS_DARK.light : '#ffffff'} stopOpacity="0.22" />
          <Stop offset="1" stopColor={dark ? ICON_COLORS_DARK.light : '#ffffff'} stopOpacity="0" />
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
export function PrintCover({ total = FIRST_MS, zIndex = 1000, launch = false }: { total?: number; zIndex?: number; /** The app's opening screen: light or dark by the phone's look, with the words and the version. */ launch?: boolean }) {
  const k = total / FIRST_MS;
  const dark = useScheme() === 'dark';
  const look = launch ? (dark ? DARK : LIGHT) : null;
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
      <GrainBackground style={{ alignItems: 'center', justifyContent: 'center' }} {...(look ? { colors: look.base, glow: look.glow, glow2: look.glow2 } : {})}>
        <Animated.View style={[{ width: TILE, height: TILE, borderRadius: TILE * ICON_RADIUS, borderCurve: 'continuous', boxShadow: look ? look.shadow : '0 22px 44px -16px rgba(0, 0, 0, 0.7)' }, tileStyle]}>
          <View style={{ flex: 1, borderRadius: TILE * ICON_RADIUS, borderCurve: 'continuous', overflow: 'hidden' }}>
            <IconArt dark={!!look && dark} />
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
        {look && <Shuffling ink={look.ink} reduce={reduce} />}
        {look && (
          <Text accessible={false} maxFontSizeMultiplier={1} style={{ position: 'absolute', bottom: 44, alignSelf: 'center', fontSize: 12, fontWeight: '500', letterSpacing: 0.3, color: look.faint }}>
            {VERSION}
          </Text>
        )}
      </GrainBackground>
    </Animated.View>
  );
}

/** The cover's two looks: a light blue field, and a very dark blue-black one with a dim blue light. */
const LIGHT = {
  base: ['#e3efff', '#cde2ff', '#eef5ff'] as const,
  glow: 'rgba(60, 130, 255, 0.32)',
  glow2: 'rgba(130, 200, 255, 0.28)',
  shadow: '0 22px 44px -16px rgba(30, 60, 140, 0.45)',
  ink: 'rgba(18, 40, 100, 0.72)',
  faint: 'rgba(18, 40, 100, 0.42)',
};
const DARK = {
  base: ['#02040a', '#04070f', '#010204'] as const,
  glow: 'rgba(50, 110, 255, 0.16)',
  glow2: 'rgba(245, 183, 0, 0.03)',
  shadow: '0 22px 44px -16px rgba(0, 0, 0, 0.8)',
  ink: 'rgba(255, 255, 255, 0.62)',
  faint: 'rgba(255, 255, 255, 0.34)',
};

/** "Version 1.0.0 (27)", small, for the bottom of the cover (the build number is the phone's own). */
const VERSION = (() => {
  const v = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '';
  const b = Application.nativeBuildVersion;
  return v ? `Version ${v}${b ? ` (${b})` : ''}` : '';
})();

/**
 * "Shuffling the deck" stays exactly as it is, centred and never re-drawn; only the three dots after it change, one,
 * two, three and again. The dots hang off the end of the words (positioned, so they take no room in the line), so
 * the words never shift as they come and go.
 */
function Shuffling({ ink, reduce, text = 'Shuffling the deck' }: { ink: string; reduce: boolean; text?: string }) {
  return (
    <View style={{ marginTop: 36, alignSelf: 'center' }}>
      <Text accessible={false} maxFontSizeMultiplier={1.2} style={{ fontSize: 17, fontWeight: '600', color: ink }}>
        {text}
      </Text>
      <Dots ink={ink} reduce={reduce} />
    </View>
  );
}

/** The dots after the words: they count up on their own clock and only this part re-draws. */
function Dots({ ink, reduce }: { ink: string; reduce: boolean }) {
  const [n, setN] = useState(reduce ? 3 : 1);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setN((x) => (x % 3) + 1), 320);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <View accessible={false} pointerEvents="none" style={{ position: 'absolute', left: '100%', top: 0, flexDirection: 'row' }}>
      {[1, 2, 3].map((i) => (
        <Text key={i} maxFontSizeMultiplier={1.2} style={{ fontSize: 17, fontWeight: '600', color: ink, opacity: i <= n ? 1 : 0 }}>
          .
        </Text>
      ))}
    </View>
  );
}

/**
 * The loading screen over the Play with friends page while its lobby is being made: the same icon, shimmer and
 * dots as the launch cover on the app's own moving blue field, dimmed so it reads as "not ready yet". The shimmer
 * keeps crossing the icon until `visible` goes false, then the whole screen eases out in 200ms (rule 15). Under
 * Reduce Motion the icon sits still. It takes touches while it is up, so nothing underneath can be pressed.
 */
export function LoadingCover({ visible, text = 'Creating your lobby' }: { visible: boolean; text?: string }) {
  const reduce = useReduceMotion();
  const [gone, setGone] = useState(false);
  const arrive = useSharedValue(reduce ? 1 : 0);
  const sweep = useSharedValue(0);
  const cover = useSharedValue(1);

  useEffect(() => {
    if (!reduce) {
      arrive.set(withTiming(1, { duration: motion.base, easing: EASE_OUT }));
      sweep.set(withRepeat(withSequence(withTiming(1, { duration: 1400, easing: SWEEP }), withTiming(1, { duration: 500 })), -1, false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (visible) return;
    cover.set(withTiming(0, { duration: motion.exit, easing: EASE_OUT }, (finished) => finished && runOnJS(setGone)(true)));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.get() }));
  const tileStyle = useAnimatedStyle(() => ({
    opacity: arrive.get(),
    transform: [{ translateY: -12 * (1 - arrive.get()) }, { scale: motion.popFrom + (1 - motion.popFrom) * arrive.get() }],
  }));
  const bandStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (-0.9 + 1.8 * sweep.get()) * TILE }, { skewX: '-16deg' }] }));

  if (gone) return null;
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityViewIsModal
      accessibilityLabel={`${text}…`}
      accessibilityLiveRegion="polite"
      style={[{ position: 'absolute', inset: 0, zIndex: 900 }, coverStyle]}
    >
      <GrainBackground style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ width: TILE, height: TILE, borderRadius: TILE * ICON_RADIUS, borderCurve: 'continuous', boxShadow: '0 22px 44px -16px rgba(0, 0, 0, 0.7)' }, tileStyle]}>
          <View style={{ flex: 1, borderRadius: TILE * ICON_RADIUS, borderCurve: 'continuous', overflow: 'hidden' }}>
            <IconArt />
            {!reduce && (
              <Animated.View style={[{ position: 'absolute', top: -TILE * 0.1, bottom: -TILE * 0.1, left: 0, width: TILE * 0.7 }, bandStyle]}>
                <Svg width="100%" height="100%" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient id="loadband" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                      <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.42" />
                      <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#loadband)" />
                </Svg>
              </Animated.View>
            )}
          </View>
        </Animated.View>
        <Shuffling ink="rgba(255, 255, 255, 0.82)" reduce={reduce} text={text} />
        {/* A little less bright than the page under it, so it reads as a loading screen. */}
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.38)' }} />
      </GrainBackground>
    </Animated.View>
  );
}
