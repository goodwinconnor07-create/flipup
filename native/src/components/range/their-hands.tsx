// After a miss (or a good-but-not-best answer): what they could have, laid out against what you held. Real example
// hands as little cards, how often you win against each kind of hand, and one line to look for next time. The same
// example hands are shown on the opponents' seats on the table.
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { rankLabel, suitOf } from '@/engine';
import { brand, radius, spacing, useColors, ROUNDED } from '@/theme';
import { combosOf, type Pos, type RangeGroup, type Scenario } from '@train/ranges/model';

const NUM = { fontVariant: ['tabular-nums' as const] };
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

/** A card too small for the real card component: rank and suit on white. */
export function MiniCard({ card, w = 22 }: { card: string; w?: number }) {
  const suit = suitOf(card);
  return (
    <View
      accessible={false}
      style={{ width: w, height: Math.round(w * 1.3), borderRadius: 4, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}
    >
      <ThemedText variant="caption2" style={{ color: RED[suit] ? '#d92b2b' : '#111111', fontWeight: '800', fontFamily: ROUNDED, fontSize: w * 0.46, lineHeight: w * 0.52 }} numberOfLines={1}>
        {rankLabel(card)}
        {SYMBOL[suit]}
      </ThemedText>
    </View>
  );
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
  const total = first.groups.reduce((n, g) => n + g.weight, 0) || 1;
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
      {rows.map(({ g, ex }) => (
        <View key={g.group.label + g.group.role} accessibilityLabel={`${g.group.label}, for example ${ex.join(' and ')}. You win ${Math.round(g.equity * 100)} percent against these`} style={{ gap: 4 }}>
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
              <ThemedText variant="caption1" tone="tertiaryLabel" style={NUM}>
                {Math.round((g.weight / total) * 100)}% of their hands · you win {Math.round(g.equity * 100)}%
              </ThemedText>
            </View>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.cellPressed, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(g.equity * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: g.equity >= 0.5 ? brand.violet : (colors.quaternaryLabel as string) }} />
          </View>
        </View>
      ))}
      {nextTime ? (
        <View style={{ padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.blueBg }}>
          <ThemedText variant="subhead" style={{ color: colors.blueInk }}>
            <ThemedText variant="subhead" style={{ fontWeight: '800', color: colors.blueInk }}>
              Next time:{' '}
            </ThemedText>
            {nextTime}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}
