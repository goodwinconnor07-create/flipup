import { useLocalSearchParams } from 'expo-router';

import { FriendsSetup } from '@/components/setup/friends-setup';
import { isVariant } from '@/engine';
import { useFreshDraft } from '@/state/setup-draft';

/**
 * Play with friends, from Home's start tile, a game's sheet (`variant`) or a friend's menu (`invite`). A root
 * screen rather than one in the Play tab, so the tab bar never sits over its Open table button.
 */
export default function PlayFriendsScreen() {
  const params = useLocalSearchParams<{ variant?: string; invite?: string }>();
  const s = useFreshDraft('friends', isVariant(params.variant) ? params.variant : undefined);
  return <FriendsSetup settings={s} invite={params.invite} />;
}
