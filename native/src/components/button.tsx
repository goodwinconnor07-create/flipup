import { ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';

import { brand, minTap, radius, spacing, useColors } from '@/theme';

import { usePanel } from './grouped-list';
import { PressableScale } from './pressable-scale';
import { Swap } from './swap';
import { ThemedText } from './themed-text';

const SIZES = {
  md: { height: Math.max(minTap, 52), paddingHorizontal: spacing.lg, text: 'headline' as const },
  lg: { height: 58, paddingHorizontal: spacing.xl, text: 'title3' as const },
};

/**
 * The app's buttons: one flat capsule, four fills. Nothing else in the app should look like a button.
 * - `primary` (and `party`, its older name): the brand blue with white words. The one main action on a screen.
 * - `inverse`: white with blue words. The main action when the button sits on a blue or night surface.
 * - `secondary`: the grey panel with plain words. Everything that isn't the main action.
 * - `quiet`: a faint white panel with white words. A second action on a blue or night surface.
 * - `destructive`: the grey panel with red words. Deleting and leaving.
 * Every size is at least 44pt tall. States: pressed (PressableScale), disabled (dimmed), loading (a spinner).
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  tint,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'party' | 'primary' | 'inverse' | 'secondary' | 'quiet' | 'destructive';
  size?: keyof typeof SIZES;
  /** `gold` makes the main button gold with dark words: Premium's, and only Premium's. Other values are the blue. */
  tint?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const panel = usePanel();
  const s = SIZES[size];
  const loud = variant === 'party' || variant === 'primary';
  const gold = loud && tint === 'gold';
  const fill = gold ? brand.gold : loud ? brand.violet : variant === 'inverse' ? '#ffffff' : variant === 'quiet' ? 'rgba(255, 255, 255, 0.16)' : panel.fill;
  const ink = gold ? brand.goldInk : loud || variant === 'quiet' ? '#ffffff' : variant === 'inverse' ? brand.violet : variant === 'destructive' ? (colors.red as string) : (colors.label as string);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled}
      onPress={loading ? undefined : onPress}
      style={[{ minHeight: s.height, paddingHorizontal: s.paddingHorizontal, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: fill }, style]}
    >
      {/* The title and the spinner replace each other, and a title that changes (Select to Selected) slides through a mask. */}
      <Swap id={loading ? '\u0000busy' : title} kind="text">
        {loading ? (
          <ActivityIndicator color={ink} />
        ) : (
          <ThemedText variant={s.text} numberOfLines={1} style={{ color: ink, fontWeight: '700' }}>
            {title}
          </ThemedText>
        )}
      </Swap>
    </PressableScale>
  );
}
