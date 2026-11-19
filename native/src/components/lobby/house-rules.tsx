import { Fragment, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PANEL_RADIUS, usePanel } from '../grouped-list';

import {
  ANTE_CHOICES,
  anteChips,
  BOMB_CHOICES,
  BLIND_CAP_CHOICES,
  BLIND_MINUTE_MAX,
  blindsLabel,
  houseRuleWords,
  levelsFor,
  STACK_CHOICES,
  TIMER_CHOICES,
  timerLabel,
  withBlindCap,
  withStack,
  type Settings,
} from '@/engine';
import { EASE_OUT, enter, exit } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, motion, radius, ROUNDED, spacing, useColors } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { SegmentedControl } from '../segmented-control';
import { Stepper } from '../stepper';
import { Switch } from '../switch';
import { ThemedText } from '../themed-text';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * The house rules, laid out like the lobby in the owner's reference (no presets, the owner's call): each number as a
 * row with its name over its value and the − + stepper on the right, then the switches. `onChange` is the host's; without it (everyone else) the rows only show the values.
 */
export function HouseRules({
  settings: s,
  onChange,
  online,
  bots = 0,
  started = false,
}: {
  settings: Settings;
  onChange?: (s: Settings) => void;
  online: boolean;
  /** Bots the Casual / Challenge level applies to: the everyday bots, not ones made in Bot Lab (they play their own dials). */ bots?: number;
  started?: boolean;
}) {
  // Every change keeps "Blinds stop at" above the blinds (`withBlindCap`), as a new stack keeps the blinds in reach.
  const set = (patch: Partial<Settings>) => onChange?.(withBlindCap({ ...s, ...patch }));
  const levels = levelsFor(s.startingStack);
  const blindIndex = Math.max(
    0,
    levels.findIndex(([sb, bb]) => sb === s.smallBlind && bb === s.bigBlind),
  );
  const stackIndex = Math.max(0, STACK_CHOICES.indexOf(s.startingStack));
  const caps = [0, ...BLIND_CAP_CHOICES.filter((c) => c > 0 && (c > s.bigBlind || c === s.blindCap))];
  const capIndex = Math.max(0, caps.indexOf(s.blindCap ?? 0));
  const edit = !!onChange;

  const numbers: ReactNode[] = [
    <NumberRow key="stack" label="Starting chips" value={chips(s.startingStack)}>
      {edit && (
        <Stepper
          label="Starting chips"
          value={stackIndex}
          min={0}
          max={STACK_CHOICES.length - 1}
          onChange={(i) => onChange(withStack(s, STACK_CHOICES[i]))}
        />
      )}
    </NumberRow>,
    <NumberRow key="blinds" label="Blinds" value={blindsLabel([s.smallBlind, s.bigBlind])}>
      {edit && (
        <Stepper
          label="Blinds"
          value={blindIndex}
          min={0}
          max={levels.length - 1}
          onChange={(i) => set({ smallBlind: levels[i][0], bigBlind: levels[i][1] })}
        />
      )}
    </NumberRow>,
    <NumberRow key="rise" label="Blinds go up" value={s.blindMinutes ? `Every ${s.blindMinutes} min` : 'Never'}>
      {edit && (
        <Stepper
          label="Minutes between blind rises"
          value={s.blindMinutes ?? 0}
          min={0}
          max={BLIND_MINUTE_MAX}
          onChange={(blindMinutes) => set({ blindMinutes })}
        />
      )}
    </NumberRow>,
    !!s.blindMinutes && (
      <NumberRow key="cap" label="Blinds stop at" value={caps[capIndex] ? blindsLabel([caps[capIndex] / 2, caps[capIndex]]) : 'No limit'}>
        {edit && (
          <Stepper label="Blinds stop at" value={capIndex} min={0} max={caps.length - 1} onChange={(i) => set({ blindCap: caps[i] })} />
        )}
      </NumberRow>
    ),
    online &&
      (edit ? (
        <View key="clock" style={{ padding: spacing.md, gap: spacing.xs }}>
          <ThemedText variant="subhead" tone="secondaryLabel">
            Time to act
          </ThemedText>
          <SegmentedControl
            label="Time to act"
            value={String(s.turnSeconds)}
            onChange={(v) => set({ turnSeconds: Number(v) })}
            options={TIMER_CHOICES.map((t) => ({ value: String(t), label: timerLabel(t) }))}
          />
        </View>
      ) : (
        <NumberRow key="clock" label="Time to act" value={timerLabel(s.turnSeconds)} />
      )),
  ].filter(Boolean);

  const switches: ReactNode[] = [
    // Bot level only means something to the host of a table with everyday bots in it: a guest, a lobby of people
    // only, or a table of nothing but Bot Lab bots (they play their own dials) never sees a setting for players it
    // doesn't change.
    (s.variant ?? 'holdem') === 'holdem' && edit && bots > 0 && (
      <View key="bot-level" style={{ padding: spacing.md, gap: spacing.xs }}>
        <ThemedText>Bot level</ThemedText>
        <SegmentedControl
          label="Bot level"
          value={s.botDifficulty ?? 'casual'}
          options={[
            { value: 'casual', label: 'Casual' },
            { value: 'challenge', label: 'Challenge' },
          ]}
          onChange={(botDifficulty) => set({ botDifficulty })}
        />
        <ThemedText variant="caption1" tone="secondaryLabel">
          {started
            ? 'Challenge bots make fewer small mistakes. Changes next hand.'
            : 'Casual bots play a relaxed game. Challenge bots make fewer small mistakes.'}
        </ThemedText>
      </View>
    ),
    <SwitchRow
      key="rebuys"
      label="Rebuys"
      line={online ? 'Busted players can buy back in' : 'If you bust, you can buy back in and keep playing'}
      value={s.rebuys}
      onChange={edit ? (rebuys) => set({ rebuys }) : undefined}
    />,
    // Bots-only: a short recap after each hand you played, with Replay; the deal waits for Next hand.
    !online && (
      <SwitchRow
        key="replay"
        label="Review after every hand"
        line="A blue Review button and a 10 second countdown to the next hand"
        value={!!s.replayEachHand}
        onChange={edit ? (replayEachHand) => set({ replayEachHand }) : undefined}
      />
    ),
    online && (
      <SwitchRow
        key="peek"
        label="Busted players peek"
        line="Once you're out, you see everyone's cards"
        value={!!s.showToBusted}
        onChange={edit ? (showToBusted) => set({ showToBusted }) : undefined}
      />
    ),
  ].filter(Boolean);

  return (
    <RulesFold summary={rulesSummary(s, online)}>
      <Card>{numbers}</Card>
      <Card>{[...switches, ...homeGameRows(s, edit ? set : undefined)]}</Card>
    </RulesFold>
  );
}

