// The hand, written out street by street so it reads in one pass: the street and its cards, then one line a move
// (who, what, how much), folds together on one line. "Replay hand" steps through it on the table above, but only
// when you ask; otherwise the table just shows the hand as it stands at your decision.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { haptic } from '@/components/haptics';
import { PressableScale } from '@/components/pressable-scale';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { bb, boardAt, seatName, streetsOf, type Action, type HandEvent } from '@/state/range-view';
import { brand, radius, spacing, useColors } from '@/theme';
import type { Pos, Replay, Scenario, Street } from '@train/ranges/model';

const STREET: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const VERB: Record<Action, string> = { fold: 'folds', check: 'checks', call: 'calls', bet: 'bets', raise: 'raises to' };
const NUM = { fontVariant: ['tabular-nums' as const] };

type Move = Extract<HandEvent, { kind: 'move' }>;
interface Row {
  /** Indexes into the event list this row covers (folds in a row share one line). */
  from: number;
  to: number;
  moves: Move[];
}

/** Moves to rows: every move its own row, except consecutive folds which go on one. */
function rowsOf(events: HandEvent[], street: Street): Row[] {
  const rows: Row[] = [];
  events.forEach((e, i) => {
    if (e.kind !== 'move' || e.street !== street) return;
    const last = rows[rows.length - 1];
    if (e.action === 'fold' && last && last.moves.every((m) => m.action === 'fold') && last.to === i - 1) {
      last.moves.push(e);
      last.to = i;
    } else rows.push({ from: i, to: i, moves: [e] });
  });
  return rows;
}

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
      style={{ minHeight: 36, paddingHorizontal: spacing.sm, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: strong ? colors.accent : colors.cellPressed, opacity: disabled ? 0.4 : 1 }}
    >
      <ThemedText variant="footnote" tone={strong ? 'onColor' : 'accent'} style={{ fontWeight: '700' }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

/** Who moved: you in a blue pill, everyone else as plain bold text (a pill each was a lot of grey noise). */
function PosChip({ pos, hero }: { pos: Pos; hero: boolean }) {
  const colors = useColors();
  if (hero)
    return (
      <View style={{ minWidth: 50, paddingVertical: 3, paddingHorizontal: spacing.xs, borderRadius: radius.sm, alignItems: 'center', backgroundColor: colors.accent }}>
        <ThemedText variant="caption1" tone="onColor" style={{ fontWeight: '800' }}>
          You
        </ThemedText>
      </View>
    );
  return (
    <View style={{ minWidth: 50, alignItems: 'flex-start' }}>
      <ThemedText variant="subhead" style={{ fontWeight: '800' }}>
        {seatName(pos)}
      </ThemedText>
    </View>
  );
}

/**
 * Under the table: Replay hand, or, while replaying, Back, Play, Next and Done with where you are. Right beside the
 * table so what you're stepping through stays in view.
 */
export function ReplayStrip({ step, total, playing, onStep, onPlaying }: { step: number | null; total: number; playing: boolean; onStep: (step: number | null) => void; onPlaying: (on: boolean) => void }) {
  const colors = useColors();
  if (step === null) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <Pill
          label="Replay hand"
          onPress={() => {
            onStep(0);
            onPlaying(true);
          }}
        />
      </View>
    );
  }
  const done = step >= total;
  return (
    <View style={{ gap: 4, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <Pill label="Back" disabled={step === 0} onPress={() => (onPlaying(false), onStep(Math.max(0, step - 1)))} />
        <Pill label={playing ? 'Pause' : done ? 'Again' : 'Play'} strong onPress={() => (done ? (onStep(0), onPlaying(true)) : onPlaying(!playing))} />
        <Pill label="Next" disabled={done} onPress={() => (onPlaying(false), onStep(Math.min(total, step + 1)))} />
        <Pill label="Done" onPress={() => (onPlaying(false), onStep(null))} />
      </View>
      <ThemedText variant="caption1" style={[{ color: colors.tertiaryLabel as string }, NUM]}>
        Replaying · step {step} of {total}
      </ThemedText>
    </View>
  );
}

export function HandHistory({
  scenario,
  events,
  pot,
  step,
  onJump,
  decision,
}: {
  scenario: Scenario;
  events: HandEvent[];
  /** The pot at the start of each street after preflop. */
  pot: Replay['potAt'];
  /** Where the replay is (null: not replaying), to light the move being replayed. */
  step: number | null;
  /** Tapping a street replays from there. */
  onJump: (step: number) => void;
  /** What you're being asked, for the last line. */
  decision: string;
}) {
  const colors = useColors();
  const hero = scenario.hero.pos;
  const replaying = step !== null;
  const done = step !== null && step >= events.length;

  const verb = (m: Move) => `${VERB[m.action]}${m.amount !== undefined ? ` ${bb(m.amount)}` : ''}`;
  const tone = (a: Action) => (a === 'bet' || a === 'raise' ? brand.raise : a === 'call' ? (colors.accent as string) : (colors.secondaryLabel as string));

  let body: ReactNode[] = [];
  for (const street of streetsOf(scenario)) {
    const rows = rowsOf(events, street);
    const cards = boardAt(scenario, street);
    const dealt = events.findIndex((e) => e.kind === 'deal' && e.street === street);
    const hidden = replaying && street !== 'preflop' && step <= dealt;
    body.push(
      <View key={street} style={{ gap: spacing.xxs, opacity: replaying && step === 0 && street !== 'preflop' ? 0.35 : 1 }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Replay from the ${STREET[street].toLowerCase()}`}
          onPress={() => {
            haptic.select();
            onJump(Math.max(0, dealt));
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 30 }}
        >
          <ThemedText variant="headline">{STREET[street]}</ThemedText>
          {!hidden && cards.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {(street === 'flop' ? cards : cards.slice(-1)).map((c) => (
                <PlayingCard key={c} card={c} size="sm" />
              ))}
            </View>
          )}
          {street !== 'preflop' && pot[street] !== undefined && (
            <ThemedText variant="footnote" tone="tertiaryLabel" style={[{ marginLeft: 'auto' }, NUM]}>
              pot {bb(Math.round(pot[street]! * 10) / 10)}
            </ThemedText>
          )}
        </PressableScale>
        {street === 'preflop' && (
          <ThemedText variant="caption1" tone="tertiaryLabel" style={NUM}>
            Blinds 0.5bb and 1bb{scenario.ante ? `, ${bb(scenario.ante)} big blind ante` : ''}
          </ThemedText>
        )}
        {rows.map((row) => {
          const now = replaying && step > row.from && step - 1 <= row.to;
          const future = replaying && step <= row.from;
          const first = row.moves[0];
          return (
            <View
              key={row.from}
              accessibilityLabel={row.moves.length > 1 ? `${row.moves.map((m) => seatName(m.who)).join(', ')} fold` : `${first.who === hero ? 'You' : seatName(first.who)} ${verb(first)}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 34, paddingHorizontal: spacing.xs, borderRadius: radius.sm, backgroundColor: now ? colors.blueBg : 'transparent', opacity: future ? 0.3 : 1 }}
            >
              {row.moves.length > 1 ? (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, flexShrink: 1 }}>
                    {row.moves.map((m, i) => (
                      <PosChip key={i} pos={m.who} hero={m.who === hero} />
                    ))}
                  </View>
                  <ThemedText variant="subhead" tone="tertiaryLabel" style={{ fontWeight: '600' }}>
                    fold
                  </ThemedText>
                </>
              ) : (
                <>
                  <PosChip pos={first.who} hero={first.who === hero} />
                  <ThemedText variant="subhead" style={[{ fontWeight: '700', flex: 1, color: first.action === 'fold' ? (colors.tertiaryLabel as string) : tone(first.action) }, NUM]}>
                    {verb(first)}
                    {first.allIn ? ' · all in' : ''}
                  </ThemedText>
                </>
              )}
            </View>
          );
        })}
      </View>,
    );
  }

  return (
    <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      <ThemedText variant="title3" accessibilityRole="header">
        Hand history
      </ThemedText>

      <View style={{ gap: spacing.sm }}>{body}</View>

      {(!replaying || done) && (
        <View style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.blueBg }}>
          <ThemedText variant="subhead" style={{ fontWeight: '700', color: colors.blueInk }}>
            Your move: {decision}
          </ThemedText>
        </View>
      )}
    </View>
  );
}
