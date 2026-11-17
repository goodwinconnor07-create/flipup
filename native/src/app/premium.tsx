import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GrainBackground } from '@/components/grain-background';
import { PANEL_RADIUS, Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { isReason, PERKS, REASON_PERK, type Perk, type PerkId } from '@/components/premium/perks';
import { PerkScreen, PhoneFrame } from '@/components/premium/phone-shots';
import { PressableScale } from '@/components/pressable-scale';
import { Confetti } from '@/components/table/confetti';
import { Swap } from '@/components/swap';
import { RoundButton } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { FAMILIAR_COUNT, FREE_BOT_NAMES, isVariant, VARIANTS, variantInfo, FREE_VARIANTS } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePremium } from '@/state/premium';
import { buyPremium, manageSubscription, ON_SALE, restorePremium, startStore, storeError, useStore, yearlySaving, type Plan, type StoreState } from '@/state/purchase';
import { brand, ForceScheme, radius, ROUNDED, spacing, useScreenReader } from '@/theme';

import { APP_INFO } from '../../appInfo';

/** The plan cards: solid, so the phone pictures they sit over never show through the prices. */
const CARD_BG = '#111b3d';
const CARD_EDGE = 'rgba(255,255,255,0.12)';
const MUTED = 'rgba(255,255,255,0.72)';
/** How long each perk stays up before the next slides in. */
const HERO_MS = 4200;
/** How much of the phone shows under each perk's words before the plans cut across it, like the App Store's shots. */
const PHONE_SHOW = 0.56;

/**
 * FlipUp Premium (docs/APP_STORE.md 3.1.1 and 3.1.2; docs/PREMIUM_PLAN.md), laid out after Flighty Pro's page (owner,
 * 2026-11-11): the FlipUp | PREMIUM pill and a round close button, then every perk as its own big picture with a title
 * and a line, sliding on by itself every few seconds (swipe them too; still under Reduce Motion), and under it the
 * plans as big dark cards you swipe between, each with its badge, name, line, the App Store's price, one big button
 * and what it includes. Opened with `?reason=` (a locked game, bot, range hand, look, Replay, a share design, an icon
 * or the gold name), whose perk comes first. With Premium the card says what plan you're on.
 */
export default function PremiumScreen() {
  return (
    <ForceScheme scheme="dark">
      <PremiumPage />
    </ForceScheme>
  );
}

