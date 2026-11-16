import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { dismissUndo, UNDO_MS, useUndoOffer } from '@/state/undo';
import { radius, spacing } from '@/theme';

import { Icon } from './icon';
import { haptic } from './haptics';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/**
 * The toast that offers to take a removal back ("Bot removed · Undo"), floating over the bottom of every screen
 * for four seconds. It goes when you tap it or its X, and the moment you move to another screen (an undo only makes
 * sense where the removal happened). It's a dark card of its own, not glass: glass flashed white as it appeared
 * over the dark pages. It rises in with `enter()` and leaves quicker (rule 15); under Reduce Motion it fades. It stays
 * out of the way of touches except its own button, and VoiceOver reads it as an alert.
 */
export function UndoToast() {
  const offer = useUndoOffer();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const id = offer?.id;
  // A new screen (a sheet, a page, a tab) ends the offer.
  const path = usePathname();
  useEffect(() => dismissUndo(), [path]);
  useEffect(() => {
    if (id === undefined) return;
    const t = setTimeout(() => dismissUndo(id), UNDO_MS);
    return () => clearTimeout(t);
  }, [id]);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 84, alignItems: 'center', paddingHorizontal: spacing.md, zIndex: 50 }}>
      {offer && (
        <Animated.View key={offer.id} entering={enter(reduce)} exiting={exit(reduce)} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <View style={{ borderRadius: radius.full, borderCurve: 'continuous', backgroundColor: '#1c2036', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, minHeight: 48 }}>
              <PressableScale accessibilityRole="button" accessibilityLabel={`${offer.message}. Dismiss`} onPress={() => (haptic.tap(), dismissUndo(offer.id))}>
                <ThemedText variant="subhead" style={{ fontWeight: '600', color: '#ffffff', marginRight: spacing.md }} numberOfLines={1}>
                  {offer.message}
                </ThemedText>
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Undo: ${offer.message}`}
                onPress={() => {
                  haptic.tap();
                  offer.undo();
                  dismissUndo(offer.id);
                }}
                style={{ minHeight: 44, minWidth: 44, paddingHorizontal: spacing.xs, alignItems: 'center', justifyContent: 'center' }}
              >
                <ThemedText variant="headline" style={{ color: '#6f9bff' }}>
                  Undo
                </ThemedText>
              </PressableScale>
              <PressableScale accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={6} onPress={() => (haptic.tap(), dismissUndo(offer.id))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="xmark" size={13} color="rgba(255,255,255,0.7)" />
              </PressableScale>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
