import { Stack } from 'expo-router';

// Phase 0 shell: one native stack. The real screens come in Phase 5, after the design system (Phase 3).
export default function RootLayout() {
  return <Stack screenOptions={{ headerLargeTitle: true }} />;
}
