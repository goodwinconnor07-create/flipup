import '@/polyfills';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';

import { useReminderTaps } from '@/state/reminder';
import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { CrashScreen } from '@/components/crash-screen';
import { RequestTimeoutPopup } from '@/components/request-timeout-popup';
import { LaunchCover } from '@/components/launch-cover';
import { UndoToast } from '@/components/undo-toast';
import { ThumbSnapper } from '@/components/thumb-snaps';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { startStore } from '@/state/purchase';
import { loadAppearance, useAppearance, type AppearancePref } from '@/state/prefs';
import { haptic } from '@/components/haptics';
import { GLASS_SHEETS } from '@/components/sheet-material';
import { useColors, usePlainColors, useReduceTransparency } from '@/theme';

/** Appearance in Settings: follow the phone, or always light or dark. */
const applyAppearance = (a: AppearancePref) => {
  try {
    Appearance.setColorScheme?.(a === 'auto' ? 'unspecified' : a);
  } catch {
    // The web build follows the browser.
  }
};
applyAppearance(loadAppearance());

// A join link opened from outside (`/ABCDE`, `/party/ABCDE`) still has the tabs under its sheet.
/** A screen that throws while drawing shows a way back instead of closing the app. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <CrashScreen {...props} />;
}

export const unstable_settings = { initialRouteName: '(tabs)' };
// Connect to the App Store at launch: purchases that finish later still land, and Premium comes back on its own.
void startStore();

/** Every screen that opens as a bottom sheet: each gets a light tap as it rises and as it goes, and a tick when its detent changes. */
const SHEETS = new Set([
  'game/[id]', 'lobby-game', 'premium', 'premium-perk', 'share-card', 'table-menu', 'table-standings', 'table-theme', 'table-settings', 'range-breakdown',
  'range-how', 'hand-rankings', 'table-log', 'card-packs', 'blocked', 'your-name', 'emoji', 'join', 'party-sheet', 'how-to-play/[id]',
]);

// The root: the tab bar, and the sheets that open over it. Sheets are real iOS form sheets with detents and a
// grab handle, dismissed by a swipe down. Each tab has its own stack inside (see (tabs)/*/_layout.tsx).
/** Opened from Home's PLAY, whose card has already grown to fill the screen: the page fades in over it instead of sliding. */
function fadeAfterFill(route: { params?: object }) {
  return (route.params as { fill?: string } | undefined)?.fill ? { animation: 'fade' as const, animationDuration: 200 } : {};
}

