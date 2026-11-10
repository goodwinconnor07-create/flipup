import { router } from 'expo-router';
import { useRef } from 'react';
import { View } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { isPremiumVariant, VARIANTS, type Variant } from '@/engine';
import { useDrift } from '@/motion/use-drift';
import { usePremium } from '@/state/premium';
import { brand } from '@/theme';

import { GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';

const GAP = 14;

/**
 * The games as a row of big cards you swipe, one at a time, like picking a character: the one in the middle is full
 * size and upright, its neighbours smaller, dimmer and tipped away, all driven by the scroll itself (so a card is
 * always exactly under the finger, rule 14), clipped to the middle column so they never run under the side bars. Each card that passes the middle gives a selection tick and becomes the
 * chosen game. The row floats a few points up and down (not under Reduce Motion). Tap the middle card for its
 * page, a neighbour to bring it to the middle. VoiceOver treats the row as one adjustable control.
 */
export function GameSwiper({ variant, onChange, size, width }: { variant: Variant; onChange: (v: Variant) => void; size: number; width: number }) {
  const premium = usePremium();
  const step = size + GAP;
  const start = Math.max(0, VARIANTS.findIndex((v) => v.id === variant));
  const x = useSharedValue(start * step);
  const ref = useRef<Animated.ScrollView>(null);
  const start0 = useRef(start);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  const pick = (i: number) => {
    const next = VARIANTS[Math.max(0, Math.min(VARIANTS.length - 1, i))];
    if (!next) return;
    haptic.select();
    onChange(next.id);
  };
  useAnimatedReaction(
    () => Math.round(x.get() / step),
    (i, was) => {
      if (was !== null && i !== was) runOnJS(pick)(i);
    },
  );
  const to = (i: number) => ref.current?.scrollTo({ x: i * step, animated: true });
  const { t } = useDrift(2600);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -4 + 8 * t.get() }] }));
  const pad = Math.max(0, (width - size) / 2);
  return (
    <Animated.View
      style={[{ width, height: size + 36, overflow: 'hidden' }, float]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Game"
      accessibilityValue={{ text: VARIANTS[start]?.name }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') to(Math.min(VARIANTS.length - 1, start + 1));
        else if (e.nativeEvent.actionName === 'decrement') to(Math.max(0, start - 1));
        else router.push(`/game/${variant}`);
      }}
    >
      <Animated.ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        contentOffset={{ x: start * step, y: 0 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Starts on the chosen game (the web build ignores contentOffset, so it's also set once laid out).
        onLayout={() => ref.current?.scrollTo({ x: start0.current * step, animated: false })}
        contentContainerStyle={{ paddingHorizontal: pad, paddingVertical: 18, gap: GAP }}
      >
        {VARIANTS.map((v, i) => (
          <Card
            key={v.id}
            variant={v.id}
            index={i}
            x={x}
            step={step}
            size={size}
            locked={!premium && isPremiumVariant(v.id)}
            onPress={() => {
              if (i === start) {
                haptic.tap();
                router.push(`/game/${v.id}`);
              } else to(i);
            }}
          />
        ))}
      </Animated.ScrollView>
    </Animated.View>
  );
}

function Card({ variant, index, x, step, size, locked, onPress }: { variant: Variant; index: number; x: SharedValue<number>; step: number; size: number; locked: boolean; onPress: () => void }) {
  const style = useAnimatedStyle(() => {
    const d = x.get() / step - index;
    return {
      opacity: interpolate(d, [-1, 0, 1], [0.5, 1, 0.5], 'clamp'),
      transform: [{ scale: interpolate(d, [-1, 0, 1], [0.78, 1, 0.78], 'clamp') }, { rotateZ: `${interpolate(d, [-1, 0, 1], [7, 0, -7], 'clamp')}deg` }],
    };
  });
  return (
    <Animated.View style={style}>
      <PressableScale accessible={false} onPress={onPress} haptics={false}>
        <View style={{ borderRadius: size * 0.24, borderCurve: 'continuous', boxShadow: '0 18px 36px -12px rgba(0, 0, 0, 0.65)' }}>
          <GameThumb variant={variant} size={size} />
        </View>
        {locked && (
          <View style={{ position: 'absolute', top: -8, right: -8, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1533', borderWidth: 2, borderColor: brand.gold }}>
            <Icon name="crown.fill" size={15} color={brand.gold} />
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}
