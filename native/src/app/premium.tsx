import { router, Stack, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_BACKS } from '@design/premiumLooks';
import { Button } from '@/components/button';
import { GameIcon, iconCorner } from '@/components/game-icon';
import { GameThumb } from '@/components/game-picture';
import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SheetScroll } from '@/components/sheet-scroll';
import { MoveBubble } from '@/components/table/bubbles';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { BUBBLE_STYLES, CARD_PACKS, FREE_VARIANTS, isVariant, VARIANTS, variantInfo } from '@/engine';
import { usePremium } from '@/state/premium';
import { buyPremium, ON_SALE, restorePremium, startStore, useStore } from '@/state/purchase';
import { gradient, party, radius, ROUNDED, spacing, useColors } from '@/theme';

import { APP_INFO } from '../../appInfo';

type Reason = 'game' | 'pack' | 'bubble';
type Part = 'games' | 'packs' | 'bubbles';

const FIRST: Record<Reason, Part> = { game: 'games', pack: 'packs', bubble: 'bubbles' };
const glass = 'rgba(255,255,255,0.1)';

/**
 * FlipUp Premium (docs/APP_STORE.md, 3.1.1; docs/PREMIUM_PLAN.md). A night-purple sheet that shows what you get
 * before it asks for money, the way SCRAM and Apple do it: "Not now" in quiet words, the eight games' icons as the
 * picture, one big line, three benefits, then everything in it (the eight games, every card back (tap to see it big),
 * every bubble effect, and what's free against what's not). It opens with whatever you tapped first (a locked game, a card back or a bubble). The price
 * comes from the App Store and sits in a bar pinned to the bottom, with Restore Purchases.
 */
