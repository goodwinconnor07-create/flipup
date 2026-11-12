import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { SHOT_ASPECT } from '@/components/how-to/shots';
import { stepsFor, ZOOMS } from '@/components/how-to/steps';
import { Icon } from '@/components/icon';
import { isVariant, variantInfo, type Variant } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { EASE_OUT } from '@/motion/presets';
import { motion, radius, ROUNDED, spacing } from '@/theme';

/** The pictures are a phone screen, this shape. */
const ASPECT = SHOT_ASPECT;
/** How long a step stays before the next, like a story. */
const STEP_MS = 6500;

/**
 * How to Play, like a story: one real hand of the game on FlipUp's own table, a picture for each moment that
 * matters, zoomed in on what the step is about, with a title and a line under it. Bars along the very top fill and
 * move on by themselves; tap anywhere on the right for the next step, on the left for the one before, and hold to
 * pause. Full screen, so the bars and the close button sit at the top edge. The layout is measured: the picture takes
 * the room between the bars and the words.
 */
export default function HowToPlay() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const variant: Variant = isVariant(id) ? id : 'holdem';
  const info = variantInfo(variant);
  const steps = stepsFor(variant);
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const reduce = useReduceMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [room, setRoom] = useState<{ width: number; height: number } | null>(null);
  const progress = useSharedValue(0);
  const last = steps.length - 1;
  const step = steps[index];

  const go = (i: number) => {
    const next = Math.max(0, Math.min(last, i));
    haptic.tap();
    cancelAnimation(progress);
    progress.set(0);
    setIndex(next);
  };

  // The bar fills over the step's time, then the next step comes (the last one stays).
  useEffect(() => {
    if (paused || !steps.length) {
      cancelAnimation(progress);
      return;
    }
    const left = Math.max(0, 1 - progress.get()) * STEP_MS;
    progress.set(withTiming(1, { duration: left, easing: Easing.linear }));
    if (index >= last) return;
    const timer = setTimeout(() => {
      progress.set(0);
      setIndex((i) => Math.min(last, i + 1));
    }, left);
    return () => clearTimeout(timer);
  }, [index, paused, last, steps.length, progress]);
  const filling = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  // The zoom: the frame takes the shape of the step's part of the picture, as big as the room allows.
  const zoom = useSharedValue({ top: 0, height: 1, left: 0, width: 1 });
  useEffect(() => {
    const z = { left: 0, width: 1, ...ZOOMS[steps[index]?.zoom ?? 'full'] };
    zoom.set(reduce ? z : withTiming(z, { duration: 520, easing: Easing.inOut(Easing.cubic) }));
  }, [index, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = () => {
    haptic.tap();
    router.back();
    // From a game's sheet, back is the sheet with its Play buttons; from Home, open that sheet.
    if (from !== 'game') router.push(`/game/${variant}`);
  };

  // The picture: as big as the room under the bars allows, at the phone's own shape.
  const measure = (e: LayoutChangeEvent) => setRoom({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  const roomW = room?.width ?? 0;
  const roomH = room?.height ?? 0;
  const frame = useAnimatedStyle(() => {
    const { height, width } = zoom.get();
    const aspect = (ASPECT * width) / height;
    const w = Math.min(roomW, roomH * aspect);
    return { width: w, height: w / aspect };
  });
  const strip = useAnimatedStyle(() => {
    const { top, height, left, width } = zoom.get();
    const w = Math.min(roomW, roomH * ((ASPECT * width) / height));
    const fullW = w / width;
    const fullH = fullW / ASPECT;
    return { width: fullW, height: fullH, transform: [{ translateX: -left * fullW }, { translateY: -top * fullH }] };
  });
  // Tap anywhere: the left third goes back, the rest goes on.
  const tap = (pageX: number) => go(pageX < screenW / 3 ? index - 1 : index + 1);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top + spacing.xxs, paddingBottom: insets.bottom + spacing.md, gap: spacing.sm }}>
      <Stack.Screen options={{ title: `How to play ${info.name}`, headerShown: false }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, height: 40 }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {steps.map((s, i) => (
            <View key={s.shot + i} style={{ flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.25)' }}>
              {i < index ? <View style={{ flex: 1, backgroundColor: '#ffffff' }} /> : i === index ? <Animated.View style={[{ height: '100%', backgroundColor: '#ffffff' }, filling]} /> : null}
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          onPress={() => {
            haptic.tap();
            router.back();
          }}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.18)', opacity: pressed ? 0.6 : 1 })}
        >
          <Icon name="xmark" size={17} color="#ffffff" />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${step?.title ?? info.name}. Tap for the next step`}
        onPressIn={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        onPress={(e) => tap(e.nativeEvent.pageX)}
        style={{ flex: 1, gap: spacing.lg }}
      >
        <View onLayout={measure} style={{ flex: 1, minHeight: 0, marginHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' }}>
          {step && roomW > 0 && (
            <Animated.View style={[{ borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: '#111114', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.16)' }, frame]}>
              <Animated.View style={strip}>
                <Image source={step.image} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={reduce ? 0 : 180} accessible={false} />
              </Animated.View>
            </Animated.View>
          )}
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <Animated.View key={index} entering={reduce ? undefined : FadeIn.duration(motion.base).easing(EASE_OUT)} accessibilityLiveRegion="polite" style={{ minHeight: 118, gap: spacing.xs }}>
            <Text maxFontSizeMultiplier={1.2} style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              {info.name}
              {steps.length ? ` · ${index + 1} of ${steps.length}` : ''}
            </Text>
            <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={{ color: '#ffffff', fontFamily: ROUNDED, fontSize: 28, lineHeight: 34, fontWeight: '700' }}>
              {step?.title ?? info.name}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={{ color: 'rgba(255, 255, 255, 0.78)', fontSize: 17, lineHeight: 24 }}>
              {step?.text ?? info.rules[0]}
            </Text>
          </Animated.View>
        </View>
      </Pressable>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <Button variant="party" tint="green" size="lg" title={`Play ${info.name}`} onPress={play} />
      </View>
    </View>
  );
}