/**
 * Home game rules (19 Nov 2026, the owner's ask), in the same box as Rebuys: each is a switch, and turning the ante
 * or bomb pots on adds a row of pills under it to pick how much or how often (the owner's call: on/off first, the
 * detail only once it's on). Run it twice is Texas Hold'em only, so it's left out of the other games.
 */
function homeGameRows(s: Settings, set?: (patch: Partial<Settings>) => void): ReactNode[] {
  const anteLine = s.ante ? `Everyone puts in ${chips(anteChips(s))} before the deal` : 'Everyone puts in a little before the deal';
  return [
    <SwitchRow key="ante" label="Ante" line={anteLine} value={!!s.ante} onChange={set ? (on) => set({ ante: on ? 25 : 0 }) : undefined}>
      {!!s.ante && set && (
        <ChoicePills
          label="Ante size"
          value={s.ante}
          options={ANTE_CHOICES.filter((a) => a > 0).map((a) => ({ value: a, label: ANTE_WORDS[a] ?? `${a}%` }))}
          onChange={(ante) => set({ ante })}
        />
      )}
    </SwitchRow>,
    <SwitchRow
      key="bomb"
      label="Bomb pot"
      line={
        s.bombEvery
          ? `Every ${s.bombEvery} hands, everyone puts in 2 big blinds and play starts on the flop`
          : 'Now and then, everyone puts in 2 big blinds and play starts on the flop'
      }
      value={!!s.bombEvery}
      onChange={set ? (on) => set({ bombEvery: on ? 10 : 0 }) : undefined}
    >
      {!!s.bombEvery && set && (
        <ChoicePills
          label="Bomb pot every"
          value={s.bombEvery}
          options={BOMB_CHOICES.filter((b) => b > 0).map((b) => ({ value: b, label: `Every ${b}` }))}
          onChange={(bombEvery) => set({ bombEvery })}
        />
      )}
    </SwitchRow>,
    <SwitchRow
      key="straddle"
      label="Straddle"
      line="The player after the big blind puts in 2 big blinds"
      value={!!s.straddle}
      onChange={set ? (straddle) => set({ straddle }) : undefined}
    />,
    (s.variant ?? 'holdem') === 'holdem' && (
      <SwitchRow
        key="twice"
        label="Run it twice"
        line="When players are all in, they can deal the rest twice and split the pot"
        value={!!s.runTwice}
        onChange={set ? (runTwice) => set({ runTwice }) : undefined}
      />
    ),
  ].filter(Boolean);
}

/** The ante's sizes, as a share of the big blind. */
const ANTE_WORDS: Record<number, string> = { 10: '10% BB', 25: '¼ BB', 50: '½ BB', 100: '1 BB' };

/**
 * A row of pills under a switch that's on: one choice, the picked one filled in the app's blue. Rows of the page's
 * own see-through white, so they sit in the panel rather than on it.
 */
