// The full breakdown of a Range training hand, for the `range-breakdown` sheet (the result card has the short
// version). In reading order: the decision and why; how the hand played out, street by street, with the cards each
// street brought and what was left of their range after it (so the range visibly narrows down); what they could have
// against what you held; the rule to remember; and the numbers (pot odds and what each play wins). Their range is said
// in words, never as shares of it (the owner, 26 Nov 2026). The numbers come from range-numbers.json (worked out
// ahead, see state/ranges.ts).
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { RangeWords } from '@/components/range/result-card';
import { MiniCard, TheirHands } from '@/components/range/their-hands';
import { ThemedText } from '@/components/themed-text';
import { detail } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { pileBet, pilesOf } from '@/state/range-result';
import { numbersFor } from '@/state/ranges';
import { brand, radius, spacing, useColors } from '@/theme';
import { bb, optionsFor, replay, type OptionId, type Scenario, type Street } from '@train/ranges/model';

const STREET_NAME: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${bb(Math.abs(Math.round(n * 10) / 10))}`;
const NUM = { fontVariant: ['tabular-nums' as const] };

/** The board cards each street brought. */
function cardsOf(s: Scenario, street: Street): string[] {
  if (street === 'flop') return s.board.slice(0, 3);
  if (street === 'turn') return s.board.slice(3, 4);
  if (street === 'river') return s.board.slice(4, 5);
  return [];
}

/**
 * The hand as it played out: one step a street down a thin line, the street's name and the cards it brought, what
 * happened and what it meant, then what's left of their range in a tinted box, so the range narrows step by step.
 */
function Story({ scenario }: { scenario: Scenario }) {
  const colors = useColors();
  const last = scenario.streets.length - 1;
  return (
    <View>
      {scenario.streets.map((st, i) => {
        const cards = st.street === 'preflop' ? scenario.hero.cards : cardsOf(scenario, st.street);
        return (
          <View key={st.street} style={{ flexDirection: 'row', gap: spacing.sm }}>
            {/* The line and its dot; the dot is gold on the street you decide on. */}
            <View style={{ width: 14, alignItems: 'center' }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: i === last ? brand.gold : (colors.blueInk as string) }} />
              {i < last ? <View style={{ flex: 1, width: 2, marginVertical: 4, borderRadius: 1, backgroundColor: colors.separator as string }} /> : null}
            </View>
            <View style={{ flex: 1, gap: spacing.xs, paddingBottom: i < last ? spacing.lg : 0 }}>
              <View accessible accessibilityLabel={`${STREET_NAME[st.street]}${st.street === 'preflop' ? ', you held' : ''} ${cards.join(' ')}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <ThemedText variant="caption1" style={{ fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: i === last ? (colors.goldInk as string) : (colors.secondaryLabel as string) }}>
                  {STREET_NAME[st.street]}
                  {i === last ? ' · your decision' : ''}
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {cards.map((c) => (
                    <MiniCard key={c} card={c} w={20} />
                  ))}
                </View>
              </View>
              <ThemedText variant="subhead">{st.text}</ThemedText>
              <View style={{ flexDirection: 'row', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.blueBg as string }}>
                <View style={{ marginTop: 2 }}><Icon name="eye.fill" size={14} color={colors.blueInk as string} /></View>
                <ThemedText variant="footnote" style={{ flex: 1, color: colors.blueInk as string }}>
                  <ThemedText variant="footnote" style={{ fontWeight: '800', color: colors.blueInk as string }}>
                    {scenario.opponents.filter((o) => o.range.length).length > 1 ? 'Their ranges: ' : 'Their range: '}
                  </ThemedText>
                  {st.range}
                </ThemedText>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

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

      {/* How the hand played out: street by street, their range narrowing. */}
      {scenario.streets.length > 0 && (
        <Animated.View entering={step()}>
          <Section title="How the hand played out">
            <Panel>
              <Story scenario={scenario} />
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

      {/* The rule to take to the table. */}
      {scenario.takeaway ? (
        <Animated.View entering={step()}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.blueBg as string }}>
            <Icon name="lightbulb.fill" size={18} color={colors.blueInk as string} />
            <ThemedText variant="subhead" style={{ flex: 1, color: colors.blueInk as string }}>
              <ThemedText variant="subhead" style={{ fontWeight: '800', color: colors.blueInk as string }}>
                Remember:{' '}
              </ThemedText>
              {scenario.takeaway}
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}

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

    </View>
  );
}
