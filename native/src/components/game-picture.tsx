import { Image } from 'expo-image';
import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { G, Path, Text } from 'react-native-svg';

import { gameLook, gameScene, gameThumb, prims, spotArt, type Prim, type Shape, type SpotId } from '@design/gameArt';
import type { Variant } from '@/engine';
import { radius } from '@/theme';

import { tilePicture } from './thumb-cache';

/** SF Pro Rounded on iPhone, the system font elsewhere; SVG text falls back to a serif without one. */
export const FONT = process.env.EXPO_OS === 'web' ? 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, sans-serif' : 'System';

// A game's picture, the same shapes the web draws (src/design/gameArt.ts): a flat field, one outlined subject.
// `prims()` has already turned the shapes into paths, text and groups, so this file only draws those.

function drawPrim(p: Prim, key: number | string): ReactNode {
  if (p.tag === 'g') {
    return (
      <G key={key} transform={p.t} opacity={p.opacity}>
        {p.kids.map(drawPrim)}
      </G>
    );
  }
  if (p.tag === 'text') {
    return (
      <Text key={key} fontFamily={FONT} x={p.x} y={p.y} fontSize={p.size} fontWeight={String(p.weight) as '900'} textAnchor={p.anchor} fill={p.fill} opacity={p.opacity} letterSpacing={p.spacing}>
        {p.text}
      </Text>
    );
  }
  return <Path key={key} d={p.d} fill={p.fill} stroke={p.stroke} strokeWidth={p.sw} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={p.dash} opacity={p.opacity} transform={p.t} />;
}

/** One shape drawn (the solo cards' pictures reuse the games' cards). */
export function draw(shape: Shape, key: number) {
  return <G key={key}>{prims([shape]).map(drawPrim)}</G>;
}

/** The game's picture filling a box (cropped to its shape), on the game's flat field. */
export function GamePicture({ variant, width, height, rounded = radius.md }: { variant: Variant; width: number; height: number; rounded?: number }) {
  const [field] = gameLook(variant).card;
  return (
    <View
      style={{ width, height, borderRadius: rounded, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: field }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
        {prims(gameScene(variant)).map(drawPrim)}
      </Svg>
    </View>
  );
}

/**
 * A game's small square picture, for lists: the game's subject (gameThumb in gameArt.ts) on its flat
 * field, made to read at 30 to 52 points. The wide picture is for the big cards and sheets.
 *
 * On iPhone it's a saved picture once one exists at this size (thumb-cache.ts), which is far cheaper to show than
 * the SVG. The choice is made when the tile appears and kept, so a tile on screen never flickers from one to the
 * other; the next time it appears (or the next launch) it's the picture.
 */
export function GameThumb({ variant, size, rounded = size * 0.24 }: { variant: Variant; size: number; rounded?: number }) {
  // Looked up again when the game changes (the lobby's card keeps one thumb while the host picks another game).
  const picture = useMemo(() => tilePicture({ variant, size, rounded }), [variant, size, rounded]);
  if (picture) {
    return (
      <Image
        source={{ uri: picture }}
        // The picture already has its rounded corners (transparent outside them).
        style={{ width: size, height: size }}
        cachePolicy="memory"
        transition={null}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }
  return <DrawnThumb variant={variant} size={size} rounded={rounded} />;
}

/** The tile drawn as SVG: what the saved pictures are taken from. */
export function DrawnThumb({ variant, size, rounded = size * 0.24 }: { variant: Variant; size: number; rounded?: number }) {
  const [field] = gameLook(variant).card;
  return (
    <View
      style={{ width: size, height: size, borderRadius: rounded, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: field }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {prims(gameThumb(variant)).map(drawPrim)}
      </Svg>
    </View>
  );
}

/** A spot picture (a ticket for Join, a target for Range training): the games' drawing style, with nothing behind it. */
export function Sticker({ id, size }: { id: SpotId; size: number }) {
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {prims(spotArt(id)).map(drawPrim)}
      </Svg>
    </View>
  );
}
