import { router, Stack, useIsFocused } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gameLook } from '@design/gameArt';
import { showDemo } from '@/components/demo/show';
import { Avatar } from '@/components/avatar';
import { haptic } from '@/components/haptics';
import { GameBackdrop, shade } from '@/components/home/game-backdrop';
import { GameSwiper } from '@/components/home/game-swiper';
import { LiveButton } from '@/components/home/live-button';
import { PlayButton } from '@/components/home/play-button';
import { LockVeil } from '@/components/premium/lock-veil';
import { SmallButton } from '@/components/home/small-button';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { AVATAR } from '@/components/profile-menu';
import { Swap } from '@/components/swap';
import { useTabPush } from '@/components/use-tab-push';
import { detail } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { variantNeedsPremium, isVariant, variantInfo, type Variant } from '@/engine';
import { askForName } from '@/state/ask-name';
import { usePartyView } from '@/components/party/panel';
import { forgetParty, usePartyRef } from '@/state/party';
import { usePremium } from '@/state/premium';
import { unlockToHost } from '@/state/unlock';
import { useProfile } from '@/state/profile';
import { useRangeHistory } from '@/state/range-history';
import { usePokerRecord } from '@/state/record';
import { maybeAskForReview } from '@/state/review';
import { me as myDevice, useTable } from '@/state/session';
import { save, useStored } from '@/state/storage';
import { ForceScheme, radius, ROUNDED, spacing } from '@/theme';

/** The tab bar's height over the bottom safe area. */
const TAB_BAR = 49;
/** The space between the Demo button and the shortcuts. */
const GAP = 20;
/** The round shortcuts' see-through fill and edge. */
const GLASS = 'rgba(255, 255, 255, 0.12)';
const EDGE = 'rgba(255, 255, 255, 0.14)';
/** The game shown in the middle, kept between launches. */
const PICK = 'flipup.homegame';

