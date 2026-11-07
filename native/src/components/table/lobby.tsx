import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addedLine, BOTS, MAX_SEATS, variantInfo, type Game } from '@/engine';
import { joinLink } from '@/state/api';
import { useDeclined, usePals, type Pal } from '@/state/pals';
import { useProfile } from '@/state/profile';
import { dispatch, me as myDevice, type TableState } from '@/state/session';
import { invitePal, invitesFor, seatOf, uninvitePal, useInviteWatch, useTableInvites } from '@/state/table-invites';
import { tableShare } from '@/state/table-share';
import { ForceScheme, radius, ROUNDED, spacing, useColors } from '@/theme';

import { GrainBackground } from '../grain-background';
import { haptic } from '../haptics';
import { InviteTicket } from '../invite-ticket';
import { BotsRow, type RowBot } from '../setup/bots-row';
import { Face, FaceRow } from '../setup/faces';
import { InviteFriendsRow } from '../setup/invite-friends-row';
import { OPEN_BUTTON_ROOM, OpenTableButton } from '../setup/open-table-button';
import { SetupRowTitle } from '../setup/setup-header';
import { RoundButton } from '../tab-screen';
import { ThemedText } from '../themed-text';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Before the first deal, on the same dark grain page as Play with friends. The host sees the code (big tiles, the QR
 * code and Share), who's sitting down, the Invite friends row (the same faces, rings and pills: invites sent on the
 * setup page carry on here), the bots row (+ seats a random bot, a tap takes one off), what the table plays, and
 * Deal. Everyone else sees who's there and waits. The menu button opens the table menu.
 */
export function Lobby({ game, online, conn }: { game: Game; online: boolean; conn: TableState['conn'] }) {
  return (
    <ForceScheme scheme="dark">
      <LobbyPage game={game} online={online} conn={conn} />
    </ForceScheme>
  );
}

