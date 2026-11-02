import { Text, type TextProps } from 'react-native';

import { maxScale, typography, useColors, type TypeStyle } from '@/theme';

type Tone = 'label' | 'secondaryLabel' | 'tertiaryLabel' | 'accent' | 'onColor' | 'red';

/**
 * Every piece of text goes through here: a step on the type ramp and a tone, never a raw font size.
 * It scales with Dynamic Type up to the style's cap.
 */
export function ThemedText({ variant = 'body', tone = 'label', style, ...props }: TextProps & { variant?: TypeStyle; tone?: Tone }) {
  const colors = useColors();
  return <Text maxFontSizeMultiplier={maxScale[variant]} style={[typography[variant], { color: colors[tone] }, style]} {...props} />;
}
