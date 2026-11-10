import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { isPremiumVariant, VARIANTS, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { usePokerRecord } from '@/state/record';
import { spacing, useColors, ROUNDED } from '@/theme';

import { GameTile, tileHeight } from '../game-tile';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { SectionTitle } from './section-title';

const TILE = 124;

/**
 * Every variant as a row you swipe through, like a shelf in Apple's Games app: each game as a `GameTile` (its picture and
 * name band), one line under it, a crown on the Premium ones. "See all" opens them all as big cards.
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
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${again ? 'Play again: ' : ''}${name}${locked ? ', Premium' : ''}. ${gameLook(variant).hook}`}
      onPress={() => {
        haptic.tap();
        router.push(`/game/${variant}`);
      }}
      haptics={false}
      style={{ width: TILE, gap: spacing.xs }}
    >
      <GameTile variant={variant} name={name} width={TILE} locked={locked} again={again} />
      {/* The name is on the tile; under it, one quiet line on why the game is fun. */}
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 13, lineHeight: 16, fontWeight: '500', textAlign: 'center', color: colors.secondaryLabel }}>
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
      <View style={{ width: TILE, height: tileHeight(TILE), borderRadius: Math.round(TILE * 0.2), borderCurve: 'continuous', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.separator, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
        <Icon name="shuffle" size={34} color={colors.secondaryLabel} />
        <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: ROUNDED, fontSize: 12, lineHeight: 14, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: colors.secondaryLabel }}>
          Surprise me
        </Text>
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 13, lineHeight: 16, fontWeight: '500', textAlign: 'center', color: colors.secondaryLabel }}>
        A random mode
      </Text>
    </PressableScale>
  );
}
