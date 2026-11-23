import { Stack } from 'expo-router';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useColors } from '@/theme';

export const unstable_settings = { initialRouteName: 'profile' };

// The You tab's stack (23 Nov 2026, the owner's ask): your profile first, with your stats, Saved hands, Share cards,
// Premium, Demos and Settings; Stats, Settings, Help and What's New push onto it. The same iOS "‹ Back" as the others.
export default function Layout() {
  const colors = useColors();
  const reduce = useReduceMotion();
  return <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, animation: reduce ? 'fade' : 'default', headerBackButtonDisplayMode: 'default', headerBackTitle: 'Back' }} />;
}