export default function PremiumSheet() {
  const params = useLocalSearchParams<{ reason?: string; game?: string }>();
  const reason: Reason | undefined = params.reason === 'game' || params.reason === 'pack' || params.reason === 'bubble' ? params.reason : undefined;
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

  const title = has ? 'You have Premium' : reason === 'game' && wanted ? `Host ${variantInfo(wanted).name}` : reason === 'pack' ? 'Get the card packs' : reason === 'bubble' ? 'Get the chat bubbles' : 'FlipUp Premium';
  const line = has
    ? 'Thank you for backing FlipUp. Everything below is yours.'
    : reason === 'game'
      ? 'This game needs Premium to host. Your friends can join it for free.'
      : reason === 'pack' || reason === 'bubble'
        ? 'Everyone at your table sees your look. One payment, yours for good.'
        : 'Make every table yours. One payment, yours for good.';

  const parts: Record<Part, React.ReactNode> = {
    games: <Games key="games" first={wanted} />,
    packs: <Packs key="packs" />,
    bubbles: <Bubbles key="bubbles" />,
  };
  const order: Part[] = ['games', 'packs', 'bubbles'];
  if (reason) order.sort((a, b) => (a === FIRST[reason] ? -1 : b === FIRST[reason] ? 1 : 0));

  return (
    <GrainBackground colors={[night[0], night[1], night[1]]} glow="rgba(150, 120, 255, 0.16)" glow2="rgba(245, 183, 0, 0.06)">
      <Stack.Screen options={{ title: 'FlipUp Premium' }} />
      <SheetScroll style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl }}>
        {/* The way out is quiet words, not a button that competes with Buy. */}
        <Pressable accessibilityRole="button" accessibilityLabel={has ? 'Close' : 'Not now'} hitSlop={12} onPress={() => router.back()} style={({ pressed }) => ({ position: 'absolute', top: spacing.md, left: spacing.lg, zIndex: 1, minHeight: 32, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
          <ThemedText variant="body" tone="onColor" style={{ opacity: 0.8 }}>
            {has ? 'Close' : 'Not now'}
          </ThemedText>
        </Pressable>

        <IconWall first={wanted} />
        <View style={{ gap: spacing.xs }}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.25} style={{ fontFamily: ROUNDED, fontSize: 40, lineHeight: 44, fontWeight: '800', color: '#ffffff' }}>
            {title}
          </Text>
          <ThemedText tone="onColor" style={{ opacity: 0.8 }}>
            {line}
          </ThemedText>
        </View>

        {has && (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Card packs" variant="secondary" onPress={() => router.push('/card-packs')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Chat bubbles" variant="secondary" onPress={() => router.push('/chat-bubbles')} />
            </View>
          </View>
        )}

        {/* What you get, in three lines, before the catalogue. */}
        <View style={{ gap: spacing.md }}>
          <Benefit icon="crown.fill" title={`${VARIANTS.length - FREE_VARIANTS} more games to host`} line="Imposter, Red River, Memory Poker and the rest, for your whole table." />
          <Benefit icon="paintpalette.fill" title="Every card pack and bubble effect" line="Everyone at the table sees your look." />
          <Benefit icon="person.2.fill" title="Friends play free" line="Only the host needs Premium. Everyone else joins by code." />
        </View>

        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={{ marginTop: spacing.md, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, color: 'rgba(255, 255, 255, 0.6)' }}>
          EVERYTHING IN PREMIUM
        </Text>
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
          <>
            <Button title={store.price ? `Unlock Premium · ${store.price}` : 'Loading price…'} variant="party" tint="gold" size="lg" loading={store.busy} disabled={!store.price} onPress={() => void buy()} />
            <ThemedText variant="subhead" tone="onColor" style={{ textAlign: 'center', fontWeight: '600', opacity: 0.85 }}>
              One payment, no subscription. Friends play free.
            </ThemedText>
          </>
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

/**
 * The top of the offer: the eight Premium games' icons as a tilted wall that runs off the edges (the game you tapped
 * first, if any), so the picture is what you're buying.
 */
function IconWall({ first }: { first?: string }) {
  const games = VARIANTS.slice(FREE_VARIANTS).map((v) => v.id);
  if (first) games.sort((a, b) => (a === first ? -1 : b === first ? 1 : 0));
  const SIZE = 84;
  const rows = [games.slice(0, 4), games.slice(4, 8)];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: SIZE * 2 + 56, marginHorizontal: -spacing.lg, marginTop: spacing.xl, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ gap: 14, transform: [{ rotate: '-8deg' }] }}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 14, marginLeft: r ? SIZE * 0.6 : 0 }}>
            {row.map((g) => (
              <View key={g} style={{ borderRadius: iconCorner(SIZE), borderCurve: 'continuous', boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.7)' }}>
                <GameIcon id={g} size={SIZE} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/** One thing Premium gives you: a gold symbol, a bold line and a plain one. No box round it. */
function Benefit({ icon, title, line }: { icon: 'crown.fill' | 'paintpalette.fill' | 'person.2.fill'; title: string; line: string }) {
  return (
    <View accessible style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
      <View style={{ width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', ...gradient(`linear-gradient(180deg, ${party.yellow}, ${party.orange})`) }}>
        <Icon name={icon} size={18} color="white" />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <ThemedText variant="headline" tone="onColor">
          {title}
        </ThemedText>
        <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.72 }}>
          {line}
        </ThemedText>
      </View>
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
  const colors = useColors();
  const games = VARIANTS.slice(FREE_VARIANTS);
  if (first) games.sort((a, b) => (a.id === first ? -1 : b.id === first ? 1 : 0));
  return (
    <View style={{ gap: spacing.sm }}>
      <Heading note="Tap one to see how it plays.">{`${games.length} more games`}</Heading>
      <View style={{ borderRadius: radius.md, backgroundColor: glass, overflow: 'hidden' }}>
        {games.map((g, i) => (
          <PressableScale
            key={g.id}
            accessibilityRole="button"
            accessibilityLabel={`${g.name}. ${g.tagline}. See how it plays.`}
            onPress={() => {
              haptic.select();
              router.push(`/how-to-play/${g.id}`);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderTopWidth: i ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: g.id === first ? 'rgba(255,255,255,0.08)' : undefined }}
          >
            <GameThumb variant={g.id} size={44} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="headline" tone="onColor" numberOfLines={1}>
                {g.name}
              </ThemedText>
              <ThemedText variant="footnote" tone="onColor" style={{ opacity: 0.7 }} numberOfLines={2}>
                {g.tagline}
              </ThemedText>
            </View>
            <Icon name="crown.fill" size={15} color={colors.gold} />
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

/** Every Premium bubble effect as a live bubble. */
function Bubbles() {
  const fx = BUBBLE_STYLES.filter((b) => !b.free);
  return (
    <View style={{ gap: spacing.sm }}>
      <Heading note="Your moves and messages show in this colour for the whole table.">{`${fx.length} bubble effects`}</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {fx.map((b) => (
          <View key={b.id} accessible accessibilityLabel={`${b.name}. ${b.note}`} style={{ width: '48%', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: glass }}>
            <MoveBubble text="Raise 40" tone="blue" fx={b.id} big />
            <ThemedText variant="footnote" tone="onColor" style={{ opacity: 0.8 }}>
              {b.name}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Free against Premium, from the real counts. */
function Compare() {
  const rows = [
    { what: 'Games to host', free: String(FREE_VARIANTS), premium: String(VARIANTS.length) },
    { what: 'Card backs', free: '1', premium: String(1 + CARD_PACKS.filter((p) => !p.venue).length) },
    { what: 'Bubble looks', free: String(1 + BUBBLE_STYLES.filter((b) => b.free).length), premium: String(1 + BUBBLE_STYLES.length) },
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
