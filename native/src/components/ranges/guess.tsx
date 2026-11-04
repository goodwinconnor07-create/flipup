import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, cardColors, radius, ROUNDED, spacing } from '@/theme';

import { Button } from '../button';
import { LivingCard } from '../living-card';
import { RaiseSlider } from '../table/raise-slider';

/**
 * Pro's guess, between your answer and the reveal: how often do you think your hand wins here? Slide to a number
 * (a tick every 5%) and reveal. Within 5 points of the truth is worth 30, within 10 is worth 15.
 */
export function GuessCard({ pickLabel, onDone }: { pickLabel: string; onDone: (guess: number | null) => void }) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [value, setValue] = useState(40);
  return (
    <Animated.View entering={reduce ? undefined : SlideInDown.springify().mass(0.8).damping(18)} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, paddingBottom: Math.max(insets.bottom, spacing.md) }}>
      <LivingCard colors={cardColors.night} radius={radius.xl} grain={0} style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ gap: 2 }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: brand.gold }}>
            YOU PICKED {pickLabel.toUpperCase()}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 27, fontWeight: '800', color: '#ffffff' }}>
            How often do you win here?
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
            Against everything they could have. Within 5% is +30.
          </Text>
        </View>
        <Text maxFontSizeMultiplier={1.2} style={{ alignSelf: 'center', fontFamily: ROUNDED, fontSize: 56, lineHeight: 62, fontWeight: '800', color: brand.gold, fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">
          {value}%
        </Text>
        <RaiseSlider value={value} min={0} max={100} step={1} tint={brand.gold} onChange={setValue} />
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <View style={{ flex: 1 }}>
            <Button title="Skip" variant="secondary" onPress={() => onDone(null)} />
          </View>
          <View style={{ flex: 2 }}>
            <Button title="Reveal" variant="party" onPress={() => onDone(value)} />
          </View>
        </View>
      </LivingCard>
    </Animated.View>
  );
}
