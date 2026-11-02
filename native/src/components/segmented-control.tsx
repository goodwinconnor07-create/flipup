import { Pressable, View } from 'react-native';

import { radius, spacing, useColors, useShadows } from '@/theme';

import { haptic } from './haptics';
import type { SegmentedControlProps } from './segmented-control.types';
import { ThemedText } from './themed-text';

/** The segmented control where there's no SwiftUI (the web build): a grey track with a raised chosen segment. */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: SegmentedControlProps<T>) {
  const colors = useColors();
  const shadow = useShadows();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', padding: 2, borderRadius: radius.sm, backgroundColor: colors.cellPressed }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            onPress={() => {
              if (on) return;
              haptic.select();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              minHeight: 32,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.xs,
              borderRadius: radius.sm - 2,
              backgroundColor: on ? colors.segmentOn : 'transparent',
              boxShadow: on ? shadow.sm : undefined,
            }}
          >
            <ThemedText variant="subhead" style={{ fontWeight: on ? '600' : '400' }}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
