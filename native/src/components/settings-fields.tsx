import { View } from 'react-native';

import {
  BLIND_CAP_CHOICES,
  BLIND_MINUTE_MAX,
  blindsLabel,
  levelsFor,
  STACK_CHOICES,
  TIMER_CHOICES,
  timerLabel,
  withBlindCap,
  withStack,
  type Settings,
} from '@/engine';
import { useSuggestChallenge } from '@/state/table-feel';
import { party, spacing, useColors } from '@/theme';

import { Row, Section } from './grouped-list';
import { SegmentedControl } from './segmented-control';
import { Stepper } from './stepper';
import { Switch } from './switch';
import { ThemedText } from './themed-text';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Chips and blinds, and the house rules: the same controls in Setup and in a table's settings. `online` adds the
 * time to act and the busted players' peek, which only matter with friends. Two sections by default; `merged`
 * puts every row in one grouped block (Play with friends), and `tint` gives every icon square the same colour.
 */
export function SettingsFields({
  settings,
  onChange,
  online,
  merged,
  tint,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  online: boolean;
  /** Everything in one grouped block instead of two sections, under this header. */
  merged?: { header?: string };
  /** One colour for every row's icon square, in place of each row's own. */
  tint?: string;
}) {
  const colors = useColors();
  const beatingCasual = useSuggestChallenge();
  const set = (patch: Partial<Settings>) => onChange(withBlindCap({ ...settings, ...patch }));
  const levels = levelsFor(settings.startingStack);
  const blindIndex = Math.max(
    0,
    levels.findIndex(([sb, bb]) => sb === settings.smallBlind && bb === settings.bigBlind),
  );
  const stackIndex = Math.max(0, STACK_CHOICES.indexOf(settings.startingStack));
  const caps = [0, ...BLIND_CAP_CHOICES.filter((c) => c > 0 && (c > settings.bigBlind || c === settings.blindCap))];
  const capIndex = Math.max(0, caps.indexOf(settings.blindCap ?? 0));
  const blindsFoot = settings.blindMinutes
    ? `Blinds rise every ${settings.blindMinutes} min${settings.blindCap ? `, up to ${blindsLabel([settings.blindCap / 2, settings.blindCap])}` : ''}.`
    : 'The blinds stay the same all game.';
  const clockFoot = online ? 'Time to act is how long each person gets before they check or fold.' : undefined;
  const color = (own: string) => tint ?? own;

  const chipRows = [
    <Row
      key="stack"
      title="Starting chips"
      detail={chips(settings.startingStack)}
      icon={{ symbol: 'dollarsign.circle.fill', color: color(party.blue) }}
      accessory={
        <Stepper
          label="Starting chips"
          value={stackIndex}
          min={0}
          max={STACK_CHOICES.length - 1}
          onChange={(i) => onChange(withStack(settings, STACK_CHOICES[i]))}
        />
      }
    />,
    <Row
      key="blinds"
      title="Blinds"
      detail={blindsLabel([settings.smallBlind, settings.bigBlind])}
      icon={{ symbol: 'suit.spade.fill', color: color(colors.indigo as string) }}
      accessory={
        <Stepper
          label="Blinds"
          value={blindIndex}
          min={0}
          max={levels.length - 1}
          onChange={(i) => set({ smallBlind: levels[i][0], bigBlind: levels[i][1] })}
        />
      }
    />,
    <Row
      key="rise"
      title="Blinds go up"
      detail={settings.blindMinutes ? `${settings.blindMinutes} min` : 'Never'}
      icon={{ symbol: 'chart.line.uptrend.xyaxis', color: color(party.orange) }}
      accessory={
        <Stepper
          label="Minutes between blind rises"
          value={settings.blindMinutes ?? 0}
          min={0}
          max={BLIND_MINUTE_MAX}
          onChange={(blindMinutes) => set({ blindMinutes })}
        />
      }
    />,
    !!settings.blindMinutes && (
      <Row
        key="cap"
        title="Blinds stop at"
        detail={caps[capIndex] ? blindsLabel([caps[capIndex] / 2, caps[capIndex]]) : 'No limit'}
        icon={{ symbol: 'flag.checkered', color: color(colors.slate as string) }}
        accessory={
          <Stepper label="Blinds stop at" value={capIndex} min={0} max={caps.length - 1} onChange={(i) => set({ blindCap: caps[i] })} />
        }
      />
    ),
  ];

  const ruleRows = [
    (settings.variant ?? 'holdem') === 'holdem' && (
      <View key="bot-level" style={{ padding: spacing.md, gap: spacing.xs }}>
        <ThemedText>Bot level</ThemedText>
        <SegmentedControl
          label="Bot level"
          value={settings.botDifficulty ?? 'casual'}
          options={[
            { value: 'casual', label: 'Casual' },
            { value: 'challenge', label: 'Challenge' },
          ]}
          onChange={(botDifficulty) => set({ botDifficulty })}
        />
        <ThemedText variant="caption1" tone="secondaryLabel">
          {beatingCasual && (settings.botDifficulty ?? 'casual') === 'casual'
            ? "You've beaten Casual three tables running. Try Challenge."
            : 'Challenge makes fewer small mistakes. Changes next hand.'}
        </ThemedText>
      </View>
    ),
    online && (
      <View key="clock" style={{ padding: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs }}>
        <ThemedText>Time to act</ThemedText>
        <SegmentedControl
          label="Time to act"
          value={String(settings.turnSeconds)}
          onChange={(v) => set({ turnSeconds: Number(v) })}
          options={TIMER_CHOICES.map((t) => ({ value: String(t), label: timerLabel(t) }))}
        />
      </View>
    ),
    <Row
      key="rebuys"
      title="Rebuys"
      subtitle={online ? 'Busted players can buy back in' : 'If you bust, you can buy back in and keep playing'}
      icon={{ symbol: 'arrow.clockwise', color: color(party.green) }}
      accessory={<Switch label="Rebuys" value={settings.rebuys} onValueChange={(rebuys) => set({ rebuys })} />}
    />,
    online && (
      <Row
        key="peek"
        title="Busted players peek"
        subtitle="Once you're out, you see everyone's cards"
        icon={{ symbol: 'eye.fill', color: color(party.pink) }}
        accessory={
          <Switch label="Busted players peek" value={!!settings.showToBusted} onValueChange={(showToBusted) => set({ showToBusted })} />
        }
      />
    ),
  ];

  if (merged) {
    return (
      <Section header={merged.header} footer={[blindsFoot, clockFoot].filter(Boolean).join(' ')}>
        {chipRows}
        {ruleRows}
      </Section>
    );
  }
  return (
    <>
      <Section header="Chips and blinds" footer={blindsFoot}>
        {chipRows}
      </Section>
      <Section header="House rules" footer={clockFoot}>
        {ruleRows}
      </Section>
    </>
  );
}
