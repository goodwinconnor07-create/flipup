import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { LobbyScroll, NAV_H } from '../lobby/lobby-scroll';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_SEATS, variantInfo, type PartySettings, type Settings } from '@/engine';
import { seatKey } from '@/state/blocks';
import { showToast } from '@/state/toast';
import { userMessage, UserError } from '@/state/user-error';
import { configureParty, createParty, leaveParty, startParty } from '@/state/party';
import { clearPartyDraft, setPartyRules, usePartyDraft, type PartyDraft } from '@/state/party-draft';
import { joinLink } from '@/state/api';
import { askForName } from '@/state/ask-name';
import { tableShareMessage } from '@/state/table-share';
import { usePremium } from '@/state/premium';
import { insertAt, offerUndo } from '@/state/undo';
import { readProfile, useProfile } from '@/state/profile';
import { abandonLobby, currentTable, dispatch, me as myDevice, openOnlineTable, useTable } from '@/state/session';
import { saveSettings, setDraft } from '@/state/setup-draft';
import { unlockToHost } from '@/state/unlock';
import { ForceScheme, spacing } from '@/theme';

import { LobbyBackdrop } from '../lobby/lobby-backdrop';
import { LoadingCover } from '../launch-cover';
import { CodeCard } from '../lobby/code-card';
import { GameCard } from '../lobby/game-card';
import { HouseRules } from '../lobby/house-rules';
import { Players, type PlayerLine } from '../lobby/players';
import { openPlayerMenu } from '../player-menu';
import { ThemedText } from '../themed-text';
import { labRowBot, randomBot, type RowBot } from './row-bot';
import { OPEN_BUTTON_ROOM, OpenTableButton } from './open-table-button';
import { lobbyRows, usePartyView } from '../party/panel';
import { PartyCard, PartyRules, StartPartyButton } from './party-pieces';
import { choose } from '@/components/choose';

/**
 * Play with friends, laid out after the owner's reference video in FlipUp's own look (the game's colour, always
 * dark). The online table opens in the background as the page opens, so its code is real from the start, and the host
 * deals from here; there's no separate lobby for the host. Top to bottom (reordered 19 Nov 2026: who's here first):
 *  1. `CodeCard`: the game code with Copy, QR and Share (the host can't change it: owner's call), and how friends join
 *  2. `Players`: you, anyone who sat down with the code, the bots you added, and Add a bot
 *  3. `GameCard`: the game (Texas Hold'em unless one was passed), Change opens the `lobby-game` list, How it plays
 *  4. `HouseRules`: each number with its − + stepper, then the switches
 *  5. "Want to play more than one game? Start a party." (`StartPartyButton`)
 * and Start game pinned at the bottom on its bar. Friends join with the code.
 *
 * Once a party's playlist is saved (state/party-draft.ts) the page is still this same lobby, with a party in it: the
 * party is made at that moment (so its game code is real), the playlist card takes the game card's place, the party's
 * rules (rebuys locked off) take the house rules' place, the players are who's joined the party, and Start party
 * starts it. Editing the playlist or the rules updates the party for everyone who's already in.
 */
export function FriendsSetup({ settings }: { settings: Settings }) {
  return (
    <ForceScheme scheme="dark">
      <FriendsSetupPage settings={settings} />
    </ForceScheme>
  );
}

