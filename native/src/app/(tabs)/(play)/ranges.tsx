import { Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, useColorScheme, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { enter } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { answerHand, computeNumbers, hasStoredNumbers, nextHand, numbersFor, SCENARIOS, solvedCount, useRangeGrades, type HandNumbers } from '@/state/ranges';
import { brand, minTap, radius, ROUNDED, spacing, useColors, usePlainColors, useShadows } from '@/theme';
import { bb, gradeOf, optionsFor, replay, type Grade, type OptionId, type RangeGroup, type Street } from '@train/ranges/model';

// Range training (the web's RangeTrainer.tsx, on the phone): a hand played to the turn or river with the whole
// action log, one decision, then why: what each street told you, every opponent's range broken down with how your
// hand does against each part of it, and what each play wins on average. The hands and the grading are the shared
// model's (src/train/ranges); the numbers come from state/ranges.ts.

const STREET_NAME: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const GRADE: Record<Grade, string> = { best: 'Best play', ok: 'Also good', mistake: 'Not this time' };
const GRADE_ICON: Record<Grade, IconName> = { best: 'checkmark.circle.fill', ok: 'hand.thumbsup.fill', mistake: 'xmark.circle.fill' };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${bb(Math.abs(Math.round(n * 10) / 10))}`;

/** What a group does, in a few words: "Value", or "Folds · calls ⅓" when a small bet changes its mind. */
function respond(g: RangeGroup, facing: boolean): string {
  if (facing) return g.role === 'value' ? 'Value' : g.role === 'bluff' ? 'Bluff' : 'Called';
  const word = { calls: 'Calls', folds: 'Folds', raises: 'Raises', value: 'Value', bluff: 'Bluff' };
  const extra = [g.small && g.small !== g.role ? `${word[g.small].toLowerCase()} ⅓` : '', g.big && g.big !== g.role ? `${word[g.big].toLowerCase()} to an overbet` : ''].filter(Boolean);
  return [word[g.role], ...extra].join(' · ');
}

export default function RangeTrainerScreen() {
  const colors = useColors();
  const reduce = useReduceMotion();
  const grades = useRangeGrades();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const reviewY = useRef(0);
  const [scenario, setScenario] = useState(() => nextHand(null));
  const [pick, setPick] = useState<OptionId | null>(null);
  const [numbers, setNumbers] = useState<HandNumbers | null>(null);
  const r = useMemo(() => replay(scenario), [scenario]);
  const options = useMemo(() => optionsFor(scenario, r), [scenario, r]);

  // The numbers come from the file; a hand that isn't in it is worked out a moment after you answer, so the grade
  // shows first and a spinner holds the place of the numbers.
  useEffect(() => {
    if (!pick) return setNumbers(null);
    if (hasStoredNumbers(scenario.id)) return setNumbers(numbersFor(scenario, r));
    const t = setTimeout(() => setNumbers(computeNumbers(scenario, r)), 50);
    return () => clearTimeout(t);
  }, [pick, scenario, r]);

  const facing = r.toCall > 0;
  const decision: Street = scenario.board.length === 4 ? 'turn' : 'river';
  const boardAt: Record<Street, string[]> = { preflop: [], flop: scenario.board.slice(0, 3), turn: scenario.board.slice(3, 4), river: scenario.board.slice(4, 5) };
  const streets = (['preflop', 'flop', 'turn', 'river'] as Street[]).slice(0, scenario.board.length - 1);
  const inPot = scenario.opponents.filter((o) => r.live.includes(o.pos));
  const grade = pick ? gradeOf(scenario, pick) : null;
  const best = options.find((o) => o.id === scenario.best)!;
  const label = (id: OptionId) => options.find((o) => o.id === id)?.label ?? id;

  const answer = (id: OptionId) => {
    if (pick) return;
    const g = answerHand(scenario, id);
    if (g === 'mistake') haptic.failure();
    else haptic.success();
    setPick(id);
    // Bring the grade up into view once it has drawn.
    setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, reviewY.current - spacing.md), animated: !reduce }), 60);
  };
  const next = () => {
    haptic.tap();
    setScenario(nextHand(scenario.id));
    setPick(null);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Range training',
          headerLargeTitleEnabled: false,
          headerRight: () => (
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '600', color: colors.secondaryLabel, fontVariant: ['tabular-nums'], paddingHorizontal: spacing.xs }}>
              {solvedCount(grades)} of {SCENARIOS.length}
            </Text>
          ),
        }}
      />
      <ScrollView
        ref={scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.lg, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center' }}
      >
        {/* What the hand is about, and who's in it. */}
        <View style={{ gap: spacing.xxs }}>
          <ThemedText variant="subhead" tone="accent" style={{ fontWeight: '700' }}>
            {scenario.concept}
          </ThemedText>
          <ThemedText variant="title1" accessibilityRole="header">
            {scenario.title}
          </ThemedText>
          <ThemedText variant="callout" tone="secondaryLabel">
            You’re {scenario.hero.pos} · {scenario.table === 9 ? '9-handed live' : '6-handed'} · {scenario.stack}bb deep
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
            {scenario.opponents.map((o) => {
              const out = !r.live.includes(o.pos);
              return (
                <View key={o.pos} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs + 2, borderRadius: radius.full, backgroundColor: colors.cell, opacity: out ? 0.55 : 1 }}>
                  <ThemedText variant="footnote" style={{ fontWeight: '700' }}>
                    {o.pos}
                  </ThemedText>
                  <ThemedText variant="footnote" tone="secondaryLabel">
                    {o.type.toLowerCase()}
                    {out ? ' (folded)' : ''}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        <HandCard scenario={scenario} pot={r.pot} />

        {/* The hand log, a street at a time. */}
        <Box>
          {streets.map((st, i) => (
            <View key={st} style={{ gap: spacing.xxs, paddingTop: i ? spacing.sm : 0, borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.separator }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 28 }}>
                <ThemedText variant="headline">{STREET_NAME[st]}</ThemedText>
                {boardAt[st].length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {boardAt[st].map((c) => (
                      <PlayingCard key={c} card={c} size="sm" />
                    ))}
                  </View>
                )}
                <View style={{ flex: 1 }} />
                {st !== 'preflop' && r.potAt[st] !== undefined && (
                  <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontVariant: ['tabular-nums'] }}>
                    pot {bb(r.potAt[st]!)}
                  </ThemedText>
                )}
              </View>
              {r.lines
                .filter((l) => l.street === st)
                .map((l, k) => (
                  <ThemedText key={k} variant="callout">
                    {l.text}
                  </ThemedText>
                ))}
              {st === decision && (
                <ThemedText variant="callout" tone="accent" style={{ fontWeight: '700' }}>
                  {facing ? 'Your move: call, fold or raise?' : 'Your move'}
                </ThemedText>
              )}
            </View>
          ))}
        </Box>

        {!pick ? (
          <View style={{ gap: spacing.sm }} accessibilityLabel="Your options">
            {options.map((o) => (
              <Choice key={o.id} id={o.id} label={o.label} onPress={() => answer(o.id)} />
            ))}
          </View>
        ) : (
          <Animated.View
            entering={enter(reduce)}
            style={{ gap: spacing.lg }}
            onLayout={(e) => {
              reviewY.current = e.nativeEvent.layout.y;
            }}
          >
            <GradeCard grade={grade!} line={pick === scenario.best ? best.label : `Best: ${best.label}`} />
            <ThemedText variant="body">{scenario.why}</ThemedText>

            {numbers ? (
              <Numbers numbers={numbers} facing={facing} multiway={inPot.length > 1} best={scenario.best} pick={pick} label={label} />
            ) : (
              <Box>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTap }}>
                  <ActivityIndicator />
                  <ThemedText variant="callout" tone="secondaryLabel">
                    Dealing it out…
                  </ThemedText>
                </View>
              </Box>
            )}

            <View style={{ gap: spacing.sm }}>
              <Heading>What each street told you</Heading>
              <Box>
                {scenario.clues.map((c, i) => (
                  <View key={i} style={{ gap: 2, paddingTop: i ? spacing.sm : 0, borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.separator }}>
                    <ThemedText variant="subhead" tone="secondaryLabel" style={{ fontWeight: '700' }}>
                      {STREET_NAME[c.street]}
                    </ThemedText>
                    <ThemedText variant="callout">{c.text}</ThemedText>
                  </View>
                ))}
              </Box>
            </View>

            {numbers &&
              numbers.views.map((v) => {
                const o = scenario.opponents.find((x) => x.pos === v.pos)!;
                const total = v.groups.reduce((n, g) => n + g.weight, 0) || 1;
                return (
                  <View key={v.pos} style={{ gap: spacing.sm }}>
                    <Heading sub={o.type.toLowerCase()}>{numbers.views.length > 1 ? `${v.pos}’s range now` : 'Their range now'}</Heading>
                    <Box>
                      {o.range.map((g, i) => (
                        <RangeRow key={g.label + g.role} group={g} role={respond(g, facing)} share={v.groups[i].weight / total} combos={v.groups[i].combos} equity={v.groups[i].equity} first={i === 0} />
                      ))}
                    </Box>
                  </View>
                );
              })}

            <Button title="Next hand" variant="party" size="lg" onPress={next} />
          </Animated.View>
        )}
      </ScrollView>
    </>
  );
}

/** A grey box with the app's card shadow. */
function Box({ children }: { children: ReactNode }) {
  const colors = useColors();
  const shadows = useShadows();
  return <View style={{ padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, boxShadow: shadows.card }}>{children}</View>;
}

function Heading({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flexWrap: 'wrap' }}>
      <ThemedText variant="title3" accessibilityRole="header">
        {children}
      </ThemedText>
      {sub && (
        <ThemedText variant="subhead" tone="secondaryLabel">
          {sub}
        </ThemedText>
      )}
    </View>
  );
}

/** The board and your hand on the night card, with the pot. */
function HandCard({ scenario, pot }: { scenario: (typeof SCENARIOS)[number]; pot: number }) {
  const shadows = useShadows();
  return (
    <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card }}>
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: brand.violetNight, padding: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }} accessibilityLabel={`Board: ${scenario.board.join(' ')}`}>
          {scenario.board.map((c, i) => (
            <PlayingCard key={c} card={c} size="md" flip delay={i * 80} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ gap: spacing.xxs }}>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>
              Your hand
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.xxs }} accessibilityLabel={`Your hand: ${scenario.hero.cards.join(' ')}`}>
              {scenario.hero.cards.map((c) => (
                <PlayingCard key={c} card={c} size="lg" width={58} />
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>
              Pot
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 34, lineHeight: 40, fontWeight: '800', color: brand.gold, fontVariant: ['tabular-nums'] }}>
              {bb(pot)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** One answer, coloured as at the table: Fold red, Call and Check system blue, Raise and bets green. */
function Choice({ id, label, onPress }: { id: OptionId; label: string; onPress: () => void }) {
  const c = usePlainColors();
  const blue = useColorScheme() === 'dark' ? '#0a84ff' : '#007aff';
  const look = id === 'fold' ? { bg: c.redBg, ink: c.redInk } : id === 'call' || id === 'check' ? { bg: blue, ink: '#ffffff' } : { bg: brand.raise, ink: '#ffffff' };
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      haptics={false}
      onPress={onPress}
      style={{ minHeight: 56, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, backgroundColor: look.bg }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ color: look.ink, fontSize: 18, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
    </PressableScale>
  );
}

function GradeCard({ grade, line }: { grade: Grade; line: string }) {
  const colors = useColors();
  const c = usePlainColors();
  const tint = grade === 'best' ? brand.gold : grade === 'ok' ? (colors.accent as string) : c.redInk;
  return (
    <View accessibilityLiveRegion="polite" accessible accessibilityLabel={`${GRADE[grade]}. ${line}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      <Icon name={GRADE_ICON[grade]} size={34} color={tint} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 29, fontWeight: '800', color: tint }}>
          {GRADE[grade]}
        </Text>
        <ThemedText variant="callout" tone="secondaryLabel">
          {line}
        </ThemedText>
      </View>
    </View>
  );
}

