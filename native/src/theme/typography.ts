// The type ramp as React Native text styles. The system font (SF Pro on iPhone); sizes follow the person's
// Dynamic Type setting, capped per style by `maxFontSizeMultiplier` (see ThemedText).
import type { TextStyle } from 'react-native';

import { type, type TypeStyle } from '@design/tokens';

export type { TypeStyle };

export const typography: Record<TypeStyle, TextStyle> = Object.fromEntries(
  Object.entries(type).map(([name, t]) => [name, { fontSize: t.size, lineHeight: t.leading, fontWeight: t.weight }]),
) as Record<TypeStyle, TextStyle>;

export const maxScale: Record<TypeStyle, number> = Object.fromEntries(Object.entries(type).map(([name, t]) => [name, t.maxScale])) as Record<
  TypeStyle,
  number
>;
