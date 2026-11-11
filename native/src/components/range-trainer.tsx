// Range training: the web's RangeTrainer.tsx (src/screens/RangeTrainer.tsx) in the app's type, colours and controls,
// in three steps on one page. Read: the table as it stands at your decision, the hand street by street in a line
// each, and your cards. Decide: your options pinned at the bottom (a Hint and Skip under your hand). Learn: the
// options open into the result card (components/range/result-card.tsx) in the same place, so the table above never
// moves, while the opponents' likely hands turn up on their seats; Breakdown opens the whole why in a sheet.
// The numbers come from range-numbers.json (worked out ahead, see state/ranges.ts).
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { BoardTable } from '@/components/range/board-table';
import { GlassButton } from '@/components/range/glass-button';
import { HandStory, ReplayStrip } from '@/components/range/hand-history';
import { ResultCard } from '@/components/range/result-card';
import { exampleOf, topGroups } from '@/components/range/their-hands';
import { PressableScale } from '@/components/pressable-scale';
import { cardName, describeHand, rankLabel, suitOf } from '@/engine';
import { playSound } from '@/components/table/sounds';
import { useTabFooter } from '@/components/tab-screen';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { readRangeHistory, runOf } from '@/state/range-history';
import { cheersRun, pileBet, pilesOf } from '@/state/range-result';
import { answerHand, nextHand, numbersFor } from '@/state/ranges';
import { eventsOf, firstSentence, viewAt } from '@/state/range-view';
import { radius, spacing, useColors } from '@/theme';
import { bb, gradeOf, optionsFor, replay, type Grade, type OptionId, type Pos, type Scenario, type Street } from '@train/ranges/model';

const STREET_NAME: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const NUM = { fontVariant: ['tabular-nums' as const] };

/** The answer bar's glass tints: Fold red, Check and Call blue, bets and raises green, deeper for bigger bets. */
const TINT = {
  fold: 'rgba(235,72,60,0.6)',
  blue: 'rgba(37,87,214,0.82)',
  small: 'rgba(34,179,94,0.72)',
  mid: 'rgba(34,179,94,0.84)',
  big: 'rgba(20,132,63,0.88)',
} as const;

