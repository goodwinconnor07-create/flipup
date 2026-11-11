import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { isReason, PERKS, REASON_PERK, type Perk, type PerkId } from '@/components/premium/perks';
import { PressableScale } from '@/components/pressable-scale';
import { statsData } from '@/components/share/data';
import { CARD_H, CARD_W, SHARE_DESIGNS, ShareCard } from '@/components/share/designs';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { botFace, BOTS, CARD_PACKS, FREE_BOT_NAMES, isVariant, VARIANTS, variantInfo, FREE_VARIANTS } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { usePremium } from '@/state/premium';
import { buyPremium, manageSubscription, ON_SALE, restorePremium, startStore, useStore, yearlySaving, type Plan, type StoreState } from '@/state/purchase';
import { brand, gradient, radius, ROUNDED, spacing } from '@/theme';

import { APP_INFO } from '../../appInfo';

/** The page: night at the top, the brand blue lit up behind the pictures, then down to black under the plans. */
const PAGE = 'linear-gradient(180deg, #050b24 0%, #0d2468 16%, #2557d6 34%, #5b8bff 52%, #3a64d8 60%, #0c1430 70%, #000000 82%)';
const CARD_BG = 'rgba(30,31,36,0.97)';
const MUTED = 'rgba(255,255,255,0.6)';
/** How long each perk stays up before the next slides in. */
const HERO_MS = 4200;
const HERO_H = 330;

/**
 * FlipUp Premium (docs/APP_STORE.md 3.1.1 and 3.1.2; docs/PREMIUM_PLAN.md), laid out after Flighty Pro's page (owner,
 * 2026-11-11): the FlipUp | PREMIUM pill and a round close button, then every perk as its own big picture with a title
 * and a line, sliding on by itself every few seconds (swipe them too; still under Reduce Motion), and under it the
 * plans as big dark cards you swipe between, each with its badge, name, line, the App Store's price, one big button
 * and what it includes. Opened with `?reason=` (a locked game, bot, range hand, look, Replay, a share design, an icon
 * or the gold name), whose perk comes first. With Premium the card says what plan you're on.
 */
export default function PremiumSheet() {
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

  const restore = async () => {
    const ok = await restorePremium();
    if (ok) {
      haptic.success();
      Alert.alert('Premium is back', 'Thanks for backing FlipUp.');
    } else if (!store.error) Alert.alert('Nothing to restore', 'This Apple Account has no FlipUp Premium.');
  };

  return (
    <View style={[{ flex: 1, backgroundColor: '#000000' }, gradient(PAGE)]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md }}>
          <BrandPill />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,24,40,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name="xmark" size={17} color="white" />
          </Pressable>
        </View>

        <HeroPager perks={perks} wanted={reason === 'game' ? wanted : undefined} />

        <Plans store={store} has={has} />

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}>
          {!has && ON_SALE && (
            <ThemedText variant="caption1" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Subscriptions renew until you cancel in Settings, at least a day before they renew. Play chips only, no cash value. Friends always join your games free.
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
      </ScrollView>
    </View>
  );
}

