// Range training: the web's RangeTrainer.tsx (src/screens/RangeTrainer.tsx), one to one, in the app's type, colours
// and controls. A hand played to the turn or river with the whole action log, one decision, then why: what each
// street told you, every opponent's range broken down with how your hand does against each part of it, and what
// each play wins on average. The numbers come from range-numbers.json (worked out ahead, see state/ranges.ts).
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Linking, useColorScheme, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { BoardTable } from '@/components/range/board-table';
import { HandHistory, ReplayStrip } from '@/components/range/hand-history';
import { SwapIcon } from '@/components/swap';
import { PressableScale } from '@/components/pressable-scale';
import { useTabFooter } from '@/components/tab-screen';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { detail, EASE_OUT, popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { answerHand, nextHand, numbersFor } from '@/state/ranges';
import { eventsOf, firstSentence, viewAt } from '@/state/range-view';
import { brand, radius, spacing, useColors, usePlainColors } from '@/theme';
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
export function RangeTrainer({ onNext, onTop, focus, onStopFocus }: { onNext?: () => void; /** Scrolls the page back up to the table (a street tapped in the history replays on it). */ onTop?: () => void; /** Practising only these kinds of spot (from Stats). */ focus?: string[]; onStopFocus?: () => void }) {
  const colors = useColors();
  const reduce = useReduceMotion();
  const [scenario, setScenario] = useState<Scenario>(() => nextHand(null, Math.random, focus));
  // Replaying the hand's history on the table (only when asked), and whether the details under the verdict are open.
  const [step, setStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [more, setMore] = useState(false);
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
  const events = useMemo(() => eventsOf(scenario, r), [scenario, r]);
  const view = useMemo(() => viewAt(scenario, r, events, step), [scenario, r, events, step]);
  // The replay plays itself a move at a time while it's playing, and stops at the end.
  useEffect(() => {
    if (!playing || step === null) return;
    const end = step >= events.length;
    const t = setTimeout(() => (end ? setPlaying(false) : setStep(step + 1)), end ? 0 : 1100);
    return () => clearTimeout(t);
  }, [playing, step, events.length]);

  const answer = (id: OptionId) => {
    if (pick) return;
    const grade = answerHand(scenario, id);
    if (grade === 'mistake') haptic.failure();
    else haptic.success();
    setPick(id);
  };
  const next = () => {
    setScenario(nextHand(scenario, Math.random, focus));
    setOpen([]);
    setPick(null);
    setStep(null);
    setPlaying(false);
    setMore(false);
    onNext?.();
  };

  const grade = pick ? gradeOf(scenario, pick) : null;
  const best = options.find((o) => o.id === scenario.best);
  const facing = r.toCall > 0;
  const label = (id: OptionId) => options.find((o) => o.id === id)?.label ?? id;
  const inPot = scenario.opponents.filter((o) => r.live.includes(o.pos));
  const topEv = evs ? Math.max(...evs.rows.map((x) => Math.abs(x.ev)), 0.1) : 1;
  const dead = [...scenario.hero.cards, ...scenario.board];
  const gradeLook: Record<Grade, { bg: string; ink: string }> = {
    best: { bg: colors.goldBg as string, ink: colors.goldInk as string },
    ok: { bg: colors.blueBg as string, ink: colors.blueInk as string },
    mistake: { bg: colors.cell as string, ink: colors.secondaryLabel as string },
  };

  const kind = (id: OptionId): 'fold' | 'blue' | 'raise' => (id === 'fold' ? 'fold' : id === 'call' || id === 'check' ? 'blue' : 'raise');
  // The answer bar, pinned under the page above the tab bar: your options, then Next hand once you've answered.
  const bar = !pick ? (
    <View accessibilityLabel="Your options" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {options.map((o) => (
        <AnswerButton key={o.id} label={o.label} kind={kind(o.id)} wide={options.length > 3} onPress={() => answer(o.id)} />
      ))}
    </View>
  ) : (
    <Button title="Next hand" onPress={next} />
  );
  useTabFooter(bar);

  return (
    <View key={scenario.id} style={{ gap: spacing.md }}>
      {focus?.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs, paddingLeft: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.blueBg }}>
          <ThemedText variant="footnote" numberOfLines={2} style={{ flex: 1, fontWeight: '600', color: colors.blueInk }}>
            Practising: {focus.join(', ')}
          </ThemedText>
          <Button title="Done" variant="secondary" size="md" onPress={() => onStopFocus?.()} style={{ minHeight: 36, height: 36, paddingHorizontal: spacing.sm }} />
        </View>
      ) : null}

      {/* What the hand teaches, then its name. */}
      <View style={{ gap: 2 }}>
        <ThemedText variant="caption1" tone="accent" style={{ fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {scenario.concept}
        </ThemedText>
        <ThemedText variant="title2" accessibilityRole="header">
          {scenario.title}
        </ThemedText>
      </View>

      {/* Your answer comes first, right under the title, so it's never below the fold. */}
      {pick ? (
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <SwapIcon name={grade === 'mistake' ? 'arrow.counterclockwise' : 'checkmark.circle.fill'} size={20} color={gradeLook[grade!].ink} />
              <ThemedText variant="title3" style={{ fontWeight: '700', color: gradeLook[grade!].ink }}>
                {GRADE[grade!]}
              </ThemedText>
            </View>
            <ThemedText variant="subhead" style={{ color: gradeLook[grade!].ink }}>
              {pick === scenario.best ? best?.label : `Best: ${best?.label}`}
            </ThemedText>
            <ThemedText variant="subhead" style={{ color: gradeLook[grade!].ink, marginTop: spacing.xxs }}>
              {firstSentence(scenario.why)}
            </ThemedText>
          </Animated.View>
          <View style={{ gap: spacing.sm }}>
            <Button title={more ? 'Hide the details' : 'Show me more'} variant="secondary" onPress={() => setMore(!more)} />
          </View>
          {more && (
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="body">{scenario.why}</ThemedText>
              <ThemedText variant="footnote" tone="secondaryLabel" onPress={() => void Linking.openURL(scenario.source.url)} accessibilityRole="link">
                From {scenario.source.by}: {scenario.source.title}
                {scenario.source.note ? ` (${scenario.source.note})` : ''}
              </ThemedText>
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
            </View>
          )}
        </View>
      ) : null}

      {/* The table as it stands: everyone's seat, the pot and the whole board. Nothing deals unless you replay. */}
      <BoardTable scenario={scenario} view={view} />
      <ReplayStrip step={step} total={events.length} playing={playing} onStep={setStep} onPlaying={setPlaying} />

      {/* Your hand, with what it costs and where you sit. */}
      <View accessibilityLabel={`Your hand ${scenario.hero.cards.join(' ')}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {scenario.hero.cards.map((c) => (
            <PlayingCard key={c} card={c} size="md" width={56} />
          ))}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="title3" style={NUM}>
            {facing ? `${bb(r.toCall)} to call` : 'Checked to you'}
          </ThemedText>
          <ThemedText variant="subhead" tone="secondaryLabel" style={NUM}>
            You’re {scenario.hero.pos} · {bb(r.stacks[scenario.hero.pos] ?? 0)} behind
          </ThemedText>
          <ThemedText variant="footnote" tone="tertiaryLabel">
            {scenario.format === 'tournament' ? 'Tournament' : scenario.table === 9 ? 'Live cash' : 'Cash'}, {scenario.table === 9 ? '9' : '6'}-handed
          </ThemedText>
        </View>
      </View>

      <HandHistory
        scenario={scenario}
        events={events}
        pot={r.potAt}
        step={step}
        onJump={(n) => {
          setStep(n);
          setPlaying(true);
          onTop?.();
        }}
        decision={facing ? (options.some((o) => o.id === 'raise') ? 'fold, call or raise?' : 'fold or call?') : 'check or bet?'}
      />

    </View>
  );
}

/** One answer in the pinned bar: Fold in red, Call and Check in the table's blue, Bet and Raise in its green. */
function AnswerButton({ label, kind, wide, onPress }: { label: string; kind: 'fold' | 'blue' | 'raise'; /** Four options: two to a row. */ wide: boolean; onPress: () => void }) {
  const colors = useColors();
  const c = usePlainColors();
  const blue = useColorScheme() === 'dark' ? '#0a84ff' : '#007aff';
  const look = kind === 'fold' ? { bg: c.redBg, ink: c.redInk } : kind === 'blue' ? { bg: blue, ink: '#ffffff' } : { bg: brand.raise, ink: '#ffffff' };
  return (
    <View style={{ flexGrow: 1, flexBasis: wide ? '47%' : '30%' }}>
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      outerStyle={{ width: '100%' }}
      style={{ width: '100%', minHeight: 52, paddingHorizontal: spacing.xs, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: look.bg || (colors.cell as string) }}
    >
      <ThemedText variant="subhead" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: look.ink, fontWeight: '700', textAlign: 'center' }}>
        {label}
      </ThemedText>
    </PressableScale>
    </View>
  );
}
