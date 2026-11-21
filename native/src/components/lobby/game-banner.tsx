import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path, Text } from 'react-native-svg';

import { gameLook, INK, prims, rr, SUIT_PATH } from '@design/gameArt';
import { bannerParticles, gameBanner, type BannerLayer, type Particle } from '@design/gameBanner';
import type { Variant } from '@/engine';
import { EASE_OUT } from '@/motion/presets';
import { useAmbientClock } from '@/motion/use-ambient-clock';
import { gradient } from '@/theme';

import { drawPrim, FONT } from '../game-picture';

// The lobby game card's living scene (src/design/gameBanner.ts): the set and the subject's parts as SVG layers, each
// drawn once at the screen's own scale and moved as a whole on the UI thread (transform and opacity only), so they
// stay sharp and cost nothing per frame on the JS thread. Then a shade from the right for the words, and the game's
// particles drifting over it all. One clock drives everything (`useAmbientClock`), stopped off screen, in the
// background and under Reduce Motion, where the scene stands still.

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

function MovingLayer({ layer, box, unit, height, clock }: { layer: BannerLayer; box: Box; unit: number; height: number; clock: SharedValue<number> }) {
  const move = layer.move!;
  const pivot = layer.pivot ?? [box[0] + box[2] / 2, box[1] + box[3] / 2];
  const style = useAnimatedStyle(() => {
    const t = clock.get();
    const TAU = Math.PI * 2;
    const phase = 'phase' in move ? (move.phase ?? 0) : 0;
    const wave = Math.sin(TAU * (t / move.period + phase));
    const frac = (x: number) => x - Math.floor(x);
    switch (move.kind) {
      case 'bob':
        return { transform: [{ translateY: move.amp * unit * wave }] };
      case 'sway':
        return { transform: [{ rotate: `${move.deg * wave}deg` }] };
      case 'float':
        return { transform: [{ translateY: move.amp * unit * wave }, { rotate: `${move.deg * Math.sin(TAU * (t / move.period + phase + 0.25))}deg` }] };
      case 'spin':
        return { transform: [{ rotate: `${360 * frac(t / move.period)}deg` }] };
      case 'flow':
        return { transform: [{ translateX: -move.length * unit * frac(t / move.period) }] };
      case 'drift':
        return { transform: [{ translateX: move.amp * unit * wave }] };
      case 'twinkle': {
        // Never bigger than drawn, so it stays sharp.
        const k = 0.5 + 0.5 * wave;
        return { opacity: 0.45 + 0.55 * k, transform: [{ scale: 0.72 + 0.28 * k }] };
      }
      case 'pulse': {
        const f = frac(t / move.period + phase);
        return { opacity: 1 - f, transform: [{ scale: 0.84 + 0.16 * f }] };
      }
    }
  });
  const at = place(box, unit, height);
  if (move.kind === 'flow') {
    // The box is a window that stays put; the picture, one `length` wider, slides through it.
    const wide: Box = [box[0], box[1], box[2] + move.length, box[3]];
    return (
      <View pointerEvents="none" style={{ position: 'absolute', ...at, overflow: 'hidden' }}>
        <Animated.View style={[{ width: wide[2] * unit, height: at.height }, style]}>
          <LayerSvg layer={layer} box={wide} unit={unit} />
        </Animated.View>
      </View>
    );
  }
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', ...at, transformOrigin: `${(pivot[0] - box[0]) * unit}px ${(pivot[1] - box[1]) * unit}px` }, style]}>
      <LayerSvg layer={layer} box={box} unit={unit} />
    </Animated.View>
  );
}

const SPARKLE = 'M0 -10L2.6 -2.6L10 0L2.6 2.6L0 10L-2.6 2.6L-10 0L-2.6 -2.6Z';
const LEAF = 'M-10 0C-5 -7 5 -7 10 0C5 7 -5 7 -10 0Z';

