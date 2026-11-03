import '@/polyfills';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { startStore } from '@/state/purchase';
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
// Connect to the App Store at launch: purchases that finish later still land, and Premium comes back on its own.
void startStore();

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
        <Stack.Screen name="table" options={{ headerShown: false, gestureEnabled: false, animation: 'fade', animationDuration: 200 }} />
        {/* The fade is short because the table's own DealWipe does the moving. */}
        <Stack.Screen name="game/[id]" options={{ ...sheet, title: 'Game' }} />
        {/* How to Play: a recorded hand on black, as a full-height modal you swipe down to close. */}
        <Stack.Screen name="how-to-play/[id]" options={{ presentation: 'modal', headerShown: false, title: 'How to play', contentStyle: { backgroundColor: '#000000' } }} />
        <Stack.Screen name="premium" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'FlipUp Premium' }} />
        <Stack.Screen name="table-menu" options={{ ...sheet, title: 'Menu' }} />
        <Stack.Screen name="table-standings" options={{ ...sheet, title: 'Standings' }} />
        <Stack.Screen name="table-theme" options={{ ...sheet, title: 'Table theme' }} />
        <Stack.Screen name="table-settings" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Table settings' }} />
        <Stack.Screen name="hand-rankings" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Hand rankings' }} />
        <Stack.Screen name="table-log" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Hand log' }} />
        <Stack.Screen name="card-packs" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Card packs' }} />
        <Stack.Screen name="chat-bubbles" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Chat bubbles' }} />
        <Stack.Screen name="blocked" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Blocked players' }} />
        <Stack.Screen name="emoji" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Your emoji' }} />
        <Stack.Screen name="streak" options={{ ...sheet, title: 'Daily streak' }} />
        <Stack.Screen name="username" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'Username' }} />
        <Stack.Screen name="add-friend" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'Add a friend' }} />
        <Stack.Screen name="code-entry" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'Code' }} />
        <Stack.Screen name="party-sheet" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Party' }} />
        <Stack.Screen name="sample-sheet" options={{ ...sheet, sheetAllowedDetents: [0.5, 1], title: 'A sheet' }} />
      </Stack>
    </ThemeProvider>
  );
}
