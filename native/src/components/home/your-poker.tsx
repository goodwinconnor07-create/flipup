import { router } from 'expo-router';
import { View } from 'react-native';

import { brand, radius, spacing, useColors, useShadows } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';

/**
 * Before your first hand: Texas Hold'em's How to Play, step by step on the app's own table. A quiet grey row with a
 * blue badge, like Join a game: the two start tiles are the one loud thing on Home, and this is the help beside them.
 */
export function FirstHand() {
  const colors = useColors();
  const shadows = useShadows();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="How to play Texas Hold'em, step by step"
      onPress={() => {
        haptic.tap();
        router.push('/how-to-play/holdem');
      }}
      haptics={false}
      outerStyle={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 72, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet }}>
        <Icon name="play.fill" size={18} color="#ffffff" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="headline">New to poker?</ThemedText>
        <ThemedText variant="subhead" tone="secondaryLabel">
          Texas Hold&apos;em, step by step
        </ThemedText>
      </View>
      <Icon name="chevron.right" size={15} color={colors.tertiaryLabel} />
    </PressableScale>
  );
}
