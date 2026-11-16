// The game code's QR code (the lobby's Game code card), which grows into itself when tapped.
import { useEffect } from 'react';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { EASE_IN_OUT } from '@/motion/presets';
import { radius, spacing } from '@/theme';

import { QRCode } from './qr-code';

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
