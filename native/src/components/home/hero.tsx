import { Image } from 'expo-image';
import { router, useIsFocused, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { iconColours, type IconId } from '@design/gameIcons';
import { challengeById, VARIANTS, variantInfo, variantOf, type ChallengeId } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useChallengeBests } from '@/state/challenges';
import { usePartyRef } from '@/state/party';
import { usePremium } from '@/state/premium';
import { usePokerRecord } from '@/state/record';
import { useTable } from '@/state/session';
import { cardColors, gradient, radius, spacing, useColors, usePlainColors, useScheme } from '@/theme';

import { iconPicture, mix } from '../game-icon';
import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { CardFan } from '../premium/card-fan';
import { PressableScale } from '../pressable-scale';
import { ringTone } from '../setup/game-row';

/** A slide: its art (a game's or solo card's icon, or something drawn), then words on the page under it. */
interface Slide {
  key: string;
  art: IconId | 'party' | 'premium';
  eyebrow: string;
  symbol: IconName;
  title: string;
  line: string;
  button: string;
  href: Href;
  /** A table or party you're in: it comes first and holds the carousel still. */
  live?: boolean;
}

const DAY = 86_400_000;
const dayNumber = (now = Date.now()) => Math.floor((now - new Date(now).getTimezoneOffset() * 60_000) / DAY);
const place = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
/** Today's solo pick goes round the three challenges and Range training's three hands of the day. */
const SOLO_ROTATION: (ChallengeId | 'ranges')[] = ['shortStack', 'detective', 'rewind', 'ranges'];

/** Home's slides, in order: your table or party, the newest game, today's solo pick, your last game, Premium. */
export function useHeroSlides(): Slide[] {
  const t = useTable();
  const partyRef = usePartyRef();
  const premium = usePremium();
  const record = usePokerRecord();
  const bests = useChallengeBests();
  const slides: Slide[] = [];
  const game = t.game;

  const atTable = !!t.mode && !(game && game.status === 'ended' && !game.party);
  if (atTable) {
    const variant = game ? variantOf(game) : 'holdem';
    const challenge = game?.challenge ? challengeById(game.challenge.id) : undefined;
    const where = game?.hand && game.status === 'playing' ? `Hand ${game.hand.number}` : game?.status === 'lobby' ? 'In the lobby' : 'Still going';
    slides.push({
      key: 'table',
      art: challenge ? challenge.id : variant,
      eyebrow: challenge ? 'Your challenge' : game?.party ? `Party · game ${game.party.round + 1} of ${game.party.total}` : t.mode === 'online' ? `Your table${t.code ? ` · ${t.code}` : ''}` : 'You vs the bots',
      symbol: 'bolt.fill',
      title: challenge ? challenge.name : variantInfo(variant).name,
      line: `${where}. Your seat is waiting.`,
      button: 'Rejoin',
      href: '/table',
      live: true,
    });
  } else if (partyRef) {
    slides.push({ key: 'party', art: 'party', eyebrow: `Your party · ${partyRef.code}`, symbol: 'party.popper.fill', title: 'Game night', line: 'Your party is open. Back to the board.', button: 'Open', href: '/party-room', live: true });
  }

  // The newest game: the last one in VARIANTS (new games go at the end), so the next one added takes this slide.
  const newest = VARIANTS[VARIANTS.length - 1];
  const last = record.games.at(-1);
  slides.push({ key: 'new', art: newest.id, eyebrow: 'New game', symbol: 'star.fill', title: newest.name, line: gameLook(newest.id).mood, button: 'Play', href: `/game/${newest.id}` });

  const solo = SOLO_ROTATION[dayNumber() % SOLO_ROTATION.length];
  if (solo === 'ranges') {
    slides.push({ key: 'solo', art: 'ranges', eyebrow: "Today's three", symbol: 'flame.fill', title: 'Range training', line: 'Three hands, the same on every phone today. One go each.', button: 'Play', href: '/range-training' });
  } else {
    const c = challengeById(solo)!;
    const best = bests[solo];
    const unit = c.unit === 'bb' ? 'big blinds' : c.unit;
    slides.push({ key: 'solo', art: solo, eyebrow: "Today's challenge", symbol: 'trophy.fill', title: c.name, line: best && best.plays > 0 ? `Your best: ${best.best} ${unit}. Beat it.` : c.line, button: 'Try it', href: `/challenge/${solo}` });
  }

  if (last && !atTable && last.variant !== newest.id) {
    const info = variantInfo(last.variant);
    slides.push({ key: 'last', art: last.variant, eyebrow: 'Play again', symbol: 'arrow.counterclockwise', title: info.name, line: last.place === 1 ? `You won last time, out of ${last.players}.` : `You came ${place(last.place)} of ${last.players} last time.`, button: 'Play again', href: `/game/${last.variant}` });
  }

  if (!premium) {
    slides.push({ key: 'premium', art: 'premium', eyebrow: 'FlipUp Premium', symbol: 'crown.fill', title: 'Eight more games', line: 'Plus every card pack and bubble effect. Pay once, friends play free.', button: 'See Premium', href: '/premium' });
  }
  return slides;
}

