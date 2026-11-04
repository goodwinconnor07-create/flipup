import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * An old link to Setup: `mode=friends` goes on to the Play with friends page, anything else to Play with bots.
 */
export default function SetupRedirect() {
  const params = useLocalSearchParams<{ mode?: string; variant?: string; invite?: string }>();
  const extra = { ...(params.variant ? { variant: params.variant } : {}) };
  if (params.mode === 'friends') return <Redirect href={{ pathname: '/play-friends', params: { ...extra, ...(params.invite ? { invite: params.invite } : {}) } }} />;
  return <Redirect href={{ pathname: '/play-bots', params: extra }} />;
}
