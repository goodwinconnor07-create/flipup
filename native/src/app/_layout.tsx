import '@/polyfills';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { loadAppearance, useAppearance, type AppearancePref } from '@/state/prefs';
import { useColors, usePlainColors } from '@/theme';

/** Appearance in Settings: follow the phone, or always light or dark. */
const applyAppearance = (a: AppearancePref) => {
  try {
    Appearance.setColorScheme?.(a === 'auto' ? 'unspecified' : a);
  } catch {
    // The web build follows the browser.
  }
};
applyAppearance(loadAppearance());

// The root: the tab bar, and the sheets that open over it. Sheets are real iOS form sheets with detents and a
// grab handle, dismissed by a swipe down. Each tab has its own stack inside (see (tabs)/*/_layout.tsx).
export default function RootLayout() {
  const appearance = useAppearance();
  useEffect(() => applyAppearance(appearance), [appearance]);
  const dark = useColorScheme() === 'dark';
  const reduce = useReduceMotion();
  const colors = useColors();
  const plain = usePlainColors();
  // The navigation chrome (headers, titles, hairlines) takes the same tokens as the screens.
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: plain.accent, background: plain.background, card: plain.background, text: plain.label, border: plain.separator },
  };
  const sheet = {
    presentation: 'formSheet' as const,
    sheetAllowedDetents: [0.6, 1],
    sheetGrabberVisible: true,
    contentStyle: { backgroundColor: colors.background },
  };
  return (
    <ThemeProvider value={theme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, animation: reduce ? 'fade' : 'default' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* The table covers the tab bar and can't be swiped away mid-hand: you leave it from its menu. */}
        <Stack.Screen name="table" options={{ headerShown: false, gestureEnabled: false, animation: reduce ? 'fade' : 'slide_from_bottom' }} />
        <Stack.Screen name="game/[id]" options={{ ...sheet, title: 'Game' }} />
        <Stack.Screen name="premium" options={{ ...sheet, title: 'FlipUp Premium' }} />
        <Stack.Screen name="table-menu" options={{ ...sheet, title: 'Menu' }} />
        <Stack.Screen name="table-standings" options={{ ...sheet, title: 'Standings' }} />
        <Stack.Screen name="table-theme" options={{ ...sheet, title: 'Table theme' }} />
        <Stack.Screen name="table-settings" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Table settings' }} />
        <Stack.Screen name="hand-rankings" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Hand rankings' }} />
        <Stack.Screen name="table-log" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Hand log' }} />
        <Stack.Screen name="code-entry" options={{ ...sheet, sheetAllowedDetents: [1], title: 'Code' }} />
        <Stack.Screen name="party-sheet" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Party' }} />
        <Stack.Screen name="sample-sheet" options={{ ...sheet, sheetAllowedDetents: [0.5, 1], title: 'A sheet' }} />
      </Stack>
    </ThemeProvider>
  );
}
