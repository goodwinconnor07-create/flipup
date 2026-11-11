// The answer's result, risen out of the answer bar it replaces (motion rules 10 and 20: the bar opens into it from
// the bottom, from 95%), so the table above never moves while you take it in. Pinned, it stays short so it never
// covers the page: the verdict, one sentence of why, Breakdown and Next hand. Its numbers (`ResultDetails`: your odds
// against the price or what each play wins against the best, and their range as piles) sit in the page under the
// table. Everything else is one tap away in the `range-breakdown` sheet.
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Confetti } from '@/components/table/confetti';
import { detail, rise } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { BET_WORDS, VERDICT, type Pile } from '@/state/range-result';
import type { HandNumbers } from '@/state/ranges';
import { brand, radius, spacing, useColors, useScheme, useShadows } from '@/theme';
import { bb, type Grade, type OptionId } from '@train/ranges/model';

const NUM = { fontVariant: ['tabular-nums' as const] };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${bb(Math.abs(Math.round(n * 10) / 10))}`;
const ICON: Record<Grade, IconName> = { best: 'checkmark.circle.fill', ok: 'checkmark.circle.fill', mistake: 'xmark.circle.fill' };

export function ResultCard({
  grade,
  pick,
  best,
  label,
  why,
  run,
  cheer,
  onBreakdown,
  onNext,
  nextTitle = 'Next hand',
}: {
  grade: Grade;
  pick: OptionId;
  best: OptionId;
  /** An option's label ("Call 12bb", "Bet ¾ pot (24bb)"). */
  label: (id: OptionId) => string;
  /** The first sentence of why. */
  why: string;
  /** Best plays in a row, counting this one. */
  run: number;
  /** A run worth confetti (3, 5, 10...). */
  cheer: boolean;
  onBreakdown: () => void;
  onNext: () => void;
  /** The main button's words (the last hand of a set says See your set). */
  nextTitle?: string;
}) {
  const colors = useColors();
  const shadows = useShadows();
  const dark = useScheme() === 'dark';
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  // Gold is good news (a best play), blue a fine answer, grey a miss: the same three as the rest of the trainer.
  const look: Record<Grade, { ink: string; bg: string }> = {
    best: { ink: colors.goldInk as string, bg: colors.goldBg as string },
    ok: { ink: colors.blueInk as string, bg: colors.blueBg as string },
    mistake: { ink: colors.secondaryLabel as string, bg: colors.cellPressed as string },
  };
  const tone = look[grade];
  const sub = pick === best ? `You played ${label(pick)}` : `Best was ${label(best)}`;
  return (
    <Animated.View
      entering={rise(reduce)}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLiveRegion="polite"
      style={{
        transformOrigin: '50% 100%',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: dark ? (colors.cell as string) : (colors.background as string),
        boxShadow: shadows.card,
      }}
    >
      {/* The verdict, with the run when you're on one. */}
      <View
        accessible
        accessibilityLabel={`${VERDICT[grade]}. ${sub}.${run >= 2 ? ` ${run} in a row.` : ''}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
          <Icon name={ICON[grade]} size={22} color={tone.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title3" style={{ fontWeight: '800', color: tone.ink }}>
            {VERDICT[grade]}
          </ThemedText>
          <ThemedText variant="subhead" tone="secondaryLabel" numberOfLines={1} style={NUM}>
            {sub}
          </ThemedText>
        </View>
        {run >= 2 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 4,
              paddingHorizontal: spacing.xs,
              borderRadius: radius.full,
              backgroundColor: look.best.bg,
            }}
          >
            <Icon name="flame.fill" size={14} color={brand.gold} />
            <ThemedText variant="footnote" style={[{ fontWeight: '800' }, NUM]}>
              {run}
            </ThemedText>
          </View>
        )}
      </View>

      <Animated.View entering={detail(0, reduce)}>
        <ThemedText variant="subhead">{why}</ThemedText>
      </Animated.View>

      <Animated.View entering={detail(1, reduce)} style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xxs }}>
        <View style={{ flex: 1 }}>
          <Button title="Breakdown" variant="secondary" onPress={onBreakdown} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button title={nextTitle} variant="primary" onPress={onNext} />
        </View>
      </Animated.View>

      {/* A run worth marking: confetti from the verdict, over the page (the card doesn't clip). */}
      {width > 0 && <Confetti burst={cheer ? 1 : 0} origin={{ x: 34, y: 34 }} amount={70} />}
    </Animated.View>
  );
}

/**
 * The result's numbers, in the page under the table: your odds against the price (facing a bet) or what each play wins
 * against the best (when you could bet), then their range as piles, answering the bet you made, or the one you could
 * have made. A range that's all one pile is said in words; one bar at 100% says nothing.
 */
export function ResultDetails({
  numbers,
  facing,
  best,
  pick,
  label,
  piles,
  bet,
}: {
  numbers: HandNumbers;
  facing: boolean;
  best: OptionId;
  pick: OptionId;
  label: (id: OptionId) => string;
  piles: Pile[];
  bet: OptionId;
}) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const words = BET_WORDS[bet] ?? 'a bet';
  const caption = facing ? 'Their hands now' : pick === bet ? `Their hands against your bet` : `If you’d made ${words}`;
  return (
    <View
      style={{ gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}
    >
      <Animated.View entering={detail(0, reduce)}>
        {facing ? <Odds numbers={numbers} /> : <Plays numbers={numbers} best={best} pick={pick} label={label} />}
      </Animated.View>
      {piles.length > 0 && (
        <Animated.View entering={detail(1, reduce)}>
          <Piles piles={piles} caption={caption} />
        </Animated.View>
      )}
    </View>
  );
}

