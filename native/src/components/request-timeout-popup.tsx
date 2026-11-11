import { Modal, View } from 'react-native';

import { dismissRequestTimeout, useRequestTimedOut } from '@/state/request-timeout';
import { radius, spacing, useColors } from '@/theme';

import { Button } from './button';
import { haptic } from './haptics';
import { Icon } from './icon';
import { ThemedText } from './themed-text';

/**
 * The way out of a request that never came back (30 seconds): a small card with a symbol on top, a friendly line
 * and Cancel. A backup, so an error that would leave a spinner for ever never traps anyone.
 */
export function RequestTimeoutPopup() {
  const colors = useColors();
  const open = useRequestTimedOut();
  const cancel = () => {
    haptic.tap();
    dismissRequestTimeout();
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={cancel}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <View
          accessibilityRole="alert"
          style={{ width: '100%', maxWidth: 320, alignItems: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.cell }}
        >
          <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
            <Icon name="wifi.slash" size={28} color={colors.secondaryLabel} />
          </View>
          <ThemedText variant="title3" style={{ textAlign: 'center' }}>
            That's taking a while
          </ThemedText>
          <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center' }}>
            We couldn't get an answer. Check your connection and try again in a moment.
          </ThemedText>
          <Button title="Cancel" variant="secondary" onPress={cancel} />
        </View>
      </View>
    </Modal>
  );
}