function PremiumPage() {
  const params = useLocalSearchParams<{ reason?: string; game?: string }>();
  const reason = isReason(params.reason) ? params.reason : undefined;
  const wanted = params.game && isVariant(params.game) ? params.game : undefined;
  const has = usePremium();
  const store = useStore();
  const insets = useSafeAreaInsets();
  useEffect(() => void startStore(), []);
  const open = (url: string) => void openBrowserAsync(url).catch(() => Linking.openURL(url));
  const lit = reason ? REASON_PERK[reason] : undefined;
  const perks = lit ? [...PERKS.filter((p) => p.id === lit), ...PERKS.filter((p) => p.id !== lit)] : PERKS;

  // Just bought: a moment to enjoy it before the page closes.
  const [celebrate, setCelebrate] = useState(0);
  const pageRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const restore = async () => {
    const ok = await restorePremium();
    if (ok) {
      haptic.success();
      Alert.alert('Premium is back', 'Thanks for backing FlipUp.');
    } else if (!storeError()) Alert.alert('Nothing to restore', 'This Apple Account has no FlipUp Premium.');
  };

  return (
    <GrainBackground>
      <ScrollView
        ref={pageRef}
        contentInsetAdjustmentBehavior="never"
        scrollEnabled={!celebrate}
        contentContainerStyle={{ paddingTop: insets.top + spacing.xs, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
          <BrandPill />
          <RoundButton icon="xmark" label="Close" onPress={() => router.back()} />
        </View>

        {/* With Premium there's nothing to sell: the plan card, then what's unlocked. */}
        {!has && <HeroPager perks={perks} wanted={reason === 'game' ? wanted : undefined} />}

        {/* The plans cut across the bottom of the phone, as the reference does. */}
        <View style={{ marginTop: has ? spacing.md : -spacing.xxl }}>
          <Plans store={store} has={has} onBought={() => (pageRef.current?.scrollTo({ y: 0, animated: false }), setCelebrate(Date.now()))} />
        </View>

        {/* The terms sit right under the plans, beside the buttons that buy them (App Review 3.1.2), not under the perks. */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}>
          {!has && ON_SALE && (
            <ThemedText variant="caption1" tone="secondaryLabel" style={{ textAlign: 'center' }}>
              Payment is charged to your Apple Account. A subscription renews automatically at the price shown unless you cancel it at least 24 hours before the period ends; cancel anytime in Settings, Apple Account, Subscriptions. Play chips only, no cash value. Friends always join your games free.
            </ThemedText>
          )}
          {ON_SALE && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
              {!has && <Link text="Restore" onPress={() => void restore()} />}
              <Link text="Terms" onPress={() => open(APP_INFO.termsUrl)} />
              <Link text="Privacy" onPress={() => open(APP_INFO.privacyUrl)} />
            </View>
          )}
        </View>

        <PerkList has={has} />
      </ScrollView>
      <Celebration at={celebrate} />
    </GrainBackground>
  );
}

/**
 * After a purchase: the whole screen says thank you, with confetti (none under Reduce Motion) and what just
 * unlocked, and Done closes the page.
 */
function Celebration({ at }: { at: number }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Mounted only after a purchase, and drawn over the page itself rather than in a native Modal (a Modal inside a
  // form sheet can fail to present, and an empty one is a risk for nothing).
  if (!at) return null;
  return (
    <Animated.View entering={FadeIn.duration(250)} style={{ position: 'absolute', top: 0, left: 0, right: 0, height, zIndex: 50 }}>
      <GrainBackground style={{ flex: 1, paddingTop: insets.top + spacing.xl, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md, paddingHorizontal: spacing.lg, gap: spacing.lg }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.085)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
            <Icon name="crown.fill" size={40} color={brand.gold} />
          </View>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 34, lineHeight: 40, fontWeight: '800', color: '#ffffff', textAlign: 'center' }}>
            Premium is on
          </Text>
          <ThemedText variant="body" style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center' }}>
            Thanks for backing FlipUp. Here’s what just unlocked.
          </ThemedText>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.xs }} showsVerticalScrollIndicator={false}>
          {PERKS.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 18, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.085)' }}>
              <Icon name={p.icon} size={20} color={brand.gold} />
              <ThemedText variant="headline" style={{ flex: 1, color: '#ffffff' }}>
                {p.title}
              </ThemedText>
              <Icon name="checkmark" size={16} color="rgba(255,255,255,0.8)" />
            </View>
          ))}
        </ScrollView>
        <BlueButton title="Done" onPress={() => router.back()} />
        <Confetti burst={at} origin={{ x: width / 2, y: height * 0.25 }} amount={90} />
      </GrainBackground>
    </Animated.View>
  );
}

/**
 * Every perk in one place under the plans (the pictures above show one at a time): its icon, its name and a line.
 * A tap opens the perk's own page, which with Premium has a button to go there.
 */
function PerkList({ has }: { has: boolean }) {
  return (
    <View style={{ marginHorizontal: spacing.md, marginTop: spacing.xl }}>
      <Section header={has ? 'Your Premium' : 'Everything in Premium'}>
        {PERKS.map((p) => (
          <Row
            key={p.id}
            title={p.title}
            subtitle={p.about}
            icon={{ symbol: p.icon, color: brand.gold }}
            onPress={() => router.push({ pathname: '/premium-perk', params: { id: p.id } })}
          />
        ))}
      </Section>
    </View>
  );
}

