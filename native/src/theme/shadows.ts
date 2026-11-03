import { useColorScheme } from 'react-native';

/**
 * Shadows in the app, stronger than the web's so they read on a phone: `sm` for small things, `soft` and `card` for
 * every box (cells, lists, banners), `raised` for coloured cards. A shadow can't show on dark mode's true black, so
 * there each level also draws a faint light edge inside the box, which is what separates it from the page.
 *
 * A view that clips its content (`overflow: 'hidden'`) loses its own shadow on iOS: put the shadow on a wrapper and
 * the clipping inside it (LivingCard and Section do).
 */
const SHADOWS = {
  light: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.10)',
    soft: '0 1px 2px rgba(0, 0, 0, 0.05), 0 6px 18px -6px rgba(0, 0, 0, 0.14)',
    card: '0 1px 3px rgba(0, 0, 0, 0.06), 0 10px 26px -8px rgba(0, 0, 0, 0.18)',
    raised: '0 2px 6px rgba(20, 8, 70, 0.10), 0 18px 36px -12px rgba(30, 12, 110, 0.38)',
  },
  dark: {
    sm: '0 2px 8px -4px rgba(0, 0, 0, 0.6), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)',
    soft: '0 8px 24px -10px rgba(0, 0, 0, 0.8), inset 0 0 0 0.5px rgba(255, 255, 255, 0.09)',
    card: '0 10px 28px -10px rgba(0, 0, 0, 0.9), inset 0 0 0 0.5px rgba(255, 255, 255, 0.10)',
    raised: '0 18px 40px -14px rgba(110, 75, 255, 0.35), inset 0 0 0 0.5px rgba(255, 255, 255, 0.14)',
  },
} as const;

/** Today's shadow levels, as boxShadow strings. */
export function useShadows(): Record<keyof (typeof SHADOWS)['light'], string> {
  return SHADOWS[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
