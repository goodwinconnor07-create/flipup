import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PartyRow } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { BLOCKED_EMOJI, BLOCKED_NAME, memberKey, useBlocked } from '@/state/blocks';
import { FRIENDS_ON } from '@/scope';
import { sendFriendRequest, usePals } from '@/state/pals';
import { radius, spacing, usePlainColors } from '@/theme';

import { Avatar } from '../avatar';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { openPlayerMenu } from '../player-menu';

/** One row's height plus the gap under it, as on the web (56 + 4). */
const ROW = 60;
/** The web's `.board-row` transition: 0.7s on cubic-bezier(0.2, 0.9, 0.3, 1). */
const SLIDE = { duration: 700, easing: Easing.bezier(0.2, 0.9, 0.3, 1) };

/**
 * The party leaderboard. Rows are drawn in a fixed order and placed by rank, so when the ranking changes each row
 * slides to its new place instead of the list jumping.
 */
export function PartyBoard({ rows: raw, you, running, code }: { rows: PartyRow[]; you: string | null; running: boolean; code?: string }) {
  const pals = usePals();
  // A blocked member's name and picture are hidden here too.
  const blocked = new Set(useBlocked().map((b) => b.key));
  const rows = raw.map((r) => (blocked.has(memberKey(r.id)) ? { ...r, name: BLOCKED_NAME, emoji: BLOCKED_EMOJI, friendCode: undefined } : r));
  const stable = [...rows].sort((a, b) => (a.id < b.id ? -1 : 1));
  return (
    <View accessibilityRole="list" accessibilityLabel="Leaderboard" style={{ height: rows.length * ROW - 4 }}>
      {stable.map((r) => (
        <BoardRow key={r.id} row={r} me={r.id === you} running={running} canAdd={r.id !== you && !!r.friendCode && !pals.some((p) => p.code === r.friendCode)} code={code} />
      ))}
    </View>
  );
}

function BoardRow({ row: r, me, running, canAdd, code }: { row: PartyRow; me: boolean; running: boolean; canAdd: boolean; code?: string }) {
  const c = usePlainColors();
  const reduce = useReduceMotion();
  const target = (r.rank - 1) * ROW;
  const y = useSharedValue(target);
  useEffect(() => {
    y.set(reduce ? target : withTiming(target, SLIDE));
  }, [target, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const place = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const line = r.stack !== null ? (r.out ? 'Out' : `${r.stack.toLocaleString('en-US')} chips`) : r.points.length > 0 ? `Last game +${r.points[r.points.length - 1]}` : 'Ready';
  return (
    <Animated.View
      accessibilityLabel={`${r.rank}. ${r.name}${me ? ', you' : ''}. ${r.total} points${running ? `, plus ${r.provisional} if this game ended now` : ''}. ${line}.`}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          height: ROW - 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          backgroundColor: c.cell,
          borderWidth: 2,
          borderColor: me ? c.accent : 'transparent',
          opacity: r.out ? 0.55 : 1,
        },
        place,
      ]}
    >
      <Text maxFontSizeMultiplier={1.2} style={{ width: 20, textAlign: 'center', fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'], color: r.rank === 1 ? c.goldInk : c.tertiaryLabel }}>
        {r.rank}
      </Text>
      {/* Another member's face and name open Report and Block (App Store guideline 1.2). */}
      <Pressable
        disabled={me || !code}
        accessibilityRole="button"
        accessibilityLabel={`${r.name}: report or block`}
        onPress={() => code && openPlayerMenu({ key: memberKey(r.id), name: r.name, emoji: r.emoji, where: 'party', code, playerId: r.id }, r.name)}
        style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
      <Avatar emoji={r.emoji} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ flexShrink: 1, fontSize: 17, fontWeight: '600', color: c.label }}>
            {r.name}
          </Text>
          {me && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full, backgroundColor: c.blueBg }}>
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 11, fontWeight: '700', color: c.blueInk }}>
                You
              </Text>
            </View>
          )}
        </View>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontSize: 13, color: c.tertiaryLabel }}>
          {line}
        </Text>
      </View>
      </Pressable>
      {r.move !== 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name={r.move > 0 ? 'arrowtriangle.up.fill' : 'arrowtriangle.down.fill'} size={10} color={r.move > 0 ? c.green : c.red} />
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '700', color: r.move > 0 ? c.green : c.red }}>
            {Math.abs(r.move)}
          </Text>
        </View>
      )}
      <View style={{ alignItems: 'flex-end', minWidth: 36 }}>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 20, lineHeight: 24, fontWeight: '700', fontVariant: ['tabular-nums'], color: c.label }}>
          {r.total}
        </Text>
        {running && (
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'], color: c.green }}>
            +{r.provisional}
          </Text>
        )}
      </View>
      {FRIENDS_ON && canAdd && r.friendCode && <AddFriend code={r.friendCode} name={r.name} emoji={r.emoji} />}
    </Animated.View>
  );
}

/** "+ Friend" on someone else's row, once the server has checked their phone owns that friend code. It sends a friend request. */
function AddFriend({ code, name, emoji }: { code: string; name: string; emoji: string }) {
  const c = usePlainColors();
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const status = await sendFriendRequest(code, { name, emoji });
      haptic.success();
      if (status === 'sent') Alert.alert('Friend request sent', `${name} will see it in their Friends tab.`);
    } catch (e) {
      haptic.failure();
      Alert.alert("Couldn't add them", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${name} as a friend`}
      hitSlop={8}
      disabled={busy}
      onPress={() => void add()}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: c.blueBg, opacity: pressed || busy ? 0.6 : 1 })}
    >
      <Icon name="plus" size={11} color={c.blueInk} />
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '600', color: c.blueInk }}>
        Friend
      </Text>
    </Pressable>
  );
}
