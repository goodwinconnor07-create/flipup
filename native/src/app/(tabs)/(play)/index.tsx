import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Share, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gameLook } from '@design/gameArt';
import { Avatar } from '@/components/avatar';
import { haptic } from '@/components/haptics';
import { GameBackdrop, shade } from '@/components/home/game-backdrop';
import { GameSwiper } from '@/components/home/game-swiper';
import { PlayButton } from '@/components/home/play-button';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Swap } from '@/components/swap';
import { detail, EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { freeThisWeek, isPremiumVariant, variantNeedsPremium, isVariant, VARIANTS, variantInfo, variantOf, type Variant } from '@/engine';
import { usePartyRef } from '@/state/party';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { useRangeHistory } from '@/state/range-history';
import { usePokerRecord } from '@/state/record';
import { maybeAskForReview } from '@/state/review';
import { useTable } from '@/state/session';
import { save, useStored } from '@/state/storage';
import { brand, ForceScheme, ROUNDED, spacing } from '@/theme';
import { APP_INFO } from '../../../../appInfo';

const GLASS = 'rgba(255, 255, 255, 0.11)';
const EDGE = 'rgba(255, 255, 255, 0.12)';
/** The tab bar's height over the bottom safe area. */
const TAB_BAR = 49;
/** The game shown in the middle, kept between launches. */
const PICK = 'flipup.homegame';

/**
 * Home as a game lobby (a test, 10 Nov 2026: "a normal game app home screen" with bottom tabs and main middle
 * buttons, made satisfying to open). The page takes the colour of the chosen game (`GameBackdrop`). "Play" top left
 * and your face top right (a tap opens your profile); the games as a line of cards across the whole screen, locked
 * on one at a time (`GameSwiper`), the chosen one's name, hook and dots under it; a row of round shortcuts (Stats,
 * Rules, Saved hands, Premium, Settings, Share) just over PLAY (`PlayButton`), with Play bots and Join a game under
 * it. PLAY and Play bots open their page straight away. The tab bar stays at
 * the bottom. Nothing scrolls.
 */
export default function Home() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const reduce = useReduceMotion();
  const profile = useProfile();
  const record = usePokerRecord();
  // After a good moment (three finished games or ten best plays) iOS may ask for a rating, once.
  const games = record.games.length;
  const bestPlays = useRangeHistory().filter((a) => a.grade === 'best').length;
  useEffect(() => {
    const t = setTimeout(() => void maybeAskForReview(games, bestPlays), 2500);
    return () => clearTimeout(t);
  }, [games, bestPlays]);

  // The game in the middle: the one you picked here, else the one you played last, else Texas Hold'em.
  const stored = useStored<string | null>(PICK, null);
  const last = record.games.at(-1)?.variant;
  const variant: Variant = isVariant(stored) ? stored : (last ?? 'holdem');
  const info = variantInfo(variant);
  const look = gameLook(variant);
  // The parts arrive one after another, 30ms apart, when the app opens (phone only: the web build's layout animations misplace rows).
  const arrive = (i: number) => (Platform.OS === 'ios' ? detail(i, reduce) : undefined);
  // At 320pt wide (an SE with Display Zoom) there's no room for the hook line and a full-size card: the card shrinks
  // and the hook goes, so the page dots never sit on the shortcuts.
  const narrow = width < 350;
  const hero = Math.round(Math.max(narrow ? 100 : 120, Math.min(200, height * (narrow ? 0.18 : 0.23))));
  const card = Math.min(hero, width - spacing.md * 2 - 80);

  // PLAY opens the page straight away; no colour fills the screen. A Premium game without Premium opens its sheet
  // instead, which explains the game before any setup and leads to the offer.
  const premium = usePremium();
  const start = (path: string, buzz = false) => () => {
    if (buzz) haptic.turn();
    if (!premium && variantNeedsPremium(variant)) {
      haptic.tap();
      router.push(`/game/${variant}`);
      return;
    }
    router.push(path as never);
  };

  const go = (path: string) => () => {
    haptic.tap();
    router.push(path as never);
  };
  const named = profile.name.trim().length > 0;
  const pad = { paddingHorizontal: spacing.md };
  return (
    <ForceScheme scheme="dark">
      <Stack.Screen options={{ title: 'Play', headerShown: false }} />
      <GameBackdrop variant={variant} style={{ flex: 1 }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center', paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + TAB_BAR + spacing.xs, gap: spacing.md }}>
          {/* Top bar: the page's name on the left, you on the right. */}
          <Animated.View entering={arrive(0)} style={[pad, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 34, fontWeight: '800', letterSpacing: -0.4, color: '#ffffff' }}>
              Play
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={named ? `${profile.name}. Open your profile` : 'Set up your profile'}
              onPress={go('/profile')}
              haptics={false}
              style={{ padding: 3, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.85)', boxShadow: '0 6px 16px -4px rgba(0, 0, 0, 0.5)' }}
            >
              <Avatar emoji={named ? profile.emoji : undefined} size={50} />
            </PressableScale>
          </Animated.View>

          {/* The middle: the games in a line across the whole screen. */}
          <Animated.View entering={arrive(1)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
            <View>
              <GameSwiper variant={variant} onChange={(v) => save(PICK, v)} size={card} width={Math.min(width, 560 + spacing.md * 2)} />
            </View>
            <View style={[pad, { alignItems: 'center', gap: 2 }]}>
              <Swap id={variant} kind="text">
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: ROUNDED, fontSize: 30, fontWeight: '900', letterSpacing: -0.4, color: '#ffffff', textAlign: 'center' }}>
                  {info.name}
                </Text>
              </Swap>
              {/* Free this week: one Premium game anyone can host, said where the game is picked. */}
              {!premium && isPremiumVariant(variant) && variant === freeThisWeek() && (
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: brand.gold, textTransform: 'uppercase' }}>
                  Free this week
                </Text>
              )}
              {!narrow && (
                <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={{ fontSize: 15, lineHeight: 19, fontWeight: '500', color: 'rgba(255, 255, 255, 0.78)', textAlign: 'center' }}>
                  {look.hook}
                </Text>
              )}
            </View>
            {/* Which of the games this is. */}
            <View accessible={false} style={{ flexDirection: 'row', gap: 5, paddingTop: 4 }}>
              {VARIANTS.map((v) => (
                <Dot key={v.id} on={v.id === variant} />
              ))}
            </View>
          </Animated.View>

          {/* The shortcuts, then the main buttons. */}
          <Animated.View entering={arrive(2)} style={[pad, { gap: spacing.sm }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: spacing.xxs }}>
              <SideButton icon="chart.bar.xaxis" label="Stats" onPress={go('/stats')} />
              <SideButton icon="book.fill" label="How to play" onPress={go(`/how-to-play/${variant}`)} />
              <SideButton icon="film.stack.fill" label="Saved" say="Saved hands" onPress={go('/replays')} />
              {/* A subscriber's shortcut is what they've unlocked (the Premium page lists it for them), not an offer. */}
              <SideButton icon="crown.fill" label={premium ? 'Unlocked' : 'Premium'} say={premium ? 'Your Premium' : undefined} tint={brand.gold} onPress={go('/premium')} />
              <SideButton icon="gearshape.fill" label="Settings" onPress={go('/settings')} />
              <SideButton icon="square.and.arrow.up" label="Share" onPress={shareApp} />
            </View>
            <LiveCard />
            <PlayButton label={`Play ${info.name} with friends`} line="with friends · share a code" ink={shade(look.band, 0.35)} tint={`${look.card[0]}40`} onPress={start(`/play-friends?variant=${variant}`)} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <SmallButton icon="cpu.fill" label="Play bots" onPress={start(`/play-bots?variant=${variant}`, true)} />
              <SmallButton icon="qrcode.viewfinder" label="Join a game" onPress={go('/join')} />
            </View>
          </Animated.View>
        </View>
      </GameBackdrop>
    </ForceScheme>
  );
}

