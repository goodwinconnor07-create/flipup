import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PartyRow } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { BLOCKED_EMOJI, BLOCKED_NAME, memberKey, useBlocked } from '@/state/blocks';
import { radius, spacing, usePlainColors } from '@/theme';

import { Avatar } from '../avatar';
import { SwapIcon } from '../swap';
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
  // A blocked member's name and picture are hidden here too.
  const blocked = new Set(useBlocked().map((b) => b.key));
  const rows = raw.map((r) => (blocked.has(memberKey(r.id)) ? { ...r, name: BLOCKED_NAME, emoji: BLOCKED_EMOJI } : r));
  const stable = [...rows].sort((a, b) => (a.id < b.id ? -1 : 1));
  return (
    <View accessibilityRole="list" accessibilityLabel="Leaderboard" style={{ height: rows.length * ROW - 4 }}>
      {stable.map((r) => (
        <BoardRow key={r.id} row={r} me={r.id === you} running={running} code={code} />
      ))}
    </View>
  );
}

function BoardRow({ row: r, me, running, code }: { row: PartyRow; me: boolean; running: boolean; code?: string }) {
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
          <SwapIcon name={r.move > 0 ? 'arrowtriangle.up.fill' : 'arrowtriangle.down.fill'} size={10} color={r.move > 0 ? c.green : c.red} />
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
    </Animated.View>
  );
}
