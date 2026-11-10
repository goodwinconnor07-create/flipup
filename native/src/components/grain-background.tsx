import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Dark on purpose: white text and emoji have to stay clear on it. The page is the middle colour. */
export const GRAIN_NIGHT = ['#070f2a', '#0b1533', '#040914'] as const;

/**
 * The background for the app's dark blue pages (Play with friends, Play with bots, the lobby, Premium): one flat
 * night blue, the middle of `colors`. It was a film grain, then a moving light field; since 10 November 2026 it is
 * flat like everything else (the owner: clean, nothing that looks generated). The name stayed.
 */
export function GrainBackground({
  colors = GRAIN_NIGHT,
  style,
  children,
}: {
  /** Only the middle colour is used. */
  colors?: readonly [string, string, string];
  /** Unused since the page went flat; kept so callers needn't change. */
  glow?: string;
  glow2?: string;
  still?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return <View style={[{ flex: 1, overflow: 'hidden', backgroundColor: colors[1] }, style]}>{children}</View>;
}
