import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { radius, spacing, useColors } from '@/theme';

/** How long a connection has to stay down before the table says so in words: a brief drop is the Reconnecting pill's job. */
export const LOST_AFTER_MS = 20_000;

/** True once `offline` has been true for `ms` without a break. */
export function useOfflineFor(offline: boolean, ms: number = LOST_AFTER_MS): boolean {
  const [long, setLong] = useState(false);
  useEffect(() => {
    if (!offline) return;
    const t = setTimeout(() => setLong(true), ms);
    return () => {
      clearTimeout(t);
      setLong(false);
    };
  }, [offline, ms]);
  return long;
}

/**
 * A connection that has stayed down, in plain words with a way out (the owner approved this in the 9 Nov ideas).
 * `page` fills the screen when there is no table to show yet; `card` sits under the bar over a table you're at,
 * where your seat and chips are kept while we reconnect.
 */
export function ConnectionLost({ variant, onRetry, onLeave }: { variant: 'page' | 'card'; onRetry: () => void; onLeave: () => void }) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const page = variant === 'page';
  const body = page ? "Check your signal. We'll keep trying while you wait." : "Your seat and chips stay at the table. We'll keep trying.";
  const retry = () => {
    haptic.tap();
    onRetry();
  };
  return (
    <Animated.View
      entering={enter(reduce)}
      exiting={exit(reduce)}
      accessibilityRole="alert"
      style={
        page
          ? { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl }
          : { marginHorizontal: spacing.md, marginTop: spacing.sm, padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }
      }
    >
      <View style={{ flexDirection: page ? 'column' : 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: page ? 84 : 36, height: page ? 84 : 36, borderRadius: 42, borderWidth: 2, borderColor: colors.separator, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="wifi.slash" size={page ? 34 : 18} color={colors.secondaryLabel} />
        </View>
        <View style={{ flex: page ? undefined : 1, alignItems: page ? 'center' : 'flex-start', gap: 2 }}>
          <ThemedText variant={page ? 'title2' : 'headline'} style={{ textAlign: page ? 'center' : 'left' }}>
            Still can&apos;t reach the table
          </ThemedText>
          <ThemedText variant={page ? 'body' : 'subhead'} tone="secondaryLabel" style={{ textAlign: page ? 'center' : 'left' }}>
            {body}
          </ThemedText>
        </View>
      </View>
      <View style={{ alignSelf: 'stretch', gap: spacing.xs, marginTop: page ? spacing.md : 0, flexDirection: page ? 'column' : 'row' }}>
        <Button title="Try again" onPress={retry} style={page ? undefined : { flex: 1 }} />
        <Button title="Leave table" variant="destructive" onPress={onLeave} style={page ? undefined : { flex: 1 }} />
      </View>
    </Animated.View>
  );
}
