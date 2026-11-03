import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { GameThumb } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { SeatPreview } from '@/components/seat-preview';
import { Stepper } from '@/components/stepper';
import { SettingsFields } from '@/components/settings-fields';
import { isVariant, MAX_SEATS, variantInfo, type Settings } from '@/engine';
import { useProfile } from '@/state/profile';
import { openLocalTable, openOnlineTable } from '@/state/session';
import { saveSettings, setDraft, startDraft, useDraft, useSavedSettings } from '@/state/setup-draft';
import { party, spacing } from '@/theme';

/**
 * Setting up a table: the table itself at the top (the game's felt, you and a face for each bot, open seats for
 * friends), then a native grouped form: who plays, the game, chips and blinds, and the house rules, each
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
  const [bots, setBots] = useState(mode === 'bots' ? 4 : 0);
  const set = (patch: Partial<Settings>) => setDraft({ ...s, ...patch });
  const variant = s.variant ?? 'holdem';
  const minBots = mode === 'bots' ? 1 : 0;
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
  const open = async () => {
    if (busy) return;
    saveSettings(s);
    if (mode === 'bots') {
      openLocalTable(s, bots, profile.name, profile.emoji);
      router.push('/table');
      return;
    }
    setBusy(true);
    try {
      await openOnlineTable(s, bots, profile.name, profile.emoji);
      router.push('/table');
    } catch (e) {
      Alert.alert("Couldn't open a table", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: mode === 'friends' ? 'Play with friends' : 'Play with bots' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
        <SeatPreview settings={s} bots={bots} friends={mode === 'friends'} />
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
            leading={<GameThumb variant={variant} size={44} />}
            onPress={() => router.push('/choose-game')}
          />
        </Section>

        <SettingsFields settings={s} onChange={setDraft} online={mode === 'friends'} />

        <Button variant="party" tint={mode === 'friends' ? 'blue' : 'green'} size="lg" title={mode === 'friends' ? 'Open the table' : 'Sit down'} loading={busy} onPress={() => void open()} />
      </ScrollView>
    </>
  );
}
