import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { isPremiumVariant, VARIANTS, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { party, radius, spacing, useColors, useShadows } from '@/theme';

import { GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { SectionTitle } from './section-title';

const TILE = 124;

/**
 * Every game as a row you swipe through, like a shelf in Apple's Games app: the game's picture in a big rounded
 * square, its name under it, a crown on the Premium ones. "See all" opens them all as big cards.
 */
export function GameRow() {
  const premium = usePremium();
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionTitle title="Games" onMore={() => router.push('/games')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md }} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
        {VARIANTS.map((v) => (
          <Tile key={v.id} variant={v.id} name={v.name} locked={!premium && isPremiumVariant(v.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Tile({ variant, name, locked }: { variant: Variant; name: string; locked: boolean }) {
  const colors = useColors();
  const shadows = useShadows();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}${locked ? ', Premium' : ''}`}
      onPress={() => {
        haptic.tap();
        router.push(`/game/${variant}`);
      }}
      haptics={false}
      style={{ width: TILE, gap: spacing.xs }}
    >
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card }}>
        <GameThumb variant={variant} size={TILE} rounded={radius.lg} />
        {locked && (
          <View style={{ position: 'absolute', top: spacing.xs, right: spacing.xs, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
            <Icon name="crown.fill" size={13} color={party.yellow} />
          </View>
        )}
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontSize: 15, lineHeight: 19, fontWeight: '600', color: colors.label }}>
        {name}
      </Text>
    </PressableScale>
  );
}
