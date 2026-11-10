import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Share, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { gameLook } from '@design/gameArt';
import { Avatar } from '@/components/avatar';
import { GameThumb } from '@/components/game-picture';
import { haptic } from '@/components/haptics';
import { LivelyBackground } from '@/components/home/lively-background';
import { Icon, type IconName } from '@/components/icon';
import { MARK } from '@/components/launch-mark';
import { PressableScale } from '@/components/pressable-scale';
import { isPremiumVariant, isVariant, VARIANTS, variantInfo, variantOf, type Variant } from '@/engine';
import { usePartyRef } from '@/state/party';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { useRangeHistory } from '@/state/range-history';
import { usePokerRecord } from '@/state/record';
import { maybeAskForReview } from '@/state/review';
import { useTable } from '@/state/session';
import { save, useStored } from '@/state/storage';
import { brand, ForceScheme, gradient, ROUNDED, spacing } from '@/theme';
import { APP_INFO } from '../../../../appInfo';

const INK = '#0b1533';
const GLASS = 'rgba(255, 255, 255, 0.11)';
const EDGE = 'rgba(255, 255, 255, 0.12)';
/** The tab bar's height over the bottom safe area. */
const TAB_BAR = 49;
/** The game shown in the middle, kept between launches. */
const PICK = 'flipup.homegame';

/**
 * Home as a game lobby (a test, 10 Nov 2026, after the owner's co-designer asked for "a normal game app home
 * screen": bottom tabs, main middle buttons, side bars). On the lively blue field: your face and name top left and
 * the FlipUp spade top right; the chosen game big in the middle with arrows to flip through all of them; a column
 * of round shortcuts down each side (Games, Stats, How to play; Premium, Share, Settings); then the big PLAY button
 * with Bots and Join under it. The tab bar stays at the bottom. Nothing scrolls.
 */