/** How long a slide stays before the next slides in. */
const HOLD_MS = 6500;
const WORDS = 176;

/**
 * Home's hero, the way Apple's Games app opens: each slide's art full width from the top of the screen (the title
 * sits on it), fading into the page, then an eyebrow, a title, a line and one grey capsule under it, and the page
 * dots. Slides move on by themselves every few seconds while Home is showing, unless something live is first, you've
 * swiped them yourself, or Reduce Motion is on.
 */
export function Hero({ width, top }: { width: number; top: number }) {
  const slides = useHeroSlides();
  const colors = useColors();
  const page = usePlainColors().background;
  const dark = useScheme() === 'dark';
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const art = Math.round(width * 0.92) + top;
  const live = slides[0]?.live;
  const count = slides.length;

  useEffect(() => {
    if (reduce || touched || live || !focused || count < 2) return;
    const t = setTimeout(() => ref.current?.scrollTo({ x: ((index + 1) % count) * width, animated: true }), HOLD_MS);
    return () => clearTimeout(t);
  }, [reduce, touched, live, focused, count, index, width]);

  return (
    <View>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScrollBeginDrag={() => setTouched(true)}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (i !== index && i >= 0 && i < count) setIndex(i);
        }}
      >
        {slides.map((s) => (
          <View key={s.key} style={{ width }}>
            <View style={{ width, height: art, overflow: 'hidden' }}>
              <SlideArt art={s.art} width={width} height={art} top={top} />
              {/* A dark wash under the status bar and title, and the art fading into the page at the bottom. */}
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: top + 120, ...gradient('linear-gradient(180deg, rgba(0, 0, 0, 0.42) 0%, rgba(0, 0, 0, 0) 100%)') }} />
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: art * 0.42, ...gradient(`linear-gradient(180deg, ${page}00 0%, ${page}b3 55%, ${page} 100%)`) }} />
            </View>
            <View style={{ height: WORDS, marginTop: -spacing.xl, alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.xxs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name={s.symbol} size={13} color={tone(s.art, dark)} />
                <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: tone(s.art, dark) }}>
                  {s.eyebrow}
                </Text>
              </View>
              <Text maxFontSizeMultiplier={1.25} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: colors.label, textAlign: 'center' }}>
                {s.title}
              </Text>
              <Text maxFontSizeMultiplier={1.25} numberOfLines={2} style={{ fontSize: 16, lineHeight: 21, color: colors.secondaryLabel, textAlign: 'center' }}>
                {s.line}
              </Text>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${s.button}: ${s.title}`}
                onPress={() => {
                  haptic.tap();
                  router.push(s.href);
                }}
                style={{ marginTop: spacing.sm, minWidth: 180, minHeight: 46, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.cellPressed }}
              >
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '700', color: colors.label }}>
                  {s.button}
                </Text>
              </PressableScale>
            </View>
          </View>
        ))}
      </ScrollView>
      {count > 1 && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: spacing.sm }}>
          {slides.map((s, i) => (
            <View key={s.key} style={{ width: i === index ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === index ? colors.label : colors.quaternaryLabel }} />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * The eyebrow's colour: the art's own, made readable on the page (lifted on black, deepened on white), or the
 * brand's for drawn slides.
 */
function tone(art: Slide['art'], dark: boolean): string {
  const base = art === 'premium' ? '#e0a100' : art === 'party' ? '#8468ee' : iconColours(art)[0];
  if (dark) return ringTone(base);
  const n = parseInt(base.slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.4 ? mix(base, '#000000', Math.min(0.55, (lum - 0.25) * 1.1)) : base;
}

function SlideArt({ art, width, height, top }: { art: Slide['art']; width: number; height: number; top: number }): ReactNode {
  if (art === 'premium' || art === 'party') {
    const colours = art === 'premium' ? cardColors.night : cardColors.violet;
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center', paddingTop: top, ...gradient(`linear-gradient(160deg, ${colours[0]} 0%, ${colours[1]} 55%, ${colours[2]} 100%)`) }}>
        {art === 'premium' ? <CardFan scale={1.7} /> : <Icon name="party.popper.fill" size={120} color="#ffffff" />}
      </View>
    );
  }
  // The icon's square art, as big as the slide: it's drawn to be read at any size.
  return <Image source={iconPicture(art)} style={{ width, height }} contentFit="cover" cachePolicy="memory" transition={null} />;
}
