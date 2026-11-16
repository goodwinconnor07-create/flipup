import { router, Stack } from 'expo-router';
import { Alert, Share, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { SheetScroll } from '@/components/sheet-scroll';
import { MenuRow, MenuSection, useMenuColors } from '@/components/menu-list';
import { YouSettings } from '@/components/you-settings';
import { myPlayer } from '@/engine';
import { tableShare } from '@/state/table-share';
import { dispatch, leaveTable, me as myDevice, requestLogs, useTable } from '@/state/session';
import { spacing, useColors } from '@/theme';

/**
 * The table's menu, as on the web: the table (standings, hand log, invite, table settings, add a bot, sit out), you
 * (appearance, sound, animations, the bots' talk, fast bot games, the table theme, hand rankings), then Home (the
 * table keeps going), ending the game for everyone (the host) and leaving.
 */
export default function TableMenu() {
  const colors = useColors();
  const menu = useMenuColors();
  const t = useTable();
  const game = t.game;
  const online = t.mode === 'online';
  if (!game) return null;
  const me = myPlayer(game, myDevice);
  const host = game.hostDeviceId === myDevice;
  const playing = game.status === 'playing';
  const started = game.status !== 'lobby';
  const ended = game.status === 'ended';
  const close = () => router.back();
  const quick = (fn: () => void) => () => {
    fn();
    close();
  };
  const goHome = () => {
    close();
    router.dismissAll();
  };
  const leave = () => {
    leaveTable();
    goHome();
  };
  const ask = (title: string, body: string, confirm: string, run: () => void) =>
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirm, style: 'destructive', onPress: run },
    ]);

  // Big icons in one row at the top, each with its label under it. Bots-only games have no Leave game (it would
  // only run without you): End game and Home are there, and Leave only to close a finished table.
  const tiles: TileProps[] = [];
  if (host && !ended && (online || playing)) {
    tiles.push({
      label: 'End game',
      symbol: 'stop.circle.fill',
      color: colors.red as string,
      onPress: () =>
        ask('End the game for everyone?', 'A hand in progress is called off and everyone gets their bets back. Then you see the final standings.', 'End game', () => {
          dispatch({ type: 'end' });
          close();
        }),
    });
  }
  if (online || ended) {
    tiles.push({
      label: ended ? 'Close table' : 'Leave game',
      symbol: 'rectangle.portrait.and.arrow.right',
      color: colors.red as string,
      onPress: () =>
        ended
          ? leave()
          : ask('Leave the table?', online ? (host ? 'The table stays open for the others while it lasts.' : 'Your seat goes to someone else. If a hand is on, your cards are folded.') : "This run won't get a score.", 'Leave', leave),
    });
  }
  if (!ended) tiles.push({ label: 'Home', symbol: 'house.fill', color: colors.accent as string, onPress: goHome });
  if (me && playing) {
    tiles.push({ label: me.sittingOut ? "I'm back" : 'Sit out', symbol: 'clock.fill', color: (me.sittingOut ? colors.accent : colors.slate) as string, onPress: quick(() => dispatch({ type: 'sitOut', out: !me.sittingOut })) });
  }

  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }} style={{ backgroundColor: menu.page }}>
      <Stack.Screen options={{ title: 'Menu' }} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}>
        {tiles.map((t) => (
          <MenuTile key={t.label} {...t} />
        ))}
      </View>
      <MenuSection header="Table">
        {started && <MenuRow title="Standings" icon={{ symbol: 'trophy.fill', color: colors.gold as string }} onPress={() => router.push('/table-standings')} />}
        {started && (
          <MenuRow
            title="Hand log"
            icon={{ symbol: 'list.bullet', color: colors.accent as string }}
            onPress={() => {
              requestLogs();
              router.push('/table-log');
            }}
          />
        )}
        {online && t.code && !ended && (
          <MenuRow
            title="Invite friends"
            detail={t.code}
            icon={{ symbol: 'square.and.arrow.up', color: colors.green as string }}
            onPress={() => void Share.share(tableShare(game, t.code!))}
          />
        )}
        {host && !ended && <MenuRow title="Table settings" icon={{ symbol: 'gearshape.fill', color: colors.slate as string }} onPress={() => router.push('/table-settings')} />}
        {host && playing && game.players.length < 9 && <MenuRow title="Add a bot" icon={{ symbol: 'person.badge.plus', color: colors.green as string }} chevron={false} onPress={quick(() => dispatch({ type: 'addBot' }))} />}
      </MenuSection>
      <YouSettings header="You" online={online} />
    </SheetScroll>
  );
}

type TileProps = { label: string; symbol: string; color: string; onPress: () => void };

/** One large app-style icon with its label under it; the row shares the width, so two to four tiles all look full. */
function MenuTile({ label, symbol, color, onPress }: TileProps) {
  const menu = useMenuColors();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} outerStyle={{ flex: 1, maxWidth: 120 }} style={{ alignItems: 'center', gap: spacing.xs }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: menu.fill }}>
        <Icon name={symbol as never} size={34} color={color} />
      </View>
      <ThemedText variant="footnote" style={{ fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}
