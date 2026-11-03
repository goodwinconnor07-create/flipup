import { router, Stack } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { CARD_BACKS } from '@design/premiumLooks';
import { SheetScroll } from '@/components/sheet-scroll';
import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { CARD_PACKS } from '@/engine';
import { usePremium } from '@/state/premium';
import { buyPremium, ON_SALE, restorePremium, startStore, useStore } from '@/state/purchase';
import { gradient, party, radius, spacing } from '@/theme';

import { APP_INFO } from '../../appInfo';

const PERKS: { icon: IconName; title: string; line: string }[] = [
  { icon: 'crown.fill', title: 'Seven more games', line: 'Host Red River, Imposter, Memory Poker and the rest, with no ads.' },
  { icon: 'suit.spade.fill', title: 'Eleven card packs', line: 'Shining card backs. Your table sees them on your cards.' },
  { icon: 'bubble.left.fill', title: 'Eleven bubble effects', line: 'Fire, galaxy, neon and more. Everyone at the table sees them.' },
];

/**
 * FlipUp Premium: a night-purple sheet with a fan of every Premium card back, what it unlocks, the App Store's
 * price, Buy and Restore Purchases (docs/APP_STORE.md, 3.1.1). One payment, never chips.
 */
export default function PremiumSheet() {
  const has = usePremium();
  const store = useStore();
  useEffect(() => void startStore(), []);
  const packs = CARD_PACKS.filter((p) => !p.venue);
  const mid = (packs.length - 1) / 2;
  const night = CARD_BACKS.obsidian.base;
  const open = (url: string) => void openBrowserAsync(url).catch(() => Linking.openURL(url));

  const buy = async () => {
    if (await buyPremium()) {
      haptic.success();
      router.back();
    }
  };
  const restore = async () => {
    const ok = await restorePremium();
    if (ok) {
      haptic.success();
      Alert.alert('Premium is back', 'Thanks for backing FlipUp.');
    } else if (!store.error) Alert.alert('Nothing to restore', 'This Apple Account hasn’t bought FlipUp Premium.');
  };

  return (
    <SheetScroll style={gradient(`linear-gradient(180deg, ${night[0]}, ${night[1]})`)} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'FlipUp Premium' }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()} style={({ pressed }) => ({ position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 1, width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', opacity: pressed ? 0.6 : 1 })}>
        <Icon name="xmark" size={14} color="white" />
      </Pressable>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height: 120, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' }}>
        {packs.map((p, i) => (
          <View key={p.id} style={{ marginHorizontal: -14, transform: [{ rotate: `${(i - mid) * 6}deg` }, { translateY: Math.abs(i - mid) * 3 }] }}>
            <PlayingCard back size="md" pack={p.id} />
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.xs, alignItems: 'center' }}>
        <ThemedText variant="largeTitle" tone="onColor" style={{ textAlign: 'center' }}>
          FlipUp Premium
        </ThemedText>
        <ThemedText tone="onColor" style={{ textAlign: 'center', opacity: 0.8 }}>
          {has ? 'Unlocked. Thank you for backing FlipUp.' : 'Make every table yours. One payment, yours for good.'}
        </ThemedText>
      </View>
      <View style={{ gap: spacing.md }}>
        {PERKS.map((p) => (
          <View key={p.title} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <View style={{ width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', ...gradient(`linear-gradient(180deg, ${party.yellow}, ${party.orange})`) }}>
              <Icon name={p.icon} size={18} color="white" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText variant="headline" tone="onColor">
                {p.title}
              </ThemedText>
              <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.75 }}>
                {p.line}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
      {has ? (
        <Button title="Done" variant="party" tint="gold" size="lg" onPress={() => router.back()} />
      ) : ON_SALE ? (
        <Button title={store.price ? `Unlock for ${store.price}` : 'Loading price…'} variant="party" tint="gold" size="lg" loading={store.busy} disabled={!store.price} onPress={() => void buy()} />
      ) : (
        <Button title="On the iPhone app" variant="secondary" size="lg" disabled />
      )}
      {store.error && (
        <ThemedText variant="footnote" tone="onColor" style={{ textAlign: 'center', opacity: 0.8 }}>
          {store.error}
        </ThemedText>
      )}
      {ON_SALE && !has && (
        <Button title="Restore Purchases" variant="secondary" onPress={() => void restore()} disabled={store.busy} />
      )}
      <ThemedText variant="footnote" tone="onColor" style={{ textAlign: 'center', opacity: 0.6 }}>
        A one-time purchase through the App Store. It never buys chips: they&apos;re play chips with no cash value.
      </ThemedText>
      <ThemedText variant="footnote" tone="onColor" style={{ textAlign: 'center', opacity: 0.8, textDecorationLine: 'underline' }} onPress={() => open(APP_INFO.privacyUrl)}>
        Privacy policy
      </ThemedText>
    </SheetScroll>
  );
}
