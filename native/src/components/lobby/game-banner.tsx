import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { gameLook, prims } from '@design/gameArt';
import { gameBanner, type BannerLayer } from '@design/gameBanner';
import type { Variant } from '@/engine';
import { EASE_OUT } from '@/motion/presets';
import { gradient } from '@/theme';

import { drawPrim } from '../game-picture';

// The lobby game card's scene (src/design/gameBanner.ts): the set and the subject's parts as SVG layers drawn at the
// screen's own scale, then a shade from the right for the words. It stands still (23 Nov 2026, the owner: with the
// page's light moving too, the bobbing cards and drifting particles were a step too far); only a new game fades in.

type Box = [number, number, number, number];

/** A colour mixed towards black by `k`, at opacity `a`. */
function shadeAlpha(hex: string, k: number, a: number): string {
  const v = parseInt(hex.replace('#', ''), 16);
  const c = (x: number) => Math.round(x * (1 - k));
  return `rgba(${c((v >> 16) & 255)}, ${c((v >> 8) & 255)}, ${c(v & 255)}, ${a})`;
}

/** Where a box of the picture sits on the card, in points (the picture's y = 100 is the card's bottom). */
function place(box: Box, unit: number, height: number) {
  return { left: box[0] * unit, top: height - (100 - box[1]) * unit, width: box[2] * unit, height: box[3] * unit };
}

function LayerSvg({ layer, box, unit }: { layer: BannerLayer; box: Box; unit: number }) {
  const drawn = useMemo(() => prims(layer.shapes).map(drawPrim), [layer]);
  return (
    <Svg width={box[2] * unit} height={box[3] * unit} viewBox={box.join(' ')}>
      {drawn}
    </Svg>
  );
}

function StillLayer({ layer, box, unit, height }: { layer: BannerLayer; box: Box; unit: number; height: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', ...place(box, unit, height) }}>
      <LayerSvg layer={layer} box={box} unit={unit} />
    </View>
  );
}

/**
 * The game card's scene filling a `width` × `height` card. `unit` is the size of the subject's 100-unit square in
 * points / 100; the words go to its right. A new game fades in over the old one (300ms in, 240 out, as Home's page).
 */
export function GameBanner({ variant, width, height, unit }: { variant: Variant; width: number; height: number; unit: number }) {
  const banner = useMemo(() => gameBanner(variant), [variant]);
  const look = gameLook(variant);
  const card: Box = [0, 100 - height / unit, width / unit, height / unit];
  // The shade for the words starts at the subject's right side and is darkest behind them.
  const from = ((60 * unit) / width) * 100;
  const full = ((112 * unit) / width) * 100;
  return (
    <Animated.View
      key={variant}
      pointerEvents="none"
      entering={FadeIn.duration(300).easing(EASE_OUT)}
      exiting={FadeOut.duration(240).easing(EASE_OUT)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', inset: 0, backgroundColor: look.card[0] }}
    >
      {banner.layers.map((layer, i) => {
        const box: Box = layer.box ?? card;
        return <StillLayer key={i} layer={layer} box={box} unit={unit} height={height} />;
      })}
      <View
        style={{
          position: 'absolute',
          inset: 0,
          ...gradient(`linear-gradient(90deg, rgba(0, 0, 0, 0) ${from.toFixed(1)}%, ${shadeAlpha(look.band, 0.45, 0.62)} ${full.toFixed(1)}%, ${shadeAlpha(look.band, 0.45, 0.8)} 100%)`),
        }}
      />
    </Animated.View>
  );
}
