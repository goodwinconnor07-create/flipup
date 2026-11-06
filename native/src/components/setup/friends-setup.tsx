import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_SEATS, variantInfo, type Settings } from '@/engine';
import { createParty } from '@/state/party';
import { clearPartyDraft, usePartyDraft } from '@/state/party-draft';
import { takeBackInvites, useDeclined, useMyUsername, usePals, type Pal } from '@/state/pals';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { abandonLobby, currentTable, dispatch, me as myDevice, openOnlineTable, useTable } from '@/state/session';
import { saveSettings, setDraft } from '@/state/setup-draft';
import { clearInvites, invitePal, uninvitePal, useInviteWatch, useTableInvites, waitingInvites } from '@/state/table-invites';
import { unlockToHost } from '@/state/unlock';
import { ForceScheme, spacing, useColors } from '@/theme';

import { GrainBackground } from '../grain-background';
import { BotsRow, randomBot, type RowBot } from './bots-row';
import { SetupGameRow } from './game-row';
import { InviteFriendsRow } from './invite-friends-row';
import { OPEN_BUTTON_ROOM, OpenTableButton } from './open-table-button';
import { PartyPlaylistCard, PartyRules, StartPartyButton } from './party-pieces';
import { SettingsTable } from './settings-table';
import { SetupHeader, SetupRowTitle } from './setup-header';
import { TableCodeCard } from './table-code-card';

