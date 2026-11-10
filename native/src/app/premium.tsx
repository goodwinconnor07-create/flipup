import { router, Stack, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_BACKS } from '@design/premiumLooks';
import { Button } from '@/components/button';
import { GameTile } from '@/components/game-tile';
import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SheetScroll } from '@/components/sheet-scroll';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { CARD_PACKS, FREE_VARIANTS, isVariant, VARIANTS, variantInfo } from '@/engine';
import { usePremium } from '@/state/premium';
import { buyPremium, ON_SALE, restorePremium, startStore, useStore } from '@/state/purchase';
import { gradient, party, radius, spacing, useColors } from '@/theme';

import { APP_INFO } from '../../appInfo';

type Reason = 'game' | 'pack';
type Part = 'games' | 'packs';

const FIRST: Record<Reason, Part> = { game: 'games', pack: 'packs' };
const glass = 'rgba(255,255,255,0.1)';

/**
 * FlipUp Premium (docs/APP_STORE.md, 3.1.1; docs/PREMIUM_PLAN.md). A night-purple sheet that shows what you get
 * before it asks for money: the eight games, every card back (tap to see it big), and what's free against what's
 * not. It opens with whatever you tapped first (a locked game or a card back). The price
 * comes from the App Store and sits in a bar pinned to the bottom, with Restore Purchases.
 */
