import { router } from 'expo-router';
import { Alert } from 'react-native';

import { inviteFriends, removePal, type Pal } from '@/state/pals';
import { readProfile } from '@/state/profile';
import { useTable } from '@/state/session';

import { haptic } from './haptics';
import type { MenuItem } from './menu.types';

/** Asks before inviting when you have no name yet: friends see who's asking. */
function needName(): boolean {
  if (readProfile().name.trim()) return false;
  Alert.alert('Add your name first', 'Friends see your name and picture.', [
    { text: 'Not now', style: 'cancel' },
    { text: 'Set up profile', onPress: () => router.push('/profile') },
  ]);
  return true;
}

/**
 * What you can do with a friend, for Apple's menu on their row (Friends tab, Home) and for their profile: invite
 * them (straight to the online table you're at, else to a new one through Setup), open their profile, or remove them.
 */
export function useFriendActions() {
  const table = useTable();
  // An online table you're at that's still open: invites go straight to it.
  const openTable = table.mode === 'online' && table.code && table.game && table.game.status !== 'ended' ? table.code : null;

  const invite = async (pal: Pal) => {
    if (needName()) return;
    if (openTable) {
      const sent = await inviteFriends([pal.code], openTable).catch(() => 0);
      haptic[sent ? 'success' : 'failure']();
      Alert.alert(sent ? `${pal.name} is invited` : "Couldn't send the invite", sent ? `They can join table ${openTable} from their Friends tab.` : 'Check your connection and try again.');
      return;
    }
    router.push({ pathname: '/play-friends', params: { invite: pal.code } });
  };
  const remove = (pal: Pal, then?: () => void) =>
    Alert.alert(`Remove ${pal.name}?`, 'You’ll both drop off each other’s list. You can send a new request any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void removePal(pal.code).catch(() => undefined);
          then?.();
        },
      },
    ]);
  const inviteLabel = openTable ? `Invite to table ${openTable}` : 'Invite to a game';
  const sections = (pal: Pal): MenuItem[][] => [
    [
      { title: inviteLabel, symbol: 'paperplane.fill', onPress: () => void invite(pal) },
      { title: 'View profile', symbol: 'person.crop.circle', onPress: () => router.push({ pathname: '/friend/[code]', params: { code: pal.code } }) },
    ],
    [{ title: 'Remove friend', symbol: 'person.badge.minus', destructive: true, onPress: () => remove(pal) }],
  ];
  return { sections, invite, remove, inviteLabel, openTable };
}
