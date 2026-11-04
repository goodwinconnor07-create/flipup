import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

import { useForcedScheme, useScheme } from '@/theme';

/** Checked once: Liquid Glass needs iOS 26, and some early iOS 26 builds lack the API. */
const liquid = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * For what floats over the content: the tab bar, capsules, the join button, toasts. Liquid Glass on iOS 26 and
 * later; below that, the system material blur. Flat things (cells, cards) never use it.
 */
export function GlassSurface({ children, style, interactive }: { children?: ReactNode; style?: StyleProp<ViewStyle>; interactive?: boolean }) {
  const dark = useScheme() === 'dark';
  const forced = useForcedScheme();
  if (liquid) {
    return (
      <GlassView isInteractive={interactive} colorScheme={forced ?? undefined} style={style}>
        {children}
      </GlassView>
    );
  }
  return (
    <BlurView tint={dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} intensity={80} style={[{ overflow: 'hidden' }, style]}>
      {children}
    </BlurView>
  );
}
