import { router } from 'expo-router';

import { useProfile } from '@/state/profile';

import { Avatar } from './avatar';
import { haptic } from './haptics';
import { PressableScale } from './pressable-scale';

/**
 * Your emoji in a tab's title row: a tap opens your profile, where your name, face, stats and Settings are (the
 * owner, 9 Nov 2026: a menu of three items repeated what the profile already lists). Before you've set up a
 * profile it's an empty outline that goes to the same place. The name is older than the behaviour.
 */
export function ProfileMenu() {
  const profile = useProfile();
  const named = profile.name.trim().length > 0;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={named ? `${profile.name}. Open your profile` : 'Set up your profile'}
      onPress={() => {
        haptic.tap();
        router.push('/profile');
      }}
    >
      <Avatar emoji={named ? profile.emoji : undefined} size={44} />
    </PressableScale>
  );
}
