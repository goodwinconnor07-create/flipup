import { createContext, useContext, type ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';

import { maxScale, typography, useColors, type TypeStyle } from '@/theme';

type Tone = 'label' | 'secondaryLabel' | 'tertiaryLabel' | 'accent' | 'onColor' | 'red';

/** How far text may grow with Dynamic Type on pages that scroll (Apple's largest accessibility size is about 3.1x). */
const ROOMY: Record<TypeStyle, number> = {
  largeTitle: 2,
  title1: 2.2,
  title2: 2.4,
  title3: 2.6,
  headline: 3.1,
  body: 3.1,
  callout: 3.1,
  subhead: 3.1,
  footnote: 3.1,
  caption1: 3.1,
  caption2: 3.1,
};

const Tight = createContext(false);

/**
 * Around a screen whose layout is fixed (the table, the trainer): text there keeps the lower caps in
 * the type ramp. Everywhere else, which scrolls, text follows the person's size setting up to Apple's largest.
 */
export function TightText({ children }: { children: ReactNode }) {
  return <Tight.Provider value>{children}</Tight.Provider>;
}

/**
 * Every piece of text goes through here: a step on the type ramp and a tone, never a raw font size.
 * It scales with Dynamic Type up to the style's cap (see TightText).
 */
export function ThemedText({ variant = 'body', tone = 'label', style, ...props }: TextProps & { variant?: TypeStyle; tone?: Tone }) {
  const colors = useColors();
  const tight = useContext(Tight);
  return <Text maxFontSizeMultiplier={tight ? maxScale[variant] : ROOMY[variant]} style={[typography[variant], { color: colors[tone] }, style]} {...props} />;
}
