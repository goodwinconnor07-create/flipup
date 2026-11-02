import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { GamePicture } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { SegmentedControl } from '@/components/segmented-control';
import { Stepper } from '@/components/stepper';
import { Switch } from '@/components/switch';
import { ThemedText } from '@/components/themed-text';
import {
  BLIND_CAP_CHOICES,
  BLIND_MINUTE_MAX,
  blindsLabel,
  isVariant,
  levelsFor,
  MAX_SEATS,
  STACK_CHOICES,
  TIMER_CHOICES,
  timerLabel,
  variantInfo,
  withStack,
  type Settings,
} from '@/engine';
import { useProfile } from '@/state/profile';
import { openLocalTable } from '@/state/session';
import { saveSettings, setDraft, startDraft, useDraft, useSavedSettings } from '@/state/setup-draft';
import { party, spacing, useColors } from '@/theme';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Setting up a table, as a native grouped form: who plays, the game, chips and blinds, and the house rules, each
 * section with a footer that says what it does. Steppers, a segmented control and switches; the Game row opens
 * the list of games.
 */
export default function SetupScreen() {
  const params = useLocalSearchParams<{ mode?: string; variant?: string }>();
  const mode = params.mode === 'friends' ? 'friends' : 'bots';
  const saved = useSavedSettings();
  // A fresh draft each time the screen opens, from the last table's settings and any game picked on Home.
  useEffect(() => startDraft(saved, mode, isVariant(params.variant) ? params.variant : undefined), []); // eslint-disable-line react-hooks/exhaustive-deps
  const s = useDraft();
  const colors = useColors();
  const [bots, setBots] = useState(mode === 'bots' ? 4 : 0);
  const set = (patch: Partial<Settings>) => setDraft({ ...s, ...patch });
  const variant = s.variant ?? 'holdem';
  const levels = levelsFor(s.startingStack);
  const blindIndex = Math.max(0, levels.findIndex(([sb, bb]) => sb === s.smallBlind && bb === s.bigBlind));
  const stackIndex = Math.max(0, STACK_CHOICES.indexOf(s.startingStack));
  const caps = [0, ...BLIND_CAP_CHOICES.filter((c) => c > 0 && (c > s.bigBlind || c === s.blindCap))];
  const capIndex = Math.max(0, caps.indexOf(s.blindCap ?? 0));
  const minBots = mode === 'bots' ? 1 : 0;
  const blindsFoot = s.blindMinutes
    ? `Blinds rise every ${s.blindMinutes} min${s.blindCap ? `, up to ${blindsLabel([s.blindCap / 2, s.blindCap])}` : ''}.`
    : 'The blinds stay the same all game.';

  const profile = useProfile();
  const open = () => {
    saveSettings(s);
    if (mode === 'friends') {
      // Online tables come in step 3b.
      Alert.alert('Coming next', 'Tables with friends arrive in the next update. Try one with bots.');
      return;
    }
    openLocalTable(s, bots, profile.name, profile.emoji);
    router.push('/table');
  };

  return (
    <>
      <Stack.Screen options={{ title: mode === 'friends' ? 'Play with friends' : 'Play with bots' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
        <Section footer={mode === 'friends' ? 'Bots fill seats your friends leave empty.' : 'Computer players at your table.'}>
          <Row
            title="Bots"
            detail={String(bots)}
            icon={{ symbol: 'cpu.fill', color: party.green }}
            accessory={<Stepper label="Bots" value={bots} min={minBots} max={MAX_SEATS - 1} onChange={setBots} />}
          />
        </Section>

        <Section header="Game">
          <Row
            title={variantInfo(variant).name}
            subtitle={variantInfo(variant).tagline}
            leading={<GamePicture variant={variant} width={44} height={44} rounded={10} />}
            onPress={() => router.push('/choose-game')}
          />
        </Section>

        <Section header="Chips and blinds" footer={blindsFoot}>
          <Row
            title="Starting chips"
            detail={chips(s.startingStack)}
            icon={{ symbol: 'dollarsign.circle.fill', color: party.blue }}
            accessory={<Stepper label="Starting chips" value={stackIndex} min={0} max={STACK_CHOICES.length - 1} onChange={(i) => setDraft(withStack(s, STACK_CHOICES[i]))} />}
          />
          <Row
            title="Blinds"
            detail={blindsLabel([s.smallBlind, s.bigBlind])}
            icon={{ symbol: 'suit.spade.fill', color: colors.indigo as string }}
            accessory={
              <Stepper label="Blinds" value={blindIndex} min={0} max={levels.length - 1} onChange={(i) => set({ smallBlind: levels[i][0], bigBlind: levels[i][1] })} />
            }
          />
          <Row
            title="Blinds go up"
            detail={s.blindMinutes ? `${s.blindMinutes} min` : 'Never'}
            icon={{ symbol: 'chart.line.uptrend.xyaxis', color: party.orange }}
            accessory={<Stepper label="Minutes between blind rises" value={s.blindMinutes ?? 0} min={0} max={BLIND_MINUTE_MAX} onChange={(blindMinutes) => set({ blindMinutes })} />}
          />
          {!!s.blindMinutes && (
            <Row
              title="Blinds stop at"
              detail={caps[capIndex] ? blindsLabel([caps[capIndex] / 2, caps[capIndex]]) : 'No limit'}
              icon={{ symbol: 'flag.checkered', color: colors.slate as string }}
              accessory={<Stepper label="Blinds stop at" value={capIndex} min={0} max={caps.length - 1} onChange={(i) => set({ blindCap: caps[i] })} />}
            />
          )}
        </Section>

        <Section header="House rules" footer={mode === 'friends' ? 'Time to act is how long each person gets before they check or fold.' : undefined}>
          {mode === 'friends' && (
            <View style={{ padding: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs }}>
              <ThemedText>Time to act</ThemedText>
              <SegmentedControl
                label="Time to act"
                value={String(s.turnSeconds)}
                onChange={(v) => set({ turnSeconds: Number(v) })}
                options={TIMER_CHOICES.map((t) => ({ value: String(t), label: timerLabel(t) }))}
              />
            </View>
          )}
          <Row
            title="Rebuys"
            subtitle="Busted players can buy back in"
            icon={{ symbol: 'arrow.clockwise', color: party.green }}
            accessory={<Switch label="Rebuys" value={s.rebuys} onValueChange={(rebuys) => set({ rebuys })} />}
          />
          {mode === 'friends' && (
            <Row
              title="Busted players peek"
              subtitle="Once you're out, you see everyone's cards"
              icon={{ symbol: 'eye.fill', color: party.pink }}
              accessory={<Switch label="Busted players peek" value={!!s.showToBusted} onValueChange={(showToBusted) => set({ showToBusted })} />}
            />
          )}
        </Section>

        <Button variant="party" tint={mode === 'friends' ? 'blue' : 'green'} size="lg" title={mode === 'friends' ? 'Open the table' : 'Sit down'} onPress={open} />
      </ScrollView>
    </>
  );
}
