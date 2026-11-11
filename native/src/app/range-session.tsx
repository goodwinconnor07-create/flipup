// A Range training set, full screen over the tabs: five hands, one at a time, then how the set went. The top bar has
// Back and the set's progress (a dot a hand, coloured by its grade once answered); the trainer's answer bar and result
// card pin to the bottom of the screen, as they did on the tab. Opened from the Train tab's start screen (params:
// `focus`, a JSON list of kinds of spot or 'id:<hand>' entries to practise, from Stats or Work on).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { RangeTrainer } from '@/components/range-trainer';
import { SetSummary, useGradeInk, type SetAnswer } from '@/components/range/set-summary';
import { BackText } from '@/components/setup/setup-header';
import { FooterContext } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { SET_SIZE } from '@/state/range-result';
import { spacing, useColors } from '@/theme';

export default function RangeSession() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const ink = useGradeInk();
  const params = useLocalSearchParams<{ focus?: string }>();
  const focus = useMemo(() => {
    try {
      const f = params.focus ? (JSON.parse(params.focus) as unknown) : null;
      return Array.isArray(f) && f.every((x) => typeof x === 'string') && f.length ? (f as string[]) : undefined;
    } catch {
      return undefined;
    }
  }, [params.focus]);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<SetAnswer[]>([]);
  const [done, setDone] = useState(false);
  const top = () => scroll.current?.scrollTo({ y: 0, animated: false });
  const again = () => {
    setAnswers([]);
    setDone(false);
    setRound(round + 1);
    top();
  };
  // The hand you're on: one past the answers, until the last one is answered.
  const at = Math.min(answers.length + 1, SET_SIZE);
  const full = answers.length >= SET_SIZE;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false, title: 'Range training' }} />
      {/* Back on the left, the set's progress in the middle. */}
      <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.md, backgroundColor: colors.background }}>
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'center' }}>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6 }}>
            <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }} accessibilityRole="header">
              {done ? 'Set done' : `Hand ${at} of ${SET_SIZE}`}
            </ThemedText>
            <View accessible accessibilityLabel={`${answers.length} of ${SET_SIZE} hands played`} style={{ flexDirection: 'row', gap: 6 }}>
              {Array.from({ length: SET_SIZE }, (_, i) => {
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

      <PinnedPage
        scrollRef={scroll}
        fixed={
          done ? (
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Button title="Done" variant="secondary" onPress={() => router.back()} />
              </View>
              <View style={{ flex: 1.4 }}>
                <Button title="Another 5" variant="primary" onPress={again} />
              </View>
            </View>
          ) : undefined
        }
      >
        {done ? (
          <SetSummary answers={answers} />
        ) : (
          <RangeTrainer
            key={round}
            focus={focus}
            onStopFocus={() => router.back()}
            onNext={top}
            onTop={top}
            onScrollTo={(y) => scroll.current?.scrollTo({ y, animated: true })}
            onAnswer={(scenario, pick, grade) => setAnswers((xs) => [...xs, { scenario, pick, grade }])}
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
    </View>
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
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, spacing.sm), backgroundColor: fixed ? colors.background : undefined }}
      >
        <View pointerEvents="box-none" style={{ width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          {fixed ?? footer}
        </View>
      </View>
    </FooterContext.Provider>
  );
}
