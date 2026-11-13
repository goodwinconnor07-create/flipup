// The first time you play a mini game, a small card with its basics over a blurred page (the owner's ask, 13 Nov
// 2026). Against bots it comes up before the deal and the game starts only on Continue. Online the table doesn't wait
// for anyone, so the card gives you five seconds (a bar drains along its foot) and has an X in the corner; with
// VoiceOver on it stays until it's closed, since a card that times out can't be read aloud in time.
//
// Motion (docs/MOTION.md): the shade fades in over 250ms and out in 200 (rule 15); the card pops in from 95% with
// popIn() (rule 10, no bounce, rule 13). The bar drains linearly, as a timer should. Under Reduce Motion the card
// only fades.
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { basicsOf } from '@/data/game-basics';
import { variantInfo, type Variant } from '@/engine';
import { popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, motion, radius, ROUNDED, spacing } from '@/theme';

import { GameThumb } from './game-picture';
import { haptic } from './haptics';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/** How long an online table's card stays up. */
export const RULES_READ_MS = 5000;

export function RulesCard({
  variant,
  timed = false,
  onDone,
}: {
  variant: Variant;
  /** Online: the card closes itself after `RULES_READ_MS` and has an X; otherwise it waits for Continue. */
  timed?: boolean;
  onDone: () => void;
}) {
  const reduce = useReduceMotion();
  const info = variantInfo(variant);
  const lines = basicsOf(variant);
  const left = useSharedValue(1);
  const [reader, setReader] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then(setReader);
  }, []);
  useEffect(() => {
    if (!timed || reader) return;
    left.set(withTiming(0, { duration: RULES_READ_MS, easing: Easing.linear }));
    const t = setTimeout(onDone, RULES_READ_MS);
    return () => clearTimeout(t);
  }, [timed, reader]); // eslint-disable-line react-hooks/exhaustive-deps
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: left.get() }] }));

  const close = () => {
    haptic.tap();
    onDone();
  };
  // Online the card goes as the full rules open; against bots it waits underneath for Continue.
  const allRules = () => {
    if (timed) onDone();
    router.push({ pathname: '/game/[id]', params: { id: variant, rules: '1' } });
  };

  return (
    <Animated.View
      entering={FadeIn.duration(motion.base)}
      exiting={FadeOut.duration(motion.exit)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}
    >
      {/* The page stays where it is, out of focus behind the card. */}
      <BlurView tint="dark" intensity={18} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.32)' }} />
      <Animated.View
        entering={reduce ? undefined : popIn()}
        accessibilityViewIsModal
        style={{
          width: '100%',
          maxWidth: 330,
          padding: spacing.lg,
          paddingBottom: timed ? spacing.md : spacing.lg,
          gap: spacing.md,
          borderRadius: 28,
          borderCurve: 'continuous',
          backgroundColor: 'rgba(20,24,40,0.95)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.45)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: timed ? 28 : 0 }}>
          <GameThumb variant={variant} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText variant="caption1" style={{ color: 'rgba(255,255,255,0.55)', fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
              New game
            </ThemedText>
            <Text
              accessibilityRole="header"
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
              style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 26, fontWeight: '800', color: '#ffffff' }}
            >
              {info.name}
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          {lines.map((line, i) => (
            <View key={line} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <View style={{ width: 22, height: 22, marginTop: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(91,139,255,0.22)' }}>
                <Text maxFontSizeMultiplier={1.1} style={{ fontSize: 12, fontWeight: '800', color: brand.violetDark }}>
                  {i + 1}
                </Text>
              </View>
              <ThemedText variant="subhead" style={{ flex: 1, color: 'rgba(255,255,255,0.9)' }}>
                {line}
              </ThemedText>
            </View>
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={allRules} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <ThemedText variant="subhead" style={{ color: brand.violetDark, fontWeight: '700' }}>
            All the rules ›
          </ThemedText>
        </Pressable>

        {timed ? (
          // Five seconds, draining from the right. Gone with VoiceOver on: the card waits to be closed then.
          !reader && (
            <View accessible={false} style={{ height: 4, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
              <Animated.View style={[{ height: 4, borderRadius: radius.full, backgroundColor: brand.violetDark, transformOrigin: 'left' }, bar]} />
            </View>
          )
        ) : (
          <PressableScale
            accessibilityRole="button"
            onPress={close}
            style={{ height: 50, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}
          >
            <ThemedText variant="headline" style={{ color: brand.violet, fontWeight: '700' }}>
              Continue
            </ThemedText>
          </PressableScale>
        )}

        {timed && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            hitSlop={10}
            style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <Icon name="xmark" size={13} color="rgba(255,255,255,0.85)" />
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}
