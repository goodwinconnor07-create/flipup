// What they could have, laid out against what you held: real example hands as little cards, the kind of hand each
// stands for, whether yours is ahead of it, and the rule to remember. The same example hands are shown on the
// opponents' seats on the table. No share of their range is shown (the owner, 26 Nov 2026).
import { Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { rankLabel, suitOf } from '@/engine';
import { radius, spacing, useColors } from '@/theme';
import { combosOf, type Pos, type RangeGroup, type Scenario } from '@train/ranges/model';

const SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;
const RED = { s: false, h: true, d: true, c: false } as const;

export interface GroupView {
  group: RangeGroup;
  weight: number;
  combos: number;
  equity: number;
}
export interface OpponentHands {
  pos: Pos;
  type: string;
  groups: GroupView[];
}

/** The kind of hand that matters most: the biggest value group when you face a bet, else the biggest group. */
export function topGroups(groups: GroupView[], facing: boolean, n: number): GroupView[] {
  const sorted = [...groups].sort((a, b) => b.weight - a.weight);
  const value = facing ? sorted.filter((g) => g.group.role === 'value') : [];
  const rest = sorted.filter((g) => !value.includes(g));
  return [...value, ...rest].slice(0, n);
}

/** One real hand from a group, not using any card on the table or in your hand. */
export function exampleOf(g: GroupView, dead: string[]): [string, string] | null {
  return combosOf(g.group, dead)[0] ?? null;
}

/**
 * A card too small for the real card component: the rank over its suit on white, like a card's corner. Stacked, so
 * a 10 fits whole (on one line it ran out of room and showed as "1…"), and fixed in size so Dynamic Type can't cut it.
 */
export function MiniCard({ card, w = 22 }: { card: string; w?: number }) {
  const suit = suitOf(card);
  const color = RED[suit] ? '#d92b2b' : '#111111';
  const rank = rankLabel(card);
  return (
    <View
      accessible={false}
      style={{ width: w, height: Math.round(w * 1.3), borderRadius: 4, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}
    >
      <Text
        maxFontSizeMultiplier={1}
        numberOfLines={1}
        style={{ color, fontWeight: '800', fontSize: w * (rank.length > 1 ? 0.42 : 0.48), lineHeight: w * 0.52, letterSpacing: rank.length > 1 ? -0.6 : 0 }}
      >
        {rank}
      </Text>
      <Text maxFontSizeMultiplier={1} style={{ color, fontSize: w * 0.42, lineHeight: w * 0.46 }}>
        {SYMBOL[suit]}
      </Text>
    </View>
  );
}

/** Your hand against one kind of theirs, in words. */
export function standing(equity: number): { words: string; ahead: boolean | null } {
  if (equity >= 0.6) return { words: 'You’re ahead of these', ahead: true };
  if (equity <= 0.4) return { words: 'These beat you', ahead: false };
  return { words: 'Close to even', ahead: null };
}

/** Their likely hands against yours. `opponents` are the ones still in the hand, with their ranges as worked out. */
export function TheirHands({ scenario, opponents, facing, dead, nextTime }: { scenario: Scenario; opponents: OpponentHands[]; facing: boolean; dead: string[]; nextTime: string | null }) {
  const colors = useColors();
  const first = opponents[0];
  if (!first) return null;
  const rows = topGroups(first.groups, facing, 3)
    .map((g) => ({ g, ex: exampleOf(g, dead) }))
    .filter((x): x is { g: GroupView; ex: [string, string] } => !!x.ex);
  if (!rows.length) return null;
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      <ThemedText variant="title3" accessibilityRole="header">
        {opponents.length > 1 ? `${first.pos} could have` : 'What they could have'}
      </ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {scenario.hero.cards.map((c) => (
            <MiniCard key={c} card={c} w={28} />
          ))}
        </View>
        <ThemedText variant="subhead" tone="secondaryLabel" style={{ flex: 1 }}>
          You held this
        </ThemedText>
      </View>
      {rows.map(({ g, ex }) => {
        const st = standing(g.equity);
        return (
        <View key={g.group.label + g.group.role} accessible accessibilityLabel={`${g.group.label}, for example ${ex.join(' and ')}. ${st.words}.`} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {ex.map((c) => (
                <MiniCard key={c} card={c} w={28} />
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="subhead" numberOfLines={2} style={{ fontWeight: '600' }}>
                {g.group.label}
              </ThemedText>
              <ThemedText variant="caption1" style={{ fontWeight: '600', color: st.ahead ? (colors.blueInk as string) : (colors.secondaryLabel as string) }}>
                {st.words}
              </ThemedText>
            </View>
          </View>
        </View>
        );
      })}
      {nextTime ? (
        <View style={{ padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.blueBg }}>
          <ThemedText variant="subhead" style={{ color: colors.blueInk }}>
            <ThemedText variant="subhead" style={{ fontWeight: '800', color: colors.blueInk }}>
              Remember:{' '}
            </ThemedText>
            {nextTime}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}
