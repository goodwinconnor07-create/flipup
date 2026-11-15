import { useLocalSearchParams } from 'expo-router';

import { BotsSetup } from '@/components/setup/bots-setup';
import { isOffered } from '@/engine';
import { useFreshDraft } from '@/state/setup-draft';

/** Play with bots, from Home's start tile or a game's sheet (`variant`). A root screen so the tab bar stays clear of Deal. */
export default function PlayBotsScreen() {
  const params = useLocalSearchParams<{ variant?: string }>();
  const s = useFreshDraft('bots', isOffered(params.variant) ? params.variant : undefined);
  return <BotsSetup settings={s} />;
}
