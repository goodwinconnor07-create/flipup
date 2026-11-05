import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { isPremiumVariant, VARIANTS, type Variant } from '@/engine';
import { brand, spacing, useColors } from '@/theme';

import { GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';

/** The icon, about the size of an app icon on the iPhone's home screen. */
const ICON = 64;
/** The ring round the chosen one: a gap the colour of the page, then the game's colour. */
const RING = 3;
const GAP = 3;
/** Each tile's width, name included, and the space between tiles: the snap step. */
const TILE = ICON + 2 * (RING + GAP) + spacing.xs;
const STEP = TILE + spacing.xs;

/**
 * Every game as a row of app icons with the name under each, like the iPhone's home screen: a swipe snaps to a
 * tile, there's no scroll bar, and the Premium ones carry a crown. A tap opens the game's popup (`setup-game`),
 * where Select picks it. The chosen game wears a ring and a soft glow in its own colour, and the row scrolls to it
 * when the page opens on a game further along.
 */
export function SetupGameRow({ selected }: { selected: Variant }) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    VARIANTS.findIndex((v) => v.id === selected),
  );
  // Bring the chosen game into view once, when the row knows its width.
  useEffect(() => {
    if (!width) return;
    const x = Math.max(0, index * STEP - (width - TILE) / 2);
    ref.current?.scrollTo({ x, animated: false });
  }, [width]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={STEP}
      decelerationRate="fast"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ marginHorizontal: -spacing.md }}
      contentContainerStyle={{ paddingHorizontal: spacing.md - (RING + GAP) + spacing.xxs, gap: spacing.xs, paddingVertical: spacing.xs }}
      accessibilityRole="list"
      accessibilityLabel="Games"
    >
      {VARIANTS.map((v) => (
        <GameIcon key={v.id} variant={v.id} name={v.name} chosen={v.id === selected} crown={isPremiumVariant(v.id)} />
      ))}
    </ScrollView>
  );
}

function GameIcon({ variant, name, chosen, crown }: { variant: Variant; name: string; chosen: boolean; crown: boolean }) {
  const colors = useColors();
  const tone = ringTone(gameLook(variant).card[0]);
  const corner = ICON * 0.24;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}${crown ? ', Premium' : ''}`}
      accessibilityState={{ selected: chosen }}
      accessibilityHint="Shows how it plays, with Select"
      onPress={() => {
        haptic.tap();
        router.push({ pathname: '/setup-game/[id]', params: { id: variant } });
      }}
      haptics={false}
      style={{ width: TILE, alignItems: 'center', gap: spacing.xs }}
    >
      <View
        style={{
          padding: GAP,
          borderWidth: RING,
          borderRadius: corner + GAP + RING,
          borderCurve: 'continuous',
          borderColor: chosen ? tone : 'transparent',
          boxShadow: chosen ? `0 0 18px 2px ${tone}` : undefined,
        }}
      >
        <GameThumb variant={variant} size={ICON} rounded={corner} />
        {crown && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 22,
              height: 22,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: brand.goldInk,
              borderWidth: 1.5,
              borderColor: brand.gold,
            }}
          >
            <Icon name="crown.fill" size={11} color={brand.gold} />
          </View>
        )}
      </View>
      <ThemedText
        variant="caption1"
        numberOfLines={2}
        style={{ textAlign: 'center', fontWeight: chosen ? '700' : '500', color: chosen ? colors.label : colors.secondaryLabel }}
      >
        {name}
      </ThemedText>
    </PressableScale>
  );
}

/**
 * The game's own colour for its ring, lifted toward white when it's too dark to show on the night page (the ghost,
 * Pittsburgh and Imposter are near black), so every ring reads while keeping its game's hue.
 */
export function ringTone(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  const lift = lum < 0.45 ? Math.min(0.6, (0.45 - lum) * 1.6) : 0;
  const [r, g, b] = rgb.map((c) => Math.round(c + (255 - c) * lift));
  return `rgb(${r}, ${g}, ${b})`;
}