/**
 * Home as a game lobby. The page takes the colour of the chosen game (`GameBackdrop`). "Play" top left and your face
 * top right (a tap opens your profile, which holds Premium, Demos and Settings); the games as a line of cards
 * across the whole screen, locked on one at a time (`GameSwiper`), a little bigger than before; the chosen one's
 * name, hook and a Demo button under it (an interactive hand of the game, `showDemo()`); a row of three round shortcuts (Stats, Saved hands, Share
 * cards; the owner brought them back on 19 Nov 2026 and kept the big game and buttons); then Play with friends
 * (`PlayButton`), with Play bots and Join a game under it. No hint pill, no dots. The leftover height sits mostly
 * above the game, so the buttons ride a little above the tab bar rather than
 * leaving a gap under the Demo button. Nothing scrolls.
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

  // A first launch (no name yet): the welcome opens over Home. Only while Home is on top, so a join link's sheet
  // asks in its own way (with the table it found) rather than twice.
  const focused = useIsFocused();
  const hasName = !!profile.name.trim();
  useEffect(() => {
    if (hasName || !focused) return;
    const t = setTimeout(() => void askForName(), 400);
    return () => clearTimeout(t);
  }, [hasName, focused]);

  // The game in the middle: the one you picked here, else the one you played last, else Texas Hold'em.
  const stored = useStored<string | null>(PICK, null);
  const last = record.games.at(-1)?.variant;
  // A game this build doesn't have (one a test build played) starts on Hold'em.
  const variant: Variant = isVariant(stored) ? stored : isVariant(last) ? last : 'holdem';
  const info = variantInfo(variant);
  const look = gameLook(variant);
  // The parts arrive one after another, 30ms apart, when the app opens (phone only: the web build's layout animations misplace rows).
  const arrive = (i: number) => (Platform.OS === 'ios' ? detail(i, reduce) : undefined);
  // At 320pt wide (an SE with Display Zoom) there's no room for the hook line and a full-size card: the card shrinks
  // and the hook goes, so the page dots never sit on the shortcuts.
  const narrow = width < 350;
  const hero = Math.round(Math.max(narrow ? 110 : 130, Math.min(narrow ? 190 : 248, height * (narrow ? 0.19 : 0.27))));
  const card = Math.min(hero, width - spacing.md * 2 - 80);

  // PLAY opens the page straight away; no colour fills the screen. A Premium game without Premium opens its sheet
  // instead, which explains the game before any setup and leads to the offer.
  const premium = usePremium();
  const locked = !premium && variantNeedsPremium(variant);
  const push = useTabPush();
  const start = (path: string, buzz = false) => () => {
    if (buzz) haptic.turn();
    if (!premium && variantNeedsPremium(variant)) {
      haptic.tap();
      push(`/game/${variant}`);
      return;
    }
    push(path);
  };

  const go = (path: string) => () => {
    haptic.tap();
    push(path);
  };
  const named = profile.name.trim().length > 0;
  const pad = { paddingHorizontal: spacing.md };
  return (
    <ForceScheme scheme="dark">
      {/* Always dark, so the clock and battery are white whatever the phone's own look. */}
      <Stack.Screen options={{ title: 'Play', headerShown: false, statusBarStyle: 'light' }} />
      <GameBackdrop variant={variant} style={{ flex: 1 }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center', paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + TAB_BAR + spacing.sm }}>
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
              style={{ borderRadius: 999, boxShadow: '0 6px 16px -4px rgba(0, 0, 0, 0.5)' }}
            >
              <Avatar emoji={named ? profile.emoji : undefined} size={AVATAR} />
            </PressableScale>
          </Animated.View>

          {/* Most of the spare height goes above the game, a little under the buttons. */}
          <View style={{ flex: 1 }} />

          {/* The middle: the games in a line across the whole screen, the chosen one's name, hook and its Demo. */}
          <Animated.View entering={arrive(1)} style={{ alignItems: 'center', gap: spacing.xs }}>
            <GameSwiper variant={variant} onChange={(v) => save(PICK, v)} size={card} width={Math.min(width, 560 + spacing.md * 2)} />
            <View style={[pad, { alignItems: 'center', gap: 2 }]}>
              {/* The name and hook change with the game. Both boxes run the full width, so a longer old name isn't cut
                  to the new one's width as it leaves, and the name rolls by half its line so the two never print over
                  each other. */}
              <Swap id={variant} kind="text" slide={narrow ? 18 : 22} style={{ alignSelf: 'stretch' }}>
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: ROUNDED, fontSize: narrow ? 32 : 38, fontWeight: '900', letterSpacing: -0.5, color: '#ffffff', textAlign: 'center' }}>
                  {info.name}
                </Text>
              </Swap>
              {!narrow && (
                <Swap id={variant} kind="text" style={{ alignSelf: 'stretch' }}>
                  <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={{ fontSize: 17, lineHeight: 22, fontWeight: '500', color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center' }}>
                    {look.hook}
                  </Text>
                </Swap>
              )}
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Demo: play a hand of ${info.name}`}
              onPress={() => showDemo(variant)}
              haptics={false}
              style={{ minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: EDGE, backgroundColor: GLASS, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="play.fill" size={12} color="#ffffff" />
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                Demo
              </Text>
            </PressableScale>
          </Animated.View>

          {/* The shortcuts, then the main buttons. */}
          <Animated.View entering={arrive(2)} style={[pad, { gap: spacing.sm, marginTop: GAP }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, paddingBottom: spacing.xxs }}>
              <Shortcut icon="chart.bar.xaxis" label="Stats" onPress={go('/stats')} />
              <Shortcut icon="film.stack.fill" label="Saved hands" onPress={go('/replays')} />
              <Shortcut icon="square.and.arrow.up" label="Share cards" onPress={go('/share')} />
            </View>
            {/* A Premium game without Premium: the game sheet's lock (blur, lock, its words) over Host <game>; a tap opens the offer for this game. */}
            <View style={{ borderRadius: 26, borderCurve: 'continuous', overflow: 'hidden' }}>
              <View accessibilityElementsHidden={locked} importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}>
                <PlayButton label="Play with friends" line="Host a table · share the code" ink={shade(look.band, 0.35)} onPress={start(`/play-friends?variant=${variant}`)} />
              </View>
              {locked && <LockVeil compact game={info.name} onPress={() => unlockToHost([variant], premium)} />}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <SmallButton icon="cpu.fill" label="Play bots" onPress={start(`/play-bots?variant=${variant}`, true)} />
              {/* Where Join a game is. While you're at a table or in a party, the way back to it takes this spot. */}
              <JoinOrLive join={<SmallButton icon="qrcode.viewfinder" label="Join a game" onPress={go('/join')} />} />
            </View>
          </Animated.View>

          <View style={{ flex: 0.35, minHeight: spacing.sm }} />
        </View>
      </GameBackdrop>
    </ForceScheme>
  );
}

/** A shortcut over Host <game>: a round see-through button with its name under it. */
function Shortcut({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} haptics={false} style={{ alignItems: 'center', gap: 5, minWidth: 72 }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: GLASS, borderWidth: 1, borderColor: EDGE }}>
        <Icon name={icon} size={23} color="#ffffff" />
      </View>
      <Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.85)' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * The second small button under Host a game: Join a game, or, while you're at a table or in a party (you can't join
 * two games at once), a LIVE button in the same spot that takes you back to it. A small x on its corner puts it away
 * for this game and brings Join a game back; the next table or party shows it again.
 */
function JoinOrLive({ join }: { join: ReactNode }) {
  const t = useTable();
  const game = t.game;
  const partyRef = usePartyRef();
  // A table counts only once the server (or the phone, for a bots-only one) has shown it to us, and not once it's over.
  const atTable = !!t.mode && !t.demo && !!game && !(game.status === 'ended' && !game.party);
  // A party that has closed or finished is checked for while Home is on screen, so its button goes and Join a game returns.
  const focused = useIsFocused();
  const [partyView] = usePartyView(partyRef?.code ?? '', forgetParty, focused && !!partyRef && !atTable);
  const partyOver = !!partyRef && partyView?.status === 'done';
  const key = atTable ? `table:${game?.id ?? ''}` : partyRef && !partyOver ? 'party' : '';
  const [away, setAway] = useState('');
  if (!key || away === key) return <>{join}</>;
  // Everything about it in one line that slides past: who's hosting, the game, how many are in, and whose turn it is.
  const mine = game?.players.find((p) => p.deviceId === myDevice);
  const host = game?.players.find((p) => p.deviceId === game.hostDeviceId);
  const turn = !!game?.hand && !game.hand.result && !!mine && game.hand.toAct === mine.id;
  const who = !atTable ? 'your party' : host && host.deviceId !== myDevice ? `${host.name}'s table` : 'your table';
  const parts = [`Rejoin ${who}`];
  if (atTable && game) parts.push(variantInfo(game.settings.variant ?? 'holdem').name, `${game.players.length} in`);
  if (turn) parts.push('Your turn');
  const words = parts.join(' · ');
  const short = parts.slice(0, 1).join('');
  return (
    <View style={{ flex: 1 }}>
      <LiveButton
        text={words}
        short={short}
        label={`${atTable ? 'Back to your table' : 'Back to your party'}. ${words}`}
        onPress={() => {
          haptic.tap();
          router.push(atTable ? '/table' : '/party-room');
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hide this and show Join a game"
        hitSlop={10}
        onPress={() => {
          haptic.tap();
          setAway(key);
        }}
        style={{ position: 'absolute', top: -8, right: -6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', boxShadow: '0 3px 8px -2px rgba(0, 0, 0, 0.5)' }}
      >
        <Icon name="xmark" size={11} color="#0b1533" />
      </Pressable>
    </View>
  );
}
