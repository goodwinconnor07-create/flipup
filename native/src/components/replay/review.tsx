// Hand review inside a replay (Premium, 19 Nov 2026): a Review card at the top of the replay's list (the hand in a line,
// then each of your moves; a tap jumps the replay there), a line under the felt whenever the replay stands on one of
// your moves, and a mark beside your moves in the hand log. Facts only, never a grade (the owner's call): an eye where
// their cards were known and the odds are exact, an info mark where only the pot odds and your hand are. Without
// Premium the card and the line are locked and open the offer.
import { router } from 'expo-router';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { enter } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { summaryLine, type ReviewedMove } from '@/state/hand-review';
import { brand, radius, ROUNDED, spacing } from '@/theme';

type Kind = ReviewedMove['kind'];

const LOOK: Record<Kind, { icon: IconName; color: string; word: string }> = {
  exact: { icon: 'eye.fill', color: '#8fb3ff', word: 'Their cards known' },
  facts: { icon: 'info.circle', color: 'rgba(255,255,255,0.55)', word: 'Pot odds only' },
};

const STREET: Record<ReviewedMove['street'], string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const MOVE: Record<ReviewedMove['move'], string> = { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', allin: 'All in' };

/** The mark beside one of your moves in the hand log. */
export function ReviewMark({ kind }: { kind: Kind }) {
  const look = LOOK[kind];
  return (
    <View accessible accessibilityLabel={look.word}>
      <Icon name={look.icon} size={14} color={look.color} />
    </View>
  );
}

/** Under the felt, while the replay stands on one of your moves: its numbers and the facts behind them.
 * `still` draws it without its entrance (the Premium page's picture of it). */
export function CoachLine({ move, still }: { move: ReviewedMove; still?: boolean }) {
  const reduce = useReduceMotion();
  const look = LOOK[move.kind];
  return (
    <Animated.View
      key={move.step}
      entering={still ? undefined : enter(reduce)}
      accessible
      accessibilityLabel={`Review: ${move.title}. ${move.line}`}
      style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <Icon name={look.icon} size={20} color={look.color} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="subhead" style={{ fontWeight: '800', color: '#ffffff' }}>
          {move.title}
        </ThemedText>
        <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {move.line}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

/** Without Premium, on one of your moves: a quiet locked line that opens the offer. */
export function CoachLocked() {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="See your odds at this move. Hand review is part of Premium."
      onPress={() => router.push({ pathname: '/premium', params: { reason: 'review' } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.08)' }}
    >
      <Icon name="crown.fill" size={13} color={brand.gold} />
      <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
        See your odds at this move
      </ThemedText>
    </PressableScale>
  );
}

/**
 * The Review card at the top of the replay's list: the hand in a line, then a row for each of your moves. `moves`
 * undefined while it's worked out. A tap on a row jumps the replay to that move.
 */
export function ReviewCard({ moves, step, onJump }: { moves: ReviewedMove[] | undefined; step: number; onJump: (step: number) => void }) {
  const anyExact = !!moves?.some((m) => m.kind === 'exact');
  return (
    <View style={{ gap: spacing.xs, marginBottom: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <ThemedText variant="title3" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          Review
        </ThemedText>
        <ThemedText variant="footnote" numberOfLines={1} style={{ flexShrink: 1, color: 'rgba(255,255,255,0.75)', fontWeight: '700' }}>
          {moves ? summaryLine(moves) : 'Counting the odds…'}
        </ThemedText>
      </View>
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {(moves ?? []).map((m) => {
          const look = LOOK[m.kind];
          const here = m.step === step;
          return (
            <PressableScale
              key={m.step}
              accessibilityRole="button"
              accessibilityLabel={`${STREET[m.street]}, ${MOVE[m.move]}. ${m.title}. Jump here.`}
              onPress={() => onJump(m.step)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 9, backgroundColor: here ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            >
              <Icon name={look.icon} size={18} color={look.color} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="subhead" numberOfLines={1} style={{ fontWeight: '700', color: '#ffffff' }}>
                  {STREET[m.street]} · {MOVE[m.move]}
                </ThemedText>
                <ThemedText variant="caption1" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {m.title}
                </ThemedText>
              </View>
              <Icon name="chevron.right" size={12} color="rgba(255,255,255,0.4)" />
            </PressableScale>
          );
        })}
      </View>
      <ThemedText variant="caption2" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {anyExact
          ? 'Odds are counted from the real cards, which you couldn’t see at the time. The pot odds are what a call needed to break even.'
          : 'Their cards weren’t shown, so this is the pot odds and your hand at each move. Odds show when everyone still in showed.'}
      </ThemedText>
    </View>
  );
}

/** The card without Premium: what the review is, and the way to it. */
export function ReviewLocked() {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Hand review. Your odds at every move, against the real cards. Part of Premium."
      onPress={() => router.push({ pathname: '/premium', params: { reason: 'review' } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.xs, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(245,183,0,0.35)' }}
    >
      <Icon name="lightbulb.fill" size={22} color={brand.gold} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="headline" style={{ fontFamily: ROUNDED, fontWeight: '800', color: '#ffffff' }}>
          Hand review
        </ThemedText>
        <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Your odds at every move, against the real cards.
        </ThemedText>
      </View>
      <Icon name="crown.fill" size={16} color={brand.gold} />
    </PressableScale>
  );
}
