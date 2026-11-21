import { router } from 'expo-router';
import { View } from 'react-native';

import { LobbyScroll, NAV_H } from '../lobby/lobby-scroll';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { variantInfo, type Game } from '@/engine';
import { joinLink } from '@/state/api';
import { seatKey } from '@/state/blocks';
import { labSpec } from '@/state/bot-lab';
import { tableShareMessage } from '@/state/table-share';
import { dispatch, me as myDevice, type TableState } from '@/state/session';
import { ForceScheme, spacing } from '@/theme';

import { LobbyBackdrop } from '../lobby/lobby-backdrop';
import { haptic } from '../haptics';
import { CodeCard } from '../lobby/code-card';
import { GameCard } from '../lobby/game-card';
import { HouseRules } from '../lobby/house-rules';
import { Players, type PlayerLine } from '../lobby/players';
import { openPlayerMenu } from '../player-menu';
import { OPEN_BUTTON_ROOM, OpenTableButton } from '../setup/open-table-button';
import { RoundButton } from '../tab-screen';
import { ThemedText } from '../themed-text';
import { choose } from '@/components/choose';

/**
 * A table before its deal (after Play again, or for a friend who joined and waits), drawn from the same pieces as
 * Play with friends: the menu button and "Lobby", the game code card (online), the game, the house rules and the
 * players, with Start game pinned at the bottom for the host. Everyone else sees the same page read-only.
 */
export function Lobby({ game, online, conn }: { game: Game; online: boolean; conn: TableState['conn'] }) {
  return (
    <ForceScheme scheme="dark">
      <LobbyPage game={game} online={online} conn={conn} />
    </ForceScheme>
  );
}

function LobbyPage({ game, online, conn }: { game: Game; online: boolean; conn: TableState['conn'] }) {
  const insets = useSafeAreaInsets();
  const host = game.hostDeviceId === myDevice;
  const s = game.settings;
  const variant = s.variant ?? 'holdem';
  const hostName = game.players.find((p) => p.deviceId === game.hostDeviceId)?.name ?? '';

  const remove = (id: string) => dispatch({ type: 'remove', playerId: id });
  const rows: PlayerLine[] = game.players.map((p) => {
    const you = p.deviceId === myDevice;
    const theHost = p.deviceId === game.hostDeviceId;
    const key = seatKey(p);
    const removeOption = host && !you ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => remove(p.id) }] : [];
    return {
      key: p.id,
      name: you ? p.name || 'You' : p.name,
      emoji: p.emoji,
      line: p.bot ? 'Bot' : you ? (theHost ? 'You · Host' : 'You') : theHost ? 'Host' : p.offline ? 'Offline' : 'Ready',
      you,
      gold: p.gold,
      // The host holds a bot to take it off; a tap on a person opens their menu.
      onRemove: host && p.bot ? () => remove(p.id) : undefined,
      onMore:
        you || p.bot
          ? undefined
          : () =>
              !p.bot && key && game.code
                ? openPlayerMenu({ key, name: p.name, emoji: p.emoji, where: 'table', code: game.code, playerId: p.id }, p.name, undefined, removeOption)
                : choose(p.name, undefined, [...removeOption, { text: 'Cancel', style: 'cancel' }]),
    };
  });

  // A mini game you've never played shows its rules card on the table itself (bots-only: the deal waits for Continue;
  // online: everyone gets the timed card once it deals).
  const start = () => dispatch({ type: 'start' });

  const line = online && conn === 'offline' ? 'Reconnecting…' : host ? null : 'Waiting for the host to deal.';

  return (
    <LobbyBackdrop variant={variant}>
      <LobbyScroll
        header={
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <RoundButton
              icon="line.3.horizontal"
              label="Menu"
              onPress={() => {
                haptic.tap();
                router.push('/table-menu');
              }}
            />
            <ThemedText variant="headline" accessibilityRole="header">
              Lobby
            </ThemedText>
            <View style={{ width: 44 }} />
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + NAV_H + spacing.xs, paddingBottom: (host ? OPEN_BUTTON_ROOM : spacing.xxxl) + insets.bottom, gap: spacing.lg }}
      >
        {line && (
          <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center', marginTop: -spacing.sm }}>
            {line}
          </ThemedText>
        )}

        {online && game.code && (
          <CodeCard
            code={game.code}
            share={{ message: tableShareMessage({ host: hostName, game: variantInfo(variant).name, code: game.code }), url: joinLink(game.code) }}
            hint={host && game.players.every((p) => p.bot || p.deviceId === game.hostDeviceId) ? 'Friends join from Join on the Play tab with this code.' : undefined}
          />
        )}

        {/* Who's here first, then the game (the same order as Play with friends). */}
        <Players rows={rows} onAdd={host ? () => dispatch({ type: 'addBot' }) : undefined} onAddLab={host ? (b) => dispatch({ type: 'addBot', lab: labSpec(b) }) : undefined} />

        <GameCard variant={variant} host={host} table />

        <HouseRules settings={s} onChange={host ? (next) => dispatch({ type: 'settings', settings: next }) : undefined} online={online} bots={game.players.filter((p) => p.bot && !p.labBot).length} />
      </LobbyScroll>
      {host && (
        <OpenTableButton
          title="Start game"
          line={game.players.length < 2 ? 'Add a bot or wait for a friend' : undefined}
          disabled={game.players.length < 2}
          onPress={start}
        />
      )}
    </LobbyBackdrop>
  );
}