/** One particle's look, drawn on a 24-wide square about its middle. */
function ParticleShape({ p, size }: { p: Particle; size: number }) {
  if (p.kind === 'dot') return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.colour }} />;
  return (
    <Svg width={size} height={size} viewBox="-12 -12 24 24">
      {p.kind === 'suit' && <Path d={SUIT_PATH[p.suit]} fill={p.colour} />}
      {p.kind === 'sparkle' && <Path d={SPARKLE} fill={p.colour} />}
      {p.kind === 'confetti' && <Path d={rr(-10, -5.5, 20, 11, 2)} fill={p.colour} />}
      {p.kind === 'streak' && <Path d={rr(-11, -1.2, 22, 2.4, 1.2)} fill={p.colour} />}
      {p.kind === 'leaf' && <Path d={LEAF} fill={p.colour} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />}
      {p.kind === 'leaf' && <Path d="M-6 0H6" stroke={INK} strokeWidth={1.2} opacity={0.5} strokeLinecap="round" />}
      {p.kind === 'glyph' && (
        <Text x={0} y={8} fontFamily={FONT} fontSize={22} fontWeight="900" textAnchor="middle" fill={p.colour}>
          {p.text}
        </Text>
      )}
    </Svg>
  );
}

function Mote({ p, unit, width, height, clock }: { p: Particle; unit: number; width: number; height: number; clock: SharedValue<number> }) {
  const size = p.size * unit;
  const top = height - (100 - p.y) * unit - size / 2;
  const style = useAnimatedStyle(() => {
    const TAU = Math.PI * 2;
    const t = clock.get();
    const raw = t / p.period + p.phase;
    const f = raw - Math.floor(raw);
    const sway = p.sway * unit * Math.sin(TAU * (f * 2 + p.phase));
    const turn = p.kind === 'confetti' ? `${360 * p.spin * f}deg` : p.kind === 'streak' ? `${p.spin}deg` : `${p.spin * Math.sin(TAU * (f * 1.5 + p.phase))}deg`;
    // Confetti flips as it falls (never wider than drawn).
    const flip = p.kind === 'confetti' ? Math.cos(TAU * f * 3) : 1;
    switch (p.dir) {
      case 'down':
        return { transform: [{ translateX: sway }, { translateY: f * (height + size * 2) }, { rotate: turn }, { scaleX: flip }] };
      case 'up':
        return { transform: [{ translateX: sway }, { translateY: -f * (height + size * 2) }, { rotate: turn }] };
      case 'right': {
        const g = p.x + f - Math.floor(p.x + f);
        return { transform: [{ translateX: g * (width + size * 2) }, { translateY: sway }] };
      }
      case 'still': {
        const k = 0.5 + 0.5 * Math.sin(TAU * raw);
        return { opacity: p.opacity * (0.3 + 0.7 * k), transform: [{ scale: 0.55 + 0.45 * k }, { rotate: turn }] };
      }
    }
  });
  const start = p.dir === 'down' ? { left: p.x * width - size / 2, top: -size } : p.dir === 'up' ? { left: p.x * width - size / 2, top: height } : p.dir === 'right' ? { left: -size * 2, top } : { left: p.x * width - size / 2, top };
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, opacity: p.opacity, ...start }, style]}>
      <ParticleShape p={p} size={size} />
    </Animated.View>
  );
}

/**
 * The game card's scene filling a `width` × `height` card. `unit` is the size of the subject's 100-unit square in
 * points / 100; the words go to its right. A new game fades in over the old one (300ms in, 240 out, as Home's page).
 */
export function GameBanner({ variant, width, height, unit }: { variant: Variant; width: number; height: number; unit: number }) {
  const clock = useAmbientClock();
  const banner = useMemo(() => gameBanner(variant), [variant]);
  const motes = useMemo(() => bannerParticles(variant), [variant]);
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
        return layer.move ? <MovingLayer key={i} layer={layer} box={box} unit={unit} height={height} clock={clock} /> : <StillLayer key={i} layer={layer} box={box} unit={unit} height={height} />;
      })}
      <View
        style={{
          position: 'absolute',
          inset: 0,
          ...gradient(`linear-gradient(90deg, rgba(0, 0, 0, 0) ${from.toFixed(1)}%, ${shadeAlpha(look.band, 0.45, 0.62)} ${full.toFixed(1)}%, ${shadeAlpha(look.band, 0.45, 0.8)} 100%)`),
        }}
      />
      {motes.map((p, i) => (
        <Mote key={i} p={p} unit={unit} width={width} height={height} clock={clock} />
      ))}
    </Animated.View>
  );
}
