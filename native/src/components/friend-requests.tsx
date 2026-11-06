// Friend requests waiting for you: the rows (their face, name and username, Deny and Accept) used by the Friends
// tab's "Incoming Friend Requests" section and the `friend-requests` sheet, and the red count pill that opens it.
import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { FriendRequest } from '@/engine';

import { exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { answerRequest, useFriendBox } from '@/state/pals';
import { radius, spacing, useColors, useShadows } from '@/theme';

import { Avatar } from './avatar';
import { haptic } from './haptics';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/** Every request waiting, one row each, in a grouped box. Nothing at all when there are none. */
export function RequestList({ requests }: { requests: FriendRequest[] }) {
  const colors = useColors();
  const shadows = useShadows();
  if (!requests.length) return null;
  return (
    <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card }}>
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.cell }}>
        {requests.map((r, i) => (
          <RequestRow key={r.from} request={r} first={i === 0} />
        ))}
      </View>
    </View>
  );
}

/**
 * One request: who's asking, then Deny and Accept. Answered, the row fades out at once and the list closes up (no
 * spinner: `answerRequest()` updates the lists first and puts the request back if the server says no).
 */
function RequestRow({ request, first }: { request: FriendRequest; first: boolean }) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const go = (yes: boolean) => {
    haptic[yes ? 'success' : 'tap']();
    answerRequest(request.from, yes).catch(() => Alert.alert("Couldn't answer", 'Check your connection and try again.'));
  };
  return (
    <Animated.View exiting={exit(reduce)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 76, paddingHorizontal: spacing.md }}>
      <Avatar emoji={request.emoji} size={48} />
      <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: first ? 0 : 0.5, borderTopColor: colors.separator }}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="headline" numberOfLines={1}>
            {request.name}
          </ThemedText>
          <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
            {request.username ? `@${request.username}` : 'Wants to be friends'}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <PressableScale
            haptics={false}
            accessibilityRole="button"
            accessibilityLabel={`Deny ${request.name}`}
            onPress={() => go(false)}
            style={{ minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cellPressed }}
          >
            <ThemedText variant="subhead" tone="secondaryLabel" style={{ fontWeight: '600' }}>
              Deny
            </ThemedText>
          </PressableScale>
          <PressableScale
            haptics={false}
            accessibilityRole="button"
            accessibilityLabel={`Accept ${request.name}`}
            onPress={() => go(true)}
            style={{ minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}
          >
            <ThemedText variant="subhead" tone="onColor" style={{ fontWeight: '700' }}>
              Accept
            </ThemedText>
          </PressableScale>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * The red pill with how many friend requests are waiting ("1", "2"…), for a tab's title row. A tap opens the
 * small sheet to accept or deny them. Nothing at zero.
 */
export function RequestsPill() {
  const colors = useColors();
  const reduce = useReduceMotion();
  const count = useFriendBox().requests.length;
  if (!count) return null;
  return (
    <Animated.View exiting={exit(reduce)}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${count} friend ${count === 1 ? 'request' : 'requests'}`}
        accessibilityHint="Opens them to accept or deny"
        onPress={() => router.push('/friend-requests')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 32, paddingHorizontal: spacing.sm + 2, borderRadius: radius.full, backgroundColor: colors.red }}
      >
        <Icon name="person.fill" size={13} color="#ffffff" />
        <ThemedText variant="subhead" tone="onColor" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {count > 99 ? '99+' : String(count)}
        </ThemedText>
      </PressableScale>
    </Animated.View>
  );
}
