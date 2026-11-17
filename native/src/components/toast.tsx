import { useEffect } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { dismissToast, TOAST_MS, useToast } from '@/state/toast';
import { radius, spacing, useScreenReader } from '@/theme';

import { useAnnounce } from './announce';
import { haptic } from './haptics';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/**
 * Says what went wrong, in a sentence, without stopping the person: the same dark card as the undo toast, over the
 * bottom of every screen for five seconds (four times that with VoiceOver, which reads it as an alert). A tap closes
 * it. Rises in with `enter()`, leaves quicker; under Reduce Motion it fades.
 */
export function Toast() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const reader = useScreenReader();
  const id = toast?.id;
  useAnnounce(toast?.text ?? null, id);
  useEffect(() => {
    if (id === undefined) return;
    const t = setTimeout(() => dismissToast(id), reader ? TOAST_MS * 4 : TOAST_MS);
    return () => clearTimeout(t);
  }, [id, reader]);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 84, alignItems: 'center', paddingHorizontal: spacing.md, zIndex: 60 }}>
      {toast && (
        <Animated.View key={toast.id} entering={enter(reduce)} exiting={exit(reduce)} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${toast.text} Dismiss`}
            onPress={() => (haptic.tap(), dismissToast(toast.id))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: 420, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 48, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: '#1c2036', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
          >
            <Icon name="exclamationmark.triangle.fill" size={16} color="#ffd166" />
            <ThemedText variant="subhead" style={{ flexShrink: 1, fontWeight: '600', color: '#ffffff' }}>
              {toast.text}
            </ThemedText>
          </PressableScale>
        </Animated.View>
      )}
    </View>
  );
}
