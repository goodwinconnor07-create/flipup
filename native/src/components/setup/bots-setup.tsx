import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { Button } from '@/components/button';
import { GameThumb } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { SeatPreview } from '@/components/seat-preview';
import { SettingsFields } from '@/components/settings-fields';
import { Stepper } from '@/components/stepper';
import { MAX_SEATS, variantInfo, type Settings } from '@/engine';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { openLocalTable } from '@/state/session';
import { saveSettings, setDraft } from '@/state/setup-draft';
import { unlockToHost } from '@/state/unlock';
import { party, spacing } from '@/theme';

/**
 * Play with bots, as Setup has drawn it since Phase 5 (Stage 6c rebuilds it on the grain page): the table itself at
 * the top (the game's felt, you and a face for each bot), then a native grouped form: bots, the game (its row opens
 * `choose-game`), chips and blinds, and the house rules. Sit down deals at once on the phone.
 */
export function BotsSetup({ settings: s }: { settings: Settings }) {
  const [bots, setBots] = useState(4);
  const variant = s.variant ?? 'holdem';
  const profile = useProfile();
  const premium = usePremium();
  const open = () => {
    if (!unlockToHost([variant], premium)) return;
    saveSettings(s);
    openLocalTable(s, bots, profile.name, profile.emoji);
    router.push('/table');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Play with bots' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}
      >
        <SeatPreview settings={s} bots={bots} friends={false} guests={[]} />
        <Section footer="Computer players at your table.">
          <Row
            title="Bots"
            detail={String(bots)}
            icon={{ symbol: 'cpu.fill', color: party.green }}
            accessory={<Stepper label="Bots" value={bots} min={1} max={MAX_SEATS - 1} onChange={setBots} />}
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

        <SettingsFields settings={s} onChange={setDraft} online={false} />

        <Button variant="party" tint="green" size="lg" title="Sit down" onPress={open} />
      </ScrollView>
    </>
  );
}
