// The type ramp as React Native text styles. The system font (SF Pro on iPhone); sizes follow the person's
// Dynamic Type setting, capped per style by `maxFontSizeMultiplier` (see ThemedText).
//
// Headings (large title and titles 1 to 3) are SF Pro Rounded, Apple's own rounded cut of the system font, bold,
// the way Flighty sets its screen titles. iOS draws it from `ui-rounded`; the web build asks for the same face and
// falls back to the system font where the browser has no rounded one.
import { Platform, type TextStyle } from 'react-native';

import { type, type TypeStyle } from '@design/tokens';

export type { TypeStyle };

export const ROUNDED = Platform.select({ ios: 'ui-rounded', web: 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, sans-serif', default: undefined });

const HEADINGS: Partial<Record<TypeStyle, TextStyle>> = {
  largeTitle: { fontFamily: ROUNDED, fontWeight: '700', letterSpacing: 0.2 },
  title1: { fontFamily: ROUNDED, fontWeight: '700' },
  title2: { fontFamily: ROUNDED, fontWeight: '700' },
  title3: { fontFamily: ROUNDED },
};

export const typography: Record<TypeStyle, TextStyle> = Object.fromEntries(
  Object.entries(type).map(([name, t]) => [name, { fontSize: t.size, lineHeight: t.leading, fontWeight: t.weight, ...HEADINGS[name as TypeStyle] }]),
) as Record<TypeStyle, TextStyle>;

export const maxScale: Record<TypeStyle, number> = Object.fromEntries(Object.entries(type).map(([name, t]) => [name, t.maxScale])) as Record<
  TypeStyle,
  number
>;
