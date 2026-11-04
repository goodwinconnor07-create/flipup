import { router } from 'expo-router';
import { View } from 'react-native';

import { ROUNDED, spacing } from '@/theme';

import { RoundButton } from '../tab-screen';
import { ThemedText } from '../themed-text';

/**
 * The page's own header on the dark grain pages: a round glass back button, then the title big and white in SF Pro
 * Rounded with a line under it. No navigation bar, so nothing paints over the grain.
 */
export function SetupHeader({ title, line }: { title: string; line?: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row' }}>
        <RoundButton icon="chevron.left" label="Back" onPress={() => router.back()} />
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
export function SetupRowTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
      <ThemedText variant="title3" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '700' }}>
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
