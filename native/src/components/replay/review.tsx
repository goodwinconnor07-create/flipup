// The mistake review inside a replay (Premium, 19 Nov 2026): a Review card at the top of the replay's list (a line
// for the hand, then each of your moves with its verdict; a tap jumps the replay there), a coach line under the felt
// whenever the replay stands on one of your moves, and a mark beside your moves in the hand log. Without Premium the
// card and the coach line are locked and open the offer. Colours follow the palette: gold for good news, the app's
// blue for a close one, plain white for a mistake (red stays for Fold), grey for nothing to grade.
import { router } from 'expo-router';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { enter } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { reviewSummary, summaryLine, type ReviewedMove } from '@/state/hand-review';
import { brand, radius, ROUNDED, spacing } from '@/theme';

type Verdict = ReviewedMove['verdict'];

const LOOK: Record<Verdict, { icon: IconName; color: string; word: string }> = {
  good: { icon: 'checkmark.circle.fill', color: brand.gold, word: 'Good' },
  close: { icon: 'minus.circle.fill', color: '#8fb3ff', word: 'Close' },
  mistake: { icon: 'exclamationmark.triangle.fill', color: '#ffffff', word: 'Likely mistake' },
  fine: { icon: 'info.circle', color: 'rgba(255,255,255,0.55)', word: 'Note' },
};

const STREET: Record<ReviewedMove['street'], string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const MOVE: Record<ReviewedMove['move'], string> = { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', allin: 'All in' };

/** The mark beside one of your moves in the hand log. */
export function VerdictMark({ verdict }: { verdict: Verdict }) {
  const look = LOOK[verdict];
  return (
    <View accessible accessibilityLabel={look.word}>
      <Icon name={look.icon} size={14} color={look.color} />
    </View>
  );
}

/** Under the felt, while the replay stands on one of your moves: the verdict, its title and the line with the numbers.
 * `still` draws it without its entrance (the Premium page's picture of it). */
export function CoachLine({ move, still }: { move: ReviewedMove; still?: boolean }) {
  const reduce = useReduceMotion();
  const look = LOOK[move.verdict];
  return (
    <Animated.View
      key={move.step}
      entering={still ? undefined : enter(reduce)}
      accessible
      accessibilityLabel={`Review: ${move.title}. ${move.line}`}
      style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: move.verdict === 'mistake' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.1)' }}
    >
      <Icon name={look.icon} size={20} color={look.color} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="subhead" style={{ fontWeight: '800', color: look.color === brand.gold ? brand.gold : '#ffffff' }}>
          {move.title}
          {move.costBb ? ` · about ${move.costBb} bb` : ''}
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
      accessibilityLabel="Was this the right move? Mistake review is part of Premium."
      onPress={() => router.push({ pathname: '/premium', params: { reason: 'review' } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.08)' }}
    >
      <Icon name="crown.fill" size={13} color={brand.gold} />
      <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
        Was this the right move?
      </ThemedText>
    </PressableScale>
  );
}

/**
 * The Review card at the top of the replay's list: the hand in a line ("1 mistake · about 4 bb"), then a row for
 * each of your moves. `moves` undefined while it's worked out. A tap on a row jumps the replay to that move.
 */
export function ReviewCard({ moves, step, onJump }: { moves: ReviewedMove[] | undefined; step: number; onJump: (step: number) => void }) {
  const s = moves ? reviewSummary(moves) : null;
  return (
    <View style={{ gap: spacing.xs, marginBottom: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <ThemedText variant="title3" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          Review
        </ThemedText>
        <ThemedText variant="footnote" style={{ color: s?.mistakes ? '#ffffff' : s ? brand.gold : 'rgba(255,255,255,0.6)', fontWeight: '700' }}>
          {moves ? summaryLine(moves) : 'Looking at your moves…'}
        </ThemedText>
      </View>
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {(moves ?? []).map((m) => {
          const look = LOOK[m.verdict];
          const here = m.step === step;
          return (
            <PressableScale
              key={m.step}
              accessibilityRole="button"
              accessibilityLabel={`${STREET[m.street]}, ${MOVE[m.move]}. ${look.word}: ${m.title}. Jump here.`}
              onPress={() => onJump(m.step)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 9, backgroundColor: here ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            >
              <Icon name={look.icon} size={18} color={look.color} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="subhead" numberOfLines={1} style={{ fontWeight: '700', color: '#ffffff' }}>
                  {STREET[m.street]} · {MOVE[m.move]}
                </ThemedText>
                <ThemedText variant="caption1" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {m.title} · {Math.round(m.equity * 100)}% to win{m.price !== null ? `, needed ${Math.round(m.price * 100)}%` : ''}
                </ThemedText>
              </View>
              <Icon name="chevron.right" size={12} color="rgba(255,255,255,0.4)" />
            </PressableScale>
          );
        })}
      </View>
      <ThemedText variant="caption2" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Pot odds are exact. Your chance to win is our estimate against the hands their betting points to, never their real cards, so treat a verdict as a pointer, not a ruling.
      </ThemedText>
    </View>
  );
}

/** The card without Premium: what the review is, and the way to it. */
export function ReviewLocked() {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Mistake review. See where you won or lost chips, move by move. Part of Premium."
      onPress={() => router.push({ pathname: '/premium', params: { reason: 'review' } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.xs, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(245,183,0,0.35)' }}
    >
      <Icon name="lightbulb.fill" size={22} color={brand.gold} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="headline" style={{ fontFamily: ROUNDED, fontWeight: '800', color: '#ffffff' }}>
          Mistake review
        </ThemedText>
        <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.75)' }}>
          See where you won or lost chips, move by move.
        </ThemedText>
      </View>
      <Icon name="crown.fill" size={16} color={brand.gold} />
    </PressableScale>
  );
}
