import { useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { EASE_IN_OUT, EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { cardColors, radius, ROUNDED, spacing } from '@/theme';

import { haptic } from './haptics';
import { Icon } from './icon';
import { LivingCard } from './living-card';
import { PressableScale } from './pressable-scale';
import { QRCode } from './qr-code';
import { ThemedText } from './themed-text';


/**
 * How friends get in, like a ticket: the code big across the top in letter tiles, Share as a small round button in
 * the corner, and the QR code on a white stub under it (they scan it from the Join button on FlipUp's Play tab). A tap on the QR code
 * shows it big, for a phone across the table.
 */
export function InviteTicket({ code, link, kind = 'table', message }: { code: string; link: string; kind?: 'table' | 'party'; message: string }) {
  const [big, setBig] = useState(false);
  const [row, setRow] = useState(0);
  const reduce = useReduceMotion();
  // The words leave quicker than the stub grows (rule 15) and come back once it has settled.
  const fade = useSharedValue(1);
  useEffect(() => {
    fade.set(reduce ? (big ? 0 : 1) : withTiming(big ? 0 : 1, { duration: big ? 160 : 250, easing: EASE_OUT }));
  }, [big, reduce, fade]);
  const words = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const label = kind === 'party' ? 'Party code' : 'Table code';
  const onShare = () => {
    haptic.tap();
    void Share.share({ message, url: link });
  };
  return (
    <LivingCard colors={cardColors.violet} radius={radius.lg} style={{ padding: spacing.md, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ThemedText variant="footnote" tone="onColor" style={{ flex: 1, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.85 }}>
          {label}
        </ThemedText>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Share the link"
          haptics={false}
          onPress={onShare}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <Icon name="square.and.arrow.up" size={18} color="#ffffff" />
        </PressableScale>
      </View>
      <View accessible accessibilityLabel={`${label} ${code.split('').join(' ')}`} style={{ flexDirection: 'row', gap: spacing.xs }}>
        {code.split('').map((ch, i) => (
          <View key={i} style={{ flex: 1, height: 68, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: 'rgba(255, 255, 255, 0.16)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.32)', alignItems: 'center', justifyContent: 'center' }}>
            <Text maxFontSizeMultiplier={1} style={{ fontFamily: ROUNDED, fontSize: 36, fontWeight: '800', color: '#ffffff' }}>
              {ch}
            </Text>
          </View>
        ))}
      </View>
      {/* One row that never changes direction: the stub grows and slides to the middle while the words fade out
          under it, so the QR code is one object getting bigger (motion rule 20), with no layout jump. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={big ? 'Show the QR code smaller' : 'Show the QR code bigger'}
        onLayout={(e) => setRow(e.nativeEvent.layout.width)}
        onPress={() => {
          haptic.tap();
          setBig((b) => !b);
        }}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <GrowingQR link={link} big={big} reduce={reduce} row={row} />
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: SMALL + spacing.xxs * 2 + spacing.md, right: 0, top: 0, height: SMALL + spacing.xxs * 2, justifyContent: 'center', gap: 2 }, words]}
        >
          <ThemedText variant="headline" tone="onColor">
            Or scan it
          </ThemedText>
          <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.8 }}>
            From Join on FlipUp&apos;s Play tab. Tap to make it bigger.
          </ThemedText>
        </Animated.View>
      </Pressable>
    </LivingCard>
  );
}

const SMALL = 96;
const LARGE = 240;

/**
 * The QR code is drawn once, at full size, and the white stub around it grows and the code scales with it, so a tap
 * makes the same object bigger instead of swapping one picture for another (motion rule 20). Given `row` (the width
 * it sits in), the stub also slides from the left edge to the middle as it grows.
 */
export function GrowingQR({ link, big, reduce, row }: { link: string; big: boolean; reduce: boolean; row?: number }) {
  const t = useSharedValue(big ? 1 : 0);
  useEffect(() => {
    t.set(reduce ? (big ? 1 : 0) : withTiming(big ? 1 : 0, { duration: 300, easing: EASE_IN_OUT }));
  }, [big, reduce, t]);
  const pad = spacing.xxs;
  const stub = useAnimatedStyle(() => {
    const side = interpolate(t.get(), [0, 1], [SMALL, LARGE]) + pad * 2;
    return { width: side, height: side, marginLeft: row ? (Math.max(0, row - (LARGE + pad * 2)) / 2) * t.get() : 0 };
  });
  // Scaled about its centre, then moved so its top-left corner stays inside the stub's padding.
  const code = useAnimatedStyle(() => {
    const k = interpolate(t.get(), [0, 1], [SMALL / LARGE, 1]);
    const shift = (-LARGE * (1 - k)) / 2;
    return { transform: [{ translateX: shift }, { translateY: shift }, { scale: k }] };
  });
  return (
    <Animated.View style={[{ padding: pad, overflow: 'hidden', borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: '#ffffff', alignSelf: row ? 'flex-start' : 'center' }, stub]}>
      <Animated.View style={[{ width: LARGE, height: LARGE }, code]}>
        <QRCode text={link} size={LARGE} />
      </Animated.View>
    </Animated.View>
  );
}
