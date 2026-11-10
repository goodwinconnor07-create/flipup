import { Stack } from 'expo-router';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useColors } from '@/theme';

export const unstable_settings = { initialRouteName: 'stats' };

// The stats tab's stack: its first screen draws its own large title, like the other tabs.
export default function Layout() {
  const colors = useColors();
  const reduce = useReduceMotion();
  return <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, animation: reduce ? 'fade' : 'default', headerBackButtonDisplayMode: 'default', headerBackTitle: 'Back' }} />;
}
