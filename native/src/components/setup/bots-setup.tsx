import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_SEATS, variantInfo, type Settings } from '@/engine';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { dispatch, openLocalTable } from '@/state/session';
import { saveSettings, setDraft } from '@/state/setup-draft';
import { unlockToHost } from '@/state/unlock';
import { ForceScheme, spacing, useColors } from '@/theme';

import { GrainBackground } from '../grain-background';
import { BotsRow, randomBot, type RowBot } from './bots-row';
import { SetupGameRow } from './game-row';
import { OPEN_BUTTON_ROOM, OpenTableButton } from './open-table-button';
import { SettingsTable } from './settings-table';
import { SetupHeader, SetupRowTitle } from './setup-header';
import { UltraRow } from './ultra-row';

/** Bots already sitting when the page opens, so Deal works at once. */
const START_BOTS = 4;

/**
 * Play with bots: Play with friends without the Invite friends row, on the same dark grain page. Top to bottom:
 * the bots (`BotsRow`), the game (`SetupGameRow`, whose popup sets the draft), and the settings table. Deal is
 * pinned at the bottom (`OpenTableButton`) and deals at once, seating exactly these bots.
 * `settings` is the draft the route started (app/play-bots.tsx).
 */
export function BotsSetup({ settings }: { settings: Settings }) {
  return (
    <ForceScheme scheme="dark">
      <BotsSetupPage settings={settings} />
    </ForceScheme>
  );
}

function BotsSetupPage({ settings: s }: { settings: Settings }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const premium = usePremium();
  const variant = s.variant ?? 'holdem';
  const [bots, setBots] = useState<RowBot[]>(() => {
    const out: RowBot[] = [];
    for (let i = 0; i < START_BOTS; i++) {
      const b = randomBot(out, undefined);
      if (b) out.push({ ...b, greet: undefined });
    }
    return out;
  });
  const full = 1 + bots.length >= MAX_SEATS;
  const [ultraOn, setUltra] = useState(false);
  const ultra = ultraOn && premium;

  const deal = () => {
    if (!bots.length) return;
    if (!unlockToHost([variant], premium)) return;
    saveSettings(s);
    openLocalTable(s, bots.length, profile.name, profile.emoji, bots.map((b) => b.name), { ultra });
    // Straight to the deal ("Dealing in 3…"): the bots are already picked here, so no second lobby.
    dispatch({ type: 'start' });
    router.push('/table');
  };

  return (
    <GrainBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: OPEN_BUTTON_ROOM + insets.bottom, gap: spacing.xl }}
      >
        <SetupHeader title="Play with bots" line="Pick your bots and a game." />

        <BotsRow
          bots={bots}
          canAdd={!full}
          onAdd={() => {
            const bot = randomBot(bots, profile.name || undefined);
            if (bot && !full) setBots((have) => [...have, bot]);
          }}
          onRemove={(b) => setBots((have) => have.filter((x) => x.key !== b.key))}
          detail={full ? `Table full · ${MAX_SEATS} seats` : bots.length ? undefined : 'Add at least one bot'}
        />

        <UltraRow on={ultra} premium={premium} onChange={setUltra} />

        <View style={{ gap: spacing.xs }}>
          <SetupRowTitle title="Game" detail={variantInfo(variant).name} />
          <SetupGameRow selected={variant} />
        </View>

        <SettingsTable settings={s} onChange={setDraft} tint={colors.accent as string} online={false} />
      </ScrollView>
      <OpenTableButton title="Deal" line={bots.length ? `You and ${bots.length} ${ultra ? 'ULTRA ' : ''}${bots.length === 1 ? 'bot' : 'bots'} · ${variantInfo(variant).name}` : 'Add a bot first'} onPress={deal} />
    </GrainBackground>
  );
}