export default function RootLayout() {
  const appearance = useAppearance();
  useEffect(() => applyAppearance(appearance), [appearance]);
  // The daily quiz reminder opens the Train tab.
  useReminderTaps((url) => router.navigate(url as never));
  const dark = useColorScheme() === 'dark';
  const reduce = useReduceMotion();
  const colors = useColors();
  const plain = usePlainColors();
  const solid = useReduceTransparency();
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
    contentStyle: { backgroundColor: GLASS_SHEETS && !solid ? 'transparent' : colors.background },
  };
  // Apple's own navigation bar on the dark pages: a large title that collapses, a blur under it once the page scrolls, "‹ Back".
  const darkPage = {
    headerShown: true,
    headerTransparent: true,
    headerLargeTitle: true,
    headerLargeTitleShadowVisible: false,
    headerBlurEffect: 'systemMaterialDark' as const,
    headerTintColor: colors.accent as string,
    headerTitleStyle: { color: '#ffffff' },
    headerLargeTitleStyle: { color: '#ffffff' },
    headerBackButtonDisplayMode: 'default' as const,
    headerBackTitle: 'Back',
    statusBarStyle: 'light' as const,
  };
  return (
    <ThemeProvider value={theme}>
      <Stack
        screenListeners={({ route }) =>
          ({
            transitionStart: () => SHEETS.has(route.name) && haptic.tap(),
            sheetDetentChange: () => haptic.select(),
          }) as never
        }
        screenOptions={{ contentStyle: { backgroundColor: colors.background }, animation: reduce ? 'fade' : 'default' }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* The table covers the tab bar and can't be swiped away mid-hand: you leave it from its menu. */}
        {/* Play with friends: its own dark grain page, over the tabs so the tab bar never covers Open table. */}
        <Stack.Screen name="play-friends" options={({ route }) => ({ headerShown: false, title: 'Play with friends', statusBarStyle: 'light', ...fadeAfterFill(route) })} />
        {/* A party's playlist, pushed from Play with friends; Save takes it back there. */}
        <Stack.Screen name="party-playlist" options={{ headerShown: false, title: 'Party playlist', statusBarStyle: 'light' }} />
        <Stack.Screen name="play-bots" options={({ route }) => ({ headerShown: false, title: 'Play with bots', statusBarStyle: 'light', ...fadeAfterFill(route) })} />
        <Stack.Screen name="table" options={{ headerShown: false, gestureEnabled: false, animation: 'fade', animationDuration: 200 }} />
        {/* Nearly full height (a gap at the top, still swipes away), so Play and How it plays show at once. */}
        <Stack.Screen name="game/[id]" options={{ ...sheet, sheetAllowedDetents: [1], title: 'Game', headerShown: false }} />
        {/* Play with friends' Change on the game card: every game in a list, Premium under a gold line. */}
        <Stack.Screen name="lobby-game" options={{ ...sheet, sheetAllowedDetents: [0.6, 1], headerShown: false, title: 'Change the game' }} />
        {/* How to Play: a story on black in a sheet at full height (a black page, so it keeps its own fill); the X closes it. */}
        <Stack.Screen name="how-to-play/[id]" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'How to play', contentStyle: { backgroundColor: '#000000' } }} />
        {/* Range training's table: its own night room over the tabs, like Play with bots, so nothing covers the answers. */}
        <Stack.Screen name="premium" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'FlipUp Premium' }} />
        {/* A perk sheet is only as tall as what it says (the games list is long, so it gets the two detents). */}
        <Stack.Screen name="premium-perk" options={({ route }) => ({ ...sheet, sheetAllowedDetents: (route.params as { id?: string } | undefined)?.id === 'games' ? [0.75, 1] : 'fitToContents', headerShown: false, title: 'Premium' })} />
        {/* Share cards, the hand bank and Replay. */}
        <Stack.Screen name="share" options={{ ...darkPage, title: 'Share' }} />
        <Stack.Screen name="share-card" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'Share card' }} />
        <Stack.Screen name="replays" options={{ ...darkPage, title: 'Saved hands' }} />
        <Stack.Screen name="replay/[id]" options={{ headerShown: false, title: 'Replay', statusBarStyle: 'light' }} />
        <Stack.Screen name="table-menu" options={{ ...sheet, title: 'Menu' }} />
        <Stack.Screen name="table-standings" options={{ ...sheet, title: 'Standings' }} />
        <Stack.Screen name="table-theme" options={{ ...sheet, title: 'Table theme' }} />
        <Stack.Screen name="table-settings" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Table settings' }} />
        {/* Range training: a set of five hands, full screen over the tabs (Back and the set's progress on top). */}
        <Stack.Screen name="range-session" options={{ headerShown: false, title: 'Range training' }} />
        {/* Range training: the full breakdown of the hand you just answered (the result card's Breakdown). */}
        <Stack.Screen name="range-breakdown" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Breakdown' }} />
        {/* Range training explained in four steps (the Train tab's How it works). */}
        <Stack.Screen name="range-how" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'How it works' }} />
        <Stack.Screen name="hand-rankings"options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Hand rankings' }} />
        <Stack.Screen name="table-log" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Hand log' }} />
        <Stack.Screen name="card-packs" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Card packs' }} />
        <Stack.Screen name="blocked" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Blocked players' }} />
        {/* Asked on top of joining or opening a table when the player has no name yet (state/ask-name.ts). */}
        <Stack.Screen name="your-name" options={{ ...sheet, sheetAllowedDetents: [1], title: 'Your name' }} />
        <Stack.Screen name="emoji" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Your emoji' }} />
        {/* Join with a code: Play's round button. The keyboard comes up as it opens; a table or party code, or a QR code. */}
        <Stack.Screen name="join" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'Join' }} />
        {/* Join links: they only pass the code on to the Join sheet. */}
        <Stack.Screen name="[code]" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="party/[code]" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="party-sheet" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Party' }} />
      </Stack>
      <RequestTimeoutPopup />
      <UndoToast />
      <LaunchCover />
      {/* Saves the game tiles as pictures in the background, so lists of games show images, not SVGs. */}
      <ThumbSnapper />
    </ThemeProvider>
  );
}
