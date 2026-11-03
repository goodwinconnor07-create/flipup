// Colours for the app. On iPhone the neutrals (page, cells, labels, separators, the accent) are Apple's own
// system colours, so they follow light and dark mode, Increase Contrast and the rest by themselves. Everything
// else, and every colour on the web build, comes from the shared palette in src/design/tokens.ts.
import { Color } from 'expo-router';
import { Platform, useColorScheme, type ColorValue } from 'react-native';

import { palette, type PaletteColor } from '@design/tokens';

import { brand } from './brand';

export type Colors = Record<PaletteColor, ColorValue>;

const ios = process.env.EXPO_OS === 'ios';

/** The system colours used for the neutrals on iPhone. */
const SYSTEM: Partial<Colors> = ios
  ? {
      background: Color.ios.systemBackground,
      cell: Color.ios.secondarySystemBackground,
      cellPressed: Color.ios.systemGray5,
      separator: Color.ios.separator,
      label: Color.ios.label,
      secondaryLabel: Color.ios.secondaryLabel,
      tertiaryLabel: Color.ios.tertiaryLabel,
      quaternaryLabel: Color.ios.quaternaryLabel,
      red: Color.ios.systemRed,
    }
  : {};

/** The palette (theme/brand.ts) over the tokens: violet for actions, gold for wins and highlights. */
function branded(dark: boolean): Partial<Colors> {
  const violet = dark ? brand.violetDark : brand.violet;
  return {
    accent: violet,
    switchOn: violet,
    pink: violet,
    indigo: violet,
    violet,
    green: brand.gold,
    gold: brand.gold,
    blueBg: dark ? 'rgba(139, 109, 255, 0.18)' : '#efeaff',
    blueInk: violet,
  };
}

/** Today's colours. Call it inside a component so a switch between light and dark redraws. */
export function useColors(): Colors {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...palette[scheme], ...SYSTEM, ...branded(scheme === 'dark') };
}

/**
 * Static hex values for places that can't take a system colour object: Reanimated styles, CSS gradients, and
 * third-party props that only accept strings.
 */
export function usePlainColors(): Record<keyof (typeof palette)['light'], string> {
  const dark = useColorScheme() === 'dark';
  return { ...palette[dark ? 'dark' : 'light'], ...(branded(dark) as Partial<(typeof palette)['light']>) };
}

export const isIOS = Platform.OS === 'ios';