/** The trainer: one hand, your answer, then why. `onNext` runs after Next hand deals the next one (to scroll up). */
export function RangeTrainer({ onNext, onTop, onScrollTo, focus, onStopFocus, onAnswer, onFinish, finishTitle }: { onNext?: () => void; /** Scrolls the page back up to the table (a street tapped replays on it). */ onTop?: () => void; /** Scrolls the page to this offset (an answer brings the table up to the top, clear of the result card). */ onScrollTo?: (y: number) => void; /** Practising only these kinds of spot (from Stats). */ focus?: string[]; onStopFocus?: () => void; /** Each answer, as it's graded (a set counts them). */ onAnswer?: (s: Scenario, pick: OptionId, grade: Grade) => void; /** Set when this was the last hand of a set: the main button ends the set instead of dealing another. */ onFinish?: () => void; finishTitle?: string }) {
  const colors = useColors();
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario>(() => nextHand(null, Math.random, focus));
  // Replaying the hand on the table (only when asked).
  const [step, setStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  // Hints: the clues for each street, one more each tap (no penalty).
  const [hints, setHints] = useState(0);
  const [pick, setPick] = useState<OptionId | null>(null);
  // Your run counting this answer, and whether it's one worth confetti.
  const [run, setRun] = useState({ n: 0, cheer: false });
  // Where the table is on the page (the trainer's own place plus the table's place in it), to scroll it into view.
  const place = useRef({ root: 0, table: 0 });
  const r = useMemo(() => replay(scenario), [scenario]);
  const options = useMemo(() => optionsFor(scenario, r), [scenario, r]);
  const facing = r.toCall > 0;
  const dead = useMemo(() => [...scenario.hero.cards, ...scenario.board], [scenario]);
  // Once you've answered: the worked-out numbers, and each live opponent's groups with them.
  const evs = useMemo(() => (pick ? numbersFor(scenario, r) : null), [scenario, r, pick]);
  const views = useMemo(
    () =>
      evs
        ? evs.views.flatMap((v) => {
            const opponent = scenario.opponents.find((o) => o.pos === v.pos);
            return opponent ? [{ pos: opponent.pos, groups: opponent.range.map((group, i) => ({ group, ...(v.groups[i] ?? { combos: 0, weight: 0, equity: 0 }) })) }] : [];
          })
        : [],
    [evs, scenario],
  );
  const piles = useMemo(() => pilesOf(views.map((v) => v.groups), facing, dead, pileBet(scenario)), [views, facing, dead, scenario]);
  const events = useMemo(() => eventsOf(scenario, r), [scenario, r]);
  // A light tick as each step of the replay lands.
  useEffect(() => {
    if (step) haptic.select();
  }, [step]);
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
    const n = runOf(readRangeHistory());
    if (grade === 'mistake') haptic.failure();
    else haptic.success();
    // A sound for each result: a win, a soft pop for also good, a quiet knock for a miss.
    playSound(grade === 'best' ? 'win' : grade === 'ok' ? 'pop' : 'check');
    setRun({ n, cheer: grade === 'best' && cheersRun(n) });
    setPlaying(false);
    setStep(null);
    setPick(id);
    onAnswer?.(scenario, id, grade);
    // Their likely hands turn up on the seats: bring the table up to the top, clear of the result card below.
    // A beat later, so the page has made room for the card first.
    const y = Math.max(0, place.current.root + place.current.table - spacing.sm);
    if (onScrollTo) setTimeout(() => onScrollTo(y), 60);
    else onTop?.();
  };
  const next = () => {
    setScenario(nextHand(scenario, Math.random, focus));
    setPick(null);
    setStep(null);
    setPlaying(false);
    setHints(0);
    setRun({ n: 0, cheer: false });
    onNext?.();
  };

  const grade = pick ? gradeOf(scenario, pick) : null;
  const label = (id: OptionId) => options.find((o) => o.id === id)?.label ?? id;
  const inPot = scenario.opponents.filter((o) => r.live.includes(o.pos));

  // Once you've answered: an example of what each opponent most likely had, on their seat.
  const reveal = useMemo(() => {
    if (!pick) return undefined;
    const out: Partial<Record<Pos, [string, string]>> = {};
    for (const v of views) {
      const g = topGroups(v.groups, facing, 1)[0];
      const ex = g ? exampleOf(g, dead) : null;
      if (ex) out[v.pos] = ex;
    }
    return out;
  }, [pick, views, facing, dead]);
  // The replay in words: what just happened and the pot after it.
  const pretty = (c: string) => `${rankLabel(c)}${{ s: '♠', h: '♥', d: '♦', c: '♣' }[suitOf(c)]}`;
  const lastEvent = step !== null && step > 0 ? events[step - 1] : null;
  const narration =
    step === null
      ? undefined
      : !lastEvent
        ? 'Blinds are in'
        : lastEvent.kind === 'deal'
          ? `${STREET_NAME[lastEvent.street]}: ${scenario.board.slice(0, lastEvent.street === 'flop' ? 3 : lastEvent.street === 'turn' ? 4 : 5).map(pretty).join(' ')}`
          : `${lastEvent.text} · pot ${bb(view.pot)}`;
  // What you're holding, in words: "a pair of tens", "two pair, kings and sixes", "ace high".
  const detailText = describeHand([...scenario.hero.cards, ...scenario.board]).detail;
  const lower = detailText.charAt(0).toLowerCase() + detailText.slice(1);
  const made = /^(pair|flush|straight|full house|royal)/.test(lower) ? `a ${lower}` : lower;
  // The table as one sentence for VoiceOver.
  const summary = `The table. You're ${scenario.hero.pos}, holding ${scenario.hero.cards.map(cardName).join(' and ')}. Board: ${view.board.map(cardName).join(', ') || 'not dealt yet'}. Pot ${bb(view.pot)}. ${facing ? `${bb(r.toCall)} to call` : 'Checked to you'}. ${inPot.map((o) => `${o.pos} is ${o.type.toLowerCase()}`).join('. ')}.`;
  const tint = (o: { id: OptionId; label: string }) =>
    o.id === 'fold' ? TINT.fold : o.id === 'call' || o.id === 'check' ? TINT.blue : o.id === 'bet33' ? TINT.small : o.id === 'bet125' || o.label.startsWith('All in') ? TINT.big : TINT.mid;

  // The pinned bar: your options, which open into the result once you've answered (the same place on the screen).
  const bar =
    pick && grade && evs ? (
      <ResultCard
        key={scenario.id}
        grade={grade}
        pick={pick}
        best={scenario.best}
        label={label}
        why={firstSentence(scenario.why)}
        numbers={evs}
        facing={facing}
        piles={piles}
        bet={pileBet(scenario)}
        run={run.n}
        cheer={run.cheer}
        onBreakdown={() => router.push({ pathname: '/range-breakdown', params: { id: scenario.id, pick } })}
        onNext={onFinish ?? next}
        nextTitle={onFinish ? (finishTitle ?? 'See your set') : 'Next hand'}
      />
    ) : (
      <View accessibilityLabel="Your options" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {options.map((o) => (
          <AnswerButton key={o.id} label={o.label} tint={tint(o)} wide={options.length > 3} onPress={() => answer(o.id)} />
        ))}
      </View>
    );
  useTabFooter(bar);

  return (
    <View key={scenario.id} onLayout={(e) => (place.current.root = e.nativeEvent.layout.y)} style={{ gap: spacing.md }}>
      {focus?.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs, paddingLeft: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.blueBg }}>
          <ThemedText variant="footnote" numberOfLines={2} style={{ flex: 1, fontWeight: '600', color: colors.blueInk }}>
            Practising: {focus.some((f) => f.startsWith('id:')) ? `your missed hands (${focus.length})` : focus.join(', ')}
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

      {/* Read: the table as it stands at your decision (nothing deals unless you replay), then the hand in a line a street. */}
      <View onLayout={(e) => (place.current.table = e.nativeEvent.layout.y)} style={{ gap: spacing.sm }}>
        <BoardTable scenario={scenario} view={view} summary={summary} reveal={reveal} />
        <ReplayStrip step={step} total={events.length} playing={playing} narration={narration} onStep={setStep} onPlaying={setPlaying} />
      </View>

      <HandStory
        scenario={scenario}
        events={events}
        pot={r.potAt}
        step={step}
        onJump={(n) => {
          setStep(n);
          setPlaying(true);
          onTop?.();
        }}
      />

      {/* Your hand: what you have, what it costs, where you sit, and who you're up against. */}
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
          <ThemedText variant="subhead" style={{ fontWeight: '700' }}>
            You have {made}
          </ThemedText>
          <ThemedText variant="footnote" tone="secondaryLabel" style={NUM}>
            {scenario.hero.pos} · {bb(r.stacks[scenario.hero.pos] ?? 0)} behind · {scenario.format === 'tournament' ? 'Tournament' : scenario.table === 9 ? 'Live cash' : 'Cash'}, {scenario.table === 9 ? '9' : '6'}-handed
          </ThemedText>
        </View>
      </View>
      <ThemedText variant="footnote" tone="secondaryLabel" accessibilityLabel={`Up against: ${inPot.map((o) => `${o.pos}, ${o.type}`).join('; ')}`}>
        {inPot.map((o, i) => (
          <ThemedText key={o.pos} variant="footnote" tone="secondaryLabel">
            {i > 0 ? '  ·  ' : 'Against '}
            <ThemedText variant="footnote" style={{ fontWeight: '800' }}>
              {o.pos}
            </ThemedText>{' '}
            {o.type.toLowerCase()}
          </ThemedText>
        ))}
      </ThemedText>

      {/* Decide: a hint a street at a time, or skip. Gone once you've answered (the result has the why). */}
      {!pick && (
        <View style={{ gap: spacing.xs }}>
          {hints > 0 && (
            <View accessibilityLiveRegion="polite" style={{ gap: spacing.xxs, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.blueBg }}>
              {scenario.clues.slice(0, hints).map((c, i) => (
                <ThemedText key={i} variant="subhead" style={{ color: colors.blueInk }}>
                  <ThemedText variant="subhead" style={{ fontWeight: '800', color: colors.blueInk }}>
                    {STREET_NAME[c.street]}{' '}
                  </ThemedText>
                  {c.text}
                </ThemedText>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {hints < scenario.clues.length && <SmallButton label={hints ? `Another hint (${hints} of ${scenario.clues.length})` : 'Hint'} onPress={() => setHints(hints + 1)} />}
            <SmallButton label="Skip hand" quiet onPress={next} />
          </View>
        </View>
      )}
    </View>
  );
}

/** One answer in the pinned bar: Fold in red, Call and Check in the table's blue, Bet and Raise in its green. */
function AnswerButton({ label, tint, wide, onPress }: { label: string; /** The glass tint (TINT). */ tint: string; /** Four options: two to a row. */ wide: boolean; onPress: () => void }) {
  const [main, sub] = splitLabel(label);
  return (
    <View style={{ flexGrow: 1, flexBasis: wide ? '47%' : '30%' }}>
      <GlassButton tint={tint} label={label} onPress={onPress}>
        <ThemedText variant="callout" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: '#ffffff', fontWeight: '800', textAlign: 'center' }}>
          {main}
        </ThemedText>
        {sub ? (
          <ThemedText variant="footnote" numberOfLines={1} style={{ color: '#ffffff', fontWeight: '600', textAlign: 'center', opacity: 0.92 }}>
            {sub}
          </ThemedText>
        ) : null}
      </GlassButton>
    </View>
  );
}

/** "Bet ¾ pot (24bb)" as two lines: the move, then what it costs. */
function splitLabel(label: string): [string, string?] {
  const paren = /^(.*?)\s*\((.*)\)$/.exec(label);
  if (paren) return [paren[1], paren[2]];
  const amount = /^(Call|Raise to) (.+)$/.exec(label);
  if (amount) return [amount[1], amount[2]];
  return [label];
}

/** A small pill under the hand: Hint, or Skip hand (quieter). */
function SmallButton({ label, onPress, quiet }: { label: string; onPress: () => void; quiet?: boolean }) {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={{ minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: quiet ? 'transparent' : colors.blueBg }}
    >
      <ThemedText variant="subhead" style={{ fontWeight: '700', color: quiet ? (colors.tertiaryLabel as string) : (colors.blueInk as string) }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}
