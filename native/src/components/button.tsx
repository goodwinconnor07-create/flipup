import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, minTap, radius, spacing, useColors } from '@/theme';

import { LivingCard } from './living-card';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

const SIZES = {
  md: { height: Math.max(minTap, 50), paddingHorizontal: spacing.lg, text: 'headline' as const },
  lg: { height: 60, paddingHorizontal: spacing.xl, text: 'title3' as const },
};

/**
 * The app's buttons.
 * - `party`: the loud one for what you tap to play: a living gradient with a faint grain (LivingCard), heavy text.
 * - `primary`: system blue. `secondary`: a flat grey cell. `destructive`: red text on a grey cell.
 * Every size is at least 44pt tall. States: pressed (PressableScale), disabled, loading.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  tint = 'blue',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'party' | 'primary' | 'secondary' | 'destructive';
  size?: keyof typeof SIZES;
  /** The party gradient. */
  tint?: keyof typeof gradients;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const s = SIZES[size];
  const fill: ViewStyle =
    variant === 'party'
      ? {}
      : variant === 'primary'
        ? { backgroundColor: colors.accent }
        : { backgroundColor: colors.cell };
  const ink = variant === 'party' || variant === 'primary' ? 'onColor' : variant === 'destructive' ? 'red' : 'accent';
  const label = loading ? (
    <ActivityIndicator color={variant === 'party' || variant === 'primary' ? '#ffffff' : undefined} />
  ) : (
    <View>
      <ThemedText variant={s.text} tone={ink} style={variant === 'party' ? { fontWeight: '800' } : undefined}>
        {title}
      </ThemedText>
    </View>
  );
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled}
      onPress={loading ? undefined : onPress}
      style={[
        variant === 'party'
          ? { borderRadius: radius.md }
          : {
          minHeight: s.height,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
        },
        fill,
        style,
      ]}
    >
      {variant === 'party' ? (
        <LivingCard
          colors={[gradients[tint][0], gradients[tint][1], gradients[tint][1]]}
          radius={radius.md}
          shadow="soft"
         
          outerStyle={{ alignSelf: 'stretch' }}
          style={{ minHeight: s.height, paddingHorizontal: s.paddingHorizontal, alignItems: 'center', justifyContent: 'center' }}
        >
          {label}
        </LivingCard>
      ) : (
        label
      )}
    </PressableScale>
  );
}
