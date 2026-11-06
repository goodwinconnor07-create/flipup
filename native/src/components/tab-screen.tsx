import { BlurView } from 'expo-blur';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { Platform, useColorScheme, View, type ScrollView, type ScrollViewProps } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useScheme } from '@/theme';

import { GlassSurface } from './glass-surface';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/**
 * A tab's first screen, the way Flighty draws its own: no navigation bar, the title big in SF Pro Rounded with round
 * buttons on the same line, all scrolling with the page. Once the page scrolls, a blur fades in under the status bar
 * so nothing reads through the clock. The screen hides the stack's header itself (`headerShown: false`).
 */
export function TabScreen({ title, accessory, children, contentStyle, scrollRef, ...scroll }: { title: string; accessory?: ReactNode; children: ReactNode; contentStyle?: ScrollViewProps['contentContainerStyle']; /** To scroll the page from outside (Range training's Next hand goes back to the top). */ scrollRef?: RefObject<ComponentRef<typeof ScrollView> | null> } & Omit<ScrollViewProps, 'contentContainerStyle' | 'children'>) {
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === 'dark';
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });
  const veil = useAnimatedStyle(() => ({ opacity: interpolate(y.get(), [0, 24], [0, 1], 'clamp') }));
  // iOS adds the status bar's height to a scroll view on its own (automatic insets); the web build doesn't.
  const top = Platform.OS === 'ios' ? 0 : insets.top;
  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        {...scroll}
        ref={scrollRef as never}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[{ paddingTop: top + spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xl, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center' }, contentStyle]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52 }}>
          <ThemedText variant="largeTitle" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </ThemedText>
          {accessory}
        </View>
        {children}
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top }, veil]}>
        <BlurView tint={dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} intensity={80} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

/** A round button in a tab's title row (Flighty's share and "…" buttons): glass, 44pt, one SF Symbol. */
export function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }}>
      <GlassSurface interactive style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 22 }}>
        <IconInk name={icon} />
      </GlassSurface>
    </PressableScale>
  );
}

function IconInk({ name }: { name: IconName }) {
  const dark = useScheme() === 'dark';
  return <Icon name={name} size={19} color={dark ? '#ffffff' : '#000000'} />;
}
