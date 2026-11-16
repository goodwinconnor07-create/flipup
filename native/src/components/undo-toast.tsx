import { useEffect } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { dismissUndo, UNDO_MS, useUndoOffer } from '@/state/undo';
import { radius, spacing, useScreenReader } from '@/theme';

import { GlassSurface } from './glass-surface';
import { haptic } from './haptics';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';
import { useAnnounce } from './announce';

/**
 * The toast that offers to take a removal back ("Bot removed · Undo"), floating over the bottom of every screen
 * for five seconds. It rises in with `enter()` and leaves quicker (rule 15); under Reduce Motion it fades. It stays
 * out of the way of touches except its own button, and VoiceOver reads it as an alert.
 */
export function UndoToast() {
  const offer = useUndoOffer();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const id = offer?.id;
  // VoiceOver takes longer to reach the button than five seconds, so the toast waits four times as long for it.
  const reader = useScreenReader();
  useAnnounce(offer ? `${offer.message}. Undo is at the bottom of the screen.` : null, id);
  useEffect(() => {
    if (id === undefined) return;
    const t = setTimeout(() => dismissUndo(id), reader ? UNDO_MS * 4 : UNDO_MS);
    return () => clearTimeout(t);
  }, [id, reader]);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 84, alignItems: 'center', paddingHorizontal: spacing.md, zIndex: 50 }}>
      {offer && (
        <Animated.View key={offer.id} entering={enter(reduce)} exiting={exit(reduce)} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <GlassSurface style={{ borderRadius: radius.full, borderCurve: 'continuous', overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.md, paddingRight: spacing.xs, minHeight: 48 }}>
              <ThemedText variant="subhead" style={{ fontWeight: '600' }} numberOfLines={1}>
                {offer.message}
              </ThemedText>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Undo: ${offer.message}`}
                onPress={() => {
                  haptic.tap();
                  offer.undo();
                  dismissUndo(offer.id);
                }}
                style={{ minHeight: 44, minWidth: 44, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' }}
              >
                <ThemedText variant="headline" tone="accent">
                  Undo
                </ThemedText>
              </PressableScale>
            </View>
          </GlassSurface>
        </Animated.View>
      )}
    </View>
  );
}