function FriendsSetupPage({ settings: s }: { settings: Settings }) {
  const insets = useSafeAreaInsets();
  const variant = s.variant ?? 'holdem';
  const profile = useProfile();
  const premium = usePremium();
  const table = useTable();
  const [bots, setBots] = useState<RowBot[]>([]);
  const [busy, setBusy] = useState(false);
  const [lobby, setLobby] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // The loading screen holds for at least a moment, so it never flashes, and goes once the lobby exists (or failed).
  const [held, setHeld] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setHeld(false), 900);
    return () => clearTimeout(t);
  }, []);
  const partyDraft = usePartyDraft();
  // The party made for a saved playlist: its code, whether it's being made, and whether Start party has run.
  const party = useRef<{ code: string | null; making: boolean; started: boolean }>({ code: null, making: false, started: false });
  const [partyCode, setPartyCode] = useState<string | null>(null);
  const [partyFailed, setPartyFailed] = useState(false);
  const [partyView] = usePartyView(
    partyCode ?? '',
    () => {
      party.current.code = null;
      setPartyCode(null);
      clearPartyDraft();
    },
    !!partyCode,
  );
  // The lobby made for this page (once), whether it's still being made, and whether Open table took you to it.
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

  // Everyone who has sat down at the table with the code, but you.
  const others = (game?.players ?? []).filter((p) => !p.bot && p.deviceId !== myDevice);
  // Seats: you, everyone who sat down with the code, and the bots.
  const full = 1 + others.length + bots.length >= MAX_SEATS;

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

  // A saved playlist makes the party (once), keeps it up to date as it's edited, and going back to one game ends it.
  useEffect(() => {
    const p = party.current;
    if (!partyDraft) {
      if (p.code && !p.started) {
        void leaveParty(p.code);
        p.code = null;
        setPartyCode(null);
      }
      return;
    }
    if (!p.code) {
      if (p.making) return;
      if (!unlockToHost(partyDraft.games, premium)) {
        clearPartyDraft();
        return;
      }
      p.making = true;
      Promise.resolve()
        .then(() => {
          setPartyFailed(false);
          return createParty(partySettings(partyDraft));
        })
        .then((code) => {
          p.code = code;
          setPartyCode(code);
        })
        .catch((e: unknown) => {
          setPartyFailed(true);
          clearPartyDraft();
          showToast(userMessage(e, "Couldn't open the party. Check your connection and try again."));
        })
        .finally(() => {
          p.making = false;
        });
      return;
    }
    const code = p.code;
    const t = setTimeout(() => {
      configureParty(code, partySettings(partyDraft)).catch((e: unknown) =>
        showToast(userMessage(e, "Couldn't update the party. Try again.")),
      );
    }, 350);
    return () => clearTimeout(t);
  }, [partyDraft, partyCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // A fresh page starts with no party. Leaving it without opening ends the lobby.
  useEffect(() => {
    clearPartyDraft();
    // A new player is asked for a name first (the table is made with it); closing that goes back to Play.
    let live = true;
    void askForName().then((named) => {
      if (!live) return;
      if (!named) return router.back();
      makeLobby().catch(() => setFailed(true));
    });
    return () => {
      live = false;
      // Going back without starting ends the party too (anyone already in it is handed to the next person).
      // The refs are read at cleanup on purpose: what matters is the party and lobby as they are when the page goes.
      if (party.current.code && !party.current.started) void leaveParty(party.current.code); // eslint-disable-line react-hooks/exhaustive-deps
      const m = made.current; // eslint-disable-line react-hooks/exhaustive-deps
      if (!m.code || m.opened) return;
      abandonLobby(m.code);
    };
  }, []);

  const addBot = () => {
    if (full) return;
    const bot = randomBot(bots, profile.name || undefined, premium);
    if (bot) setBots((have) => [...have, bot]);
    else if (!premium) router.push({ pathname: '/premium', params: { reason: 'bots' } });
  };

  /** Starts the party: the final playlist and rules go up first, then round one. The lobby made for this page ends with it. */
  const startThisParty = async () => {
    const p = party.current;
    if (busy || !p.code || !partyDraft) return;
    setBusy(true);
    try {
      await configureParty(p.code, partySettings(partyDraft));
      await startParty(p.code);
      p.started = true;
      router.back();
      router.push('/party-room');
    } catch (e) {
      showToast(userMessage(e, "Couldn't start the party. Try again."));
      setBusy(false);
    }
  };

  const open = async () => {
    if (busy) return;
    if (partyDraft) return startThisParty();
    if (!unlockToHost([variant], premium)) return;
    saveSettings(s);
    setBusy(true);
    try {
      const m = made.current;
      if (m.making) await m.making;
      if (!m.code) await makeLobby();
      await catchUp(m.code!, s, bots);
      if (dispatch({ type: 'start' })) throw new UserError("You're offline. Try again in a moment.");
      m.opened = true;
      router.push('/table');
    } catch (e) {
      showToast(userMessage(e, "Couldn't deal. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const inNow = 1 + others.length + bots.length;
  // The game card names the game and Players counts who's in, so a ready button is just "Start game": its line only
  // says what's still missing.

  const swapBot = (b: RowBot) => {
    const next = randomBot(bots, profile.name || undefined, premium);
    if (next) setBots((have) => have.map((x) => (x.key === b.key ? next : x)));
  };
  const removeBot = (b: RowBot) => {
    const at = bots.findIndex((x) => x.key === b.key);
    setBots((have) => have.filter((x) => x.key !== b.key));
    offerUndo(`${b.name} removed`, () => setBots((have) => (have.some((x) => x.key === b.key) ? have : insertAt(have, b, at))));
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
            : choose(p.name, undefined, [
                { text: 'Remove', style: 'destructive', onPress: remove },
                { text: 'Cancel', style: 'cancel' },
              ]),
      };
    }),
    ...bots.map((b) => ({
      key: b.key,
      name: b.name,
      emoji: b.emoji,
      line: 'Bot',
      onRemove: () => removeBot(b),
      onSwap: () => swapBot(b),
    })),
  ];

  // In a party: who's joined it (you first, from the party itself once it answers), and how many seats it will fill.
  const partyRows: PlayerLine[] = partyView
    ? lobbyRows(partyView)
    : [{ key: 'you', name: profile.name || 'You', emoji: profile.emoji || '🙂', line: 'You · Host', you: true }];
  const partyPeople = partyView?.members.length ?? 1;
  const partyReady = !!partyCode && Math.max(partyPeople, partyDraft?.fill ?? 0) >= 2;

  return (
    // In the game's colour; a party (several games) keeps the blue field.
    <LobbyBackdrop variant={partyDraft ? null : variant}>
      <LobbyScroll
        title="Lobby"
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: insets.top + NAV_H + spacing.xs,
          paddingBottom: OPEN_BUTTON_ROOM + insets.bottom,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {partyDraft ? (
          <>
            <CodeCard
              code={partyCode}
              failed={partyFailed}
              share={partyCode ? { message: `Join my FlipUp party. Game code ${partyCode}`, url: joinLink(partyCode) } : undefined}
            />
            <PartyCard games={partyDraft.games} host />
            <View style={{ gap: spacing.xs }}>
              <Players rows={partyRows} />
              <ThemedText variant="footnote" tone="secondaryLabel" style={{ paddingHorizontal: spacing.xxs }}>
                {partyDraft.fill
                  ? `Friends join from Join on the Play tab with the game code. Bots fill the empty seats up to ${partyDraft.fill}.`
                  : 'Friends join from Join on the Play tab with the game code. No bots in this party.'}
              </ThemedText>
            </View>
            <PartyRules
              rules={{ stack: partyDraft.stack, blindHands: partyDraft.blindHands, fill: partyDraft.fill }}
              onChange={setPartyRules}
            />
          </>
        ) : (
          <>
            <CodeCard
              code={lobby}
              failed={failed}
              share={
                lobby
                  ? {
                      message: tableShareMessage({ host: profile.name, game: variantInfo(variant).name, code: lobby }),
                      url: joinLink(lobby),
                    }
                  : undefined
              }
              hint={others.length ? undefined : 'Friends join from Join on the Play tab with this code. Bots fill in until they do.'}
            />

            {/* Who's here first (the host's main question), then the game, the rules, and a party last: another way to play. */}
            <Players rows={rows} onAdd={addBot} onAddLab={(b) => !full && setBots((have) => [...have, labRowBot(b)])} />

            <GameCard variant={variant} host />

            <HouseRules
              settings={s}
              onChange={setDraft}
              online
              bots={bots.filter((b) => !b.lab).length}
            />

            <StartPartyButton />
          </>
        )}
      </LobbyScroll>
      <OpenTableButton
        title={partyDraft ? 'Start party' : 'Start game'}
        line={
          partyDraft
            ? !partyCode
              ? 'Opening your party…'
              : partyReady
                ? `${partyPeople} in · ${partyDraft.games.length} games`
                : 'Wait for a friend or let bots fill in'
            : inNow < 2
              ? 'Add a bot or wait for a friend'
              : undefined
        }
        busy={busy}
        // A table needs two: nothing to deal until a friend sits down or you add a bot (a party: or bots fill in).
        disabled={partyDraft ? !partyReady : inNow < 2}
        onPress={() => void open()}
      />
      <LoadingCover variant={variant} visible={held || (!lobby && !failed)} text="Creating your lobby" />
    </LobbyBackdrop>
  );
}

/**
 * Brings the lobby made for the invites up to date before you go to it: the settings as they are now and the bots
 * you picked. Waits a few seconds for the table to come through first. Throws if it doesn't.
 */
async function catchUp(code: string, settings: Settings, bots: RowBot[]): Promise<void> {
  for (let i = 0; i < 25 && !(currentTable().code === code && currentTable().game && currentTable().conn === 'open'); i++)
    await new Promise((r) => setTimeout(r, 200));
  const t = currentTable();
  if (t.code !== code || !t.game) throw new UserError("Your table didn't answer. Check your connection and try again.");
  if (JSON.stringify({ ...t.game.settings, ...settings }) !== JSON.stringify(t.game.settings) && dispatch({ type: 'settings', settings }))
    throw new UserError("You're offline. Try again in a moment.");
  for (const b of bots) if (!t.game.players.some((p) => p.name === b.name)) dispatch(b.lab ? { type: 'addBot', lab: b.lab } : { type: 'addBot', name: b.name });
}

/** What the server is told about a party. */
const partySettings = (d: PartyDraft): PartySettings => ({
  games: d.games,
  startingStack: d.stack,
  blindHands: d.blindHands,
  fillTo: d.fill,
});
