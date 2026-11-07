// Range training: the web's RangeTrainer.tsx (src/screens/RangeTrainer.tsx), one to one, in the app's type, colours
// and controls. A hand played to the turn or river with the whole action log, one decision, then why: what each
// street told you, every opponent's range broken down with how your hand does against each part of it, and what
// each play wins on average. The numbers come from range-numbers.json (worked out ahead, see state/ranges.ts).
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { detail, EASE_OUT, exit, popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useTableLook } from '@/state/prefs';
import { answerHand, nextHand, numbersFor } from '@/state/ranges';
import { brand, radius, spacing, useColors } from '@/theme';
import {
  bb,
  callShare,
  gradeOf,
  optionsFor,
  replay,
  type Grade,
  type OptionId,
  type RangeGroup,
  type Scenario,
  type Street,
} from '@train/ranges/model';

const STREET_NAME: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const GRADE: Record<Grade, string> = { best: 'Best play', ok: 'Also good', mistake: 'Not this time' };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${bb(Math.abs(Math.round(n * 10) / 10))}`;
const NUM = { fontVariant: ['tabular-nums' as const] };

/** What a group does, in a few words: "Value", or "Folds · calls ⅓" when a small bet changes its mind. */
function respond(g: RangeGroup, facing: boolean, dead: string[]): string {
  if (facing) return g.role === 'value' ? 'Value' : g.role === 'bluff' ? 'Bluff' : 'Called';
  // Some of the group calls and some folds: the ¾-pot answer first, then how much calls the other sizes.
  if (g.split?.length) {
    const at = (id: OptionId) => Math.round(callShare(g, dead, id) * 100);
    const [sm, md, bg] = [at('bet33'), at('bet75'), at('bet125')];
    const base = md >= 99 ? 'Calls' : md <= 1 ? 'Folds' : `${md}% call`;
    const extra = [sm !== md ? `${sm}% call ⅓` : '', bg !== md ? `${bg}% call an overbet` : ''].filter(Boolean);
    return [base, ...extra].join(' · ');
  }
  const word = { calls: 'Calls', folds: 'Folds', raises: 'Raises', value: 'Value', bluff: 'Bluff' };
  const extra = [
    g.small && g.small !== g.role ? `${word[g.small].toLowerCase()} ⅓` : '',
    g.big && g.big !== g.role ? `${word[g.big].toLowerCase()} to an overbet` : '',
  ].filter(Boolean);
  return [word[g.role], ...extra].join(' · ');
}

/** A flat grey cell, the web's `--bg-2` boxes. */
function Cell({ children, gap = spacing.xxs, style }: { children: ReactNode; gap?: number; style?: object }) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          gap,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          borderCurve: 'continuous',
          backgroundColor: colors.cell,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A thin bar filled to `share` (0 to 1). */
function Bar({ share, color, height = 4 }: { share: number; color: string; height?: number }) {
  const colors = useColors();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.cellPressed, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, Math.round(share * 100)))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

/** The trainer: one hand, your answer, then why. `onNext` runs after Next hand deals the next one (to scroll up). */
export function RangeTrainer({ onNext }: { onNext?: () => void }) {
  const colors = useColors();
  const look = useTableLook();
  const reduce = useReduceMotion();
  const [scenario, setScenario] = useState<Scenario>(() => nextHand(null));
  const [pick, setPick] = useState<OptionId | null>(null);
  // Opponents whose whole range is open (otherwise just the biggest groups show).
  const [open, setOpen] = useState<string[]>([]);
  const r = useMemo(() => replay(scenario), [scenario]);
  const options = useMemo(() => optionsFor(scenario, r), [scenario, r]);
  // What each play wins on average and each group's numbers (worked out ahead), once you've answered.
  const evs = useMemo(() => (pick ? numbersFor(scenario, r) : null), [scenario, r, pick]);
  // Each street's two questions (their range, and what you want), once you've answered.
  const views = useMemo(
    () =>
      evs
        ? evs.views.flatMap((v) => {
            const opponent = scenario.opponents.find((o) => o.pos === v.pos);
            return opponent
              ? [
                  {
                    opponent,
                    groups: opponent.range.map((group, i) => ({ group, ...(v.groups[i] ?? { combos: 0, weight: 0, equity: 0 }) })),
                  },
                ]
              : [];
          })
        : [],
    [evs, scenario],
  );
  const decision = scenario.board.length === 4 ? 'turn' : 'river';

  const answer = (id: OptionId) => {
    if (pick) return;
    const grade = answerHand(scenario, id);
    if (grade === 'mistake') haptic.failure();
    else haptic.success();
    setPick(id);
  };
  const next = () => {
    setScenario(nextHand(scenario));
    setOpen([]);
    setPick(null);
    onNext?.();
  };

  const grade = pick ? gradeOf(scenario, pick) : null;
  const best = options.find((o) => o.id === scenario.best);
  const facing = r.toCall > 0;
  const label = (id: OptionId) => options.find((o) => o.id === id)?.label ?? id;
  // The board as it came, street by street.
  const boardAt: Record<Street, string[]> = {
    preflop: [],
    flop: scenario.board.slice(0, 3),
    turn: scenario.board.slice(3, 4),
    river: scenario.board.slice(4, 5),
  };
  const streets = (['preflop', 'flop', 'turn', 'river'] as Street[]).slice(0, scenario.board.length - 1);
  const inPot = scenario.opponents.filter((o) => r.live.includes(o.pos));
  const topEv = evs ? Math.max(...evs.rows.map((x) => Math.abs(x.ev)), 0.1) : 1;
  const dead = [...scenario.hero.cards, ...scenario.board];
  const gradeLook: Record<Grade, { bg: string; ink: string }> = {
    best: { bg: colors.goldBg as string, ink: colors.goldInk as string },
    ok: { bg: colors.blueBg as string, ink: colors.blueInk as string },
    mistake: { bg: colors.cell as string, ink: colors.secondaryLabel as string },
  };

  return (
    <View key={scenario.id} style={{ gap: spacing.md }}>
      {/* The hand: what it teaches, the title, your seat and the table, and everyone in it. */}
      <View style={{ gap: spacing.xxs }}>
        <View
          style={{
            alignSelf: 'flex-start',
            paddingVertical: spacing.xxs,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.full,
            backgroundColor: colors.blueBg,
          }}
        >
          <ThemedText variant="caption1" style={{ fontWeight: '600', color: colors.blueInk }}>
            {scenario.concept}
          </ThemedText>
        </View>
        <ThemedText variant="title2" accessibilityRole="header" style={{ marginTop: spacing.xxs }}>
          {scenario.title}
        </ThemedText>
        <ThemedText variant="subhead" tone="tertiaryLabel">
          You’re {scenario.hero.pos} ·{' '}
          {scenario.format === 'tournament'
            ? `Tournament, ${scenario.table === 9 ? '9-handed' : '6-handed'}`
            : scenario.table === 9
              ? '9-handed live cash'
              : '6-handed cash'}
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.xxs, marginTop: spacing.xxs }}>
          {scenario.opponents.map((o) => {
            const live = r.live.includes(o.pos);
            return (
              <ThemedText key={o.pos} variant="caption1" tone="tertiaryLabel" style={{ opacity: live ? 1 : 0.6 }}>
                <ThemedText variant="caption1" style={{ fontWeight: '700' }}>
                  {o.pos}
                </ThemedText>{' '}
                {o.type.toLowerCase()}
                {live ? '' : ' (folded)'}
              </ThemedText>
            );
          })}
        </View>
      </View>

      {/* The board and your hand, on your felt. */}
      <View
        accessibilityLabel={`Board ${scenario.board.join(' ')}. Your hand ${scenario.hero.cards.join(' ')}`}
        style={{
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: look.felt,
        }}
      >
        <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
          {scenario.board.map((c, i) => (
            <PlayingCard key={c} card={c} size="md" flip delay={i * 80} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ThemedText variant="caption1" tone="onColor">
            Your hand
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
            {scenario.hero.cards.map((c) => (
              <PlayingCard key={c} card={c} size="md" />
            ))}
          </View>
          <View>
            <ThemedText variant="caption1" tone="onColor">
              Pot{' '}
              <ThemedText variant="body" tone="onColor" style={[{ fontWeight: '700' }, NUM]}>
                {bb(r.pot)}
              </ThemedText>
            </ThemedText>
            <ThemedText variant="caption1" style={[{ color: 'rgba(255,255,255,0.7)' }, NUM]}>
              You have {bb(r.stacks[scenario.hero.pos] ?? 0)} behind
            </ThemedText>
          </View>
        </View>
      </View>

      {/* The hand log, street by street. */}
      <Cell gap={spacing.sm}>
        {streets.map((st) => (
          <View key={st}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <ThemedText variant="headline">{STREET_NAME[st]}</ThemedText>
              {boardAt[st].length > 0 && (
                <View style={{ flexDirection: 'row', gap: spacing.xxs }}>
                  {boardAt[st].map((c) => (
                    <PlayingCard key={c} card={c} size="sm" />
                  ))}
                </View>
              )}
              {st !== 'preflop' && r.potAt[st] !== undefined && (
                <ThemedText variant="footnote" tone="tertiaryLabel" style={[{ marginLeft: 'auto' }, NUM]}>
                  pot {bb(r.potAt[st]!)}
                </ThemedText>
              )}
            </View>
            {st === 'preflop' ? (
              <ThemedText variant="caption1" tone="tertiaryLabel" style={[{ marginTop: 2 }, NUM]}>
                Blinds 0.5bb and 1bb{scenario.ante ? `, ${bb(scenario.ante)} big blind ante` : ''} · stacks{' '}
                {[scenario.hero.pos, ...scenario.opponents.map((o) => o.pos)]
                  .map((p) => `${p === scenario.hero.pos ? 'you' : p} ${bb(r.start[p] ?? scenario.stack)}`)
                  .join(', ')}
              </ThemedText>
            ) : (
              r.stacksAt[st] && (
                <ThemedText variant="caption1" tone="tertiaryLabel" style={[{ marginTop: 2 }, NUM]}>
                  Stacks{' '}
                  {Object.entries(r.stacksAt[st]!)
                    .map(([p, v]) => `${p === scenario.hero.pos ? 'you' : p} ${bb(Math.round(v! * 10) / 10)}`)
                    .join(', ')}
                </ThemedText>
              )
            )}
            <View style={{ marginTop: spacing.xxs }}>
              {r.lines
                .filter((l) => l.street === st)
                .map((l, i) => (
                  <ThemedText key={i} variant="subhead" tone="secondaryLabel" style={{ paddingVertical: 2 }}>
                    {l.text}
                    {l.left !== undefined && (
                      <ThemedText variant="caption1" tone="tertiaryLabel" style={NUM}>
                        {' '}
                        · {l.left > 0 ? `${bb(l.left)} behind` : 'all in'}
                      </ThemedText>
                    )}
                  </ThemedText>
                ))}
              {st === decision && (
                <ThemedText variant="subhead" tone="accent" style={{ paddingVertical: 2, fontWeight: '600' }}>
                  {facing ? (options.some((o) => o.id === 'raise') ? 'Your move: fold, call or raise?' : 'Your move: fold or call?') : 'Your move'}
                </ThemedText>
              )}
            </View>
          </View>
        ))}
      </Cell>

      {!pick ? (
        <Animated.View exiting={exit(reduce)} style={{ gap: spacing.xs }} accessibilityLabel="Your options">
          {options.map((o) => (
            <Button key={o.id} title={o.label} variant="secondary" onPress={() => answer(o.id)} />
          ))}
        </Animated.View>
      ) : (
        <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
          {/* Motion rules: the verdict pops in from 95% (10, 13), then the parts under it settle 30ms apart (6, 3). */}
          <Animated.View
            entering={reduce ? undefined : popIn()}
            style={{
              gap: 2,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radius.sm,
              borderCurve: 'continuous',
              backgroundColor: gradeLook[grade!].bg,
            }}
          >
            <ThemedText variant="title3" style={{ fontWeight: '700', color: gradeLook[grade!].ink }}>
              {GRADE[grade!]}
            </ThemedText>
            <ThemedText variant="subhead" style={{ color: gradeLook[grade!].ink }}>
              {pick === scenario.best ? best?.label : `Best: ${best?.label}`}
            </ThemedText>
          </Animated.View>
          <Animated.View entering={detail(0, reduce)}>
            <ThemedText variant="body">{scenario.why}</ThemedText>
            <ThemedText variant="footnote" tone="secondaryLabel" onPress={() => void Linking.openURL(scenario.source.url)} accessibilityRole="link">
              From {scenario.source.by}: {scenario.source.title}
              {scenario.source.note ? ` (${scenario.source.note})` : ''}
            </ThemedText>
          </Animated.View>

          {evs && (
            <Animated.View entering={detail(1, reduce)}>
              <Cell>
                {facing ? (
                  <>
                    <ThemedText variant="subhead">
                      You need{' '}
                      <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
                        {pct(evs.price)}
                      </ThemedText>{' '}
                      to call
                    </ThemedText>
                    <ThemedText variant="subhead">
                      You win{' '}
                      <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
                        {pct(evs.equity)}
                      </ThemedText>{' '}
                      against {inPot.length > 1 ? 'everyone still in' : 'their range'}
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText variant="subhead">
                    At a showdown now you’d win{' '}
                    <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
                      {pct(evs.equity)}
                    </ThemedText>{' '}
                    of the pot
                    {inPot.length > 1 ? ' against everyone still in' : ''}
                  </ThemedText>
                )}
                <ThemedText variant="subhead" style={{ marginTop: spacing.xs, fontWeight: '600' }}>
                  What each play wins on average
                </ThemedText>
                <View style={{ gap: spacing.xxs }}>
                  {evs.rows.map((row, i) => {
                    const isBest = row.id === scenario.best;
                    const isPick = row.id === pick;
                    const ink = isBest ? (colors.goldInk as string) : undefined;
                    return (
                      <Animated.View
                        key={row.id}
                        entering={detail(i + 1, reduce)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.xs,
                          paddingVertical: spacing.xxs,
                          paddingHorizontal: spacing.xs,
                          borderRadius: radius.xs,
                          backgroundColor: isBest ? colors.goldBg : isPick ? colors.cellPressed : 'transparent',
                        }}
                      >
                        <ThemedText variant="subhead" numberOfLines={1} style={[{ flex: 1.4 }, ink ? { color: ink } : null]}>
                          {label(row.id)}
                        </ThemedText>
                        <View style={{ flex: 1 }}>
                          <Bar
                            share={Math.abs(row.ev) / topEv}
                            color={row.ev >= 0 ? brand.violet : (colors.quaternaryLabel as string)}
                            height={6}
                          />
                        </View>
                        <ThemedText variant="subhead" style={[{ fontWeight: '700' }, NUM, ink ? { color: ink } : null]}>
                          {signed(row.ev)}
                        </ThemedText>
                      </Animated.View>
                    );
                  })}
                </View>
              </Cell>
            </Animated.View>
          )}

          <Animated.View entering={detail(2, reduce)}>
            <ThemedText variant="title3" accessibilityRole="header" style={{ marginTop: spacing.xs }}>
              What each street told you
            </ThemedText>
            <View style={{ gap: spacing.xs }}>
              {scenario.clues.map((c, i) => {
                return (
                  <View key={i} style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <ThemedText variant="subhead" tone="tertiaryLabel" style={[{ width: 20, textAlign: 'right' }, NUM]}>
                      {i + 1}.
                    </ThemedText>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="subhead">
                        <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
                          {STREET_NAME[c.street]}
                        </ThemedText>{' '}
                        {c.text}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {views.map((v) => {
            const total = v.groups.reduce((n, g) => n + g.weight, 0) || 1;
            // Biggest groups first; small ones wait behind "Show all" (a multiway range can have twenty).
            const sorted = [...v.groups].sort((a, b) => b.weight - a.weight);
            const big = sorted.filter((g, i) => i < 8 && g.weight / total >= 0.02);
            const shown = open.includes(v.opponent.pos) || sorted.length - big.length <= 2 ? sorted : big;
            return (
              <View key={v.opponent.pos} style={{ gap: spacing.xs }}>
                <ThemedText variant="title3" accessibilityRole="header" style={{ marginTop: spacing.xs }}>
                  {views.length > 1 ? `${v.opponent.pos}’s range now` : 'Their range now'}
                  <ThemedText variant="caption1" tone="tertiaryLabel">
                    {' '}
                    {v.opponent.type.toLowerCase()}
                  </ThemedText>
                </ThemedText>
                {shown.map((g) => (
                  // Rule 20: Show all keeps every group that was already there and lets the list grow round it.
                  <Animated.View
                    key={g.group.label + g.group.role}
                    layout={reduce ? undefined : LinearTransition.duration(250).easing(EASE_OUT)}
                    style={{
                      gap: spacing.xxs,
                      padding: spacing.sm,
                      borderRadius: radius.sm,
                      borderCurve: 'continuous',
                      backgroundColor: colors.cell,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <View
                        style={{
                          paddingVertical: 2,
                          paddingHorizontal: spacing.xs,
                          borderRadius: radius.full,
                          backgroundColor: colors.cellPressed,
                        }}
                      >
                        <ThemedText variant="caption2" tone="secondaryLabel" style={{ fontWeight: '600' }}>
                          {respond(g.group, facing, dead)}
                        </ThemedText>
                      </View>
                      <ThemedText variant="subhead" style={{ flex: 1 }}>
                        {g.group.label}
                      </ThemedText>
                      <ThemedText variant="subhead" tone="tertiaryLabel" style={NUM}>
                        {pct(g.weight / total)}
                      </ThemedText>
                    </View>
                    <View accessibilityLabel={`You win ${pct(g.equity)} against these`}>
                      <Bar share={g.equity} color={g.equity >= 0.5 ? brand.violet : (colors.quaternaryLabel as string)} />
                    </View>
                    <ThemedText variant="caption1" tone="tertiaryLabel">
                      {g.combos} combo{g.combos === 1 ? '' : 's'} · you win {pct(g.equity)} against these
                    </ThemedText>
                  </Animated.View>
                ))}
                {shown.length < sorted.length && (
                  <Button
                    variant="secondary"
                    title={`Show all ${sorted.length} groups (${pct(sorted.slice(shown.length).reduce((n, g) => n + g.weight, 0) / total)} more of their range)`}
                    onPress={() => setOpen([...open, v.opponent.pos])}
                  />
                )}
              </View>
            );
          })}
          <Button title="Next hand" onPress={next} style={{ marginTop: spacing.xs }} />
        </View>
      )}
    </View>
  );
}
