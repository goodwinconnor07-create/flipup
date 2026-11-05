import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { ROUNDED } from '@/theme';

import { GrainBackground } from './grain-background';

const TILE = 120;
/**
 * The app icon's mark: the spade with the up chevron cut through it, exactly as scripts/makeAppIcon.mjs draws it
 * (centred on 0,0; drawn even-odd), and where the icon places it on its 1024 square.
 */
const MARK =
  'M0 -60 C6 -46 22 -34 38 -20 C52 -8 58 4 58 18 C58 37 44 49 27 49 C15 49 7 44 3.5 37 C5 48 12 57 25 62 C26 63 25.5 65 24 65 L-24 65 C-25.5 65 -26 63 -25 62 C-12 57 -5 48 -3.5 37 C-7 44 -15 49 -27 49 C-44 49 -58 37 -58 18 C-58 4 -52 -8 -38 -20 C-22 -34 -6 -46 0 -60 Z M-27.30 14.70 L-5.30 -7.30 A7.5 7.5 0 0 1 5.30 -7.30 L27.30 14.70 A7.5 7.5 0 0 1 16.70 25.30 L0 8.61 L-16.70 25.30 A7.5 7.5 0 0 1 -27.30 14.70 Z';
const PLACE = `translate(${(512 / 1024) * TILE} ${(500 / 1024) * TILE}) scale(${(5.15 / 1024) * TILE})`;
/** At least this long on screen, so the spade is printed in full before the app shows. */
const PRINT_MS = 1050;
const EASE = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * The opening screen, over everything while the app starts: the app's icon on the moving deep blue field, its
 * spade printed line by line under a bright print head, the name underneath. Once the spade is done and the first
 * screen has settled, the icon pops and the whole cover fades away into the app. Under Reduce Motion the spade is
 * simply there and the cover fades. The native splash before it is the same night blue, so nothing flashes.
 */
export function LaunchCover() {
  return <PrintCover total={PRINT_MS} zIndex={1000} />;
}

/**
 * The cover itself, shared by the launch and the game's deal-in (`DealWipe`): `total` is how long the spade takes
 * to print before it pops (every step scales with it), `zIndex` where it sits.
 */
export function PrintCover({ total = PRINT_MS, zIndex = 1000 }: { total?: number; zIndex?: number }) {
  const k = total / PRINT_MS;
  const reduce = useReduceMotion();
  const [gone, setGone] = useState(false);
  const tile = useSharedValue(reduce ? 1 : 0.88);
  const tileIn = useSharedValue(reduce ? 1 : 0);
  const printed = useSharedValue(reduce ? 1 : 0);
  const name = useSharedValue(reduce ? 1 : 0);
  const cover = useSharedValue(1);

  useEffect(() => {
    if (!reduce) {
      tile.set(withTiming(1, { duration: 380 * k, easing: EASE }));
      tileIn.set(withTiming(1, { duration: 260 * k }));
      printed.set(withDelay(240 * k, withTiming(1, { duration: 720 * k, easing: Easing.inOut(Easing.quad) })));
      name.set(withDelay(760 * k, withTiming(1, { duration: 260 * k })));
    }
    const started = Date.now();
    // Ready once the first screen has drawn (two frames on) and the spade has finished printing.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
      const wait = Math.max(0, (reduce ? 300 * k : total) - (Date.now() - started));
      const leave = () => setGone(true);
      timer = setTimeout(() => {
        if (reduce) {
          cover.set(withTiming(0, { duration: 220 }, (done) => done && runOnJS(leave)()));
          return;
        }
        tile.set(withSequence(withTiming(1.1, { duration: 140, easing: EASE }), withTiming(0.2, { duration: 260, easing: Easing.in(Easing.quad) })));
        cover.set(withDelay(150, withTiming(0, { duration: 260 }, (done) => done && runOnJS(leave)())));
      }, wait);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.get() }));
  const tileStyle = useAnimatedStyle(() => ({ opacity: tileIn.get(), transform: [{ scale: tile.get() }] }));
  // The printed part of the spade grows from the top; the print head rides its lower edge.
  const inkStyle = useAnimatedStyle(() => ({ height: `${printed.get() * 100}%` }));
  const headStyle = useAnimatedStyle(() => ({ top: `${printed.get() * 100}%`, opacity: printed.get() > 0 && printed.get() < 1 ? 1 : 0 }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: name.get(), transform: [{ translateY: 6 * (1 - name.get()) }] }));

  if (gone) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, zIndex }, coverStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <GrainBackground style={{ alignItems: 'center', justifyContent: 'center', gap: 22 }}>
        <Animated.View style={[{ width: TILE, height: TILE, borderRadius: 27, borderCurve: 'continuous', boxShadow: '0 18px 40px -14px rgba(0, 0, 0, 0.7)' }, tileStyle]}>
          <View style={{ flex: 1, borderRadius: 27, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: '#2149bf' }}>
            <Svg width={TILE} height={TILE} style={{ position: 'absolute' }}>
              <Defs>
                <LinearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
                  {/* The icon's own two colours (scripts/makeAppIcon.mjs). */}
                  <Stop offset="0" stopColor="#4a7bf0" />
                  <Stop offset="1" stopColor="#152f86" />
                </LinearGradient>
              </Defs>
              <Path d={`M0 0H${TILE}V${TILE}H0Z`} fill="url(#tile)" />
              {/* The mark still to be printed: a faint outline. */}
              <Path d={MARK} transform={PLACE} fillRule="evenodd" fill="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={2.4} />
            </Svg>
            <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' }, inkStyle]}>
              <Svg width={TILE} height={TILE}>
                <Path d={MARK} transform={PLACE} fillRule="evenodd" fill="#ffffff" />
              </Svg>
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', left: 8, right: 8, height: 2, marginTop: -1, borderRadius: 1, backgroundColor: '#bfe0ff', boxShadow: '0 0 10px 3px rgba(120, 190, 255, 0.85)' }, headStyle]} />
          </View>
        </Animated.View>
        <Animated.View style={nameStyle}>
          <Text style={{ fontFamily: ROUNDED, fontSize: 30, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 }}>FlipUp</Text>
        </Animated.View>
      </GrainBackground>
    </Animated.View>
  );
}
