import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_SEATS, variantInfo, type Settings } from '@/engine';
import { FRIENDS_ON } from '@/scope';
import { seatKey } from '@/state/blocks';
import { createParty } from '@/state/party';
import { clearPartyDraft, usePartyDraft } from '@/state/party-draft';
import { takeBackInvites, useDeclined, usePals, type Pal } from '@/state/pals';
import { joinLink } from '@/state/api';
import { askForName } from '@/state/ask-name';
import { tableShareMessage } from '@/state/invite-message';
import { usePremium } from '@/state/premium';
import { readProfile, useProfile } from '@/state/profile';
import { abandonLobby, changeTableCode, currentTable, dispatch, me as myDevice, openOnlineTable, useTable } from '@/state/session';
import { saveSettings, setDraft } from '@/state/setup-draft';
import { clearInvites, invitePal, uninvitePal, useInviteWatch, useTableInvites, waitingInvites } from '@/state/table-invites';
import { unlockToHost } from '@/state/unlock';
import { ForceScheme, spacing, useColors } from '@/theme';

import { GrainBackground } from '../grain-background';
import { haptic } from '../haptics';
import { CodeCard } from '../lobby/code-card';
import { GameCard } from '../lobby/game-card';
import { HouseRules } from '../lobby/house-rules';
import { Players, type PlayerLine } from '../lobby/players';
import { openPlayerMenu } from '../player-menu';
import { RoundButton } from '../tab-screen';
import { ThemedText } from '../themed-text';
import { randomBot, type RowBot } from './bots-row';
import { InviteFriendsRow } from './invite-friends-row';
import { OPEN_BUTTON_ROOM, OpenTableButton } from './open-table-button';
import { PartyPlaylistCard, PartyRules, StartPartyButton } from './party-pieces';
import { SetupHeader, NavRow } from './setup-header';

/**
 * Play with friends, laid out after the owner's reference video in FlipUp's own look (the deep blue moving field,
 * always dark). The online table opens in the background as the page opens, so its code is real from the start, and
 * the host deals from here; there's no separate lobby for the host. Top to bottom:
 *  1. `CodeCard`: the game code with Copy, QR and Change (the host's own code, `changeTableCode()`)
 *  2. `GameCard`: the game (Texas Hold'em unless one was passed), Change opens the `lobby-game` list, then How it plays
 *  3. "Want to play more than one game? Start a party." (`StartPartyButton`)
 *  4. `HouseRules`: each number with its − + stepper, then the switches
 *  5. `Players`: you, anyone who sat down with the code, the bots you added, and Add a bot
 * and Start game pinned at the bottom. Friends join with the code (the friends list is off, `FRIENDS_ON`).
 *
 * Once a party's playlist is saved (state/party-draft.ts), the page is a party's: the playlist and the party's rules
 * take the game's and the table's places, and Open the party creates it and goes to its lobby.
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
    // Read the profile now, not from this render: a new player may have just given their name (askForName below).
    const me = readProfile();
    m.making ??= openOnlineTable(latest.current, 0, me.name, me.emoji)
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
    // A new player is asked for a name first (the table is made with it); closing that goes back to Play.
    let live = true;
    void askForName().then((named) => {
      if (!live) return;
      if (!named) return router.back();
      if (pal) sendInvite(pal);
      else makeLobby().catch(() => setFailed(true));
    });
    return () => {
      live = false;
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

  // The host's own code: the table moves to it (settings and seated bots come along) and the old one ends.
  const changeCode = async (code: string): Promise<string | null> => {
    const m = made.current;
    if (!m.code) return 'Your table is still opening. Try again in a moment.';
    const go = async () => {
      try {
        const fresh = await changeTableCode(code);
        m.code = fresh;
        setLobby(fresh);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Couldn't change the code. Try again.";
      }
    };
    if (!others.length) return go();
    return new Promise((done) =>
      Alert.alert(
        'Change the code?',
        `${others.length === 1 ? "The friend who's" : `The ${others.length} friends who are`} already here will need the new code.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => done('') },
          { text: 'Change', onPress: () => void go().then(done) },
        ],
      ),
    );
  };

  const removeBot = (b: RowBot) => {
    haptic.tap();
    setBots((have) => have.filter((x) => x.key !== b.key));
  };
  const rows: PlayerLine[] = [
    { key: 'you', name: profile.name || 'You', emoji: profile.emoji || '🙂', line: 'You · Host', you: true },
    ...others.map((p) => {
      const key = seatKey(p);
      const remove = () => dispatch({ type: 'remove', playerId: p.id });
      return {
        key: p.id,
        name: p.name,
        emoji: p.emoji,
        line: p.offline ? 'Offline' : 'Ready',
        onMore: () =>
          key && lobby
            ? openPlayerMenu({ key, name: p.name, emoji: p.emoji, where: 'table', code: lobby, playerId: p.id }, p.name, undefined, [
                { text: 'Remove', style: 'destructive', onPress: remove },
              ])
            : Alert.alert(p.name, undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: remove },
              ]),
      };
    }),
    ...bots.map((b) => ({
      key: b.key,
      name: b.name,
      emoji: b.emoji,
      line: 'Bot',
      onMore: () =>
        Alert.alert(b.name, undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => removeBot(b) },
        ]),
    })),
  ];

  return (
    <GrainBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: insets.top + spacing.xs,
          paddingBottom: OPEN_BUTTON_ROOM + insets.bottom,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {partyDraft ? (
          <SetupHeader title="Start a party" line="One short table per game, points for where you finish." />
        ) : (
          <NavRow title="Lobby" />
        )}

        {partyDraft ? (
          <>
            <PartyPlaylistCard draft={partyDraft} />
            <PartyRules draft={partyDraft} tint={tint} />
          </>
        ) : (
          <>
            <CodeCard code={lobby} failed={failed} share={lobby ? { message: tableShareMessage({ host: profile.name, game: variantInfo(variant).name, code: lobby }), url: joinLink(lobby) } : undefined} onChange={changeCode} />

            <View style={{ gap: spacing.md }}>
              <GameCard variant={variant} host />
              <StartPartyButton />
            </View>

            {FRIENDS_ON && (
              <InviteFriendsRow pals={pals} invites={invites} full={full} onInvite={sendInvite} onUninvite={(p) => uninvitePal(p.code)} />
            )}

            <HouseRules settings={s} onChange={setDraft} online />

            <Players rows={rows} onAdd={addBot} />
          </>
        )}
      </ScrollView>
      <OpenTableButton
        title={partyDraft ? 'Open the party' : 'Start game'}
        line={partyDraft ? `${partyDraft.games.length} games · ${partyDraft.stack.toLocaleString('en-US')} chips each` : inNow < 2 ? 'Add a bot or wait for a friend' : line}
        busy={busy}
        // A table needs two: nothing to deal until a friend sits down or you add a bot.
        disabled={!partyDraft && inNow < 2}
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
