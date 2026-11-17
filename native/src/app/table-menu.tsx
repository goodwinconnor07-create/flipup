import { router, Stack } from 'expo-router';
import { Alert, Share } from 'react-native';

import { NativeMenu } from '@/components/native-menu';
import type { MenuGroup, MenuItem } from '@/components/native-menu.types';
import { useYouGroups } from '@/components/you-settings';
import { myPlayer } from '@/engine';
import { tableShare } from '@/state/table-share';
import { abandonLobby, dispatch, leaveTable, me as myDevice, requestLogs, useTable } from '@/state/session';

/**
 * The table's menu, as on the web: the table (standings, hand log, invite, table settings, add a bot, sit out), you
 * (appearance, sound, animations, the bots' talk, fast bot games, the table theme, hand rankings), then Home (the
 * table keeps going), ending the game for everyone (the host) and leaving.
 */
export default function TableMenu() {
  const t = useTable();
  const you = useYouGroups({ header: 'You', online: t.mode === 'online' });
  const game = t.game;
  const online = t.mode === 'online';
  if (!game) return null;
  const me = myPlayer(game, myDevice);
  const host = game.hostDeviceId === myDevice;
  const playing = game.status === 'playing';
  const started = game.status !== 'lobby';
  const ended = game.status === 'ended';
  const lobby = game.status === 'lobby';
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

  // The big icon tiles are the first group's rows now. Bots-only games have no Leave game (it would only run without
  // you): End game and Home are there, and Leave only to close a finished table.
  const actions: (MenuItem | false)[] = [
    host &&
      !ended &&
      !lobby &&
      (online || playing) && {
        kind: 'button',
        id: 'end',
        title: 'End game',
        symbol: 'stop.circle.fill',
        destructive: true,
        onPress: () =>
          ask('End the game for everyone?', 'A hand in progress is called off and everyone gets their bets back. Then you see the final standings.', 'End game', () => {
            dispatch({ type: 'end' });
            close();
          }),
      },
    (online || ended) && {
      kind: 'button',
      id: 'leave',
      title: ended ? 'Close table' : lobby ? (host ? 'Close lobby' : 'Leave lobby') : 'Leave game',
      symbol: 'rectangle.portrait.and.arrow.right',
      destructive: true,
      onPress: () =>
        ended
          ? leave()
          : lobby
            ? ask(host ? 'Close the lobby?' : 'Leave the lobby?', host ? 'Nobody has been dealt in. Anyone who joined with the code sees it close.' : 'You can join again with the code.', host ? 'Close lobby' : 'Leave', () => {
                if (host && t.code) abandonLobby(t.code);
                else leaveTable();
                goHome();
              })
            : ask('Leave the table?', online ? (host ? 'The table stays open for the others while it lasts.' : 'Your seat goes to someone else. If a hand is on, your cards are folded.') : "This run won't get a score.", 'Leave', leave),
    },
    !ended && { kind: 'button', id: 'home', title: 'Home', symbol: 'house.fill', onPress: goHome },
    !!me && playing && { kind: 'button', id: 'sit', title: me.sittingOut ? "I'm back" : 'Sit out', symbol: 'clock.fill', onPress: quick(() => dispatch({ type: 'sitOut', out: !me.sittingOut })) },
  ];

  const groups: MenuGroup[] = [
    { id: 'actions', items: actions },
    {
      id: 'table',
      header: 'Table',
      items: [
        started && { kind: 'link', id: 'standings', title: 'Standings', onPress: () => router.push('/table-standings') },
        started && {
          kind: 'link',
          id: 'log',
          title: 'Hand log',
          onPress: () => {
            requestLogs();
            router.push('/table-log');
          },
        },
        online && !!t.code && !ended && { kind: 'link', id: 'invite', title: 'Invite friends', detail: t.code, chevron: false, onPress: () => void Share.share(tableShare(game, t.code!)) },
        host && !ended && { kind: 'link', id: 'settings', title: 'Table settings', onPress: () => router.push('/table-settings') },
        host && playing && game.players.length < 9 && { kind: 'button', id: 'bot', title: 'Add a bot', symbol: 'person.badge.plus', onPress: quick(() => dispatch({ type: 'addBot' })) },
      ],
    },
    ...you,
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Menu' }} />
      <NativeMenu groups={groups} />
    </>
  );
}