/** "FlipUp" on a dark grey capsule, then PREMIUM on black, as one pill. */
function BrandPill() {
  return (
    <View accessible accessibilityLabel="FlipUp Premium" style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden' }}>
      <Text style={{ fontFamily: ROUNDED, fontSize: 18, fontWeight: '700', color: '#ffffff', paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(40,44,60,0.85)' }}>FlipUp</Text>
      <Text style={{ fontFamily: ROUNDED, fontSize: 18, fontWeight: '800', color: brand.gold, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#000000', letterSpacing: 0.5 }}>PREMIUM</Text>
    </View>
  );
}

/** The words over each perk's picture: shorter and louder than the grid's. */
const HERO_WORDS: Partial<Record<PerkId, { title: string; line: string }>> = {
  range: { title: 'Every range hand', line: 'Every real spot, as many sets as you like.' },
  bots: { title: 'The whole roster', line: `${BOTS.length} bots in every style. Free tables get ${FREE_BOT_NAMES.length}.` },
  games: { title: `${VARIANTS.length - FREE_VARIANTS} more games`, line: 'Host every mini game. Friends join free.' },
  replay: { title: 'Replay any hand', line: 'Save it at the table, watch it back move by move.' },
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
  const focused = useIsFocused();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [page, setPage] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (reduce || held || !focused || perks.length < 2) return;
    const t = setTimeout(() => {
      const next = (page + 1) % perks.length;
      ref.current?.scrollTo({ x: next * width, animated: next !== 0 });
      setPage(next);
    }, HERO_MS);
    return () => clearTimeout(t);
  }, [page, held, reduce, focused, perks.length, width]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
    setHeld(false);
  };

  return (
    <View style={{ height: HERO_H, marginBottom: spacing.lg }}>
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
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${words.line} Show me more.`}
              onPress={() => {
                haptic.select();
                router.push({ pathname: '/premium-perk', params: { id: p.id } });
              }}
              style={{ width, height: HERO_H, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}
            >
              <View style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
                <HeroPicture id={p.id} />
              </View>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: 34, lineHeight: 40, fontWeight: '800', color: '#ffffff', textAlign: 'center' }}>
                  {title}
                </Text>
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, lineHeight: 22, color: 'rgba(255,255,255,0.92)', textAlign: 'center' }}>
                  {words.line}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <View accessible accessibilityLabel={`${page + 1} of ${perks.length}`} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {perks.map((p, i) => (
          <View key={p.id} style={{ width: i === page ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? '#ffffff' : 'rgba(255,255,255,0.35)' }} />
        ))}
      </View>
    </View>
  );
}

const SAMPLE = statsData(
  { hands: 1284, won: 402, biggestPot: 6420, best: { score: 0, name: 'Full house', cards: ['Ks', 'Kd', 'Kh', '5c', '5s'], variant: 'holdem' }, games: [], seen: [] },
  9,
  { name: 'You', emoji: '😎', username: 'you' },
);

/** A soft shadow under the pictures, so they sit on the light. */
const LIFT = { boxShadow: '0 14px 30px rgba(3,8,30,0.45)' } as const;

/** Each perk drawn from the app's own pieces: the games' pictures, real card backs, the bots' faces, a share card... */
function HeroPicture({ id }: { id: PerkId }) {
  switch (id) {
    case 'games': {
      const games = VARIANTS.slice(FREE_VARIANTS, FREE_VARIANTS + 3);
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {games.map((g, i) => (
            <View key={g.id} style={[{ marginHorizontal: -14, zIndex: i === 1 ? 2 : 1, transform: [{ rotate: `${(i - 1) * 10}deg` }, { translateY: i === 1 ? -10 : 8 }, { scale: i === 1 ? 1.1 : 0.92 }], borderRadius: 34 }, LIFT]}>
              <GameThumb variant={g.id} size={140} rounded={34} />
            </View>
          ))}
        </View>
      );
    }
    case 'packs': {
      const packs = CARD_PACKS.filter((p) => !p.venue).slice(0, 5);
      return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 190 }}>
          {packs.map((p, i) => (
            <View key={p.id} style={{ marginHorizontal: -16, transform: [{ rotate: `${(i - 2) * 11}deg` }, { translateY: Math.abs(i - 2) * 12 }], zIndex: 5 - Math.abs(i - 2) }}>
              <PlayingCard back size="lg" pack={p.id} width={100} />
            </View>
          ))}
        </View>
      );
    }
    case 'bots': {
      const faces = [...FREE_BOT_NAMES.slice(0, 1), ...BOTS.filter((b) => !FREE_BOT_NAMES.includes(b.name)).slice(0, 3)].map((n) => (typeof n === 'string' ? BOTS.find((b) => b.name === n)! : n));
      return (
        <View style={{ flexDirection: 'row' }}>
          {faces.map((b, i) => (
            <View key={b.name} style={[{ width: 92, height: 92, marginHorizontal: -6, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: ['#e8efff', '#fff3d1', '#dfe9ff', '#ffe3e3'][i], borderWidth: 5, borderColor: '#0d1430', zIndex: i }, LIFT]}>
              <Text style={{ fontSize: 46 }}>{botFace(b.emoji)}</Text>
            </View>
          ))}
        </View>
      );
    }
    case 'range':
      return (
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ transform: [{ rotate: '-8deg' }], marginRight: -18 }}>
              <PlayingCard card="As" size="lg" width={104} />
            </View>
            <View style={{ transform: [{ rotate: '8deg' }, { translateY: 6 }] }}>
              <PlayingCard card="Kd" size="lg" width={104} />
            </View>
          </View>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: brand.gold }, LIFT]}>
            <Icon name="checkmark.circle.fill" size={16} color={brand.goldInk} />
            <Text style={{ fontFamily: ROUNDED, fontSize: 16, fontWeight: '800', color: brand.goldInk }}>Best play: Raise</Text>
          </View>
        </View>
      );
    case 'replay':
      return <HandStack />;
    case 'share': {
      const k = 0.36;
      const designs = SHARE_DESIGNS.filter((d) => d.premium).slice(0, 3);
      return (
        <View style={{ flexDirection: 'row' }}>
          {designs.map((d, i) => (
            <View key={d.id} style={[{ width: CARD_W * k, height: CARD_H * k, marginHorizontal: -22, borderRadius: 12, overflow: 'hidden', zIndex: i === 1 ? 2 : 1, transform: [{ rotate: `${(i - 1) * 9}deg` }, { translateY: i === 1 ? -8 : 10 }] }, LIFT]}>
              <View style={{ width: CARD_W, height: CARD_H, transform: [{ scale: k }], transformOrigin: 'top left' }}>
                <ShareCard design={d.id} data={SAMPLE} />
              </View>
            </View>
          ))}
        </View>
      );
    }
    case 'gold':
      return (
        <View style={[{ flexDirection: 'row', gap: spacing.lg, padding: spacing.lg, borderRadius: 28, backgroundColor: 'rgba(5,10,30,0.75)' }, LIFT]}>
          {[
            { e: '😎', n: 'You', g: true },
            { e: '🦊', n: 'Sam', g: false },
            { e: '🐼', n: 'Ria', g: false },
          ].map((p) => (
            <View key={p.n} style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 44 }}>{p.e}</Text>
              <Text style={{ fontFamily: ROUNDED, fontSize: 18, fontWeight: '800', color: p.g ? brand.gold : 'rgba(255,255,255,0.55)' }}>{p.n}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>1,000</Text>
            </View>
          ))}
        </View>
      );
    default:
      return <Icon name="crown.fill" size={96} color={brand.gold} />;
  }
}

/** Saved hands as a stack of rows getting smaller into the distance, the front one ticked, like a hand bank. */
function HandStack() {
  const rows = 5;
  return (
    <View style={{ alignItems: 'center' }}>
      {Array.from({ length: rows }, (_, i) => {
        const front = i === rows - 1;
        const w = 200 + i * 28;
        return (
          <View
            key={i}
            style={[
              { width: w, height: front ? 96 : 40, marginTop: i ? -14 : 0, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: front ? 'center' : 'flex-end', paddingBottom: front ? 0 : 7, gap: 10, backgroundColor: `rgba(${226 - (rows - 1 - i) * 10},${232 - (rows - 1 - i) * 8},255,${0.55 + i * 0.1})` },
              front ? LIFT : null,
            ]}
          >
            {front && (
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3a3f55' }}>
                <Icon name="play.fill" size={16} color="#ffffff" />
              </View>
            )}
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ width: front ? 70 : 44, height: front ? 12 : 8, borderRadius: 6, backgroundColor: '#5a6078' }} />
                <View style={{ width: front ? 86 : 54, height: front ? 12 : 8, borderRadius: 6, backgroundColor: '#5a6078' }} />
              </View>
              {front && <View style={{ height: 12, borderRadius: 6, backgroundColor: '#5a6078' }} />}
            </View>
          </View>
        );
      })}
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
function Plans({ store, has }: { store: StoreState; has: boolean }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - spacing.md * 2 - 20, 420);
  const gap = spacing.sm;
  const saving = yearlySaving(store.plans);

  const buy = async (plan: Plan) => {
    if (await buyPremium(plan)) {
      haptic.success();
      router.back();
    }
  };

  if (has || !ON_SALE || store.pending || (store.error && !store.plans.monthly && !store.plans.yearly)) {
    const body: ReactNode = has ? (
      <>
        <Badge text={store.owned === 'lifetime' ? 'YOURS FOR GOOD' : 'ACTIVE'} />
        <ThemedText style={{ fontSize: 32, lineHeight: 38, color: '#ffffff' }}>You have Premium</ThemedText>
        <ThemedText variant="body" style={{ color: MUTED }}>
          {store.owned === 'lifetime' ? 'Thank you for backing FlipUp.' : `On the ${store.owned === 'monthly' ? 'monthly' : 'yearly'} plan. Thank you for backing FlipUp.`}
        </ThemedText>
        <BlueButton title="Done" onPress={() => router.back()} />
        {store.owned && store.owned !== 'lifetime' && <Button title="Manage subscription" variant="secondary" onPress={() => void manageSubscription()} />}
      </>
    ) : !ON_SALE ? (
      <>
        <ThemedText style={{ fontSize: 28, color: '#ffffff' }}>On the iPhone app</ThemedText>
        <ThemedText style={{ color: MUTED }}>Premium is sold in the FlipUp iPhone app.</ThemedText>
      </>
    ) : store.pending ? (
      <>
        <ThemedText style={{ fontSize: 28, color: '#ffffff' }}>Waiting for approval</ThemedText>
        <ThemedText style={{ color: MUTED }}>Someone has to approve this purchase. Premium turns on by itself when they do.</ThemedText>
      </>
    ) : (
      <>
        <ThemedText style={{ fontSize: 28, color: '#ffffff' }}>Can’t reach the App Store</ThemedText>
        <ThemedText style={{ color: MUTED }}>{store.error}</ThemedText>
        <BlueButton title="Try again" loading={store.busy} onPress={() => void startStore()} />
      </>
    );
    return <View style={{ marginHorizontal: spacing.md, padding: spacing.lg, gap: spacing.md, borderRadius: 26, borderCurve: 'continuous', backgroundColor: CARD_BG }}>{body}</View>;
  }

  const yearly = store.plans.yearly;
  const monthly = store.plans.monthly;
  const trialOf = (p: StoreState['plans'][Plan]) => (p?.intro ? `${p.introDays ?? 14} days for ${p.intro}, then ` : '');
  const cards: PlanInfo[] = [
    {
      plan: 'yearly',
      badge: 'BEST VALUE',
      name: 'Yearly',
      line: 'Every game, every bot and every range hand, all year.',
      per: 'year',
      under: yearly?.intro ? `${trialOf(yearly)}billed yearly` : 'Billed yearly',
      button: yearly?.intro ? `Try ${yearly.introDays ?? 14} days for ${yearly.intro}` : 'Continue',
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
      under: monthly?.intro ? `${trialOf(monthly)}cancel anytime` : 'Cancel anytime',
      button: monthly?.intro ? `Try ${monthly.introDays ?? 14} days for ${monthly.intro}` : 'Get Monthly',
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
            <View key={c.plan} style={{ width: cardW, padding: spacing.lg, paddingTop: spacing.lg + 2, gap: spacing.md, borderRadius: 26, borderCurve: 'continuous', backgroundColor: CARD_BG }}>
              <Badge text={c.badge} />
              <View style={{ gap: 6 }}>
                <ThemedText maxFontSizeMultiplier={1.2} style={{ fontSize: 34, lineHeight: 40, color: '#ffffff' }}>
                  {c.name}
                </ThemedText>
                <ThemedText variant="body" style={{ fontSize: 19, lineHeight: 25, color: MUTED }}>
                  {c.line}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.2} style={{ color: '#ffffff' }}>
                    <Text style={{ fontSize: 32, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{price?.price ?? '—'}</Text>
                    <Text style={{ fontSize: 22 }}> / {c.per}</Text>
                  </Text>
                  <ThemedText variant="body" style={{ color: MUTED }}>
                    {price ? c.under : 'Loading the App Store’s price…'}
                  </ThemedText>
                </View>
                {c.plan === 'yearly' && saving && (
                  <View style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: brand.gold }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: brand.goldInk }}>SAVE {saving}%</Text>
                  </View>
                )}
              </View>
              <BlueButton title={price ? c.button : 'Loading…'} loading={store.busy} disabled={!price} onPress={() => void buy(c.plan)} />
              <View style={{ gap: spacing.sm }}>
                {c.points.map((p) => (
                  <View key={p.text} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={{ width: 28, alignItems: 'center' }}>
                      <Icon name={p.icon} size={20} color="rgba(255,255,255,0.75)" />
                    </View>
                    <ThemedText variant="body" style={{ flex: 1, fontSize: 18, color: 'rgba(255,255,255,0.75)' }}>
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
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: '#000000' }}>
      <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: 1, color: '#ffffff' }}>{text}</Text>
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
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 20, fontWeight: '700', color: '#ffffff' }}>
        {loading ? '…' : title}
      </Text>
    </PressableScale>
  );
}

function Link({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <ThemedText variant="footnote" style={{ color: 'rgba(255,255,255,0.65)', textDecorationLine: 'underline' }}>
        {text}
      </ThemedText>
    </Pressable>
  );
}
