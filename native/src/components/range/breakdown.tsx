// The full breakdown of a Range training hand, for the `range-breakdown` sheet (the result card has the short
// version): what they could have against what you held, why in full, the numbers, what each street told you, and
// every opponent's range group by group, with how your hand does against each. The numbers come from
// range-numbers.json (worked out ahead, see state/ranges.ts).
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { TheirHands } from '@/components/range/their-hands';
import { ThemedText } from '@/components/themed-text';
import { detail, EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { firstSentence, sentenceAt } from '@/state/range-view';
import { numbersFor } from '@/state/ranges';
import { brand, radius, spacing, useColors } from '@/theme';
import { bb, callShare, optionsFor, replay, type OptionId, type RangeGroup, type Scenario, type Street } from '@train/ranges/model';

const STREET_NAME: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${bb(Math.abs(Math.round(n * 10) / 10))}`;
const NUM = { fontVariant: ['tabular-nums' as const] };

/** What a group does, in a few words: "Value", or "Folds · calls ⅓" when a small bet changes its mind. */
function respond(g: RangeGroup, facing: boolean, dead: string[]): string {
  if (facing) return g.role === 'value' ? 'Value' : g.role === 'bluff' ? 'Bluff' : 'Called';
  if (g.split?.length) {
    const at = (id: OptionId) => Math.round(callShare(g, dead, id) * 100);
    const [sm, md, bg] = [at('bet33'), at('bet75'), at('bet125')];
    const base = md >= 99 ? 'Calls' : md <= 1 ? 'Folds' : `${md}% call`;
    const extra = [sm !== md ? `${sm}% call ⅓` : '', bg !== md ? `${bg}% call an overbet` : ''].filter(Boolean);
    return [base, ...extra].join(' · ');
  }
  const word = { calls: 'Calls', folds: 'Folds', raises: 'Raises', value: 'Value', bluff: 'Bluff' };
  const extra = [g.small && g.small !== g.role ? `${word[g.small].toLowerCase()} ⅓` : '', g.big && g.big !== g.role ? `${word[g.big].toLowerCase()} to an overbet` : ''].filter(Boolean);
  return [word[g.role], ...extra].join(' · ');
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="title3" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function Bar({ share, color, height = 4 }: { share: number; color: string; height?: number }) {
  const colors = useColors();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.cellPressed, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, Math.round(share * 100)))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

export function Breakdown({ scenario, pick }: { scenario: Scenario; pick: OptionId | null }) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const [open, setOpen] = useState<string[]>([]);
  const r = useMemo(() => replay(scenario), [scenario]);
  const options = useMemo(() => optionsFor(scenario, r), [scenario, r]);
  const evs = useMemo(() => numbersFor(scenario, r), [scenario, r]);
  const facing = r.toCall > 0;
  const dead = useMemo(() => [...scenario.hero.cards, ...scenario.board], [scenario]);
  const label = (id: OptionId) => options.find((o) => o.id === id)?.label ?? id;
  const inPot = scenario.opponents.filter((o) => r.live.includes(o.pos));
  const topEv = Math.max(...evs.rows.map((x) => Math.abs(x.ev)), 0.1);
  const views = evs.views.flatMap((v) => {
    const opponent = scenario.opponents.find((o) => o.pos === v.pos);
    return opponent ? [{ opponent, groups: opponent.range.map((group, i) => ({ group, ...(v.groups[i] ?? { combos: 0, weight: 0, equity: 0 }) })) }] : [];
  });
  const nextTime = sentenceAt(scenario.why, 1) ?? (scenario.clues.length ? firstSentence(scenario.clues[scenario.clues.length - 1].text) : null);

  return (
    <View style={{ gap: spacing.lg }}>
      {views.length > 0 && <TheirHands scenario={scenario} opponents={views.map((v) => ({ pos: v.opponent.pos, type: v.opponent.type, groups: v.groups }))} facing={facing} dead={dead} nextTime={nextTime} />}

      <Animated.View entering={detail(0, reduce)}>
        <Section title="Why">
          <ThemedText variant="body">{scenario.why}</ThemedText>
          <ThemedText variant="footnote" tone="secondaryLabel" onPress={() => void Linking.openURL(scenario.source.url)} accessibilityRole="link">
            From {scenario.source.by}: {scenario.source.title}
            {scenario.source.note ? ` (${scenario.source.note})` : ''}
          </ThemedText>
        </Section>
      </Animated.View>

      <Animated.View entering={detail(1, reduce)}>
        <Section title="The numbers">
          <View style={{ gap: spacing.xxs, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
            <ThemedText variant="subhead">
              {facing ? (
                <>
                  You win <ThemedText variant="subhead" style={{ fontWeight: '700' }}>{pct(evs.equity)}</ThemedText> against {inPot.length > 1 ? 'everyone still in' : 'their range'}, and need{' '}
                  <ThemedText variant="subhead" style={{ fontWeight: '700' }}>{pct(evs.price)}</ThemedText> to call.
                </>
              ) : (
                <>
                  At a showdown now you’d win <ThemedText variant="subhead" style={{ fontWeight: '700' }}>{pct(evs.equity)}</ThemedText> of the pot{inPot.length > 1 ? ' against everyone still in' : ''}.
                </>
              )}
            </ThemedText>
            <ThemedText variant="footnote" tone="secondaryLabel" style={{ marginTop: spacing.xs, fontWeight: '600' }}>
              What each play wins on average
            </ThemedText>
            {evs.rows.map((row) => {
              const isBest = row.id === scenario.best;
              const ink = isBest ? (colors.goldInk as string) : undefined;
              return (
                <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs, borderRadius: radius.xs, backgroundColor: isBest ? colors.goldBg : row.id === pick ? colors.cellPressed : 'transparent' }}>
                  <ThemedText variant="subhead" numberOfLines={1} style={[{ flex: 1.4 }, ink ? { color: ink } : null]}>
                    {label(row.id)}
                  </ThemedText>
                  <View style={{ flex: 1 }}>
                    <Bar share={Math.abs(row.ev) / topEv} color={row.ev >= 0 ? brand.violet : (colors.quaternaryLabel as string)} height={6} />
                  </View>
                  <ThemedText variant="subhead" style={[{ fontWeight: '700' }, NUM, ink ? { color: ink } : null]}>
                    {signed(row.ev)}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </Section>
      </Animated.View>

      <Animated.View entering={detail(2, reduce)}>
        <Section title="What each street told you">
          {scenario.clues.map((c, i) => (
            <ThemedText key={i} variant="subhead">
              <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
                {STREET_NAME[c.street]}
              </ThemedText>{' '}
              {c.text}
            </ThemedText>
          ))}
        </Section>
      </Animated.View>

      {views.map((v) => {
        const total = v.groups.reduce((n, g) => n + g.weight, 0) || 1;
        // Biggest groups first; small ones wait behind Show all (a multiway range can have twenty).
        const sorted = [...v.groups].sort((a, b) => b.weight - a.weight);
        const big = sorted.filter((g, i) => i < 8 && g.weight / total >= 0.02);
        const shown = open.includes(v.opponent.pos) || sorted.length - big.length <= 2 ? sorted : big;
        return (
          <Section key={v.opponent.pos} title={views.length > 1 ? `${v.opponent.pos}’s hands` : 'Their hands'}>
            <ThemedText variant="footnote" tone="secondaryLabel" style={{ marginTop: -spacing.xxs }}>
              {v.opponent.type}
            </ThemedText>
            {shown.map((g) => (
              // Rule 20: Show all keeps every group that was already there and lets the list grow round it.
              <Animated.View
                key={g.group.label + g.group.role}
                layout={reduce ? undefined : LinearTransition.duration(250).easing(EASE_OUT)}
                accessible
                accessibilityLabel={`${g.group.label}: ${pct(g.weight / total)} of their hands, ${respond(g.group, facing, dead)}. You win ${pct(g.equity)} against these.`}
                style={{ gap: 6, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
                  <ThemedText variant="subhead" style={{ flex: 1, fontWeight: '600' }}>
                    {g.group.label}
                  </ThemedText>
                  <ThemedText variant="subhead" tone="secondaryLabel" style={NUM}>
                    {pct(g.weight / total)}
                  </ThemedText>
                </View>
                <Bar share={g.equity} color={g.equity >= 0.5 ? brand.violet : (colors.quaternaryLabel as string)} />
                <ThemedText variant="caption1" tone="tertiaryLabel" style={NUM}>
                  {respond(g.group, facing, dead)} · {g.combos} hand{g.combos === 1 ? '' : 's'} · you win {pct(g.equity)}
                </ThemedText>
              </Animated.View>
            ))}
            {shown.length < sorted.length && <Button variant="secondary" title={`Show the other ${sorted.length - shown.length}`} onPress={() => setOpen([...open, v.opponent.pos])} />}
          </Section>
        );
      })}
    </View>
  );
}
