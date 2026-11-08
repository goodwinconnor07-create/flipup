import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ROUNDED, spacing } from '@/theme';

import { Pressable, Text } from 'react-native';

import { Icon } from '../icon';
import { useColors } from '@/theme';
import { ThemedText } from '../themed-text';

/**
 * The page's own header on the dark grain pages: Apple's "‹ Back", then the title big and white in SF Pro
 * Rounded with a line under it. No navigation bar, so nothing paints over the grain.
 */
export function SetupHeader({ title, line }: { title: string; line?: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row' }}>
        <BackText />
      </View>
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="largeTitle" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          {title}
        </ThemedText>
        {line && (
          <ThemedText variant="callout" tone="secondaryLabel">
            {line}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

/** A small heading over one of the page's rows, white on the grain. */
export function SetupRowTitle({ title, detail, big }: { title: string; detail?: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
      <ThemedText variant={big ? 'title2' : 'title3'} accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: big ? '800' : '700' }}>
        {title}
      </ThemedText>
      {detail && (
        <ThemedText variant="subhead" tone="secondaryLabel" numberOfLines={1} style={{ flexShrink: 1 }}>
          {detail}
        </ThemedText>
      )}
    </View>
  );
}

/** Apple's own back control, drawn for pages with no navigation bar: a chevron and "Back" in the accent blue. */
export function BackText({ onPress = () => router.back() }: { onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, marginLeft: -6, opacity: pressed ? 0.35 : 1 })}
    >
      <Icon name="chevron.left" size={22} weight="semibold" color={colors.accent as string} />
      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 17, color: colors.accent as string }}>
        Back
      </Text>
    </Pressable>
  );
}

/** A page's top row with no navigation bar: "‹ Back" on the left and the title in the middle, as iOS draws it. */
export function NavRow({ title, left }: { title: string; left?: ReactNode }) {
  return (
    <View style={{ height: 44, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
        <ThemedText variant="headline" accessibilityRole="header">
          {title}
        </ThemedText>
      </View>
      {left ?? <BackText />}
    </View>
  );
}
