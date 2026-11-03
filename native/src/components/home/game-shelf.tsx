import { router } from 'expo-router';
import { Text, useWindowDimensions, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { isPremiumVariant, VARIANTS, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { gradient, party, radius, spacing, useShadows } from '@/theme';

import { GamePicture } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';

const open = (v: Variant) => {
  haptic.tap();
  router.push(`/game/${v}`);
};

/**
 * Every game: Texas Hold'em as one big card with its How to Play a tap away, then the rest two to a row, each its
 * drawn scene over its own colours, with a crown on the Premium ones.
 */
export function GameShelf() {
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen - spacing.md * 2, 560);
  const premium = usePremium();
  const [main, ...rest] = VARIANTS;
  const tile = (width - spacing.sm) / 2;
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="title2" accessibilityRole="header" style={{ fontWeight: '800' }}>
        Games
      </ThemedText>
      <MainCard variant={main.id} name={main.name} width={width} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {rest.map((v, i) => (
          // An odd one out at the end takes the whole row rather than leave a gap.
          <Tile key={v.id} variant={v.id} name={v.name} width={rest.length % 2 && i === rest.length - 1 ? width : tile} picture={Math.round(tile * 0.62)} locked={!premium && isPremiumVariant(v.id)} />
        ))}
      </View>
    </View>
  );
}

function MainCard({ variant, name, width }: { variant: Variant; name: string; width: number }) {
  const shadow = useShadows();
  const [top, bottom] = gameLook(variant).card;
  const height = Math.round(width * 0.5);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => open(variant)}
      style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', boxShadow: shadow.soft, ...gradient(`linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`) }}
    >
      <GamePicture variant={variant} width={width} height={height} rounded={0} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, paddingTop: spacing.sm }}>
        <ThemedText variant="title2" tone="onColor" numberOfLines={1} style={{ flex: 1, fontWeight: '800' }}>
          {name}
        </ThemedText>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`How to play ${name}`}
          onPress={() => {
            haptic.tap();
            router.push(`/how-to-play/${variant}`);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <Icon name="play.fill" size={13} color="#ffffff" />
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
            How to play
          </Text>
        </PressableScale>
      </View>
    </PressableScale>
  );
}

function Tile({ variant, name, width, picture, locked }: { variant: Variant; name: string; width: number; picture: number; locked: boolean }) {
  const shadow = useShadows();
  const [top, bottom] = gameLook(variant).card;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}${locked ? ', Premium' : ''}`}
      onPress={() => open(variant)}
      outerStyle={{ width }}
      style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', boxShadow: shadow.soft, ...gradient(`linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`) }}
    >
      <GamePicture variant={variant} width={width} height={picture} rounded={0} />
      <View style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.xxs, paddingBottom: spacing.sm, minHeight: 44, justifyContent: 'center' }}>
        <ThemedText variant="headline" tone="onColor" numberOfLines={1} adjustsFontSizeToFit style={{ fontWeight: '800' }}>
          {name}
        </ThemedText>
      </View>
      {locked && (
        <View style={{ position: 'absolute', top: spacing.xs, right: spacing.xs, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.35)' }}>
          <Icon name="crown.fill" size={14} color={party.yellow} />
        </View>
      )}
    </PressableScale>
  );
}