/** Your odds against the price, and what each play wins on average, best and yours marked. */
function Numbers({ numbers, facing, multiway, best, pick, label }: { numbers: HandNumbers; facing: boolean; multiway: boolean; best: OptionId; pick: OptionId; label: (id: OptionId) => string }) {
  const colors = useColors();
  const top = Math.max(...numbers.rows.map((x) => Math.abs(x.ev)), 0.1);
  return (
    <Box>
      {facing ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Stat value={pct(numbers.price)} line="you need to call" />
          <Stat value={pct(numbers.equity)} line={multiway ? 'you win against everyone still in' : 'you win against their range'} gold={numbers.equity >= numbers.price} />
        </View>
      ) : (
        <Stat value={pct(numbers.equity)} line={`of the pot you’d win at a showdown now${multiway ? ', against everyone still in' : ''}`} gold />
      )}
      <ThemedText variant="subhead" tone="secondaryLabel" style={{ fontWeight: '700', marginTop: spacing.xs }}>
        What each play wins on average
      </ThemedText>
      {numbers.rows.map((row) => (
        <View key={row.id} style={{ gap: spacing.xxs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <ThemedText variant="callout" style={{ flexShrink: 1, fontWeight: row.id === best ? '700' : '400' }} numberOfLines={1}>
              {label(row.id)}
            </ThemedText>
            {row.id === best && <Tag text="Best" gold />}
            {row.id === pick && <Tag text="You" />}
            <View style={{ flex: 1 }} />
            <ThemedText variant="callout" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {signed(row.ev)}
            </ThemedText>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.separator, overflow: 'hidden' }}>
            <View style={{ height: 6, borderRadius: 3, width: `${Math.round((Math.abs(row.ev) / top) * 100)}%`, backgroundColor: row.ev >= 0 ? (colors.accent as string) : (colors.tertiaryLabel as string) }} />
          </View>
        </View>
      ))}
    </Box>
  );
}