export default function PremiumSheet() {
  const params = useLocalSearchParams<{ reason?: string; game?: string }>();
  const reason: Reason | undefined = params.reason === 'game' || params.reason === 'pack' ? params.reason : undefined;
  const wanted = params.game && isVariant(params.game) ? params.game : undefined;
  const has = usePremium();
  const store = useStore();
  const insets = useSafeAreaInsets();
  useEffect(() => void startStore(), []);
  const night = CARD_BACKS.obsidian.base;
  const open = (url: string) => void openBrowserAsync(url).catch(() => Linking.openURL(url));

  const buy = async () => {
    if (await buyPremium()) haptic.success();
  };
  const restore = async () => {
    const ok = await restorePremium();
    if (ok) {
      haptic.success();
      Alert.alert('Premium is back', 'Thanks for backing FlipUp.');
    } else if (!store.error) Alert.alert('Nothing to restore', 'This Apple Account hasn’t bought FlipUp Premium.');
  };

  const title = has ? 'You have Premium' : reason === 'game' && wanted ? `Host ${variantInfo(wanted).name}` : reason === 'pack' ? 'Get the card packs' : 'FlipUp Premium';
  const line = has
    ? 'Thank you for backing FlipUp. Everything below is yours.'
    : reason === 'game'
      ? 'This game needs Premium to host. Your friends can join it for free.'
      : reason === 'pack'
        ? 'Everyone at your table sees your look. One payment, yours for good.'
        : 'Make every table yours. One payment, yours for good.';

  const parts: Record<Part, React.ReactNode> = {
    games: <Games key="games" first={wanted} />,
    packs: <Packs key="packs" />,
  };
  const order: Part[] = ['games', 'packs'];
  if (reason) order.sort((a, b) => (a === FIRST[reason] ? -1 : b === FIRST[reason] ? 1 : 0));

  return (
    <GrainBackground colors={[night[0], night[1], night[1]]} glow="rgba(90, 140, 255, 0.16)" glow2="rgba(245, 183, 0, 0.06)">
      <Stack.Screen options={{ title: 'FlipUp Premium' }} />
      <SheetScroll style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()} style={({ pressed }) => ({ position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 1, width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', opacity: pressed ? 0.6 : 1 })}>
          <Icon name="xmark" size={14} color="white" />
        </Pressable>

        <Fan />
        <View style={{ gap: spacing.xs, alignItems: 'center' }}>
          <ThemedText variant="largeTitle" tone="onColor" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {title}
          </ThemedText>
          <ThemedText tone="onColor" style={{ textAlign: 'center', opacity: 0.8 }}>
            {line}
          </ThemedText>
        </View>

        {has && <Button title="Card packs" variant="secondary" onPress={() => router.push('/card-packs')} />}

        <View accessible accessibilityLabel="Friends play free. Only the host needs Premium. Everyone else joins by code for free." style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: glass }}>
          <View style={{ width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: party.yellow }}>
            <Icon name="person.2.fill" size={18} color="white" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="headline" tone="onColor">
              Friends play free
            </ThemedText>
            <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.75 }}>
              Only the host needs Premium. Everyone else joins by code, with no payment.
            </ThemedText>
          </View>
        </View>

        {order.map((p) => parts[p])}

        <Compare />
      </SheetScroll>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(10,6,24,0.92)' }}>
        {has ? (
          <Button title="Done" variant="party" tint="gold" size="lg" onPress={() => router.back()} />
        ) : !ON_SALE ? (
          <Button title="On the iPhone app" variant="secondary" size="lg" disabled />
        ) : store.pending ? (
          <>
            <Button title="Waiting for approval" variant="secondary" size="lg" disabled />
            <ThemedText variant="footnote" tone="onColor" style={{ textAlign: 'center', opacity: 0.8 }}>
              Someone has to approve this purchase. Premium turns on by itself when they do.
            </ThemedText>
          </>
        ) : store.error && !store.price ? (
          <>
            <Button title="Try again" variant="party" tint="gold" size="lg" loading={store.busy} onPress={() => void startStore()} />
            <ThemedText variant="footnote" tone="onColor" style={{ textAlign: 'center', opacity: 0.8 }}>
              {store.error}
            </ThemedText>
          </>
        ) : (
          <Button title={store.price ? `Unlock for ${store.price}` : 'Loading price…'} variant="party" tint="gold" size="lg" loading={store.busy} disabled={!store.price} onPress={() => void buy()} />
        )}
        {!has && store.error && store.price && (
          <ThemedText variant="footnote" tone="onColor" style={{ textAlign: 'center', opacity: 0.8 }}>
            {store.error}
          </ThemedText>
        )}
        {ON_SALE && !has && (
          <Button title="Restore Purchases" variant="secondary" onPress={() => void restore()} disabled={store.busy} />
        )}
        <ThemedText variant="footnote" tone="onColor" style={{ textAlign: 'center', opacity: 0.6 }}>
          One payment through the App Store. It never buys chips: they’re play chips with no cash value.{' '}
          <ThemedText variant="footnote" tone="onColor" style={{ textDecorationLine: 'underline' }} onPress={() => open(APP_INFO.privacyUrl)}>
            Privacy policy
          </ThemedText>
        </ThemedText>
      </View>
    </GrainBackground>
  );
}

/** The fan of every Premium card back at the top. */
function Fan() {
  const packs = CARD_PACKS.filter((p) => !p.venue);
  const mid = (packs.length - 1) / 2;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height: 120, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' }}>
      {packs.map((p, i) => (
        <View key={p.id} style={{ marginHorizontal: -14, transform: [{ rotate: `${(i - mid) * 6}deg` }, { translateY: Math.abs(i - mid) * 3 }] }}>
          <PlayingCard back size="md" pack={p.id} />
        </View>
      ))}
    </View>
  );
}

function Heading({ children, note }: { children: string; note?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <ThemedText variant="title2" tone="onColor" accessibilityRole="header">
        {children}
      </ThemedText>
      {note && (
        <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.7 }}>
          {note}
        </ThemedText>
      )}
    </View>
  );
}

