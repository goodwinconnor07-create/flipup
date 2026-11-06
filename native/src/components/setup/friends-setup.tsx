import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Settings } from '@/engine';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { openOnlineTable } from '@/state/session';
import { saveSettings } from '@/state/setup-draft';
import { needsUnlock, unlockToHost } from '@/state/unlock';
import { ForceScheme, spacing } from '@/theme';

import { Button } from '../button';
import { GrainBackground } from '../grain-background';
import { RoundButton } from '../tab-screen';
import { ThemedText } from '../themed-text';

/**
 * Play with friends: opens an online table at once, so there's a game code to share, and hands over to the lobby
 * (`components/table/lobby.tsx` on the table screen), where the host picks the game and the rules, adds bots and
 * starts. This page is only the moment in between, on the same dark grain, and the place to try again when the
 * table couldn't be opened. `settings` is the draft the route started (app/play-friends.tsx).
 */
export function FriendsSetup({ settings }: { settings: Settings; invite?: string }) {
  return (
    <ForceScheme scheme="dark">
      <Opening settings={settings} />
    </ForceScheme>
  );
}

function Opening({ settings }: { settings: Settings }) {
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const premium = usePremium();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    // A Premium game without Premium: the table opens on Texas Hold'em and the offer shows over the lobby.
    const locked = needsUnlock([settings.variant ?? 'holdem'], premium);
    const s: Settings = locked ? { ...settings, variant: 'holdem' } : settings;
    saveSettings(s);
    openOnlineTable(s, 0, profile.name || 'Host', profile.emoji || '🙂')
      .then(() => {
        if (!live) return;
        router.replace('/table');
        if (locked) unlockToHost([settings.variant ?? 'holdem'], premium);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : "Couldn't open a table. Try again.");
      });
    return () => {
      live = false;
    };
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GrainBackground>
      <View
        style={{ flex: 1, paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.md }}
      >
        <View style={{ flexDirection: 'row' }}>
          <RoundButton icon="chevron.left" label="Back" onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          {error ? (
            <>
              <ThemedText variant="title3" style={{ textAlign: 'center', fontWeight: '700' }}>
                Couldn&apos;t open your table
              </ThemedText>
              <ThemedText tone="secondaryLabel" style={{ textAlign: 'center' }}>
                {error}
              </ThemedText>
              <Button
                title="Try again"
                variant="party"
                tint="blue"
                onPress={() => {
                  setError('');
                  setAttempt((n) => n + 1);
                }}
              />
            </>
          ) : (
            <>
              <ActivityIndicator size="large" />
              <ThemedText tone="secondaryLabel">Getting your game code…</ThemedText>
            </>
          )}
        </View>
      </View>
    </GrainBackground>
  );
}
