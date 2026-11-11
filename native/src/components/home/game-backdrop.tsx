import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle } from 'react-native-reanimated';

import { gameLook } from '@design/gameArt';
import type { Variant } from '@/engine';
import { EASE_OUT } from '@/motion/presets';
import { useDrift } from '@/motion/use-drift';
import { gradient } from '@/theme';

/** A colour mixed towards black: `k` of 0 is the colour, 1 is black. */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const part = (v: number) => Math.round(v * (1 - k));
  return `rgb(${part((n >> 16) & 255)}, ${part((n >> 8) & 255)}, ${part(n & 255)})`;
}

const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/**
 * Home's page colour follows the game in the middle: a dark shade of the game's own colour (dark enough for white
 * type anywhere), with three lights in its brighter tones wandering over it on 4.5 to 8s clocks. Picking another
 * game fades the new colours in over the old (300ms in, 240 out, no empty beat). The lights are transforms on the UI
 * thread, paused off screen and in the background, and still under Reduce Motion (`useDrift`).
 */
export function GameBackdrop({ variant, style, children }: { variant: Variant; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { t } = useDrift(4500);
  const { t: u } = useDrift(6200);
  const { t: v } = useDrift(8000);
  const one = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-50 + 100 * t.get()}%` }, { translateY: `${-30 + 60 * u.get()}%` }, { scale: 0.85 + 0.5 * v.get() }],
  }));
  const two = useAnimatedStyle(() => ({
    transform: [{ translateX: `${45 - 90 * u.get()}%` }, { translateY: `${40 - 80 * v.get()}%` }, { scale: 1.15 - 0.4 * t.get() }],
  }));
  const three = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-35 + 70 * v.get()}%` }, { translateY: `${35 - 70 * t.get()}%` }],
  }));
  const look = gameLook(variant);
  const field = look.card[0];
  const light = (colour: string) => gradient(`radial-gradient(circle at center, ${colour} 0%, transparent 62%)`);
  return (
    <View style={[{ flex: 1, overflow: 'hidden', backgroundColor: '#05070f' }, style]}>
      <Animated.View
        key={variant}
        pointerEvents="none"
        entering={FadeIn.duration(300).easing(EASE_OUT)}
        exiting={FadeOut.duration(240).easing(EASE_OUT)}
        style={{ position: 'absolute', inset: 0, ...gradient(`linear-gradient(170deg, ${shade(field, 0.38)} 0%, ${shade(field, 0.62)} 45%, ${shade(look.band, 0.82)} 100%)`) }}
      >
        <Animated.View style={[{ position: 'absolute', left: '-35%', top: '-15%', width: '125%', aspectRatio: 1, ...light(alpha(field, 0.6)) }, one]} />
        <Animated.View style={[{ position: 'absolute', right: '-40%', top: '22%', width: '115%', aspectRatio: 1, ...light(alpha(look.tone, 0.42)) }, two]} />
        <Animated.View style={[{ position: 'absolute', left: '5%', bottom: '-28%', width: '95%', aspectRatio: 1, ...light('rgba(255, 255, 255, 0.09)') }, three]} />
      </Animated.View>
      {children}
    </View>
  );
}
