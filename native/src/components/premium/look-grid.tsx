import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { radius, spacing, useColors } from '@/theme';

export interface LookChoice {
  id: string | null;
  name: string;
  note: string;
  locked: boolean;
  preview: ReactNode;
}

/**
 * A two-column grid of looks to pick from (card backs, bubble effects): the preview, the name and a line. The one
 * you wear has a blue ring and a tick; a locked one has a crown and opens the Premium offer instead.
 */
export function LookGrid({ choices, value, onPick, reason }: { choices: LookChoice[]; value: string | null; onPick: (id: string | null) => void; reason: 'pack' | 'bubble' }) {
  const colors = useColors();
  // Two columns inside the sheet's padding. A percentage width doesn't reach through PressableScale.
  const tile = Math.floor((Math.min(useWindowDimensions().width, 700) - spacing.md * 2 - spacing.sm) / 2);
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {choices.map((c) => {
        const on = c.id === value;
        return (
          <PressableScale
            key={c.id ?? 'plain'}
            accessibilityRole="radio"
            accessibilityLabel={`${c.name}${c.locked ? ', Premium' : ''}`}
            accessibilityState={{ checked: on }}
            onPress={() => {
              if (c.locked) {
                haptic.tap();
                router.push({ pathname: '/premium', params: { reason } });
                return;
              }
              haptic.select();
              onPick(c.id);
            }}
            style={{ width: tile, padding: spacing.sm, gap: spacing.xs, borderRadius: radius.md, backgroundColor: colors.cell, borderWidth: 3, borderColor: on ? colors.accent : 'transparent' }}
          >
            <View style={{ height: 92, alignItems: 'center', justifyContent: 'center' }}>{c.preview}</View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
              <ThemedText variant="headline" style={{ flex: 1 }} numberOfLines={1}>
                {c.name}
              </ThemedText>
              {c.locked ? <Icon name="crown.fill" size={14} color={colors.gold} /> : on ? <Icon name="checkmark.circle.fill" size={16} color={colors.accent} /> : null}
            </View>
            <ThemedText variant="footnote" tone="tertiaryLabel" numberOfLines={2}>
              {c.note}
            </ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}
