import { Redirect, useLocalSearchParams } from 'expo-router';

import { BotsSetup } from '@/components/setup/bots-setup';
import { isVariant } from '@/engine';
import { useFreshDraft } from '@/state/setup-draft';

/**
 * Play with bots: the Phase 5 form (components/setup/bots-setup.tsx) until Stage 6c, from Home's start tile or a
 * game's sheet (`variant`). An old link with `mode=friends` goes on to the Play with friends page.
 */
export default function SetupScreen() {
  const params = useLocalSearchParams<{ mode?: string; variant?: string; invite?: string }>();
  const friends = params.mode === 'friends';
  const s = useFreshDraft('bots', isVariant(params.variant) ? params.variant : undefined);
  if (friends) {
    return <Redirect href={{ pathname: '/play-friends', params: { ...(params.variant ? { variant: params.variant } : {}), ...(params.invite ? { invite: params.invite } : {}) } }} />;
  }
  return <BotsSetup settings={s} />;
}
