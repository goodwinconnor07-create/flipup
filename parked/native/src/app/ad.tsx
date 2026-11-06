import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { finishAd } from '@/state/ads';
import { spacing } from '@/theme';

const SECONDS = 5;

/** The placeholder for the rebuy's rewarded ad (state/ads.ts): a 5-second countdown, then Close. Closed early, it's skipped. */
export default function AdSheet() {
  const [left, setLeft] = useState(SECONDS);
  const done = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => {
      clearInterval(t);
      if (!done.current) finishAd('skipped');
    };
  }, []);
  const close = () => {
    done.current = true;
    finishAd('rewarded');
    router.back();
  };
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Ad', headerShown: false }} />
      <ThemedText variant="title2" style={{ textAlign: 'center' }}>
        Ad placeholder: the real ad goes here
      </ThemedText>
      <ThemedText variant="largeTitle" style={{ fontVariant: ['tabular-nums'] }}>
        {left}
      </ThemedText>
      <Button title="Close" disabled={left > 0} onPress={close} />
    </View>
  );
}
