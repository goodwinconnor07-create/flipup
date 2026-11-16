import { Stack } from 'expo-router';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { ScrollView, View } from 'react-native';

import { MENU_RADIUS, useMenuColors } from '@/components/menu-list';
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
  const menu = useMenuColors();
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';
  const build = Application.nativeBuildVersion;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: menu.page }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
      <Stack.Screen options={{ title: 'What’s New' }} />
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="subhead" tone="secondaryLabel" style={{ paddingHorizontal: spacing.md }}>
          You’re running
        </ThemedText>
        <View style={{ borderRadius: MENU_RADIUS, borderCurve: 'continuous', backgroundColor: menu.fill, paddingHorizontal: spacing.md, minHeight: 56, justifyContent: 'center' }}>
          <ThemedText variant="body" selectable>
            FlipUp {version}
            {build ? ` (${build})` : ''}
          </ThemedText>
        </View>
      </View>

      {RELEASES.map((release, index) => (
        <View key={release.version} style={{ gap: spacing.xs }}>
          <ThemedText variant="subhead" tone="secondaryLabel" accessibilityRole="header" style={{ paddingHorizontal: spacing.md }}>
            Version {release.version} · {index === 0 ? `Latest · ${release.label}` : release.label}
          </ThemedText>
          <View style={{ borderRadius: MENU_RADIUS, borderCurve: 'continuous', backgroundColor: menu.fill, overflow: 'hidden' }}>
            {release.items.map((item, i) => (
              <View key={item.title}>
                {i > 0 && <View style={{ height: 0.5, marginLeft: spacing.md + 28 + spacing.sm, backgroundColor: menu.hairline }} />}
                <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md }}>
                  <View style={{ width: 28, alignItems: 'center', paddingTop: 2 }}>
                    <Icon name={item.icon} size={22} color={colors.accent as string} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText variant="body">
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
