import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { isPremiumVariant, VARIANTS, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { usePokerRecord } from '@/state/record';
import { party, radius, spacing, useColors, useShadows } from '@/theme';

import { GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { SectionTitle } from './section-title';

const TILE = 112;

/**
 * Every variant as a row you swipe through, like a shelf in Apple's Games app: the game's picture in a big rounded
 * square, its name under it, a crown on the Premium ones. "See all" opens them all as big cards.
 */
export function GameRow() {
  const premium = usePremium();
  // The game you played last comes first, marked Play again (no card of its own taking room above the shelf).
  const last = usePokerRecord().games.at(-1)?.variant;
  const games = last ? [...VARIANTS.filter((v) => v.id === last), ...VARIANTS.filter((v) => v.id !== last)] : VARIANTS;
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionTitle title="Game modes" onMore={() => router.push('/games')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md, marginTop: -8, marginBottom: -28 }} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 28, gap: spacing.sm }}>
        {games.map((v) => (
          <Tile key={v.id} variant={v.id} name={v.name} locked={!premium && isPremiumVariant(v.id)} again={v.id === last} />
        ))}
        <Surprise />
      </ScrollView>
    </View>
  );
}

function Tile({ variant, name, locked, again }: { variant: Variant; name: string; locked: boolean; /** The game you played last. */ again?: boolean }) {
  const colors = useColors();
  const shadows = useShadows();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${again ? 'Play again: ' : ''}${name}${locked ? ', Premium' : ''}`}
      onPress={() => {
        haptic.tap();
        router.push(`/game/${variant}`);
      }}
      haptics={false}
      style={{ width: TILE, gap: spacing.xs }}
    >
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card }}>
        <GameThumb variant={variant} size={TILE} rounded={radius.lg} />
        {again && (
          <View style={{ position: 'absolute', top: spacing.xs, left: spacing.xs, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.45)' }}>
            <Icon name="arrow.counterclockwise" size={13} color="#ffffff" />
          </View>
        )}
        {locked && (
          <View style={{ position: 'absolute', top: spacing.xs, right: spacing.xs, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
            <Icon name="crown.fill" size={13} color={party.yellow} />
          </View>
        )}
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ minHeight: 38, fontSize: 15, lineHeight: 19, fontWeight: '600', color: colors.label }}>
        {name}
      </Text>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 12, lineHeight: 15, fontWeight: '500', color: colors.secondaryLabel, marginTop: -spacing.xs + 2 }}>
        {again ? 'Play again' : gameLook(variant).hook}
      </Text>
    </PressableScale>
  );
}

/** The end of the shelf: a random game, so nobody has to choose. Opens that game's sheet like any other tile. */
function Surprise() {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Surprise me. A random game mode"
      onPress={() => {
        haptic.tap();
        const pick = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
        router.push(`/game/${pick.id}`);
      }}
      haptics={false}
      style={{ width: TILE, gap: spacing.xs }}
    >
      <View style={{ width: TILE, height: TILE, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.separator, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="shuffle" size={40} color={colors.secondaryLabel} />
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ minHeight: 38, fontSize: 15, lineHeight: 19, fontWeight: '600', color: colors.label }}>
        Surprise me
      </Text>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 12, lineHeight: 15, fontWeight: '500', color: colors.secondaryLabel, marginTop: -spacing.xs + 2 }}>
        A random mode
      </Text>
    </PressableScale>
  );
}
