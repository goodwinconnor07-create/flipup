import { router } from 'expo-router';
import { View } from 'react-native';

import { brand, cardColors, radius, spacing } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { LivingCard } from '../living-card';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';

/** Before your first hand: Texas Hold'em's How to Play, step by step on the app's own table. */
export function FirstHand() {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="How to play Texas Hold'em"
      onPress={() => {
        haptic.tap();
        router.push('/how-to-play/holdem');
      }}
    >
      <LivingCard colors={cardColors.violet} radius={radius.lg} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <Icon name="play.fill" size={22} color={brand.violet} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="title3" tone="onColor">
          How to play
        </ThemedText>
        <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.85 }}>
          Texas Hold&apos;em, step by step
        </ThemedText>
      </View>
      <Icon name="chevron.right" size={16} color="#ffffff" />
      </LivingCard>
    </PressableScale>
  );
}
