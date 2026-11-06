import { Fragment } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { MAX_SEATS, type Game, type Player } from '@/engine';
import { seatKey } from '@/state/blocks';
import { dispatch, me as myDevice } from '@/state/session';
import { brand, radius, ROUNDED, spacing, useColors } from '@/theme';

import { Avatar } from '../avatar';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { openPlayerMenu } from '../player-menu';
import { ThemedText } from '../themed-text';

/**
 * Who's at the table, as a plain list: each seat's face, name and a small line (You · Host, Bot, Ready), with a
 * … on the others that opens Remove (the host's) and, for a person at an online table, Report and Block. The host's
 * last row adds a random bot. Friends come in with the game code, so there's no invite row.
 */
export function Players({ game, host, online }: { game: Game; host: boolean; online: boolean }) {
  const colors = useColors();
  const people = game.players.filter((p) => !p.bot).length;
  const bots = game.players.length - people;
  const room = MAX_SEATS - game.players.length;
  const detail = [`${people} ${people === 1 ? 'person' : 'people'}`, bots ? `${bots} ${bots === 1 ? 'bot' : 'bots'}` : '']
    .filter(Boolean)
    .join(' · ');

  const rows = game.players.map((p) => <PlayerRow key={p.id} player={p} game={game} host={host} online={online} />);
  if (host)
    rows.push(
      <Pressable
        key="add"
        accessibilityRole="button"
        accessibilityLabel={room > 0 ? 'Add a bot' : `Table full, ${MAX_SEATS} seats`}
        disabled={room <= 0}
        onPress={() => {
          haptic.tap();
          dispatch({ type: 'addBot' });
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          minHeight: 56,
          backgroundColor: pressed ? colors.cellPressed : 'transparent',
          opacity: room > 0 ? 1 : 0.4,
        })}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.cellPressed,
          }}
        >
          <Icon name="plus" size={16} color={brand.violetDark} />
        </View>
        <ThemedText style={{ fontWeight: '600', color: brand.violetDark }}>
          {room > 0 ? 'Add a bot' : `Table full · ${MAX_SEATS} seats`}
        </ThemedText>
      </Pressable>,
    );

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          Players
        </ThemedText>
        <ThemedText variant="subhead" tone="secondaryLabel">
          {detail}
        </ThemedText>
      </View>
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={{ height: 0.5, marginLeft: 64, backgroundColor: colors.separator }} />}
            {row}
          </Fragment>
        ))}
      </View>
      {online && host && people === 1 && (
        <ThemedText variant="footnote" tone="secondaryLabel" style={{ paddingHorizontal: spacing.xxs }}>
          Friends join from FlipUp&apos;s Join tab with the game code. Bots fill in until they do.
        </ThemedText>
      )}
    </View>
  );
}

function PlayerRow({ player: p, game, host, online }: { player: Player; game: Game; host: boolean; online: boolean }) {
  const you = p.deviceId === myDevice;
  const theHost = !p.bot && p.deviceId === game.hostDeviceId;
  const line = you ? (theHost ? 'You · Host' : 'You') : p.bot ? 'Bot' : theHost ? 'Host' : p.offline ? 'Offline' : 'Ready';
  const key = seatKey(p);
  const remove = () =>
    Alert.alert(`Take ${p.name} off the table?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'remove', playerId: p.id }) },
    ]);
  const person = online && !p.bot && !you && key && game.code;
  const menu = person
    ? () =>
        openPlayerMenu(
          { key, name: p.name, emoji: p.emoji, where: 'table', code: game.code!, playerId: p.id },
          p.name,
          undefined,
          host ? [{ text: 'Remove', style: 'destructive', onPress: remove }] : [],
        )
    : host && !you
      ? () => {
          haptic.tap();
          remove();
        }
      : undefined;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingLeft: spacing.md,
        paddingRight: spacing.xs,
        minHeight: 60,
      }}
    >
      <Avatar emoji={p.emoji} size={36} />
      <View style={{ flex: 1, gap: 1 }}>
        <ThemedText numberOfLines={1} style={{ fontWeight: '600' }}>
          {p.name}
        </ThemedText>
        <ThemedText variant="footnote" tone={you ? 'label' : 'secondaryLabel'} style={you ? { color: brand.violetDark } : undefined}>
          {line}
        </ThemedText>
      </View>
      {menu && <MoreButton label={`${p.name}, more`} onPress={menu} />}
    </View>
  );
}

function MoreButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
      <Icon name="ellipsis" size={18} color={colors.secondaryLabel} />
    </Pressable>
  );
}
