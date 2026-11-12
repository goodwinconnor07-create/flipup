// Secret Missions: your mission drawn as a card beside your own two (`MyArea`), laid out exactly like Power Cards'
// power card (power-card.tsx): the same size and place every hand, so nothing at the bottom of the table moves. The
// card is the game's green felt in a gold frame, with the mission's emoji and name and five dots for your race. A tap
// opens the mission panel (`MissionPanel`), which rises from the bottom like the power panel.
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { type Game } from '@/engine';
import { detail, rise, sink } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { myMission, type MissionState } from '@/state/mission-view';
import { brand, gradient, minTap, radius, spacing, useColors, useShadows } from '@/theme';

import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { Swap, SwapIcon } from '../swap';
import { ThemedText } from '../themed-text';

/** The gold foil round the card, the same as the power card's. */
const FOIL = 'linear-gradient(150deg, #fff1c1 0%, #f5c84b 30%, #b97a12 55%, #f7d77e 78%, #c88a1c 100%)';
/** The card's face: the Secret Missions felt (tableThemes.missions) going to night. */
const FACE = 'linear-gradient(170deg, #1f6b52 0%, #123a2e 50%, #071a14 100%)';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');
const LABEL: Record<MissionState, string> = { none: 'MISSION', active: 'MISSION', done: 'DONE' };

/** Five dots: missions done in this race, gold. */
function Dots({ done, goal, size, dark }: { done: number; goal: number; size: number; dark?: boolean }) {
  return (
    <View accessible={false} style={{ flexDirection: 'row', gap: Math.max(2, size * 0.5) }}>
      {Array.from({ length: goal }, (_, i) => (
        <View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: i < done ? brand.gold : dark ? 'rgba(255,255,255,0.22)' : 'rgba(128,128,128,0.35)' }} />
      ))}
    </View>
  );
}

export function MissionCard({ game, meId, width, height, onOpen }: { game: Game; meId: string | undefined; width: number; height: number; onOpen: () => void }) {
  const v = myMission(game, meId);
  const radiusPx = Math.round(width * 0.18);
  const small = width < 60;
  // A little smaller than the power card's picture: the mission also carries the race's five dots.
  const emoji = Math.round(width * (small ? 0.34 : 0.42));
  const done = v.state === 'done';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={
        v.info
          ? `Your mission: ${v.info.name}. ${v.info.text} ${v.done} of ${v.goal} done this race.`
          : done
            ? `Mission complete. ${v.done} of ${v.goal} done this race. A new one next hand.`
            : 'Your mission card. You get one when the hand is dealt.'
      }
      accessibilityHint={v.state !== 'none' ? 'Shows the mission and the race' : undefined}
      accessibilityState={{ disabled: v.state === 'none' }}
      disabled={v.state === 'none'}
      onPress={onOpen}
      style={{
        width,
        height,
        borderRadius: radiusPx,
        borderCurve: 'continuous',
        padding: 2.5,
        // Completed this hand: a gold glow round it. A shadow, so nothing moves.
        boxShadow: done ? '0 0 16px 3px rgba(245,183,0,0.6)' : '0 6px 14px -8px rgba(8,12,30,0.6)',
        ...gradient(FOIL),
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: radiusPx - 2,
          borderCurve: 'continuous',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: Math.max(4, Math.round(height * 0.06)),
          paddingBottom: small ? 5 : Math.max(4, Math.round(height * 0.07)),
          paddingHorizontal: 3,
          ...gradient(FACE),
        }}
      >
        <Swap id={LABEL[v.state]} kind="text" style={{ height: 16 }}>
          <View style={{ paddingHorizontal: done ? 6 : 0, borderRadius: 8, backgroundColor: done ? brand.gold : 'transparent' }}>
            <Text maxFontSizeMultiplier={1} numberOfLines={1} style={{ fontSize: small ? 7.5 : 9, lineHeight: 16, fontWeight: '800', letterSpacing: small ? 0.3 : 1, color: done ? brand.goldInk : 'rgba(255,224,138,0.9)' }}>
              {LABEL[v.state]}
            </Text>
          </View>
        </Swap>
        {/* The face: the mission's picture, a tick once it's done, or a target on the back before the first deal. */}
        <Swap id={v.info ? `m-${v.info.id}` : v.state} kind="icon" size={emoji + 6}>
          {v.info ? (
            <Text maxFontSizeMultiplier={1} accessible={false} style={{ fontSize: emoji, lineHeight: emoji + 6 }}>
              {v.info.emoji}
            </Text>
          ) : (
            <SwapIcon name={done ? 'checkmark.seal.fill' : 'scope'} size={Math.round(emoji * 0.85)} color={done ? brand.gold : 'rgba(255,224,138,0.45)'} />
          )}
        </Swap>
        <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: small ? 2 : 3 }}>
          <Text
            maxFontSizeMultiplier={1}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{ alignSelf: 'stretch', textAlign: 'center', fontSize: small ? 9.5 : 12, lineHeight: small ? 11 : 14, fontWeight: '800', color: '#ffffff', minHeight: small ? 12 : 14 }}
          >
            {v.info?.name ?? (done ? 'Complete' : '')}
          </Text>
          <Dots done={v.done} goal={v.goal} size={small ? 4 : 5} dark />
        </View>
      </View>
    </PressableScale>
  );
}

