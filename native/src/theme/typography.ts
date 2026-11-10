// The type ramp as React Native text styles. The system font (SF Pro on iPhone); sizes follow the person's
// Dynamic Type setting, capped per style by `maxFontSizeMultiplier` (see ThemedText).
//
// One family outside the table (owner, 10 November 2026: no mixed fonts): SF Pro Rounded, Apple's own rounded cut
// of the system font, for every step. Titles are heavy (800), row titles and buttons bold (700), reading text
// regular. iOS draws it from `ui-rounded`; the web build asks for the same face and falls back to the system font.
// Capitals are only for tile bands and small eyebrow labels.
import { Platform, type TextStyle } from 'react-native';

import { type, type TypeStyle } from '@design/tokens';

export type { TypeStyle };

export const ROUNDED = Platform.select({ ios: 'ui-rounded', web: 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, sans-serif', default: undefined });

const WEIGHTS: Partial<Record<TypeStyle, TextStyle>> = {
  largeTitle: { fontWeight: '800', letterSpacing: 0.2 },
  title1: { fontWeight: '800' },
  title2: { fontWeight: '800' },
  title3: { fontWeight: '700' },
  headline: { fontWeight: '700' },
};

export const typography: Record<TypeStyle, TextStyle> = Object.fromEntries(
  Object.entries(type).map(([name, t]) => [name, { fontSize: t.size, lineHeight: t.leading, fontWeight: t.weight, fontFamily: ROUNDED, ...WEIGHTS[name as TypeStyle] }]),
) as Record<TypeStyle, TextStyle>;

export const maxScale: Record<TypeStyle, number> = Object.fromEntries(Object.entries(type).map(([name, t]) => [name, t.maxScale])) as Record<
  TypeStyle,
  number
>;
