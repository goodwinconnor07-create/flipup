import { router } from 'expo-router';
import { Text, useWindowDimensions, View } from 'react-native';

import { isPremiumVariant, VARIANTS, type Variant } from '@/engine';
import { usePremium } from '@/state/premium';
import { party, radius, spacing, useShadows } from '@/theme';

import { ArtBackdrop, GameIcon, iconCorner, panelTint } from '../game-icon';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';

const open = (v: Variant) => {
  haptic.tap();
  router.push(`/game/${v}`);
};

/**
 * Every game (Home's "See all"): Texas Hold'em as one big card (its icon on its own blurred art, How to Play a tap
 * away), then the rest two to a row as Games-app cards (the art, then the name on a panel tinted from it), with a
 * crown on the Premium ones.
 */
export function GameShelf() {
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen - spacing.md * 2, 560);
  const premium = usePremium();
  const [main, ...rest] = VARIANTS;
  const tile = (width - spacing.sm) / 2;
  return (
    <View style={{ gap: spacing.sm }}>
      <MainCard variant={main.id} name={main.name} width={width} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {rest.map((v, i) => (
          // An odd one out at the end takes the whole row rather than leave a gap.
          <Tile key={v.id} variant={v.id} name={v.name} width={rest.length % 2 && i === rest.length - 1 ? width : tile} picture={Math.round(tile * 0.84)} locked={!premium && isPremiumVariant(v.id)} />
        ))}
      </View>
    </View>
  );
}

function MainCard({ variant, name, width }: { variant: Variant; name: string; width: number }) {
  const shadow = useShadows();
  const icon = Math.round(Math.min(132, width * 0.34));
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => open(variant)}
      outerStyle={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadow.card }}
      style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }}
    >
      <ArtBackdrop id={variant} dim={0.42} />
      <View style={{ borderRadius: iconCorner(icon), borderCurve: 'continuous', boxShadow: '0 10px 24px -8px rgba(0, 0, 0, 0.6)' }}>
        <GameIcon id={variant} size={icon} />
      </View>
      <View style={{ flex: 1, gap: spacing.xs, alignItems: 'flex-start' }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.4, color: 'rgba(255, 255, 255, 0.75)' }}>
          THE CLASSIC
        </Text>
        <ThemedText variant="title2" tone="onColor" numberOfLines={2} style={{ fontWeight: '800' }}>
          {name}
        </ThemedText>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`How to play ${name}`}
          onPress={() => {
            haptic.tap();
            router.push(`/how-to-play/${variant}`);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <Icon name="play.fill" size={12} color="#ffffff" />
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
            How to play
          </Text>
        </PressableScale>
      </View>
    </PressableScale>
  );
}

/** A game as one of Apple's Games-app cards: its art on top, then its name on a panel tinted from the art. */
function Tile({ variant, name, width, picture, locked }: { variant: Variant; name: string; width: number; picture: number; locked: boolean }) {
  const shadow = useShadows();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}${locked ? ', Premium' : ''}`}
      onPress={() => open(variant)}
      outerStyle={{ width, borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadow.card }}
      style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: panelTint(variant) }}
    >
      <View style={{ width, height: picture, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <GameIcon id={variant} size={width} rounded={0} />
      </View>
      <View style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.sm, minHeight: 44, justifyContent: 'center' }}>
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
