import '@/polyfills';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { InviteBanner } from '@/components/invite-banner';
import { LaunchCover } from '@/components/launch-cover';
import { ThumbSnapper } from '@/components/thumb-snaps';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useFriendWatch } from '@/state/pals';
import { FRIENDS_ON } from '@/scope';
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

// A join link opened from outside (`/ABCDE`, `/party/ABCDE`) still has the tabs under its sheet.
export const unstable_settings = { initialRouteName: '(tabs)' };
// Connect to the App Store at launch: purchases that finish later still land, and Premium comes back on its own.
void startStore();

// The root: the tab bar, and the sheets that open over it. Sheets are real iOS form sheets with detents and a
// grab handle, dismissed by a swipe down. Each tab has its own stack inside (see (tabs)/*/_layout.tsx).
/**
 * Friends, requests and table invites stay fresh on every screen, so an invite's banner moves on wherever you are.
 * Only while friends are on (scope.ts).
 */
function FriendWatch() {
  useFriendWatch();
  return <InviteBanner />;
}

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
        {/* Play with friends: its own dark grain page, over the tabs so the tab bar never covers Open table. */}
        <Stack.Screen name="play-friends" options={{ headerShown: false, title: 'Play with friends', statusBarStyle: 'light' }} />
        {/* A party's playlist, pushed from Play with friends; Save takes it back there. */}
        <Stack.Screen name="party-playlist" options={{ headerShown: false, title: 'Party playlist', statusBarStyle: 'light' }} />
        <Stack.Screen name="play-bots" options={{ headerShown: false, title: 'Play with bots', statusBarStyle: 'light' }} />
        <Stack.Screen name="table" options={{ headerShown: false, gestureEnabled: false, animation: 'fade', animationDuration: 200 }} />
        {/* The fade is short because the table's own DealWipe does the moving. */}
        {/* Nearly full height (a gap at the top, still swipes away), so Play and How it plays show at once. */}
        <Stack.Screen name="game/[id]" options={{ ...sheet, sheetAllowedDetents: [1], title: 'Game', headerShown: false }} />
        {/* Play with friends: a game's popup with Select and Close. */}
        <Stack.Screen name="setup-game/[id]" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'Game' }} />
        {/* Play with friends' Change on the game card: every game in a list, Premium under a gold line. */}
        <Stack.Screen name="lobby-game" options={{ ...sheet, sheetAllowedDetents: [0.6, 1], headerShown: false, title: 'Change the game' }} />
        {/* How to Play: a story on black, full screen so its bars sit at the top edge; the X closes it. */}
        <Stack.Screen name="how-to-play/[id]" options={{ presentation: 'fullScreenModal', animation: reduce ? 'fade' : 'slide_from_bottom', headerShown: false, title: 'How to play', contentStyle: { backgroundColor: '#000000' } }} />
        {/* Challenges: the start sheet, a seat's tag, Detective's check, and Rewind's two sheets. */}
        <Stack.Screen name="challenge/[id]" options={{ ...sheet, sheetAllowedDetents: [1], title: 'Challenge', headerShown: false }} />
        {/* Range training's table: its own night room over the tabs, like Play with bots, so nothing covers the answers. */}
        <Stack.Screen name="challenge-tag" options={{ ...sheet, sheetAllowedDetents: [0.6, 1], title: 'Tag a style' }} />
        <Stack.Screen name="challenge-check" options={{ ...sheet, sheetAllowedDetents: [1], gestureEnabled: false, headerShown: false, title: 'Read the table' }} />
        <Stack.Screen name="rewind" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Rewind' }} />
        <Stack.Screen name="rewind-result" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'What happened' }} />
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
        {/* Asked on top of joining or opening a table when the player has no name yet (state/ask-name.ts). */}
        <Stack.Screen name="your-name" options={{ ...sheet, sheetAllowedDetents: [1], title: 'Your name' }} />
        <Stack.Screen name="emoji" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Your emoji' }} />
        <Stack.Screen name="username" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'Username' }} />
        <Stack.Screen name="friend/[code]" options={{ ...sheet, sheetAllowedDetents: [0.7, 1], title: 'Friend' }} />
        <Stack.Screen name="friend-requests" options={{ ...sheet, sheetAllowedDetents: [0.5, 1], title: 'Friend requests' }} />
        <Stack.Screen name="invite-contacts" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Invite friends' }} />
        <Stack.Screen name="add-friend" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'Add a friend' }} />
        {/* Join with a code: Play's round button. The keyboard comes up as it opens; a table or party code, or a QR code. */}
        <Stack.Screen name="join" options={{ ...sheet, sheetAllowedDetents: [1], headerShown: false, title: 'Join' }} />
        {/* Join links: they only pass the code on to the Join sheet. */}
        <Stack.Screen name="[code]" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="party/[code]" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="party-sheet" options={{ ...sheet, sheetAllowedDetents: [0.75, 1], title: 'Party' }} />
      </Stack>
      {/* A friend's table invite drops in over any screen. */}
      {FRIENDS_ON && <FriendWatch />}
      <LaunchCover />
      {/* Saves the game tiles as pictures in the background, so lists of games show images, not SVGs. */}
      <ThumbSnapper />
    </ThemeProvider>
  );
}
