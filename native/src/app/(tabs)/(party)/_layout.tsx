import { Stack } from 'expo-router';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useColors } from '@/theme';

export const unstable_settings = { initialRouteName: 'party' };

// The party tab's stack: a large title on its first screen, inline titles on screens pushed onto it.
export default function Layout() {
  const colors = useColors();
  const reduce = useReduceMotion();
  return <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, animation: reduce ? 'fade' : 'default', headerBackButtonDisplayMode: 'minimal' }} />;
}