export default function Home() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const premium = usePremium();
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
  const at = VARIANTS.findIndex((v) => v.id === variant);
  const turn = (by: number) => () => {
    haptic.select();
    save(PICK, VARIANTS[(at + by + VARIANTS.length) % VARIANTS.length].id);
  };
  const info = variantInfo(variant);
  const locked = !premium && isPremiumVariant(variant);
  const hero = Math.round(Math.max(120, Math.min(190, height * 0.2)));

  const go = (path: string) => () => {
    haptic.tap();
    router.push(path as never);
  };
  const named = profile.name.trim().length > 0;
  return (
    <ForceScheme scheme="dark">
      <Stack.Screen options={{ title: 'Play', headerShown: false }} />
      <LivelyBackground style={{ flex: 1 }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + TAB_BAR + spacing.md, gap: spacing.md }}>
          {/* Top bar: you on the left, the logo on the right. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={named ? `${profile.name}. Open your profile` : 'Set up your profile'}
              onPress={go('/profile')}
              haptics={false}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: 4, paddingRight: spacing.md, borderRadius: 999, backgroundColor: GLASS, borderWidth: 1, borderColor: EDGE }}
            >
              <Avatar emoji={named ? profile.emoji : undefined} size={40} />
              <View>
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 17, fontWeight: '800', color: '#ffffff', maxWidth: 160 }}>
                  {named ? profile.name : 'Your profile'}
                </Text>
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255, 255, 255, 0.65)' }}>
                  {record.hands > 0 ? `${record.hands.toLocaleString('en-US')} hands played` : 'Tap to set up'}
                </Text>
              </View>
            </PressableScale>
            <View accessible accessibilityRole="header" accessibilityLabel="FlipUp">
              <Svg width={36 * (116 / 125)} height={36} viewBox="-58 -60 116 125">
                <Path d={MARK} fillRule="evenodd" fill="#ffffff" />
              </Svg>
            </View>
          </View>

          {/* The middle: side bars either side of the chosen game. */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ gap: spacing.md }}>
              <SideButton icon="square.grid.2x2.fill" label="Games" onPress={go('/games')} />
              <SideButton icon="chart.bar.xaxis" label="Stats" onPress={go('/stats')} />
              <SideButton icon="book.fill" label="Rules" onPress={go(`/how-to-play/${variant}`)} />
            </View>

            <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Arrow icon="chevron.left" label="Previous game" onPress={turn(-1)} />
                <PressableScale accessibilityRole="button" accessibilityLabel={`${info.name}${locked ? ', Premium' : ''}. About this game`} onPress={go(`/game/${variant}`)} haptics={false}>
                  <View style={{ borderRadius: hero * 0.24, borderCurve: 'continuous', boxShadow: '0 18px 40px -12px rgba(0, 0, 0, 0.6)' }}>
                    <GameThumb variant={variant} size={hero} />
                  </View>
                  {locked && (
                    <View style={{ position: 'absolute', top: -8, right: -8, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: INK, borderWidth: 2, borderColor: brand.gold }}>
                      <Icon name="crown.fill" size={15} color={brand.gold} />
                    </View>
                  )}
                </PressableScale>
                <Arrow icon="chevron.right" label="Next game" onPress={turn(1)} />
              </View>
              <View style={{ alignItems: 'center', gap: 2, paddingHorizontal: spacing.xs }}>
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: ROUNDED, fontSize: 28, fontWeight: '900', letterSpacing: -0.4, color: '#ffffff', textAlign: 'center' }}>
                  {info.name}
                </Text>
                <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={{ fontSize: 15, lineHeight: 19, fontWeight: '500', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
                  {gameLook(variant).hook}
                </Text>
              </View>
              {/* Which of the games this is. */}
              <View accessible={false} style={{ flexDirection: 'row', gap: 5, paddingTop: 2 }}>
                {VARIANTS.map((v) => (
                  <View key={v.id} style={{ width: v.id === variant ? 14 : 5, height: 5, borderRadius: 3, backgroundColor: v.id === variant ? '#ffffff' : 'rgba(255, 255, 255, 0.28)' }} />
                ))}
              </View>
            </View>

            <View style={{ gap: spacing.md }}>
              <SideButton icon="crown.fill" label="Premium" tint={brand.gold} onPress={go('/premium')} />
              <SideButton icon="square.and.arrow.up" label="Share" onPress={shareApp} />
              <SideButton icon="gearshape.fill" label="Settings" onPress={go('/settings')} />
            </View>
          </View>

          {/* The main buttons. */}
          <View style={{ gap: spacing.sm }}>
            <LiveCard />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Play ${info.name} with friends`}
              onPress={go(`/play-friends?variant=${variant}`)}
              haptics={false}
              outerStyle={{ borderRadius: 24, borderCurve: 'continuous', boxShadow: '0 12px 28px -8px rgba(37, 87, 214, 0.8)' }}
              style={{ minHeight: 72, borderRadius: 24, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.35)', ...gradient('linear-gradient(180deg, #5b8cff 0%, #2557d6 100%)') }}
            >
              <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: 1, color: '#ffffff' }}>
                PLAY
              </Text>
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255, 255, 255, 0.85)' }}>
                with friends · share a code
              </Text>
            </PressableScale>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <SmallButton icon="cpu.fill" label="Play bots" onPress={go(`/play-bots?variant=${variant}`)} />
              <SmallButton icon="qrcode.viewfinder" label="Join a game" onPress={go('/join')} />
            </View>
          </View>
        </View>
      </LivelyBackground>
    </ForceScheme>
  );
}

function shareApp() {
  haptic.tap();
  const url = `https://apps.apple.com/app/id${APP_INFO.appStoreId}`;
  void Share.share({ message: `Poker night on your phones. Play FlipUp with me: ${url}`, url }).catch(() => undefined);
}

/** A side-bar shortcut: a round see-through button with its name under it. */
function SideButton({ icon, label, tint = '#ffffff', onPress }: { icon: IconName; label: string; tint?: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} haptics={false} style={{ width: 58, alignItems: 'center', gap: 4 }}>
      <View style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: GLASS, borderWidth: 1, borderColor: EDGE }}>
        <Icon name={icon} size={21} color={tint} />
      </View>
      <Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Flips to the game before or after. */
function Arrow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} haptics={false} hitSlop={10} style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={20} color="rgba(255, 255, 255, 0.75)" />
    </PressableScale>
  );
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
