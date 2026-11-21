import { router } from 'expo-router';
import { Text, useWindowDimensions, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { variantNeedsPremium, VARIANTS, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { radius, ROUNDED, spacing, useShadows } from '@/theme';

import { GamePicture } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { GameTile } from '../game-tile';
import { PressableScale } from '../pressable-scale';

const open = (v: Variant) => {
  haptic.tap();
  router.push(`/game/${v}`);
};

/**
 * Every game (Home's "See all"): Texas Hold'em as one big card with its How to Play a tap away, then the rest as
 * `GameTile`s three to a row, with a crown on the Premium ones.
 */
export function GameShelf() {
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen - spacing.md * 2, 560);
  const premium = usePremium();
  const [main, ...rest] = VARIANTS;
  // Three to a row, like a shelf of game boxes; the last row is centred when it isn't full.
  const tile = Math.floor((width - spacing.sm * 2) / 3);
  return (
    <View style={{ gap: spacing.md }}>
      <MainCard variant={main.id} name={main.name} width={width} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: spacing.sm, rowGap: spacing.md }}>
        {rest.map((v) => (
          <PressableScale key={v.id} accessibilityRole="button" accessibilityLabel={`${v.name}${!premium && variantNeedsPremium(v.id) ? ', Premium' : ''}. ${gameLook(v.id).hook}`} onPress={() => open(v.id)} haptics={false}>
            <GameTile variant={v.id} name={v.name} width={tile} locked={!premium && variantNeedsPremium(v.id)} />
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/** Texas Hold'em: the wide picture, and under it a band in the game's darker colour with its name and How to play. */
function MainCard({ variant, name, width }: { variant: Variant; name: string; width: number }) {
  const shadow = useShadows();
  const look = gameLook(variant);
  const height = Math.round(width * 0.6);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => open(variant)}
      haptics={false}
      outerStyle={{ borderRadius: radius.xl, borderCurve: 'continuous', boxShadow: shadow.card }}
      style={{ borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: look.card[0] }}
    >
      <GamePicture variant={variant} width={width} height={height} rounded={0} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: look.band }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: '#ffffff' }}>
            {name}
          </Text>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, lineHeight: 16, fontWeight: '500', color: 'rgba(255, 255, 255, 0.78)' }}>
            {look.hook}
          </Text>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`How to play ${name}`}
          onPress={() => {
            haptic.tap();
            router.push(`/how-to-play/${variant}`);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: '#ffffff' }}
        >
          <Icon name="play.fill" size={12} color={look.band} />
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: look.band }}>
            How to play
          </Text>
        </PressableScale>
      </View>
    </PressableScale>
  );
}