/** A soft block that breathes while the App Store's price is on its way (still under Reduce Motion). */
function Shimmer({ width, height }: { width: number; height: number }) {
  const reduce = useReduceMotion();
  const glow = useSharedValue(0.18);
  useEffect(() => {
    if (!reduce) glow.set(withRepeat(withTiming(0.34, { duration: 850, easing: Easing.out(Easing.quad) }), -1, true));
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ backgroundColor: `rgba(255,255,255,${glow.get()})` }));
  return <Animated.View accessible accessibilityLabel="Loading the price" style={[{ width, height, borderRadius: 8 }, style]} />;
}

/** "FlipUp" on a dark grey capsule, then PREMIUM on black, as one pill. */
function BrandPill() {
  return (
    <View accessible accessibilityLabel="FlipUp Premium" style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.full, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.085)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '700', color: '#ffffff', paddingLeft: 14, paddingRight: 8, paddingVertical: 7 }}>FlipUp</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(245,183,0,0.16)' }}>
        <Icon name="crown.fill" size={13} color={brand.gold} />
        <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 15, fontWeight: '800', color: brand.gold, letterSpacing: 0.5 }}>PREMIUM</Text>
      </View>
    </View>
  );
}

/** The words over each perk's picture: shorter and louder than the grid's. */
const HERO_WORDS: Partial<Record<PerkId, { title: string; line: string }>> = {
  range: { title: 'Every range hand', line: 'Every real spot, as many sets as you like.' },
  bots: { title: 'The whole roster', line: `${FAMILIAR_COUNT} characters and hundreds of regulars. Free tables get ${FREE_BOT_NAMES.length}.` },
  games: { title: `${VARIANTS.length - FREE_VARIANTS} more games`, line: 'Host every mini game. Friends join free.' },
  share: { title: 'Share cards', line: 'Your best hands and nights, as a picture.' },
  gold: { title: 'Gold name', line: 'Everyone at the table sees it.' },
  packs: { title: 'Card backs', line: 'On your cards, for the whole table to see.' },
};

/**
 * One perk at a time: a big picture with its title and line under it. It moves on by itself every few seconds and
 * loops; a swipe takes over. It stays put under Reduce Motion and while the page is covered (a sheet over it).
 */
