import { router, Stack } from 'expo-router';
import { Alert, ScrollView, Share } from 'react-native';

import { Row, Section } from '@/components/grouped-list';
import { Switch } from '@/components/switch';
import { myPlayer } from '@/engine';
import { joinLink } from '@/state/api';
import { setMuted, setTalkOn, useMuted, useTalkOn } from '@/state/prefs';
import { dispatch, leaveTable, me as myDevice, requestLogs, useTable } from '@/state/session';
import { spacing, useColors } from '@/theme';

/**
 * The table's menu, as on the web: the table (standings, hand log, invite, add a bot, sit out), you (sound and
 * the bots' talk), then leaving. The host can also end the game for everyone and go to the standings.
 */
export default function TableMenu() {
  const colors = useColors();
  const t = useTable();
  const game = t.game;
  const online = t.mode === 'online';
  const muted = useMuted();
  const talk = useTalkOn();
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

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: spacing.lg, gap: spacing.lg }} style={{ backgroundColor: colors.background }}>
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
        {host && playing && game.players.length < 9 && <Row title="Add a bot" icon={{ symbol: 'person.badge.plus', color: colors.green as string }} chevron={false} onPress={quick(() => dispatch({ type: 'addBot' }))} />}
        {me && playing && (
          <Row
            title={me.sittingOut ? "I'm back" : 'Sit out'}
            icon={{ symbol: 'clock.fill', color: (me.sittingOut ? colors.accent : colors.slate) as string }}
            chevron={false}
            onPress={quick(() => dispatch({ type: 'sitOut', out: !me.sittingOut }))}
          />
        )}
      </Section>
      <Section header="You">
        <Row title="Sound" icon={{ symbol: 'speaker.wave.2.fill', color: colors.red as string }} chevron={false} trailing={<Switch label="Sound" value={!muted} onValueChange={(on) => setMuted(!on)} />} />
        <Row title="Bot talk" icon={{ symbol: 'bubble.left.fill', color: colors.green as string }} chevron={false} trailing={<Switch label="Bot talk" value={talk} onValueChange={setTalkOn} />} />
      </Section>
      <Section>
        {host && !ended && (online || playing) && (
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
              ask('Leave the table?', online ? (host ? 'The table stays open for the others while it lasts.' : 'Your seat goes to someone else. If a hand is on, your cards are folded.') : 'This ends your game against the bots.', 'Leave', leave)
            }
          />
        )}
      </Section>
    </ScrollView>
  );
}
