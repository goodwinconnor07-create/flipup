// A Range training set, full screen over the tabs: five hands, one at a time, then how the set went. The top bar has
// Back and the set's progress (a dot a hand, coloured by its grade once answered); the trainer's answer bar and result
// card pin to the bottom of the screen, as they did on the tab. Opened from the Train tab (params: `daily=1` for the
// daily quiz, free for everyone, which picks up at the hand you're on and shows your answers once it's done; or
// `focus`, a JSON list of kinds of spot or 'id:<hand>' entries to practise, Premium like every other set).
// Always dark, on Range training's light field: it stands still while you read a hand, warms or cools for a moment
// with each answer, and drifts again on the finish page.
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { RangeTrainer } from '@/components/range-trainer';
import { SetSummary, useGradeInk, type SetAnswer } from '@/components/range/set-summary';
import { TrainBackground, type TrainMood } from '@/components/range/train-background';
import { shareDaily } from '@/components/range/train-home';
import { BackText } from '@/components/setup/setup-header';
import { FooterContext } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { usePremium } from '@/state/premium';
import { noteDailyAnswer, readDaily } from '@/state/range-daily';
import { SET_SIZE } from '@/state/range-result';
import { unlockToTrain } from '@/state/unlock';
import { ForceScheme, spacing, useColors } from '@/theme';

/** How long the room stays warm or cool after an answer. */
const MOOD_MS = 2600;

export default function RangeSessionScreen() {
  const premium = usePremium();
  const { daily } = useLocalSearchParams<{ daily?: string }>();
  // Without Premium only the daily quiz opens here, however the screen was reached.
  if (!premium && daily !== '1') return <Redirect href={{ pathname: '/premium', params: { reason: 'training' } }} />;
  return (
    <ForceScheme scheme="dark">
      <RangeSession premium={premium} daily={daily === '1'} />
    </ForceScheme>
  );
}

