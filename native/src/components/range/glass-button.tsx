// A button made of glass: the page shows blurred through it, tinted with the button's colour, with a thin light edge,
// so a bar of them pinned to the bottom reads as floating over the content. The blur is a system blur on iPhone.
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { radius, spacing } from '@/theme';

export function GlassButton({ tint, label, onPress, children, minHeight = 52 }: { tint: string; label: string; onPress: () => void; children: ReactNode; minHeight?: number }) {
  const dark = useColorScheme() === 'dark';
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} outerStyle={{ width: '100%' }} style={{ width: '100%' }}>
      <View style={{ minHeight, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.28)' }}>
        <BlurView tint={dark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'} intensity={55} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tint }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
        <View style={{ minHeight, paddingHorizontal: spacing.xs, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </View>
    </PressableScale>
  );
}
