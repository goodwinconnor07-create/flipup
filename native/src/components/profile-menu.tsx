import { router } from 'expo-router';

import { usePals } from '@/state/pals';
import { useProfile } from '@/state/profile';

import { Avatar } from './avatar';
import { Menu } from './menu';

/**
 * Your emoji in a tab's title row, the way Flighty's avatar works: a tap opens Apple's menu with your profile,
 * Friends, Your stats and Settings. Before you've set up a profile it's an empty outline that goes straight there.
 */
export function ProfileMenu() {
  const profile = useProfile();
  const pals = usePals();
  const named = profile.name.trim().length > 0;
  return (
    <Menu
      label={named ? `${profile.name}. Profile, friends, stats and settings` : 'Set up your profile'}
      title={named ? profile.name : undefined}
      sections={[
        [{ title: named ? 'Edit profile' : 'Set up your profile', symbol: 'person.crop.circle', onPress: () => router.push('/profile') }],
        [
          { title: pals.length ? `Friends (${pals.length})` : 'Friends', symbol: 'person.2', onPress: () => router.navigate('/friends') },
          { title: 'Your stats', symbol: 'chart.bar.xaxis', onPress: () => router.push('/stats') },
          { title: 'Settings', symbol: 'gearshape', onPress: () => router.push('/settings') },
        ],
      ]}
    >
      <Avatar emoji={named ? profile.emoji : undefined} size={44} />
    </Menu>
  );
}