/** The eight Premium games, with the one you tapped first. A tap shows how it plays. */
function Games({ first }: { first?: string }) {
  const { width } = useWindowDimensions();
  const tile = Math.floor((Math.min(width, 560) - spacing.lg * 2 - spacing.xs * 3) / 4);
  const games = VARIANTS.slice(FREE_VARIANTS);
  if (first) games.sort((a, b) => (a.id === first ? -1 : b.id === first ? 1 : 0));
  return (
    <View style={{ gap: spacing.sm }}>
      <Heading note="Tap one to see how it plays.">{`${games.length} more games`}</Heading>
      {/* The same tiles as Home, four to a row: the eight games read as a set you're getting. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {games.map((g) => (
          <PressableScale
            key={g.id}
            accessibilityRole="button"
            accessibilityLabel={`${g.name}. ${g.tagline}. See how it plays.`}
            onPress={() => {
              haptic.select();
              router.push(`/how-to-play/${g.id}`);
            }}
            haptics={false}
          >
            <GameTile variant={g.id} name={g.name} width={tile} />
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/** Every card back in a strip, with the chosen one shown large. */
function Packs() {
  const packs = CARD_PACKS.filter((p) => !p.venue);
  const [pick, setPick] = useState(packs[0].id);
  const chosen = packs.find((p) => p.id === pick) ?? packs[0];
  return (
    <View style={{ gap: spacing.sm }}>
      <Heading note="Everyone at your table sees the back of your cards.">{`${packs.length} card packs`}</Heading>
      <View accessible accessibilityLabel={`${chosen.name}. ${chosen.note}`} style={{ alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: glass }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ transform: [{ rotate: '-7deg' }, { translateX: 10 }] }}>
            <PlayingCard back size="xl" pack={chosen.id} />
          </View>
          <View style={{ transform: [{ rotate: '7deg' }, { translateX: -10 }] }}>
            <PlayingCard back size="xl" pack={chosen.id} />
          </View>
        </View>
        <ThemedText variant="headline" tone="onColor">
          {chosen.name}
        </ThemedText>
        <ThemedText variant="footnote" tone="onColor" style={{ opacity: 0.7 }}>
          {chosen.note}
        </ThemedText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
        {packs.map((p) => (
          <PressableScale
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${p.name} card pack`}
            accessibilityState={{ selected: p.id === pick }}
            onPress={() => {
              haptic.select();
              setPick(p.id);
            }}
            style={{ alignItems: 'center', gap: 4, padding: 6, borderRadius: radius.md, borderWidth: 2, borderColor: p.id === pick ? 'white' : 'transparent' }}
          >
            <PlayingCard back size="md" pack={p.id} />
            <ThemedText variant="caption1" tone="onColor" style={{ opacity: p.id === pick ? 1 : 0.7 }} numberOfLines={1}>
              {p.name}
            </ThemedText>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

/** Free against Premium, from the real counts. */
function Compare() {
  const rows = [
    { what: 'Games to host', free: String(FREE_VARIANTS), premium: String(VARIANTS.length) },
    { what: 'Card backs', free: '1', premium: String(1 + CARD_PACKS.filter((p) => !p.venue).length) },
    { what: 'Joining any game', free: 'Yes', premium: 'Yes' },
  ];
  return (
    <View style={{ gap: spacing.sm }}>
      <Heading>Free and Premium</Heading>
      <View style={{ borderRadius: radius.md, backgroundColor: glass, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', padding: spacing.sm }}>
          <View style={{ flex: 1 }} />
          <ThemedText variant="footnote" tone="onColor" style={{ width: 64, textAlign: 'center', opacity: 0.7 }}>
            Free
          </ThemedText>
          <ThemedText variant="footnote" tone="onColor" style={{ width: 80, textAlign: 'center', fontWeight: '700' }}>
            Premium
          </ThemedText>
        </View>
        {rows.map((r) => (
          <View key={r.what} accessible accessibilityLabel={`${r.what}: ${r.free} free, ${r.premium} with Premium`} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
            <ThemedText tone="onColor" style={{ flex: 1 }}>
              {r.what}
            </ThemedText>
            <ThemedText tone="onColor" style={{ width: 64, textAlign: 'center', opacity: 0.7 }}>
              {r.free}
            </ThemedText>
            <ThemedText tone="onColor" style={{ width: 80, textAlign: 'center', fontWeight: '700' }}>
              {r.premium}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}
