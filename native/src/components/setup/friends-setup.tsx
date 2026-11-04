import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { blindsLabel, variantInfo, type Settings } from '@/engine';
import { inviteFriends, usePals } from '@/state/pals';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { openOnlineTable } from '@/state/session';
import { saveSettings, setDraft } from '@/state/setup-draft';
import { unlockToHost } from '@/state/unlock';
import { ForceScheme, spacing, useColors } from '@/theme';

import { GrainBackground } from '../grain-background';
import { BotsRow } from './bots-row';
import { SetupGameRow } from './game-row';
import { InviteFriendsRow } from './invite-friends-row';
import { OPEN_BUTTON_ROOM, OpenTableButton } from './open-table-button';
import { SettingsTable } from './settings-table';
import { SetupHeader, SetupRowTitle } from './setup-header';

/**
 * Play with friends: the page on the dark grain field, always drawn dark (ForceScheme) whatever the phone's
 * appearance, under its own white header. Top to bottom:
 *  1. Invite friends (`InviteFriendsRow`, slot for Stage 6b)
 *  2. Bots (`BotsRow`, slot for Stage 6b)
 *  3. The game row (`SetupGameRow`; a tap opens the `setup-game/[id]` popup, whose Select sets the draft)
 *  4. The settings table (`SettingsTable`: chips, blinds and house rules in one block)
 * and Open table pinned at the bottom (`OpenTableButton`). `settings` is the draft (state/setup-draft.ts) that
 * the route started (app/play-friends.tsx); `invite` is a friend code to tick from the start (a friend's menu).
 */
export function FriendsSetup({ settings, invite }: { settings: Settings; invite?: string }) {
  return (
    <ForceScheme scheme="dark">
      <FriendsSetupPage settings={settings} invite={invite} />
    </ForceScheme>
  );
}

function FriendsSetupPage({ settings: s, invite }: { settings: Settings; invite?: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const variant = s.variant ?? 'holdem';
  const tint = colors.accent as string;
  const profile = useProfile();
  const premium = usePremium();
  const pals = usePals();
  const [bots, setBots] = useState(0);
  const [invited, setInvited] = useState<string[]>(() => (invite ? [invite] : []));
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (busy) return;
    if (!unlockToHost([variant], premium)) return;
    saveSettings(s);
    setBusy(true);
    try {
      const code = await openOnlineTable(s, bots, profile.name, profile.emoji);
      const asked = invited.filter((c) => pals.some((p) => p.code === c));
      if (asked.length) void inviteFriends(asked, code).catch(() => 0);
      router.push('/table');
    } catch (e) {
      Alert.alert("Couldn't open a table", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GrainBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: insets.top + spacing.xs,
          paddingBottom: OPEN_BUTTON_ROOM + insets.bottom,
          gap: spacing.xl,
        }}
      >
        <SetupHeader title="Play with friends" line="Pick a game and set the table. Friends join with the code." />

        {/* Slot 1 (Stage 6b): Invite friends. */}
        <InviteFriendsRow
          pals={pals}
          picked={invited}
          onToggle={(code) => setInvited((have) => (have.includes(code) ? have.filter((c) => c !== code) : [...have, code]))}
        />

        {/* Slot 2 (Stage 6b): Bots. */}
        <BotsRow bots={bots} onChange={setBots} tint={tint} />

        <View style={{ gap: spacing.xs }}>
          <SetupRowTitle title="Game" detail={variantInfo(variant).name} />
          <SetupGameRow selected={variant} />
        </View>

        <SettingsTable settings={s} onChange={setDraft} tint={tint} />
      </ScrollView>
      <OpenTableButton
        title="Open table"
        line={`${variantInfo(variant).name} · ${s.startingStack.toLocaleString('en-US')} chips · ${blindsLabel([s.smallBlind, s.bigBlind])}`}
        busy={busy}
        onPress={() => void open()}
      />
    </GrainBackground>
  );
}
