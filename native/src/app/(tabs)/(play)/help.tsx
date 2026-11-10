import { Stack } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PANEL_RADIUS, usePanel } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
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
  const colors = useColors();
  const panel = usePanel();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xl }}>
      <Stack.Screen options={{ title: 'Help' }} />
      {HELP.map((section) => (
        <View key={section.id} style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs }}>
            <Icon name={section.icon} size={18} color={colors.accent as string} />
            <ThemedText variant="title3" accessibilityRole="header">
              {section.title}
            </ThemedText>
          </View>
          <Group items={section.items} fill={panel.fill} edge={panel.edge} separator={colors.separator as string} />
        </View>
      ))}

      <View style={{ gap: spacing.xs, padding: spacing.md, borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: panel.fill, borderWidth: 1, borderColor: panel.edge }}>
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
function Group({ items, fill, edge, separator }: { items: HelpItem[]; fill: string; edge: string; separator: string }) {
  const colors = useColors();
  const [open, setOpen] = useState<number | null>(null);
  const reduce = useReduceMotion();
  return (
    <View style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: fill, borderWidth: 1, borderColor: edge, overflow: 'hidden' }}>
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
              <ThemedText variant="body" style={{ flex: 1, fontWeight: '600' }}>
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
