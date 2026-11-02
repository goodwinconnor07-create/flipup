import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useColors, usePlainColors } from '@/theme';

// The app's one native stack: pushes slide from the right with swipe-back from the left edge, and sheets are
// real iOS sheets with detents. Root screens use large titles; pushed screens use inline titles.
export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const colors = useColors();
  const plain = usePlainColors();
  // The navigation chrome (header, its title and hairline) takes the same tokens as the screens.
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: plain.accent, background: plain.background, card: plain.background, text: plain.label, border: plain.separator },
  };
  return (
    <ThemeProvider value={theme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" options={{ title: 'Design system', headerLargeTitleEnabled: true }} />
        <Stack.Screen
          name="sample-sheet"
          options={{
            title: 'A sheet',
            presentation: 'formSheet',
            sheetAllowedDetents: [0.5, 1],
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
