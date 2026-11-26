// The full breakdown of a Range training hand, for the `range-breakdown` sheet (the result card has the short
// version). In reading order: the decision and why; how to read the hand, factor by factor (preflop action, position,
// players, the player, board texture, bet sizing, their likely hands); what they could have against what you held;
// the concept behind it with the rule to remember; the numbers (pot odds and what each play wins); and what each
// street told you. Their range is said in words, never as shares of it (the owner, 26 Nov 2026). The numbers come
// from range-numbers.json (worked out ahead, see state/ranges.ts).
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/icon';
import { RangeWords } from '@/components/range/result-card';
import { TheirHands } from '@/components/range/their-hands';
import { ThemedText } from '@/components/themed-text';
import { detail } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { pileBet, pilesOf } from '@/state/range-result';
import { numbersFor } from '@/state/ranges';
import { brand, radius, spacing, useColors } from '@/theme';
import { CONCEPTS } from '@train/ranges/concepts';
import { bb, optionsFor, replay, type OptionId, type ReadAbout, type Scenario, type Street } from '@train/ranges/model';

const STREET_NAME: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${bb(Math.abs(Math.round(n * 10) / 10))}`;
const NUM = { fontVariant: ['tabular-nums' as const] };

/** Each factor's name and icon, in the order they're read. */
const FACTOR: Record<ReadAbout, { title: string; icon: IconName }> = {
  preflop: { title: 'Preflop action', icon: 'suit.spade.fill' },
  position: { title: 'Position', icon: 'location.fill' },
  players: { title: 'Players in the hand', icon: 'person.3.fill' },
  opponent: { title: 'The player', icon: 'person.fill' },
  board: { title: 'Board texture', icon: 'square.grid.2x2.fill' },
  sizing: { title: 'Bet sizing', icon: 'chart.bar.xaxis' },
  range: { title: 'Their likely hands', icon: 'eye.fill' },
};
const ORDER: ReadAbout[] = ['preflop', 'position', 'players', 'opponent', 'board', 'sizing', 'range'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="title3" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function Panel({ children, tint }: { children: ReactNode; tint?: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: tint ?? colors.cell }}>
      {children}
    </View>
  );
}

function Bar({ share, color, height = 6 }: { share: number; color: string; height?: number }) {
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
  const bet = pick && pick.startsWith('bet') ? pick : pileBet(scenario);
  const reads = [...scenario.read].sort((a, b) => ORDER.indexOf(a.about) - ORDER.indexOf(b.about));
  const theory = CONCEPTS[scenario.concept];
  let n = 0;
  const step = () => detail(n++, reduce);

  return (
    <View style={{ gap: spacing.xl }}>
      {/* The decision: the best play, and why. */}
      <Animated.View entering={step()}>
        <Panel tint={colors.goldBg as string}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="checkmark.seal.fill" size={20} color={brand.gold} />
            <ThemedText variant="caption1" style={{ fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.goldInk as string }}>
              Best play
            </ThemedText>
          </View>
          <ThemedText variant="title2" accessibilityRole="header" style={NUM}>
            {label(scenario.best)}
          </ThemedText>
          <ThemedText variant="body">{scenario.why}</ThemedText>
        </Panel>
      </Animated.View>

      {/* Reading the hand, one factor at a time. */}
      {reads.length > 0 && (
        <Animated.View entering={step()}>
          <Section title="Reading the hand">
            <Panel>
              {reads.map((x, i) => (
                <View key={x.about + i} accessible accessibilityLabel={`${FACTOR[x.about].title}. ${x.text}`} style={{ flexDirection: 'row', gap: spacing.sm, paddingTop: i ? spacing.sm : 0, borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.separator as string }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueBg as string }}>
                    <Icon name={FACTOR[x.about].icon} size={15} color={colors.blueInk as string} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
                      {FACTOR[x.about].title}
                    </ThemedText>
                    <ThemedText variant="subhead" tone="secondaryLabel">
                      {x.text}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </Panel>
          </Section>
        </Animated.View>
      )}

      {/* What they could have: examples against your hand, then every kind of hand, sorted by what it means for you. */}
      {views.length > 0 && (
        <Animated.View entering={step()} style={{ gap: spacing.md }}>
          <TheirHands scenario={scenario} opponents={views.map((v) => ({ pos: v.opponent.pos, type: v.opponent.type, groups: v.groups }))} facing={facing} dead={dead} nextTime={null} />
          {views.map((v) => (
            <Panel key={v.opponent.pos}>
              <View style={{ gap: 2 }}>
                <ThemedText variant="headline">{views.length > 1 ? `Everything ${v.opponent.pos} could have` : 'Everything they could have'}</ThemedText>
                <ThemedText variant="footnote" tone="secondaryLabel">
                  {v.opponent.type}
                  {facing ? '' : ` · against ${bet === 'bet33' ? 'a ⅓-pot bet' : bet === 'bet125' ? 'an overbet' : 'a ¾-pot bet'}`}
                </ThemedText>
              </View>
              <RangeWords piles={pilesOf([v.groups], facing, dead, bet)} />
            </Panel>
          ))}
        </Animated.View>
      )}

      {/* The concept: the theory, then the rule to take to the table. */}
      <Animated.View entering={step()}>
        <Section title={scenario.concept}>
          <Panel>
            {theory ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Icon name="graduationcap.fill" size={18} color={colors.blueInk as string} />
                <ThemedText variant="subhead" style={{ flex: 1 }}>
                  {theory}
                </ThemedText>
              </View>
            ) : null}
            {scenario.takeaway ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.blueBg as string }}>
                <Icon name="lightbulb.fill" size={18} color={colors.blueInk as string} />
                <ThemedText variant="subhead" style={{ flex: 1, color: colors.blueInk as string }}>
                  <ThemedText variant="subhead" style={{ fontWeight: '800', color: colors.blueInk as string }}>
                    Remember:{' '}
                  </ThemedText>
                  {scenario.takeaway}
                </ThemedText>
              </View>
            ) : null}
          </Panel>
        </Section>
      </Animated.View>

      {/* The numbers: pot odds against your chance, and what each play wins on average. */}
      <Animated.View entering={step()}>
        <Section title="The numbers">
          <Panel>
            <ThemedText variant="subhead">
              {facing ? (
                <>
                  Calling {bb(r.toCall)} to win {bb(r.pot)} means you need to win{' '}
                  <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
                    {pct(evs.price)}
                  </ThemedText>{' '}
                  of the time. Against {inPot.length > 1 ? 'everything still in' : 'their range'} you win{' '}
                  <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
                    {pct(evs.equity)}
                  </ThemedText>
                  .
                </>
              ) : (
                <>
                  If the hand were checked down now you’d win{' '}
                  <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
                    {pct(evs.equity)}
                  </ThemedText>{' '}
                  of the pot{inPot.length > 1 ? ' against everyone still in' : ''}. What matters is who calls a bet.
                </>
              )}
            </ThemedText>
            <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontWeight: '600' }}>
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
                    <Bar share={Math.abs(row.ev) / topEv} color={row.ev >= 0 ? brand.violet : (colors.quaternaryLabel as string)} />
                  </View>
                  <ThemedText variant="subhead" style={[{ fontWeight: '700' }, NUM, ink ? { color: ink } : null]}>
                    {signed(row.ev)}
                  </ThemedText>
                </View>
              );
            })}
          </Panel>
        </Section>
      </Animated.View>

      {/* Street by street: what each street told you, as the hints said it. */}
      <Animated.View entering={step()}>
        <Section title="Street by street">
          <Panel>
            {scenario.clues.map((c, i) => (
              <View key={i} style={{ gap: 2, paddingTop: i ? spacing.sm : 0, borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.separator as string }}>
                <ThemedText variant="caption1" style={{ fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.secondaryLabel as string }}>
                  {STREET_NAME[c.street]}
                </ThemedText>
                <ThemedText variant="subhead">{c.text}</ThemedText>
              </View>
            ))}
          </Panel>
        </Section>
      </Animated.View>
    </View>
  );
}
