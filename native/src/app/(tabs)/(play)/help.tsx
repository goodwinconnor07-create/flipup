import { Stack } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MENU_RADIUS, useMenuColors } from '@/components/menu-list';
import { haptic } from '@/components/haptics';
import { PressableScale } from '@/components/pressable-scale';
import { SwapIcon } from '@/components/swap';
import { ThemedText } from '@/components/themed-text';
import { HELP, type HelpItem } from '@/data/help';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { EASE_OUT } from '@/motion/presets';
import { motion, spacing, useColors } from '@/theme';

import { APP_INFO } from '../../../../appInfo';

/**
 * Settings > Help: the questions people ask most, in groups. A tap opens an answer under its question (one open at a
 * time in a group). Still stuck? There's the support page and the support email at the bottom.
 */
export default function HelpScreen() {
  const menu = useMenuColors();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: menu.page }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
      <Stack.Screen options={{ title: 'Help' }} />
      {HELP.map((section) => (
        <View key={section.id} style={{ gap: spacing.xs }}>
          <ThemedText variant="subhead" tone="secondaryLabel" accessibilityRole="header" style={{ paddingHorizontal: spacing.md }}>
            {section.title}
          </ThemedText>
          <Group items={section.items} fill={menu.fill} separator={menu.hairline} />
        </View>
      ))}

      <View style={{ gap: spacing.xs, padding: spacing.md, borderRadius: MENU_RADIUS, borderCurve: 'continuous', backgroundColor: menu.fill }}>
        <ThemedText variant="headline">Still stuck?</ThemedText>
        <ThemedText variant="subhead" tone="secondaryLabel">
          Email us and we’ll help. Tell us your iPhone model and the version at the bottom of Settings.
        </ThemedText>
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            haptic.tap();
            void Linking.openURL(`mailto:${APP_INFO.supportEmail}?subject=${encodeURIComponent('FlipUp help')}`);
          }}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <ThemedText variant="body" tone="accent" style={{ fontWeight: '700' }}>
            {APP_INFO.supportEmail}
          </ThemedText>
        </PressableScale>
      </View>
    </ScrollView>
  );
}

/** One group's questions on a single panel. */
function Group({ items, fill, separator }: { items: HelpItem[]; fill: string; separator: string }) {
  const colors = useColors();
  const [open, setOpen] = useState<number | null>(null);
  const reduce = useReduceMotion();
  return (
    <View style={{ borderRadius: MENU_RADIUS, borderCurve: 'continuous', backgroundColor: fill, overflow: 'hidden' }}>
      {items.map((it, i) => {
        const on = open === i;
        return (
          <View key={it.q}>
            {i > 0 && <View style={{ height: 0.5, marginLeft: spacing.md, backgroundColor: separator }} />}
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ expanded: on }}
              accessibilityLabel={it.q}
              haptics={false}
              onPress={() => {
                haptic.select();
                setOpen(on ? null : i);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 52 }}
            >
              <ThemedText variant="body" style={{ flex: 1 }}>
                {it.q}
              </ThemedText>
              <SwapIcon name={on ? 'minus' : 'plus'} size={16} color={colors.secondaryLabel} />
            </PressableScale>
            {on && (
              <Animated.View entering={reduce ? undefined : FadeIn.duration(motion.base).easing(EASE_OUT)} style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
                <ThemedText variant="body" tone="secondaryLabel">
                  {it.a}
                </ThemedText>
              </Animated.View>
            )}
          </View>
        );
      })}
    </View>
  );
}
