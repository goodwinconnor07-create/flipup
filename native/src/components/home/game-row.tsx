import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { isPremiumVariant, VARIANTS, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { usePokerRecord } from '@/state/record';
import { brand, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { GamePicture } from '../game-picture';
import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { PressableScale } from '../pressable-scale';
import { SectionTitle } from './section-title';

/** A card's size: wide enough that the next one peeks in from the right, so the shelf says "swipe". */
const CARD_W = 236;
const PICTURE_H = 168;
const BAND_H = 72;
const CARD_R = 28;

/**
 * Every game mode as a big card you swipe through, the way the App Store and Apple's Games app show a featured
 * shelf: the game's drawn scene on its own colours, then a darker band with the name, its hook and a white Play
 * capsule. The game you played last comes first, tagged Play again; Premium games carry a gold tag (which is how
 * Home asks for Premium now). "See all" opens every game.
 */
export function GameRow() {
  const premium = usePremium();
  const last = usePokerRecord().games.at(-1)?.variant;
  const games = last ? [...VARIANTS.filter((v) => v.id === last), ...VARIANTS.filter((v) => v.id !== last)] : VARIANTS;
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionTitle title="Game modes" onMore={() => router.push('/games')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_W + spacing.sm}
        snapToAlignment="start"
        style={{ marginHorizontal: -spacing.md, marginTop: -8, marginBottom: -28 }}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 28, gap: spacing.sm }}
      >
        {games.map((v) => (
          <GameCard key={v.id} variant={v.id} name={v.name} locked={!premium && isPremiumVariant(v.id)} again={v.id === last} />
        ))}
        <Surprise />
      </ScrollView>
    </View>
  );
}

function open(variant: Variant) {
  haptic.tap();
  router.push(`/game/${variant}`);
}

function GameCard({ variant, name, locked, again }: { variant: Variant; name: string; locked: boolean; /** The game you played last. */ again?: boolean }) {
  const shadows = useShadows();
  const look = gameLook(variant);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${again ? 'Play again: ' : ''}${name}. ${look.hook}${locked ? '. Premium' : ''}`}
      onPress={() => open(variant)}
      haptics={false}
      style={{ width: CARD_W }}
    >
      <View style={{ borderRadius: CARD_R, borderCurve: 'continuous', boxShadow: shadows.raised }}>
        <View style={{ borderRadius: CARD_R, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: look.card[1] }}>
          <GamePicture variant={variant} width={CARD_W} height={PICTURE_H} rounded={0} />
          <View style={{ height: BAND_H, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md - 2 }}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: ROUNDED, fontSize: 18, fontWeight: '700', color: '#ffffff' }}>
                {name}
              </Text>
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255, 255, 255, 0.72)' }}>
                {look.hook}
              </Text>
            </View>
            <View style={{ paddingHorizontal: spacing.md - 2, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.94)' }}>
              <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 15, fontWeight: '700', color: brand.violet }}>
                Play
              </Text>
            </View>
          </View>
        </View>
        {again && <Tag icon="arrow.counterclockwise" text="Play again" side="left" />}
        {locked && <Tag icon="crown.fill" text="Premium" side="right" gold />}
      </View>
    </PressableScale>
  );
}

function Tag({ icon, text, side, gold }: { icon: IconName; text: string; side: 'left' | 'right'; gold?: boolean }) {
  const ink = gold ? brand.goldInk : '#ffffff';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: spacing.sm, [side]: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: gold ? brand.gold : 'rgba(0, 0, 0, 0.38)' }}
    >
      <Icon name={icon} size={11} color={ink} />
      <Text maxFontSizeMultiplier={1.1} style={{ fontSize: 12, fontWeight: '700', color: ink }}>
        {text}
      </Text>
    </View>
  );
}

/** The end of the shelf: a random game, so nobody has to choose. Same size as a game card, a quiet dashed outline. */
function Surprise() {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Surprise me. A random game mode"
      onPress={() => open(VARIANTS[Math.floor(Math.random() * VARIANTS.length)].id)}
      haptics={false}
      style={{ width: CARD_W * 0.62 }}
    >
      <View style={{ height: PICTURE_H + BAND_H, borderRadius: CARD_R, borderCurve: 'continuous', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.separator, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        <Icon name="shuffle" size={36} color={colors.secondaryLabel} />
        <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 16, fontWeight: '700', color: colors.label }}>
          Surprise me
        </Text>
      </View>
    </PressableScale>
  );
}
