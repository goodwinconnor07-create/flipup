import { router, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_BACKS } from '@design/premiumLooks';
import { Button } from '@/components/button';
import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { SwapIcon } from '@/components/swap';
import { Icon } from '@/components/icon';
import { isReason, PERKS, REASON_PERK, type Perk } from '@/components/premium/perks';
import { PressableScale } from '@/components/pressable-scale';
<<<<<<< HEAD
import { ThemedText } from '@/components/themed-text';
import { isVariant, variantInfo } from '@/engine';
=======
import { SheetScroll } from '@/components/sheet-scroll';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { CARD_PACKS, FREE_VARIANTS, isVariant, VARIANTS, variantInfo } from '@/engine';
>>>>>>> origin/main
import { usePremium } from '@/state/premium';
import { buyPremium, manageSubscription, ON_SALE, restorePremium, startStore, useStore, yearlySaving, type Plan } from '@/state/purchase';
import { brand, radius, ROUNDED, spacing } from '@/theme';

import { APP_INFO } from '../../appInfo';

<<<<<<< HEAD
const glass = 'rgba(255,255,255,0.08)';
const line = 'rgba(255,255,255,0.12)';

/**
 * FlipUp Premium (docs/APP_STORE.md 3.1.1 and 3.1.2; docs/PREMIUM_PLAN.md). Built so everything you get is on one
 * screen: a short title, then every perk as a small tile in a two-column grid (a tap shows it properly in the
 * `premium-perk` sheet), and the plans pinned at the bottom: yearly and monthly side by side, each with the App
 * Store's own price, the 14-day $1 trial when this Apple Account can still take it, Subscribe, Restore, and the
 * terms and privacy links Apple asks for. Opened with `?reason=` (a locked game, look, ULTRA, Replay, a share design,
 * an icon or the gold name), whose perk is lit up first. With Premium it says what plan you're on and how to manage it.
 */
export default function PremiumSheet() {
  const params = useLocalSearchParams<{ reason?: string; game?: string }>();
  const reason = isReason(params.reason) ? params.reason : undefined;
=======
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
>>>>>>> origin/main
  const wanted = params.game && isVariant(params.game) ? params.game : undefined;
  const has = usePremium();
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan>('yearly');
  useEffect(() => void startStore(), []);
  const night = CARD_BACKS.obsidian.base;
  const open = (url: string) => void openBrowserAsync(url).catch(() => Linking.openURL(url));
  const lit = reason ? REASON_PERK[reason] : undefined;
  const perks = lit ? [...PERKS.filter((p) => p.id === lit), ...PERKS.filter((p) => p.id !== lit)] : PERKS;

  const chosen = store.plans[plan];
  const saving = yearlySaving(store.plans);
  const trial = chosen?.intro ? `${chosen.intro} for ${chosen.introDays ?? 14} days` : null;

  const buy = async () => {
    if (await buyPremium(plan)) {
      haptic.success();
      router.back();
    }
  };
  const restore = async () => {
    const ok = await restorePremium();
    if (ok) {
      haptic.success();
      Alert.alert('Premium is back', 'Thanks for backing FlipUp.');
    } else if (!store.error) Alert.alert('Nothing to restore', 'This Apple Account has no FlipUp Premium.');
  };

<<<<<<< HEAD
  const title = has ? 'You have Premium' : reason === 'game' && wanted ? `Host ${variantInfo(wanted).name}` : 'FlipUp Premium';
  const sub = has
    ? store.owned === 'lifetime'
      ? 'Yours for good. Thank you for backing FlipUp.'
      : `On the ${store.owned === 'monthly' ? 'monthly' : 'yearly'} plan. Thank you for backing FlipUp.`
    : 'Everything below, on every table. Friends always join free.';
=======
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
>>>>>>> origin/main

  return (
    <GrainBackground colors={[night[0], night[1], night[1]]} glow="rgba(90, 140, 255, 0.16)" glow2="rgba(245, 183, 0, 0.1)">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.lg, gap: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => router.back()} style={({ pressed }) => ({ position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 1, width: 30, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', opacity: pressed ? 0.6 : 1 })}>
          <Icon name="xmark" size={13} color="white" />
        </Pressable>

        <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: spacing.xl }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.gold }}>
            <Icon name="crown.fill" size={22} color={brand.goldInk} />
          </View>
          <ThemedText accessibilityRole="header" style={{ fontFamily: ROUNDED, fontSize: 28, lineHeight: 34, fontWeight: '800', color: '#ffffff', textAlign: 'center' }}>
            {title}
          </ThemedText>
          <ThemedText variant="subhead" style={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
            {sub}
          </ThemedText>
        </View>

<<<<<<< HEAD
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {perks.map((p) => (
            <PerkTile key={p.id} perk={p} lit={p.id === lit} />
          ))}
=======
        {has && <Button title="Card packs" variant="secondary" onPress={() => router.push('/card-packs')} />}

        <View accessible accessibilityLabel="Friends play free. Only the host needs Premium. Everyone else joins by code for free." style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: glass }}>
          <View style={{ width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', ...gradient(`linear-gradient(180deg, ${party.yellow}, ${party.orange})`) }}>
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
>>>>>>> origin/main
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.sm), gap: spacing.sm, borderTopWidth: 1, borderTopColor: line, backgroundColor: 'rgba(6,8,20,0.94)' }}>
        {has ? (
          <>
            <Button title="Done" variant="party" tint="gold" size="lg" onPress={() => router.back()} />
            {store.owned && store.owned !== 'lifetime' && <Button title="Manage subscription" variant="secondary" onPress={() => void manageSubscription()} />}
          </>
        ) : !ON_SALE ? (
          <Button title="On the iPhone app" variant="secondary" size="lg" disabled />
        ) : store.pending ? (
          <>
            <Button title="Waiting for approval" variant="secondary" size="lg" disabled />
            <ThemedText variant="footnote" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
              Someone has to approve this purchase. Premium turns on by itself when they do.
            </ThemedText>
          </>
        ) : store.error && !store.plans.monthly && !store.plans.yearly ? (
          <>
            <Button title="Try again" variant="party" tint="gold" size="lg" loading={store.busy} onPress={() => void startStore()} />
            <ThemedText variant="footnote" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
              {store.error}
            </ThemedText>
          </>
        ) : (
          <>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.xs }}>
              <PlanCard name="Yearly" price={store.plans.yearly?.price} per="year" badge={saving ? `Save ${saving}%` : 'Best value'} on={plan === 'yearly'} onPress={() => setPlan('yearly')} />
              <PlanCard name="Monthly" price={store.plans.monthly?.price} per="month" on={plan === 'monthly'} onPress={() => setPlan('monthly')} />
            </View>
            <Button
              title={!chosen ? 'Loading prices…' : trial ? `Try 14 days for ${chosen.intro}` : `Subscribe for ${chosen.price}/${plan === 'yearly' ? 'year' : 'month'}`}
              variant="party"
              tint="gold"
              size="lg"
              loading={store.busy}
              disabled={!chosen}
              onPress={() => void buy()}
            />
            <ThemedText variant="caption1" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
              {chosen ? `${trial ? `${trial}, then ` : ''}${chosen.price} a ${plan === 'yearly' ? 'year' : 'month'}. Renews until you cancel in Settings, at least a day before it renews. ` : ''}
              Play chips only, no cash value.
            </ThemedText>
            {store.error && (
              <ThemedText variant="footnote" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
                {store.error}
              </ThemedText>
            )}
          </>
        )}
        {ON_SALE && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md }}>
            {!has && <Link text="Restore" onPress={() => void restore()} />}
            <Link text="Terms" onPress={() => open(APP_INFO.termsUrl)} />
            <Link text="Privacy" onPress={() => open(APP_INFO.privacyUrl)} />
          </View>
        )}
      </View>
    </GrainBackground>
  );
}