export function ChoicePills<T extends number | string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  const reduce = useReduceMotion();
  return (
    <Animated.View
      entering={Platform.OS === 'web' ? undefined : enter(reduce)}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => {
              if (on) return;
              haptic.select();
              onChange(o.value);
            }}
            style={{
              minHeight: 36,
              paddingHorizontal: spacing.md,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? brand.violet : 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              borderColor: on ? brand.violet : 'rgba(255,255,255,0.14)',
            }}
          >
            <ThemedText variant="subhead" style={{ fontWeight: '700', color: on ? '#ffffff' : (colors.label as string) }}>
              {o.label}
            </ThemedText>
          </PressableScale>
        );
      })}
    </Animated.View>
  );
}

/** The rules in one line, for the folded House rules: "1,500 chips · Blinds 10/20 · 30s to act · No rebuys". */
export function rulesSummary(s: Settings, online: boolean): string {
  const parts = [`${chips(s.startingStack)} chips`, `Blinds ${blindsLabel([s.smallBlind, s.bigBlind])}`];
  if (online) parts.push(s.turnSeconds === 0 ? 'No clock' : `${timerLabel(s.turnSeconds)} to act`);
  parts.push(s.rebuys ? 'Rebuys' : 'No rebuys');
  parts.push(...houseRuleWords(s));
  return parts.join(' · ');
}

/**
 * House rules start folded to one line (Apple: the common path first, the detail one level down; 17 Nov 2026), so
 * the lobby's players and Start game stay in view. A tap opens every row. One chevron turns (motion rule 20) and the
 * rows rise in with `enter()`; under Reduce Motion they only fade.
 */
export function RulesFold({ summary, children }: { summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const reduce = useReduceMotion();
  const panel = usePanel();
  const turn = useSharedValue(0);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 180}deg` }] }));
  const toggle = () => {
    const next = !open;
    setOpen(next);
    turn.set(reduce ? (next ? 1 : 0) : withTiming(next ? 1 : 0, { duration: next ? motion.base : motion.exit, easing: EASE_OUT }));
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
        House rules
      </ThemedText>
      <View
        style={{
          borderRadius: PANEL_RADIUS,
          borderCurve: 'continuous',
          backgroundColor: panel.fill,
          borderWidth: 1,
          borderColor: panel.edge,
          overflow: 'hidden',
        }}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`House rules, ${summary}`}
          accessibilityState={{ expanded: open }}
          accessibilityHint={open ? 'Hides the rules' : 'Shows every rule'}
          onPress={toggle}
          outerStyle={{ width: '100%' }}
          style={{
            minHeight: 64,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <ThemedText variant="subhead" tone="secondaryLabel" style={{ flex: 1 }}>
            {summary}
          </ThemedText>
          <Animated.View style={chevron}>
            <Icon name="chevron.down" size={16} color={panel.hairline} />
          </Animated.View>
        </PressableScale>
      </View>
      {open && (
        <Animated.View entering={enter(reduce)} exiting={exit(reduce)} style={{ gap: spacing.sm }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

/** One rounded box of rows with hairlines between them. */
export function Card({ children }: { children: ReactNode[] }) {
  const colors = useColors();
  const panel = usePanel();
  return (
    <View
      style={{
        borderRadius: PANEL_RADIUS,
        borderCurve: 'continuous',
        backgroundColor: panel.fill,
        borderWidth: 1,
        borderColor: panel.edge,
        overflow: 'hidden',
      }}
    >
      {children.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={{ height: 0.5, marginLeft: spacing.md, backgroundColor: colors.separator }} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * A number: its name small and grey over the value in bold, and the stepper on the right. No box round the value
 * (19 Nov 2026): an opaque grey box was the one dead neutral on a game-coloured page, and next to a stepper it read as
 * a field you could type in. The stepper is the control.
 */
export function NumberRow({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <View
      accessible={!children}
      accessibilityLabel={`${label}, ${value}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, paddingVertical: spacing.sm }}
    >
      <View style={{ flex: 1, alignItems: 'flex-start', gap: spacing.xxs }}>
        <ThemedText variant="subhead" tone="secondaryLabel">
          {label}
        </ThemedText>
        <ThemedText variant="title2" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {value}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

export function SwitchRow({
  label,
  line,
  value,
  onChange,
  children,
}: {
  label: string;
  line: string;
  value: boolean;
  onChange?: (on: boolean) => void;
  /** Shown under the row (the pills of a rule that's on). */
  children?: ReactNode;
}) {
  return (
    <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 64, justifyContent: 'center' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="headline">{label}</ThemedText>
          <ThemedText variant="subhead" tone="secondaryLabel">
            {line}
          </ThemedText>
        </View>
        {onChange ? (
          <Switch label={label} value={value} onValueChange={onChange} />
        ) : (
          <ThemedText tone="secondaryLabel">{value ? 'On' : 'Off'}</ThemedText>
        )}
      </View>
      {children}
    </View>
  );
}
