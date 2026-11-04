import { router, Stack } from 'expo-router';
import { Alert, Share } from 'react-native';

import { SheetScroll } from '@/components/sheet-scroll';
import { Row, Section } from '@/components/grouped-list';
import { YouSettings } from '@/components/you-settings';
import { myPlayer } from '@/engine';
import { joinLink } from '@/state/api';
import { dispatch, leaveTable, me as myDevice, requestLogs, useTable } from '@/state/session';
import { spacing, useColors } from '@/theme';

/**
 * The table's menu, as on the web: the table (standings, hand log, invite, table settings, add a bot, sit out), you
 * (appearance, sound, animations, the bots' talk, fast bot games, the table theme, hand rankings), then Home (the
 * table keeps going), ending the game for everyone (the host) and leaving.
 */
export default function TableMenu() {
  const colors = useColors();
  const t = useTable();
  const game = t.game;
  const online = t.mode === 'online';
  if (!game) return null;
  const me = myPlayer(game, myDevice);
  const host = game.hostDeviceId === myDevice;
  const playing = game.status === 'playing';
  const started = game.status !== 'lobby';
  const ended = game.status === 'ended';
  // A challenge plays by its own rules: no settings, extra bots, sitting out or ending it early.
  const challenge = !!game.challenge;
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

  return (
    <SheetScroll contentContainerStyle={{ paddingVertical: spacing.lg, gap: spacing.lg }} style={{ backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Menu' }} />
      <Section header="Table">
        {started && <Row title="Standings" icon={{ symbol: 'trophy.fill', color: colors.gold as string }} onPress={() => router.push('/table-standings')} />}
        {started && (
          <Row
            title="Hand log"
            icon={{ symbol: 'list.bullet', color: colors.accent as string }}
            onPress={() => {
              requestLogs();
              router.push('/table-log');
            }}
          />
        )}
        {online && t.code && !ended && (
          <Row
            title="Invite friends"
            detail={t.code}
            icon={{ symbol: 'square.and.arrow.up', color: colors.green as string }}
            onPress={() => void Share.share({ message: `Come play poker with me on FlipUp. Code ${t.code}: ${joinLink(t.code!)}`, url: joinLink(t.code!) })}
          />
        )}
        {host && !ended && !challenge && <Row title="Table settings" icon={{ symbol: 'gearshape.fill', color: colors.slate as string }} onPress={() => router.push('/table-settings')} />}
        {host && playing && !challenge && game.players.length < 9 && <Row title="Add a bot" icon={{ symbol: 'person.badge.plus', color: colors.green as string }} chevron={false} onPress={quick(() => dispatch({ type: 'addBot' }))} />}
        {me && playing && !challenge && (
          <Row
            title={me.sittingOut ? "I'm back" : 'Sit out'}
            icon={{ symbol: 'clock.fill', color: (me.sittingOut ? colors.accent : colors.slate) as string }}
            chevron={false}
            onPress={quick(() => dispatch({ type: 'sitOut', out: !me.sittingOut }))}
          />
        )}
      </Section>
      <YouSettings header="You" online={online} />
      <Section>
        {!ended && <Row title="Home" icon={{ symbol: 'house.fill', color: colors.green as string }} chevron={false} onPress={goHome} />}
        {host && !ended && !challenge && (online || playing) && (
          <Row
            title="End the game"
            icon={{ symbol: 'stop.circle.fill', color: colors.red as string }}
            destructive
            chevron={false}
            onPress={() =>
              ask('End the game for everyone?', 'A hand in progress is called off and everyone gets their bets back. Then you see the final standings.', 'End game', () => {
                dispatch({ type: 'end' });
                close();
              })
            }
          />
        )}
        {ended ? (
          <Row title="Close table" icon={{ symbol: 'rectangle.portrait.and.arrow.right', color: colors.red as string }} destructive chevron={false} onPress={leave} />
        ) : (
          <Row
            title="Leave table"
            icon={{ symbol: 'rectangle.portrait.and.arrow.right', color: colors.red as string }}
            destructive
            chevron={false}
            onPress={() =>
              ask('Leave the table?', online ? (host ? 'The table stays open for the others while it lasts.' : 'Your seat goes to someone else. If a hand is on, your cards are folded.') : challenge ? "This run won't get a score." : 'This ends your game against the bots.', 'Leave', leave)
            }
          />
        )}
      </Section>
    </SheetScroll>
  );
}