/** One perk on the grid: its icon, name and a few words. A tap shows it properly. */
function PerkTile({ perk, lit }: { perk: Perk; lit: boolean }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${perk.title}. ${perk.short}. Show me.`}
      onPress={() => {
        haptic.select();
        router.push({ pathname: '/premium-perk', params: { id: perk.id } });
      }}
      outerStyle={{ width: '49%' }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, minHeight: 62, borderRadius: radius.md, backgroundColor: lit ? 'rgba(245,183,0,0.14)' : glass, borderWidth: 1, borderColor: lit ? brand.gold : 'transparent' }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: perk.id === 'ultra' || perk.id === 'gold' ? brand.gold : brand.violet }}>
        <Icon name={perk.icon} size={16} color={perk.id === 'ultra' || perk.id === 'gold' ? brand.goldInk : '#ffffff'} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="subhead" numberOfLines={1} adjustsFontSizeToFit style={{ color: '#ffffff', fontWeight: '700' }}>
          {perk.title}
        </ThemedText>
        <ThemedText variant="caption2" numberOfLines={2} style={{ color: 'rgba(255,255,255,0.65)' }}>
          {perk.short}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

function PlanCard({ name, price, per, badge, on, onPress }: { name: string; price?: string; per: string; badge?: string; on: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${name}${price ? `, ${price} a ${per}` : ''}${badge ? `, ${badge}` : ''}`}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      outerStyle={{ flex: 1 }}
      style={{ flex: 1, padding: spacing.sm, gap: 2, borderRadius: radius.md, borderWidth: 2, borderColor: on ? brand.gold : line, backgroundColor: on ? 'rgba(245,183,0,0.1)' : glass }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <ThemedText variant="subhead" style={{ color: '#ffffff', fontWeight: '700' }}>
          {name}
        </ThemedText>
        <SwapIcon name={on ? 'checkmark.circle.fill' : 'circle'} size={18} color={on ? brand.gold : 'rgba(255,255,255,0.4)'} />
      </View>
      <ThemedText style={{ fontFamily: ROUNDED, fontSize: 20, lineHeight: 24, fontWeight: '800', color: '#ffffff' }}>
        {price ?? '—'}
        <ThemedText variant="caption1" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {' '}
          / {per}
        </ThemedText>
      </ThemedText>
      {badge && (
        <ThemedText variant="caption2" style={{ color: brand.gold, fontWeight: '800' }}>
          {badge.toUpperCase()}
        </ThemedText>
      )}
    </PressableScale>
  );
}

function Link({ text, onPress }: { text: string; onPress: () => void }) {
  return (
<<<<<<< HEAD
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.65)', textDecorationLine: 'underline' }}>
        {text}
      </ThemedText>
    </Pressable>
=======
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
>>>>>>> origin/main
  );
}
