import { useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import Animated, { interpolate, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { EASE_IN_OUT, enter, exit } from '@/motion/presets';
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
export function InviteTicket({ code, link, kind = 'table', share }: { code: string; link: string; kind?: 'table' | 'party'; share: string }) {
  const [big, setBig] = useState(false);
  const reduce = useReduceMotion();
  const label = kind === 'party' ? 'Party code' : 'Table code';
  const onShare = () => {
    haptic.tap();
    void Share.share({ message: `${share} Code ${code}: ${link}`, url: link });
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={big ? 'Show the QR code smaller' : 'Show the QR code bigger'}
        onPress={() => {
          haptic.tap();
          setBig((b) => !b);
        }}
        style={({ pressed }) => ({ flexDirection: big ? 'column' : 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.85 : 1 })}
      >
        <GrowingQR link={link} big={big} reduce={reduce} />
        {!big && (
          <Animated.View entering={reduce ? undefined : enter(false)} exiting={reduce ? undefined : exit(false)} style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="headline" tone="onColor">
              Or scan it
            </ThemedText>
            <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.8 }}>
              From Join on FlipUp&apos;s Play tab. Tap to make it bigger.
            </ThemedText>
          </Animated.View>
        )}
      </Pressable>
    </LivingCard>
  );
}

const SMALL = 96;
const LARGE = 240;

/**
 * The QR code is drawn once, at full size, and the white stub around it grows and the code scales with it, so a tap
 * makes the same object bigger instead of swapping one picture for another (motion rule 20). The stub's position
 * moves with the layout (row to column) on the same curve.
 */
export function GrowingQR({ link, big, reduce }: { link: string; big: boolean; reduce: boolean }) {
  const t = useSharedValue(big ? 1 : 0);
  useEffect(() => {
    t.set(reduce ? (big ? 1 : 0) : withTiming(big ? 1 : 0, { duration: 300, easing: EASE_IN_OUT }));
  }, [big, reduce, t]);
  const pad = spacing.xxs;
  const stub = useAnimatedStyle(() => {
    const side = interpolate(t.get(), [0, 1], [SMALL, LARGE]) + pad * 2;
    return { width: side, height: side };
  });
  const code = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(t.get(), [0, 1], [SMALL / LARGE, 1]) }] }));
  return (
    <Animated.View layout={reduce ? undefined : LinearTransition.duration(300).easing(EASE_IN_OUT)} style={[{ padding: pad, overflow: 'hidden', borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: '#ffffff' }, stub]}>
      <Animated.View style={[{ width: LARGE, height: LARGE, transformOrigin: 'top left' }, code]}>
        <QRCode text={link} size={LARGE} />
      </Animated.View>
    </Animated.View>
  );
}