function HeroPager({ perks, wanted }: { perks: Perk[]; wanted?: string }) {
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();
  // Under VoiceOver the pictures only move when the person swipes them: a page that changes while it's being read is lost.
  const reader = useScreenReader();
  const focused = useIsFocused();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (reduce || reader || held || !focused || perks.length < 2) return;
    const t = setTimeout(() => {
      const next = (page + 1) % perks.length;
      ref.current?.scrollTo({ x: next * width, animated: next !== 0 });
      setPage(next);
    }, HERO_MS);
    return () => clearTimeout(t);
  }, [page, held, reduce, reader, focused, perks.length, width]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
    setHeld(false);
  };
  const phone = Math.min(Math.round(width * 0.7), 310);

  return (
    <View>
      <View accessible accessibilityLabel={`${page + 1} of ${perks.length}`} style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.md }}>
        {perks.map((p, i) => (
          <View key={p.id} style={{ width: i === page ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? '#ffffff' : 'rgba(255,255,255,0.35)' }} />
        ))}
      </View>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setHeld(true)}
        onMomentumScrollEnd={settle}
      >
        {perks.map((p, i) => {
          const words = HERO_WORDS[p.id] ?? { title: p.title, line: p.short };
          const title = i === 0 && wanted && p.id === 'games' ? `Host ${variantInfo(wanted as never).name}` : words.title;
          return (
            // Each perk the way the App Store shows the app: its name and a line, then the phone showing it.
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${words.line} Show me more.`}
              onPress={() => {
                haptic.select();
                router.push({ pathname: '/premium-perk', params: { id: p.id } });
              }}
              style={{ width, alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.lg }}
            >
              <View style={{ alignItems: 'center', gap: spacing.xxs, minHeight: 92 }}>
                <ThemedText variant="largeTitle" numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontWeight: '800', textAlign: 'center' }}>
                  {title}
                </ThemedText>
                <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center' }}>
                  {words.line}
                </ThemedText>
              </View>
              <PhoneFrame width={phone} show={PHONE_SHOW}>
                <PerkScreen id={p.id} />
              </PhoneFrame>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface PlanInfo {
  plan: Plan;
  badge: string;
  name: string;
  line: string;
  per: string;
  under: string;
  button: string;
  points: { icon: IconName; text: string }[];
}

/**
 * The plans as big dark cards you swipe between, the next one peeking in at the edge. Yearly first (Best value),
 * then Monthly (Most flexible). With Premium it's one card with your plan; while the store is busy or can't sell,
 * one card says so.
 */
function Plans({ store, has, onBought }: { store: StoreState; has: boolean; onBought: () => void }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - spacing.md * 2 - 20, 420);
  const gap = spacing.sm;
  const saving = yearlySaving(store.plans);

  const buy = async (plan: Plan) => {
    if (await buyPremium(plan)) {
      haptic.success();
      onBought();
    }
  };

  if (has || !ON_SALE || store.pending || (store.error && !store.plans.monthly && !store.plans.yearly)) {
    const body: ReactNode = has ? (
      <>
        <Badge text={store.owned === 'lifetime' ? 'YOURS FOR GOOD' : 'ACTIVE'} />
        <ThemedText variant="title1" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>You have Premium</ThemedText>
        <ThemedText variant="body" tone="secondaryLabel">
          {store.owned === 'monthly' || store.owned === 'yearly' ? `On the ${store.owned} plan. Thank you for backing FlipUp.` : 'Thank you for backing FlipUp.'}
        </ThemedText>
        <BlueButton title="Done" onPress={() => router.back()} />
        {store.owned && store.owned !== 'lifetime' && <Button title="Manage subscription" variant="secondary" onPress={() => void manageSubscription()} />}
      </>
    ) : !ON_SALE ? (
      <>
        <ThemedText variant="title2" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>On the iPhone app</ThemedText>
        <ThemedText tone="secondaryLabel">Premium is sold in the FlipUp iPhone app.</ThemedText>
      </>
    ) : store.pending ? (
      <>
        <ThemedText variant="title2" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>Waiting for approval</ThemedText>
        <ThemedText tone="secondaryLabel">Someone has to approve this purchase. Premium turns on by itself when they do.</ThemedText>
      </>
    ) : (
      <>
        <ThemedText variant="title2" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>Can’t reach the App Store</ThemedText>
        <ThemedText tone="secondaryLabel">{store.error}</ThemedText>
        <BlueButton title="Try again" loading={store.busy} onPress={() => void startStore()} />
      </>
    );
    return <View style={{ marginHorizontal: spacing.md, padding: spacing.lg, gap: spacing.md, borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_EDGE, boxShadow: '0 -10px 30px rgba(0,0,0,0.35)' }}>{body}</View>;
  }

  const yearly = store.plans.yearly;
  const monthly = store.plans.monthly;
  // The offer in the App Store's own terms: a free trial says free, a paid one its price, and the length only when StoreKit gave one.
  const offerOf = (p: StoreState['plans'][Plan]) => (!p?.intro ? null : `${p.introLength ?? (p.introDays ? `${p.introDays} days` : 'your first period')} ${p.introFree ? 'free' : `for ${p.intro}`}`);
  const trialOf = (p: StoreState['plans'][Plan]) => (offerOf(p) ? `${offerOf(p)}, then ` : '');
  const tryOf = (p: StoreState['plans'][Plan], plain: string) => (!p?.intro ? plain : p.introLength || p.introDays ? `Try ${offerOf(p)}` : p.introFree ? 'Start free trial' : `Start for ${p.intro}`);
  const cards: PlanInfo[] = [
    {
      plan: 'yearly',
      badge: 'BEST VALUE',
      name: 'Yearly',
      line: 'Every game, every bot and every range hand, all year.',
      per: 'year',
      under: yearly?.intro ? `${trialOf(yearly)}${yearly.price} a year` : 'Billed yearly',
      button: tryOf(yearly, 'Continue'),
      points: [
        { icon: 'crown', text: 'The most for your money' },
        { icon: 'infinity', text: 'Everything in Premium' },
      ],
    },
    {
      plan: 'monthly',
      badge: 'MOST FLEXIBLE',
      name: 'Monthly',
      line: 'Everything in Premium, a month at a time.',
      per: 'month',
      under: monthly?.intro ? `${trialOf(monthly)}${monthly.price} a month` : 'Cancel anytime',
      button: tryOf(monthly, 'Get Monthly'),
      points: [
        { icon: 'calendar', text: 'Stop whenever you like' },
        { icon: 'infinity', text: 'Everything in Premium' },
      ],
    },
  ];

  return (
    <View style={{ gap: spacing.sm }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW + gap}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap }}
        onMomentumScrollEnd={() => haptic.select()}
      >
        {cards.map((c) => {
          const price = store.plans[c.plan];
          return (
            <View key={c.plan} style={{ width: cardW, padding: spacing.lg, gap: spacing.md, borderRadius: PANEL_RADIUS, borderCurve: 'continuous', backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_EDGE, boxShadow: '0 -10px 30px rgba(0,0,0,0.35)' }}>
              <Badge text={c.badge} />
              <View style={{ gap: 6 }}>
                <ThemedText variant="title1" maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
                  {c.name}
                </ThemedText>
                <ThemedText variant="body" tone="secondaryLabel">
                  {c.line}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  {/* Until the App Store answers, soft blocks where the price and its line will be, not dashes. */}
                  {price ? (
                    <>
                      <Text maxFontSizeMultiplier={1.2} style={{ color: '#ffffff' }}>
                        <Text style={{ fontFamily: ROUNDED, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{price.price}</Text>
                        <Text style={{ fontSize: 19, color: MUTED }}> / {c.per}</Text>
                      </Text>
                      <ThemedText variant="subhead" tone="secondaryLabel">
                        {c.under}
                      </ThemedText>
                    </>
                  ) : (
                    <View style={{ gap: 10, paddingVertical: 4 }}>
                      <Shimmer width={150} height={30} />
                      <Shimmer width={110} height={16} />
                    </View>
                  )}
                </View>
                {c.plan === 'yearly' && saving && (
                  <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: brand.gold }}>
                    <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 15, fontWeight: '800', color: brand.goldInk }}>Save {saving}%</Text>
                  </View>
                )}
              </View>
              {price ? (
                <BlueButton title={c.button} loading={store.busy} onPress={() => void buy(c.plan)} />
              ) : (
                <View style={{ minHeight: 56, borderRadius: radius.full, overflow: 'hidden' }}>
                  <Shimmer width={cardW - spacing.lg * 2} height={56} />
                </View>
              )}
              <View style={{ gap: spacing.sm }}>
                {c.points.map((p) => (
                  <View key={p.text} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={{ width: 28, alignItems: 'center' }}>
                      <Icon name={p.icon} size={18} color="#cfe0ff" />
                    </View>
                    <ThemedText variant="subhead" tone="secondaryLabel" style={{ flex: 1 }}>
                      {p.text}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {store.error && (
        <ThemedText variant="footnote" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', paddingHorizontal: spacing.lg }}>
          {store.error}
        </ThemedText>
      )}
    </View>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: 'rgba(91,139,255,0.18)' }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.8, color: '#cfe0ff' }}>{text}</Text>
    </View>
  );
}

/** The plan card's one big button: the brand blue, full width, a capsule. */
function BlueButton({ title, onPress, loading, disabled }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={{ minHeight: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violet, opacity: disabled ? 0.5 : 1 }}
    >
      {/* Loading… turns into the price, and Try into Continue, in place (rules 16 and 17). */}
      <Swap id={loading ? '…' : title} kind="text">
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 20, fontWeight: '700', color: '#ffffff' }}>
          {loading ? '…' : title}
        </Text>
      </Swap>
    </PressableScale>
  );
}

function Link({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.8)', textDecorationLine: 'underline' }}>
        {text}
      </ThemedText>
    </Pressable>
  );
}