function Stat({ value, line, gold }: { value: string; line: string; gold?: boolean }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 34, lineHeight: 40, fontWeight: '800', fontVariant: ['tabular-nums'], color: gold ? brand.gold : colors.label }}>
        {value}
      </Text>
      <ThemedText variant="footnote" tone="secondaryLabel">
        {line}
      </ThemedText>
    </View>
  );
}

function Tag({ text, gold }: { text: string; gold?: boolean }) {
  const colors = useColors();
  return (
    <View style={{ paddingHorizontal: spacing.xs, paddingVertical: 1, borderRadius: radius.full, backgroundColor: gold ? brand.gold : (colors.blueBg as string) }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: '700', color: gold ? brand.goldInk : (colors.accent as string) }}>
        {text}
      </Text>
    </View>
  );
}

/** One group of their hands: what it does, its name, its share of their range, and a bar of how often you win. */
function RangeRow({ group, role, share, combos, equity, first }: { group: RangeGroup; role: string; share: number; combos: number; equity: number; first: boolean }) {
  const colors = useColors();
  const ahead = equity >= 0.5;
  return (
    <View accessible accessibilityLabel={`${group.label}: ${role}, ${pct(share)} of their range. You win ${pct(equity)} against these.`} style={{ gap: spacing.xxs, paddingTop: first ? 0 : spacing.sm, borderTopWidth: first ? 0 : 0.5, borderTopColor: colors.separator }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <ThemedText variant="callout" style={{ flex: 1, fontWeight: '600' }}>
          {group.label}
        </ThemedText>
        <ThemedText variant="callout" tone="secondaryLabel" style={{ fontVariant: ['tabular-nums'] }}>
          {pct(share)}
        </ThemedText>
      </View>
      <ThemedText variant="footnote" tone="accent" style={{ fontWeight: '700' }}>
        {role}
      </ThemedText>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.separator, overflow: 'hidden' }}>
        <View style={{ height: 8, borderRadius: 4, width: `${Math.round(equity * 100)}%`, backgroundColor: ahead ? brand.gold : (colors.accent as string) }} />
      </View>
      <ThemedText variant="footnote" tone="secondaryLabel">
        {combos} combo{combos === 1 ? '' : 's'} · you win {pct(equity)} against these
      </ThemedText>
    </View>
  );
}
