import { router, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { NightSheet, SheetHeading } from '@/components/night-sheet';
import { BANKROLL_RULES } from '@/state/bankroll';
import { brand, spacing } from '@/theme';

/** How Bankroll works: opened the first time Global is opened, and from its info button. */
export default function BankrollIntro() {
  return (
    <NightSheet
      footer={
        <View style={{ padding: spacing.md }}>
          <Button title="Got it" variant="party" size="lg" onPress={() => router.back()} />
        </View>
      }
    >
      <Stack.Screen options={{ title: 'How it works', headerShown: false }} />
      <SheetHeading title="1,000 chips. One month. Don’t go broke." />
      <View style={{ gap: spacing.md }}>
        {BANKROLL_RULES.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Text style={{ width: 22, fontSize: 17, fontWeight: '800', color: brand.gold }}>{i + 1}</Text>
            <Text maxFontSizeMultiplier={1.5} style={{ flex: 1, fontSize: 17, lineHeight: 23, color: '#ffffff' }}>
              {r}
            </Text>
          </View>
        ))}
      </View>
    </NightSheet>
  );
}