/** Facing a bet: one bar, how often you win, with a mark where calling starts to pay (the price). */
function Odds({ numbers }: { numbers: HandNumbers }) {
  const colors = useColors();
  const enough = numbers.equity >= numbers.price;
  const fill = enough ? brand.violet : (colors.quaternaryLabel as string);
  return (
    <View accessible accessibilityLabel={`You win ${pct(numbers.equity)}. You need ${pct(numbers.price)} to call.`} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <ThemedText variant="subhead" style={[{ fontWeight: '700' }, NUM]}>
          You win {pct(numbers.equity)}
        </ThemedText>
        <ThemedText variant="footnote" tone="secondaryLabel" style={NUM}>
          You need {pct(numbers.price)}
        </ThemedText>
      </View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.cellPressed }}>
        <View
          style={{ width: `${Math.round(Math.min(1, numbers.equity) * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: fill }}
        />
        {/* The price: a short line standing a little proud of the bar. */}
        <View
          style={{
            position: 'absolute',
            left: `${Math.round(numbers.price * 100)}%`,
            top: -3,
            width: 2,
            height: 16,
            marginLeft: -1,
            borderRadius: 1,
            backgroundColor: colors.label as string,
          }}
        />
      </View>
    </View>
  );
}

/**
 * When you can bet: every play, the best first, as a bar that's full for the best and shorter the more a play gives
 * up, with what it loses against the best. Long always means good.
 */
function Plays({ numbers, best, pick, label }: { numbers: HandNumbers; best: OptionId; pick: OptionId; label: (id: OptionId) => string }) {
  const colors = useColors();
  const top = numbers.rows.find((r) => r.id === best)?.ev ?? Math.max(...numbers.rows.map((r) => r.ev));
  const low = Math.min(...numbers.rows.map((r) => r.ev));
  const spread = Math.max(top - low, 0.1);
  const rows = [...numbers.rows].sort((a, b) => (a.id === best ? -1 : b.id === best ? 1 : b.ev - a.ev));
  return (
    <View style={{ gap: 6 }}>
      <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontWeight: '600' }}>
        Each play against the best
      </ThemedText>
      {rows.map((r) => {
        const isBest = r.id === best;
        const isPick = r.id === pick;
        const short = label(r.id).replace(/\s*\(.*\)$/, '');
        const share = isBest ? 1 : Math.max(0.06, 1 - (top - r.ev) / spread);
        const diff = r.ev - top;
        return (
          <View
            key={r.id}
            accessible
            accessibilityLabel={`${short}: ${isBest ? 'the best play' : `${signed(diff)} against the best`}${isPick ? ', your answer' : ''}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
          >
            <ThemedText variant="footnote" numberOfLines={1} style={{ width: 92, fontWeight: isBest || isPick ? '700' : '400' }}>
              {short}
            </ThemedText>
            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.cellPressed, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${Math.round(share * 100)}%`,
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: isBest ? brand.gold : (colors.quaternaryLabel as string),
                }}
              />
            </View>
            <ThemedText
              variant="footnote"
              style={[{ width: 64, textAlign: 'right', fontWeight: '700', color: isBest ? brand.gold : (colors.label as string) }, NUM]}
            >
              {isBest ? 'Best' : signed(diff)}
            </ThemedText>
            <View style={{ width: 28 }}>
              <ThemedText variant="caption2" tone="secondaryLabel" style={{ fontWeight: '700', opacity: isPick ? 1 : 0 }}>
                You
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** A range that's all one pile, in words. */
const ONE_PILE: Record<Pile['key'], string> = {
  beats: 'Every hand they have beats you.',
  beaten: 'You beat every hand they have.',
  bluffs: 'They’re always bluffing here.',
  folds: 'They’d fold every hand.',
  ahead: 'Every hand that calls is worse than yours.',
  behind: 'Every hand that would call has you beat.',
};

/** Their range as one bar in three parts, with a key under it. */
function Piles({ piles, caption }: { piles: Pile[]; caption: string }) {
  const colors = useColors();
  if (piles.length === 1)
    return (
      <View accessible style={{ gap: 4 }}>
        <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontWeight: '600' }}>
          {caption}
        </ThemedText>
        <ThemedText variant="subhead" style={{ fontWeight: '600' }}>
          {ONE_PILE[piles[0].key]}
        </ThemedText>
      </View>
    );
  const fill = (p: Pile) =>
    !p.good ? (colors.quaternaryLabel as string) : p.key === 'bluffs' || p.key === 'folds' ? brand.gold : brand.violet;
  return (
    <View accessible accessibilityLabel={`${caption}: ${piles.map((p) => `${p.label} ${pct(p.share)}`).join(', ')}`} style={{ gap: 6 }}>
      <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontWeight: '600' }}>
        {caption}
      </ThemedText>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
        {piles.map((p) => (
          <View key={p.key} style={{ flex: p.share, backgroundColor: fill(p) }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: 2 }}>
        {piles.map((p) => (
          <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fill(p) }} />
            <ThemedText variant="footnote" style={NUM}>
              {p.label}{' '}
              <ThemedText variant="footnote" style={[{ fontWeight: '700' }, NUM]}>
                {pct(p.share)}
              </ThemedText>
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}
