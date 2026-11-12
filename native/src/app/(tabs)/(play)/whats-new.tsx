import { Stack } from 'expo-router';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { ScrollView, View } from 'react-native';

import { PANEL_RADIUS, usePanel } from '@/components/grouped-list';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { RELEASES } from '@/data/whats-new';
import { spacing, useColors } from '@/theme';

/**
 * Settings > What's New: the version this phone is running, then what's new in each release, newest first.
 * The text lives in `data/whats-new.ts`; the App Store release notes use the same lines.
 */
export default function WhatsNewScreen() {
  const colors = useColors();
  const panel = usePanel();
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';
  const build = Application.nativeBuildVersion;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xl }}>
      <Stack.Screen options={{ title: 'What’s New' }} />
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="subhead" tone="secondaryLabel">
          You’re running
        </ThemedText>
        <ThemedText variant="title2" selectable>
          FlipUp {version}
          {build ? ` (${build})` : ''}
        </ThemedText>
      </View>

      {RELEASES.map((release, index) => (
        <View key={release.version} style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, paddingHorizontal: spacing.xs }}>
            <ThemedText variant="title3" accessibilityRole="header">
              Version {release.version}
            </ThemedText>
            <ThemedText variant="footnote" tone="secondaryLabel">
              {index === 0 ? `Latest · ${release.label}` : release.label}
            </ThemedText>
          </View>
          <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge, overflow: 'hidden' }}>
            {release.items.map((item, i) => (
              <View key={item.title}>
                {i > 0 && <View style={{ height: 0.5, marginLeft: spacing.md + 28 + spacing.sm, backgroundColor: colors.separator as string }} />}
                <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md }}>
                  <View style={{ width: 28, alignItems: 'center', paddingTop: 2 }}>
                    <Icon name={item.icon} size={22} color={colors.accent as string} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText variant="body" style={{ fontWeight: '700' }}>
                      {item.title}
                    </ThemedText>
                    <ThemedText variant="subhead" tone="secondaryLabel">
                      {item.text}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
