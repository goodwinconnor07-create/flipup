import { Pressable, View } from 'react-native';

import { radius, useColors } from '@/theme';

import { haptic } from './haptics';
import { Icon } from './icon';
import type { StepperProps } from './stepper.types';

/** The − / + stepper where there's no SwiftUI (the web build). */
export function Stepper({ label, value, min, max, step = 1, onChange }: StepperProps) {
  const colors = useColors();
  const half = (sign: -1 | 1) => {
    const next = value + sign * step;
    const off = next < min || next > max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${sign < 0 ? 'Less' : 'More'} ${label}`}
        accessibilityState={{ disabled: off }}
        disabled={off}
        onPress={() => {
          haptic.select();
          onChange(next);
        }}
        style={({ pressed }) => ({ width: 47, height: 32, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.3 : pressed ? 0.5 : 1 })}
      >
        <Icon name={sign < 0 ? 'minus' : 'plus'} size={18} color={colors.label} />
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.sm, backgroundColor: colors.cellPressed }}>
      {half(-1)}
      <View style={{ width: 1, height: 18, backgroundColor: colors.separator }} />
      {half(1)}
    </View>
  );
}
