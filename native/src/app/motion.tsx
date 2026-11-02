import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/button';
import { GlassSurface } from '@/components/glass-surface';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { Row, Section } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { radius, spacing, useColors } from '@/theme';

// Phase 4: a pushed screen (inline title, swipe back from the left edge) to feel the motion rules on a phone.

type Toast = { id: number; ok: boolean };

export default function MotionScreen() {
  const colors = useColors();
  const reduce = useReduceMotion();
  const [toast, setToast] = useState<Toast | null>(null);

  // A toast stays two seconds, then leaves.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const show = (ok: boolean) => {
    if (ok) haptic.success();
    else haptic.failure();
    setToast({ id: Date.now(), ok });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, gap: spacing.xxl }}>
        <Section header="Reduce Motion" footer="Follows Settings › Accessibility › Motion live. When it's on, nothing scales or slides: presses only dim, toasts and screens fade.">
          <Row title="Reduce Motion" detail={reduce ? 'On' : 'Off'} />
        </Section>

        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="headline">Haptics</ThemedText>
          <ThemedText variant="subhead" tone="tertiaryLabel">
            A light tap on every button, a tick when a choice changes, and these two for an outcome. Each comes with something to see.
          </ThemedText>
          <Button variant="primary" title="Success" onPress={() => show(true)} />
          <Button variant="destructive" title="Failure" onPress={() => show(false)} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="headline">Press feedback</ThemedText>
          <ThemedText variant="subhead" tone="tertiaryLabel">
            Hold one down: it dips to 97% and dims in 80ms. Let go and it springs back. Press again mid-spring and it picks up from there.
          </ThemedText>
          <Button variant="party" tint="pink" size="lg" title="Press and hold" />
        </View>
      </ScrollView>

      {toast && (
        <Animated.View key={toast.id} entering={enter(reduce)} exiting={exit(reduce)} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: spacing.xxxl, alignItems: 'center' }}>
          <GlassSurface style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }}>
            <Icon name={toast.ok ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={20} color={toast.ok ? colors.green : colors.red} />
            <ThemedText variant="headline">{toast.ok ? 'Done' : "That didn't work"}</ThemedText>
          </GlassSurface>
        </Animated.View>
      )}
    </View>
  );
}