function shareApp() {
  haptic.tap();
  const url = `https://apps.apple.com/app/id${APP_INFO.appStoreId}`;
  void Share.share({ message: `Poker night on your phones. Play FlipUp with me: ${url}`, url }).catch(() => undefined);
}

/** A shortcut over PLAY: a round see-through button with its name under it. */
function SideButton({ icon, label, say, tint = '#ffffff', onPress }: { icon: IconName; label: string; say?: string; tint?: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={say ?? label} onPress={onPress} haptics={false} outerStyle={{ flex: 1 }} style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: GLASS, borderWidth: 1, borderColor: EDGE }}>
        <Icon name={icon} size={21} color={tint} />
      </View>
      <Text maxFontSizeMultiplier={1.1} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** One dot of the row under the game: the chosen one stretches into a short bar. */
function Dot({ on }: { on: boolean }) {
  const style = useAnimatedStyle(() => ({ width: withTiming(on ? 16 : 5, { duration: 200, easing: EASE_OUT }), opacity: withTiming(on ? 1 : 0.35, { duration: 200, easing: EASE_OUT }) }));
  return <Animated.View style={[{ height: 5, borderRadius: 3, backgroundColor: '#ffffff' }, style]} />;
}

/** One of the two buttons under PLAY. */
function SmallButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptics={false}
      outerStyle={{ flex: 1 }}
      style={{ minHeight: 54, flexDirection: 'row', gap: spacing.xs, borderRadius: 20, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.14)', borderWidth: 1, borderColor: EDGE }}
    >
      <Icon name={icon} size={18} color="#ffffff" />
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#ffffff' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** The table or party you're in: a slim strip over the buttons with a green LIVE tag. */
function LiveCard() {
  const t = useTable();
  const game = t.game;
  const partyRef = usePartyRef();
  const atTable = !!t.mode && !(game && game.status === 'ended' && !game.party);
  if (!atTable && !partyRef) return null;
  const what = !atTable ? 'your party' : game ? variantInfo(variantOf(game)).name : 'your table';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Back to ${what}`}
      onPress={() => {
        haptic.tap();
        router.push(atTable ? '/table' : '/party-room');
      }}
      haptics={false}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: 16, borderCurve: 'continuous', backgroundColor: GLASS, borderWidth: 1, borderColor: EDGE }}
    >
      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1.5, borderColor: brand.raise }}>
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: brand.raise }}>
          LIVE
        </Text>
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
        Back to {what}
      </Text>
      <Icon name="chevron.right" size={14} color="rgba(255, 255, 255, 0.85)" />
    </PressableScale>
  );
}
