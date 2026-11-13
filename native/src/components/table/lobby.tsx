import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { variantInfo, type Game } from '@/engine';
import { joinLink } from '@/state/api';
import { seatKey } from '@/state/blocks';
import { markRulesSeen, rulesSeen } from '@/state/rules-seen';
import { tableShareMessage } from '@/state/invite-message';
import { changeTableCode, dispatch, me as myDevice, type TableState } from '@/state/session';
import { ForceScheme, spacing } from '@/theme';

import { GrainBackground } from '../grain-background';
import { haptic } from '../haptics';
import { CodeCard } from '../lobby/code-card';
import { GameCard } from '../lobby/game-card';
import { HouseRules } from '../lobby/house-rules';
import { Players, type PlayerLine } from '../lobby/players';
import { openPlayerMenu } from '../player-menu';
import { OPEN_BUTTON_ROOM, OpenTableButton } from '../setup/open-table-button';
import { RulesCard } from '../rules-card';
import { RoundButton } from '../tab-screen';
import { ThemedText } from '../themed-text';

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
  const people = game.players.filter((p) => !p.bot);

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
                : Alert.alert(p.name, undefined, [{ text: 'Cancel', style: 'cancel' }, ...removeOption]),
    };
  });

  const changeCode = async (code: string): Promise<string | null> => {
    const go = async () => {
      try {
        await changeTableCode(code);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Couldn't change the code. Try again.";
      }
    };
    const others = people.length - 1;
    if (!others) return go();
    return new Promise((done) =>
      Alert.alert('Change the code?', `${others === 1 ? "The friend who's" : `The ${others} friends who are`} already here will need the new code.`, [
        { text: 'Cancel', style: 'cancel', onPress: () => done('') },
        { text: 'Change', onPress: () => void go().then(done) },
      ]),
    );
  };

  // A bots-only table moving on to a mini game you've never played: its rules card first, the deal on Continue.
  // Online the table shows everyone the timed card once it deals.
  const [rules, setRules] = useState(false);
  const start = () => {
    if (!online && !rulesSeen(variant)) setRules(true);
    else dispatch({ type: 'start' });
  };

  const line = online && conn === 'offline' ? 'Reconnecting…' : host ? null : 'Waiting for the host to deal.';

  return (
    <GrainBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: (host ? OPEN_BUTTON_ROOM : spacing.xxxl) + insets.bottom, gap: spacing.lg }}
      >
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
        {line && (
          <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center', marginTop: -spacing.sm }}>
            {line}
          </ThemedText>
        )}

        {online && game.code && (
          <CodeCard
            code={game.code}
            share={{ message: tableShareMessage({ host: hostName, game: variantInfo(variant).name, code: game.code }), url: joinLink(game.code) }}
            onChange={host ? changeCode : undefined}
          />
        )}

        <GameCard variant={variant} host={host} table />

        <Players rows={rows} onAdd={host ? () => dispatch({ type: 'addBot' }) : undefined} />

        <HouseRules settings={s} onChange={host ? (next) => dispatch({ type: 'settings', settings: next }) : undefined} online={online} bots={game.players.filter((p) => p.bot).length} />
      </ScrollView>
      {host && (
        <OpenTableButton
          title="Start game"
          line={game.players.length < 2 ? 'Add a bot or wait for a friend' : `${game.players.length} in · ${variantInfo(variant).name}`}
          disabled={game.players.length < 2}
          onPress={start}
        />
      )}
      {rules && (
        <RulesCard
          variant={variant}
          onDone={() => {
            markRulesSeen(variant);
            setRules(false);
            dispatch({ type: 'start' });
          }}
        />
      )}
    </GrainBackground>
  );
}