function LobbyPage({ game, online, conn }: { game: Game; online: boolean; conn: TableState['conn'] }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const pals = usePals();
  const declined = useDeclined();
  const invites = useTableInvites();
  const host = game.hostDeviceId === myDevice;
  const s = game.settings;
  useEffect(() => invitesFor(game.code), [game.code]);
  useInviteWatch(game.code, game, pals, declined);

  const people = game.players.filter((p) => !p.bot);
  const bots = game.players.filter((p) => p.bot);
  const waiting = pals.filter((p) => invites[p.code]?.status === 'invited' && !seatOf(game, p)).length;
  const room = MAX_SEATS - game.players.length - waiting;
  // Friends to invite: the ones not sitting here already.
  const invitable = pals.filter((p) => !seatOf(game, p) || invites[p.code]?.status === 'joined');

  // Bots that sit down while you're here say hello; the ones already seated when the lobby opened stay quiet.
  const seen = useRef<Set<string> | null>(null);
  const [greets, setGreets] = useState<Record<string, string>>({});
  const botIds = bots.map((b) => b.id).join();
  // The bots Open table brings over from the setup page arrive just after the lobby opens: they've said hello already.
  const opened = useRef(0);
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(bots.map((b) => b.id));
      opened.current = Date.now();
      return;
    }
    if (Date.now() - opened.current < 2500) {
      for (const b of bots) seen.current.add(b.id);
      return;
    }
    const fresh: Record<string, string> = {};
    for (const b of bots) {
      if (seen.current.has(b.id)) continue;
      seen.current.add(b.id);
      const style = BOTS.find((x) => x.name === b.name)?.style;
      if (style) fresh[b.id] = addedLine(style, profile.name || undefined, Math.random).text;
    }
    // Bots that just sat down say hello: new arrivals come from the table, so this follows it rather than a tap.
    if (Object.keys(fresh).length) setGreets((g) => ({ ...g, ...fresh })); // eslint-disable-line react-hooks/set-state-in-effect
  }, [botIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const rowBots: RowBot[] = bots.map((b) => ({ key: b.id, name: b.name, emoji: b.emoji, greet: greets[b.id] }));

  const deal = () => {
    if (!online || people.length > 1) return dispatch({ type: 'start' });
    Alert.alert('Deal without friends?', "Nobody's joined yet. Friends can still sit down later and get dealt in on the next hand.", [
      { text: 'Wait', style: 'cancel' },
      { text: 'Deal', onPress: () => dispatch({ type: 'start' }) },
    ]);
  };
  const removePerson = (id: string, name: string) =>
    Alert.alert(`Take ${name} off the table?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'remove', playerId: id }) },
    ]);
  const invite = (pal: Pal) => {
    if (!game.code) return;
    const code = game.code;
    invitePal(pal, async () => code).catch((e: unknown) => Alert.alert("Couldn't send the invite", e instanceof Error ? e.message : 'Check your connection and try again.'));
  };

  const title = host ? 'Your table' : "You're in!";
  const line = host ? (online ? 'Friends join with the code, or from your invite.' : 'Add or take off bots, then deal.') : 'Waiting for the host to deal.';
  const variant = variantInfo(s.variant);

  return (
    <GrainBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: (host ? OPEN_BUTTON_ROOM : spacing.xxxl) + insets.bottom, gap: spacing.xl }}
      >
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row' }}>
            <RoundButton
              icon="line.3.horizontal"
              label="Menu"
              onPress={() => {
                haptic.tap();
                router.push('/table-menu');
              }}
            />
          </View>
          <View style={{ gap: spacing.xxs }}>
            <ThemedText variant="largeTitle" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
              {title}
            </ThemedText>
            <ThemedText variant="callout" tone="secondaryLabel">
              {online && conn === 'offline' ? 'Reconnecting…' : line}
            </ThemedText>
          </View>
        </View>

        {online && game.code && host && <InviteTicket code={game.code} link={joinLink(game.code)} message={tableShare(game, game.code).message} />}

        <View style={{ gap: 4 }}>
          <SetupRowTitle big title="At the table" detail={`${game.players.length} of ${MAX_SEATS}`} />
          <FaceRow>
            {people.map((p) => {
              const you = p.deviceId === myDevice;
              const theHost = p.deviceId === game.hostDeviceId;
              return (
                <Face
                  key={p.id}
                  emoji={p.emoji}
                  name={you ? 'You' : p.name}
                  label={`${p.name}${you ? ', you' : ''}${theHost ? ', host' : ''}`}
                  onPress={host && !you ? () => removePerson(p.id, p.name) : undefined}
                  selected={you ? (colors.accent as string) : undefined}
                />
              );
            })}
          </FaceRow>
        </View>

        {online && host && game.code && <InviteFriendsRow pals={invitable} invites={invites} full={room <= 0} onInvite={invite} onUninvite={(p) => uninvitePal(p.code)} />}

        {host ? (
          <BotsRow
            bots={rowBots}
            canAdd={room > 0}
            onAdd={() => dispatch({ type: 'addBot' })}
            onRemove={(b) => dispatch({ type: 'remove', playerId: b.key })}
            detail={room <= 0 ? `Table full · ${MAX_SEATS} seats` : undefined}
          />
        ) : (
          rowBots.length > 0 && <BotsRow bots={rowBots} canAdd={false} onAdd={() => undefined} onRemove={() => undefined} detail={`${rowBots.length} at the table`} />
        )}

        <View style={{ gap: spacing.sm }}>
          <SetupRowTitle title="The table" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {[
              ['Game', `${variant.emoji} ${variant.name}`],
              ['Blinds', `${chips(s.smallBlind)}/${chips(s.bigBlind)}`],
              ['Stack', chips(s.startingStack)],
              ['Rebuys', s.rebuys ? 'On' : 'Off'],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.cell }}>
                <ThemedText tone="secondaryLabel">{k}</ThemedText>
                <ThemedText style={{ fontWeight: '700' }}>{v}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {host && (
        <OpenTableButton
          title="Deal"
          line={game.players.length < 2 ? 'Add a bot or wait for a friend' : `${game.players.length} at the table${waiting ? ` · ${waiting} invited` : ''}`}
          disabled={game.players.length < 2}
          onPress={deal}
        />
      )}
    </GrainBackground>
  );
}