/**
 * The panel the mission card opens: over the table like the power panel, so nothing on it moves. The mission and
 * what it pays, then the race (everyone's missions done, out of five) and when an unfinished mission is swapped.
 */
export function MissionPanel({ game, meId, inset, onClose }: { game: Game; meId: string | undefined; inset: number; onClose: () => void }) {
  const colors = useColors();
  const shadow = useShadows();
  const reduce = useReduceMotion();
  const v = myMission(game, meId);
  if (v.state === 'none') return null;
  return (
    <Animated.View
      entering={rise(reduce)}
      exiting={sink(reduce)}
      accessibilityViewIsModal
      style={{
        transformOrigin: '50% 100%',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: -inset,
        padding: spacing.md,
        paddingBottom: inset + spacing.sm,
        gap: spacing.md,
        backgroundColor: colors.background,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        boxShadow: shadow.raised,
      }}
    >
      {/* The mission: its picture on a small gold card, its name, and close. */}
      <Animated.View entering={detail(0, reduce)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: 44, height: 60, borderRadius: 9, borderCurve: 'continuous', padding: 2, ...gradient(FOIL) }}>
          <View style={{ flex: 1, borderRadius: 7, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', ...gradient(FACE) }}>
            {v.info ? (
              <Text maxFontSizeMultiplier={1} accessible={false} style={{ fontSize: 26 }}>
                {v.info.emoji}
              </Text>
            ) : (
              <Icon name="checkmark.seal.fill" size={24} color={brand.gold} />
            )}
          </View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="title2" style={{ fontWeight: '800' }}>
            {v.info?.name ?? 'Mission complete'}
          </ThemedText>
          <ThemedText variant="subhead" tone="secondaryLabel">
            {v.info ? `Pays +${chips(v.reward)} from each player` : 'A new mission when the next hand is dealt'}
          </ThemedText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={{ minWidth: minTap, minHeight: minTap, alignItems: 'flex-end', justifyContent: 'flex-start' }}>
          <Icon name="xmark" size={20} color={colors.label} />
        </Pressable>
      </Animated.View>

      {v.info && (
        <Animated.View entering={detail(1, reduce)} style={{ gap: spacing.xs }}>
          <ThemedText variant="callout" style={{ fontWeight: '700' }}>
            {v.info.text}
          </ThemedText>
          <ThemedText variant="callout" tone="secondaryLabel">
            {v.swapsIn <= 1 ? 'Not done by the end of this hand, it’s swapped for a new one.' : `Not done in ${v.swapsIn} hands, it’s swapped for a new one.`}
          </ThemedText>
        </Animated.View>
      )}

      <Animated.View entering={detail(2, reduce)} style={{ gap: spacing.xs }}>
        <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontWeight: '700', letterSpacing: 0.6 }}>
          {`RACE ${v.race} · FIRST TO ${v.goal}`}
        </ThemedText>
        <View style={{ borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell, overflow: 'hidden' }}>
          {v.standings.map((p, i) => (
            <View
              key={p.id}
              accessible
              accessibilityLabel={`${p.name}, ${p.done} of ${v.goal}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 8, borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.separator }}
            >
              <Text maxFontSizeMultiplier={1} style={{ fontSize: 20, lineHeight: 26 }}>
                {p.emoji}
              </Text>
              <ThemedText variant="callout" numberOfLines={1} style={{ flex: 1, fontWeight: p.me ? '800' : '600' }}>
                {p.name}
              </ThemedText>
              <Dots done={p.done} goal={v.goal} size={8} />
            </View>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