function RangeSession({ premium, daily }: { premium: boolean; daily: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const ink = useGradeInk();
  const params = useLocalSearchParams<{ focus?: string }>();
  const focus = useMemo(() => {
    if (daily) return undefined;
    try {
      const f = params.focus ? (JSON.parse(params.focus) as unknown) : null;
      return Array.isArray(f) && f.every((x) => typeof x === 'string') && f.length ? (f as string[]) : undefined;
    } catch {
      return undefined;
    }
  }, [params.focus, daily]);
  // The daily quiz: today's hands, and the answers you'd already given (as they were, so the dots and summary match).
  const [quiz] = useState(() => (daily ? readDaily() : null));
  const prior = useMemo<SetAnswer[]>(
    () => (quiz ? quiz.answers.flatMap((a) => quiz.hands.filter((h) => h.id === a.id).map((scenario) => ({ scenario, pick: a.pick, grade: a.grade }))) : []),
    [quiz],
  );
  const queue = quiz ? quiz.hands.slice(prior.length) : undefined;
  const size = quiz ? quiz.hands.length : SET_SIZE;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<SetAnswer[]>(prior);
  const [done, setDone] = useState(() => !!quiz?.finished);
  const [mood, setMood] = useState<TrainMood>(quiz?.finished ? 'done' : 'idle');
  useEffect(() => {
    if (done) return setMood('done');
    if (mood === 'idle') return;
    const t = setTimeout(() => setMood('idle'), MOOD_MS);
    return () => clearTimeout(t);
  }, [mood, done]);
  const top = () => scroll.current?.scrollTo({ y: 0, animated: false });
  const again = () => {
    if (!unlockToTrain(false, premium)) return;
    if (daily) {
      router.replace('/range-session');
      return;
    }
    setAnswers([]);
    setDone(false);
    setMood('idle');
    setRound(round + 1);
    top();
  };
  // The hand you're on: one past the answers, until the last one is answered.
  const at = Math.min(answers.length + 1, size);
  const full = answers.length >= size;
  const best = answers.filter((a) => a.grade === 'best').length;
  const shareQuiz = () => shareDaily({ ...readDaily(), answers: answers.map((a) => ({ id: a.scenario.id, pick: a.pick, grade: a.grade })) });

  const finish = daily ? (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <View style={{ flex: 1 }}>
          <Button title="Share" variant="secondary" onPress={shareQuiz} />
        </View>
        <View style={{ flex: 1.6 }}>
          <Button title={premium ? 'Play a set' : 'Come back tomorrow'} variant="primary" onPress={premium ? again : () => router.back()} />
        </View>
      </View>
      {!premium && (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/premium', params: { reason: 'training' } })} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 6 }}>
          <ThemedText variant="subhead" style={{ color: colors.accent as string, fontWeight: '600' }}>
            Play more with Premium
          </ThemedText>
        </Pressable>
      )}
    </View>
  ) : (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      <View style={{ flex: 1 }}>
        <Button title="Done" variant="secondary" onPress={() => router.back()} />
      </View>
      <View style={{ flex: 1.4 }}>
        <Button title="Another 5" variant="primary" onPress={again} />
      </View>
    </View>
  );

  return (
    <TrainBackground mood={mood} still={!done}>
      <Stack.Screen options={{ headerShown: false, title: daily ? 'Daily quiz' : 'Range training' }} />
      {/* Back on the left, the set's progress in the middle. */}
      <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.md }}>
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'center' }}>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6 }}>
            <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }} accessibilityRole="header">
              {done ? (daily ? `Daily quiz · ${best} of ${size} best plays` : 'Set done') : `${daily ? 'Daily quiz · ' : ''}Hand ${at} of ${size}`}
            </ThemedText>
            <View accessible accessibilityLabel={`${answers.length} of ${size} hands played`} style={{ flexDirection: 'row', gap: 6 }}>
              {Array.from({ length: size }, (_, i) => {
                const a = answers[i];
                const current = !done && !a && i === answers.length;
                return (
                  <View
                    key={i}
                    style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: a ? ink[a.grade] : colors.cellPressed, borderWidth: current ? 1.5 : 0, borderColor: colors.accent as string }}
                  />
                );
              })}
            </View>
          </View>
          <BackText />
        </View>
      </View>

      <PinnedPage scrollRef={scroll} fixed={done ? finish : undefined}>
        {done ? (
          <SetSummary answers={answers} still={!!quiz?.finished} />
        ) : (
          <RangeTrainer
            key={round}
            focus={focus}
            queue={queue}
            onStopFocus={() => router.back()}
            onNext={top}
            onTop={top}
            onScrollTo={(y) => scroll.current?.scrollTo({ y, animated: true })}
            onAnswer={(scenario, pick, grade) => {
              if (daily) noteDailyAnswer({ id: scenario.id, pick, grade });
              setMood(grade);
              setAnswers((xs) => [...xs, { scenario, pick, grade }]);
            }}
            onFinish={
              full
                ? () => {
                    setDone(true);
                    top();
                  }
                : undefined
            }
          />
        )}
      </PinnedPage>
    </TrainBackground>
  );
}

/**
 * The page under the top bar, with a bar pinned to the bottom of the screen: the trainer's own (through
 * `useTabFooter`), or `fixed` when given. The footer's state lives here, not in the screen, so a new footer only
 * redraws this frame and never the trainer that set it (that would loop).
 */
function PinnedPage({ children, fixed, scrollRef }: { children: ReactNode; fixed?: ReactNode; scrollRef: RefObject<ComponentRef<typeof ScrollView> | null> }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [footer, setFooter] = useState<ReactNode>(null);
  const [footerH, setFooterH] = useState(0);
  return (
    <FooterContext.Provider value={setFooter}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxxl + footerH, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center' }}
      >
        {children}
      </ScrollView>
      <View
        pointerEvents="box-none"
        onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
        // The set's own buttons sit on the page colour, so the list never shows through them; the trainer's bar is glass.
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, spacing.sm), backgroundColor: fixed ? '#040816' : undefined }}
      >
        <View pointerEvents="box-none" style={{ width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          {fixed ?? footer}
        </View>
      </View>
    </FooterContext.Provider>
  );
}
