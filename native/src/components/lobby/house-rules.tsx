import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  BLIND_CAP_CHOICES,
  BLIND_MINUTE_MAX,
  blindsLabel,
  levelsFor,
  STACK_CHOICES,
  TIMER_CHOICES,
  timerLabel,
  withStack,
  type Settings,
} from '@/engine';
import { radius, ROUNDED, spacing, useColors } from '@/theme';

import { SegmentedControl } from '../segmented-control';
import { Stepper } from '../stepper';
import { Switch } from '../switch';
import { ThemedText } from '../themed-text';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * The house rules, laid out like the lobby in the owner's reference (no presets, the owner's call): each number as a
 * row with its name over its value and the − + stepper on the right, then the switches. `onChange` is the host's; without it (everyone else) the rows only show the values.
 */
export function HouseRules({ settings: s, onChange, online }: { settings: Settings; onChange?: (s: Settings) => void; online: boolean }) {
  const set = (patch: Partial<Settings>) => onChange?.({ ...s, ...patch });
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
    <SwitchRow
      key="rebuys"
      label="Rebuys"
      line="Busted players can buy back in"
      value={s.rebuys}
      onChange={edit ? (rebuys) => set({ rebuys }) : undefined}
    />,
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
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
        House rules
      </ThemedText>
      <Card>{numbers}</Card>
      <Card>{switches}</Card>
    </View>
  );
}

/** One rounded box of rows with hairlines between them. */
function Card({ children }: { children: ReactNode[] }) {
  const colors = useColors();
  return (
    <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, overflow: 'hidden' }}>
      {children.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={{ height: 0.5, marginLeft: spacing.md, backgroundColor: colors.separator }} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/** A number: its name small and grey over the value in a little box of its own, and the stepper on the right. */
function NumberRow({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  const colors = useColors();
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
        <View
          style={{
            paddingHorizontal: spacing.xs,
            paddingVertical: 4,
            borderRadius: radius.sm,
            borderCurve: 'continuous',
            backgroundColor: colors.cellPressed,
          }}
        >
          <ThemedText variant="headline" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {value}
          </ThemedText>
        </View>
      </View>
      {children}
    </View>
  );
}

function SwitchRow({ label, line, value, onChange }: { label: string; line: string; value: boolean; onChange?: (on: boolean) => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 60,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="body" style={{ fontWeight: '600' }}>
          {label}
        </ThemedText>
        <ThemedText variant="footnote" tone="secondaryLabel">
          {line}
        </ThemedText>
      </View>
      {onChange ? (
        <Switch label={label} value={value} onValueChange={onChange} />
      ) : (
        <ThemedText tone="secondaryLabel">{value ? 'On' : 'Off'}</ThemedText>
      )}
    </View>
  );
}
