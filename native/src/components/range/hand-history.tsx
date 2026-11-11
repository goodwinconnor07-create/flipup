// The hand, written out a street to a line so it reads in one pass: the street, its new cards and the pot, then
// everyone's moves as one sentence, folds in a row together. It opens on the street you're deciding on, with the rest
// a tap away, so the story never pushes your decision down the page. Replay (a small text button by its heading) steps
// through it on the table above, but only when you ask; otherwise the table shows the hand as it stands now.
import { useState } from 'react';
import { View } from 'react-native';

import { haptic } from '@/components/haptics';
import { PressableScale } from '@/components/pressable-scale';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { bb, boardAt, seatName, streetsOf, type Action, type HandEvent } from '@/state/range-view';
import { radius, spacing, useColors } from '@/theme';
import type { Pos, Replay, Scenario, Street } from '@train/ranges/model';

const STREET: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const VERB: Record<Action, string> = { fold: 'folds', check: 'checks', call: 'calls', bet: 'bets', raise: 'raises to' };
const NUM = { fontVariant: ['tabular-nums' as const] };

/** A small round-cornered button. */
function Pill({ label, onPress, strong, disabled }: { label: string; onPress: () => void; strong?: boolean; disabled?: boolean }) {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={{
        minHeight: 36,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: strong ? colors.accent : colors.cellPressed,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <ThemedText variant="footnote" tone={strong ? 'onColor' : 'accent'} style={{ fontWeight: '700' }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

/**
 * Under the table while replaying: Back, Play, Next and Done with where you are. Right beside the
 * table so what you're stepping through stays in view.
 */
export function ReplayStrip({
  step,
  total,
  playing,
  narration,
  onStep,
  onPlaying,
}: {
  step: number | null;
  total: number;
  playing: boolean;
  /** What just happened, in words, with the pot. */ narration?: string;
  onStep: (step: number | null) => void;
  onPlaying: (on: boolean) => void;
}) {
  const colors = useColors();
  // Not replaying: nothing here (Replay is a small button by the story's heading, so it never pulls the eye first).
  if (step === null) return null;
  const done = step >= total;
  return (
    <View style={{ gap: 4, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <Pill label="Back" disabled={step === 0} onPress={() => (onPlaying(false), onStep(Math.max(0, step - 1)))} />
        <Pill
          label={playing ? 'Pause' : done ? 'Again' : 'Play'}
          strong
          onPress={() => (done ? (onStep(0), onPlaying(true)) : onPlaying(!playing))}
        />
        <Pill label="Next" disabled={done} onPress={() => (onPlaying(false), onStep(Math.min(total, step + 1)))} />
        <Pill label="Done" onPress={() => (onPlaying(false), onStep(null))} />
      </View>
      <ThemedText
        variant="callout"
        accessibilityLiveRegion="polite"
        style={[{ fontWeight: '700', textAlign: 'center', minHeight: 24 }, NUM]}
      >
        {narration ?? ' '}
      </ThemedText>
      <ThemedText variant="caption1" style={[{ color: colors.tertiaryLabel as string }, NUM]}>
        Step {step} of {total}
      </ThemedText>
    </View>
  );
}

/** One street's moves as a line: "HJ raises to 2.5bb · CO, BTN fold · You call". Folds in a row share a phrase. */
function lineOf(events: HandEvent[], street: Street, hero: Pos): { who: string; what: string; you: boolean }[] {
  const out: { who: string; what: string; you: boolean; fold?: boolean }[] = [];
  for (const e of events) {
    if (e.kind !== 'move' || e.street !== street) continue;
    const you = e.who === hero;
    const who = you ? 'You' : seatName(e.who);
    const last = out[out.length - 1];
    if (e.action === 'fold' && !you && last?.fold) {
      last.who += `, ${who}`;
      continue;
    }
    const verb = you ? { fold: 'fold', check: 'check', call: 'call', bet: 'bet', raise: 'raise to' }[e.action] : VERB[e.action];
    out.push({
      who,
      what: `${verb}${e.amount !== undefined && e.action !== 'fold' && e.action !== 'check' ? ` ${bb(e.amount)}` : ''}${e.allIn ? ' all in' : ''}`,
      you,
      fold: e.action === 'fold' && !you,
    });
  }
  // "CO, BTN fold" reads as one phrase, so the verb follows the group.
  return out.map((m) => (m.fold && m.who.includes(',') ? { ...m, what: 'fold' } : m));
}

/**
 * The hand in a line a street, so it reads in one pass above your decision: the street, its new cards and the pot,
 * then everyone's moves as a sentence. Tapping a street replays the hand from there on the table.
 */
export function HandStory({
  scenario,
  events,
  pot,
  step,
  replaying,
  onReplay,
  onJump,
}: {
  scenario: Scenario;
  events: HandEvent[];
  /** The pot at the start of each street after preflop. */
  pot: Replay['potAt'];
  /** Where the replay is (null: not replaying), to light the street being replayed. */
  step: number | null;
  /** Whether the hand is being replayed on the table (every street shows, to light the one being played). */
  replaying: boolean;
  /** Starts the replay from the beginning. */
  onReplay: () => void;
  /** Tapping a street replays from there. */
  onJump: (step: number) => void;
}) {
  const colors = useColors();
  const hero = scenario.hero.pos;
  const streets = streetsOf(scenario);
  const [all, setAll] = useState(false);
  const open = all || replaying || streets.length <= 1;
  const shown = open ? streets : streets.slice(-1);
  return (
    <View accessibilityLabel="How the hand went" style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xxs }}>
        <ThemedText variant="caption1" tone="secondaryLabel" accessibilityRole="header" style={{ fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
          How it went
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {streets.length > 1 && !replaying && (
            <TextLink label={all ? 'Less' : `All ${streets.length} streets`} onPress={() => setAll(!all)} />
          )}
          {!replaying && <TextLink label="Replay" onPress={onReplay} />}
        </View>
      </View>
      <View style={{ gap: 2, padding: spacing.xs, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
        {shown.map((street) => {
          const i = streets.indexOf(street);
          const cards = boardAt(scenario, street);
          const dealt = street === 'preflop' ? 0 : events.findIndex((e) => e.kind === 'deal' && e.street === street);
          const end = i + 1 < streets.length ? events.findIndex((e) => e.kind === 'deal' && e.street === streets[i + 1]) : events.length;
          const now = step !== null && step > dealt && step <= end;
          const moves = lineOf(events, street, hero);
          const said = moves.map((m) => `${m.who} ${m.what}`).join(', ');
          return (
            <PressableScale
              key={street}
              accessibilityRole="button"
              accessibilityLabel={`${STREET[street]}${cards.length ? `, ${(street === 'flop' ? cards : cards.slice(-1)).join(' ')}` : ''}: ${said || 'no moves'}. Replay from here.`}
              onPress={() => {
                haptic.select();
                onJump(Math.max(0, dealt));
              }}
              style={{
                gap: 4,
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                backgroundColor: now ? colors.blueBg : 'transparent',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 24 }}>
                <ThemedText variant="footnote" style={{ fontWeight: '700' }}>
                  {STREET[street]}
                </ThemedText>
                {cards.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {(street === 'flop' ? cards : cards.slice(-1)).map((c) => (
                      <PlayingCard key={c} card={c} size="sm" />
                    ))}
                  </View>
                )}
                <ThemedText variant="footnote" tone="tertiaryLabel" style={[{ marginLeft: 'auto' }, NUM]}>
                  {street === 'preflop'
                    ? `Blinds 0.5 / 1bb${scenario.ante ? ` · ante ${bb(scenario.ante)}` : ''}`
                    : pot[street] !== undefined
                      ? `Pot ${bb(Math.round(pot[street]! * 10) / 10)}`
                      : ''}
                </ThemedText>
              </View>
              <ThemedText variant="footnote" tone="secondaryLabel" style={NUM}>
                {moves.length === 0
                  ? 'No moves yet'
                  : moves.map((m, k) => (
                      <ThemedText
                        key={k}
                        variant="footnote"
                        style={[
                          {
                            color: m.you ? (colors.label as string) : (colors.secondaryLabel as string),
                            fontWeight: m.you ? '700' : '400',
                          },
                          NUM,
                        ]}
                      >
                        {k > 0 ? ' · ' : ''}
                        <ThemedText
                          variant="footnote"
                          style={{ fontWeight: '700', color: m.you ? (colors.accent as string) : (colors.label as string) }}
                        >
                          {m.who}
                        </ThemedText>{' '}
                        {m.what}
                      </ThemedText>
                    ))}
              </ThemedText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

/** A small text button by a heading (rule 4: it still dips to 0.97 when pressed). */
function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic.select();
        onPress();
      }}
    >
      <ThemedText variant="footnote" tone="accent" style={{ fontWeight: '600' }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}
