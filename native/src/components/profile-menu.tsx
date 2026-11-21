import { router } from 'expo-router';

import { useProfile } from '@/state/profile';

import { Avatar } from './avatar';
import { haptic } from './haptics';
import { PressableScale } from './pressable-scale';

/** The face's size: the same as on Play's top bar, so it doesn't change when you move between tabs. */
export const AVATAR = 50;

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
      haptics={false}
      // The same size and shadow as the face on Play's top bar (the owner, 17 Nov 2026: it shrank between tabs).
      style={{ borderRadius: 999, boxShadow: '0 6px 16px -4px rgba(0, 0, 0, 0.5)' }}
    >
      <Avatar emoji={named ? profile.emoji : undefined} size={AVATAR} />
    </PressableScale>
  );
}
