import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { radius as radii, useShadows } from '@/theme';

/**
 * Every coloured surface in the app (the start tiles, the stats card, banners, the invite ticket, Premium, the loud
 * buttons): one flat colour, the middle of its three (`colors[1]`; `colors[2]` is the darker shade for a band or an
 * edge on it, `colors[0]` the lighter one for a detail). Flat on purpose, like the game tiles (owner, 10 November
 * 2026): no gradient, no drifting glows, nothing moving. The name is older than the look.
 *
 * Shadows: iOS clips a view's shadow when the same view clips its content, and a rounded card has to clip. So the
 * shadow sits on an outer layer and the clipping on an inner one.
 */
export function LivingCard({
  colors,
  radius = radii.xl,
  shadow = true,
  style,
  outerStyle,
  children,
}: {
  colors: readonly [string, string, string];
  /** Unused since the cards went flat; kept so callers needn't change. */
  glow?: string;
  glow2?: string;
  still?: boolean;
  radius?: number;
  /** true for the coloured-card shadow, 'soft' for a button's, false for none. */
  shadow?: boolean | 'soft';
  /** Padding and layout of the content. */
  style?: StyleProp<ViewStyle>;
  /** Size and placement of the card itself. */
  outerStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const shadows = useShadows();
  return (
    <View style={[{ borderRadius: radius, borderCurve: 'continuous', boxShadow: shadow === 'soft' ? shadows.soft : shadow ? shadows.raised : undefined }, outerStyle]}>
      <View style={{ flexGrow: 1, borderRadius: radius, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors[1] }}>
        <View style={style}>{children}</View>
      </View>
    </View>
  );
}