/**
 * Play with friends: the page on the dark grain field, always drawn dark (ForceScheme) whatever the phone's
 * appearance, under its own white header. Top to bottom:
 *  1. Invite friends (`InviteFriendsRow`): a tap invites a friend there and then
 *  2. Bots (`BotsRow`): a + that sits a random bot down, a tap on one takes it off
 *  3. The game row (`SetupGameRow`; a tap opens the `setup-game/[id]` popup, whose Select sets the draft)
 *  4. "Want to play more than one game? Start a party." (`StartPartyButton`), which opens the party playlist
 *  5. The settings table (`SettingsTable`: chips, blinds and house rules in one block)
 * and Open table pinned at the bottom (`OpenTableButton`, with how many are in). `settings` is the draft
 * (state/setup-draft.ts) that the route started (app/play-friends.tsx); `invite` is a friend to invite at once (a
 * friend's menu).
 *
 * The online table opens in the background as the page opens, so its code is real from the start: `TableCodeCard`
 * sits above Invite friends with the code, Show QR, Share link and Invite from your contacts, and lists who has sat
 * down with the code. Everything happens on this page: Deal brings the table up to date (the settings, the bots you
 * picked), deals, and takes you to it; there's no separate lobby for the host. Going back without dealing ends that
 * table and takes the invites back.
 *
 * Once a party's playlist is saved (state/party-draft.ts), the page is a party's: the playlist takes the game row's
 * place, the party's house rules (chips, hands per level, bots fill) take the table's, and Open the party creates
 * it and goes to its lobby, where friends join with the party's code. Invites and bots picked here are for a single
 * table, so they're hidden while a party is set up.
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
  const declined = useDeclined();
  const invites = useTableInvites();
  const table = useTable();
  const [bots, setBots] = useState<RowBot[]>([]);
  const [busy, setBusy] = useState(false);
  const [lobby, setLobby] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const { username } = useMyUsername();
  const partyDraft = usePartyDraft();
  // The lobby made for the invites (once), whether it's still being made, and whether Open table took you to it.
  const made = useRef<{ code: string | null; making: Promise<string> | null; opened: boolean }>({
    code: null,
    making: null,
    opened: false,
  });
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  }, [s]);
  const game = lobby && table.code === lobby ? table.game : null;
  useInviteWatch(lobby, game, pals, declined);

  const status = (code: string) => invites[code]?.status;
  const asked = pals.filter((p) => status(p.code) === 'invited').length;
  const joined = pals.filter((p) => status(p.code) === 'joined').length;
  // Seats: you, every friend who's in or still has an invite out, and the bots.
  const taken = 1 + asked + joined + bots.length;
  const full = taken >= MAX_SEATS;

  const makeLobby = (): Promise<string> => {
    const m = made.current;
    if (m.code) return Promise.resolve(m.code);
    m.making ??= openOnlineTable(latest.current, 0, profile.name, profile.emoji)
      .then((code) => {
        m.code = code;
        setLobby(code);
        return code;
      })
      .finally(() => {
        m.making = null;
      });
    return m.making;
  };

  const sendInvite = (pal: Pal) => {
    if (full) return;
    if (!unlockToHost([variant], premium)) return;
    invitePal(pal, makeLobby).catch((e: unknown) =>
      Alert.alert("Couldn't send the invite", e instanceof Error ? e.message : 'Check your connection and try again.'),
    );
  };

  // A fresh page starts with no invites. Leaving it without opening ends the lobby and takes back what's still out.
  useEffect(() => {
    clearInvites();
    clearPartyDraft();
    const pal = invite ? pals.find((p) => p.code === invite) : undefined;
    if (pal) sendInvite(pal);
    else makeLobby().catch(() => setFailed(true));
    return () => {
      const m = made.current;
      if (!m.code || m.opened) return;
      void takeBackInvites(waitingInvites(), m.code);
      abandonLobby(m.code);
      clearInvites();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addBot = () => {
    if (full) return;
    const bot = randomBot(bots, profile.name || undefined);
    if (bot) setBots((have) => [...have, bot]);
  };

  /** Opens the party: ends any lobby made for invites, creates the party, and goes to its lobby. */
  const openParty = async () => {
    if (busy || !partyDraft) return;
    if (!unlockToHost(partyDraft.games, premium)) return;
    setBusy(true);
    try {
      const m = made.current;
      if (m.making) await m.making.catch(() => undefined);
      if (m.code) {
        void takeBackInvites(waitingInvites(), m.code);
        abandonLobby(m.code);
        clearInvites();
        m.code = null;
        setLobby(null);
      }
      await createParty({
        games: partyDraft.games,
        startingStack: partyDraft.stack,
        blindHands: partyDraft.blindHands,
        fillTo: partyDraft.fill,
      });
      clearPartyDraft();
      router.back();
      router.push('/party-room');
    } catch (e) {
      Alert.alert("Couldn't open the party", e instanceof Error ? e.message : 'Try again.');
      setBusy(false);
    }
  };

  const open = async () => {
    if (busy) return;
    if (partyDraft) return openParty();
    if (!unlockToHost([variant], premium)) return;
    saveSettings(s);
    setBusy(true);
    try {
      const m = made.current;
      if (m.making) await m.making;
      if (!m.code) await makeLobby();
      await catchUp(
        m.code!,
        s,
        bots.map((b) => b.name),
      );
      if (dispatch({ type: 'start' })) throw new Error("You're offline. Try again in a moment.");
      m.opened = true;
      router.push('/table');
    } catch (e) {
      Alert.alert("Couldn't deal", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Everyone who has sat down at the table but you (friends from an invite and anyone with the code).
  const others = (game?.players ?? []).filter((p) => !p.bot && p.deviceId !== myDevice);
  const inNow = 1 + Math.max(joined, others.length) + bots.length;
  const line = [`${inNow} in`, asked ? `${asked} invited` : '', variantInfo(variant).name].filter(Boolean).join(' · ');

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
        <SetupHeader
          title="Play with friends"
          line={
            partyDraft ? 'A party: one short table per game, points for where you finish.' : 'Share the code, add bots, pick a game, deal.'
          }
        />

        {partyDraft ? (
          <>
            <PartyPlaylistCard draft={partyDraft} />
            <PartyRules draft={partyDraft} tint={tint} />
          </>
        ) : (
          <>
            <TableCodeCard
              code={lobby}
              failed={failed}
              username={username}
              people={others.map((p) => ({ name: p.name, emoji: p.emoji }))}
              onContacts={() => router.push(lobby ? { pathname: '/invite-contacts', params: { code: lobby } } : '/invite-contacts')}
            />

            <InviteFriendsRow pals={pals} invites={invites} full={full} onInvite={sendInvite} onUninvite={(p) => uninvitePal(p.code)} />

            <BotsRow
              bots={bots}
              canAdd={!full}
              onAdd={addBot}
              onRemove={(b) => setBots((have) => have.filter((x) => x.key !== b.key))}
              detail={full ? `Table full · ${MAX_SEATS} seats` : undefined}
            />

            <View style={{ gap: spacing.xs }}>
              <SetupRowTitle title="Game" detail={variantInfo(variant).name} />
              <SetupGameRow selected={variant} />
              <View style={{ marginTop: spacing.xs }}>
                <StartPartyButton />
              </View>
            </View>

            <SettingsTable settings={s} onChange={setDraft} tint={tint} />
          </>
        )}
      </ScrollView>
      <OpenTableButton
        title={partyDraft ? 'Open the party' : 'Deal'}
        line={partyDraft ? `${partyDraft.games.length} games · ${partyDraft.stack.toLocaleString('en-US')} chips each` : line}
        busy={busy}
        onPress={() => void open()}
      />
    </GrainBackground>
  );
}

/**
 * Brings the lobby made for the invites up to date before you go to it: the settings as they are now and the bots
 * you picked. Waits a few seconds for the table to come through first. Throws if it doesn't.
 */
async function catchUp(code: string, settings: Settings, botNames: string[]): Promise<void> {
  for (let i = 0; i < 25 && !(currentTable().code === code && currentTable().game && currentTable().conn === 'open'); i++)
    await new Promise((r) => setTimeout(r, 200));
  const t = currentTable();
  if (t.code !== code || !t.game) throw new Error("Your table didn't answer. Check your connection and try again.");
  if (JSON.stringify({ ...t.game.settings, ...settings }) !== JSON.stringify(t.game.settings) && dispatch({ type: 'settings', settings }))
    throw new Error("You're offline. Try again in a moment.");
  for (const name of botNames) if (!t.game.players.some((p) => p.name === name)) dispatch({ type: 'addBot', name });
}
