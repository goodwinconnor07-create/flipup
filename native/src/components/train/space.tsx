import { useId, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { useDrift } from '@/motion/use-drift';

import type { Family } from '../ranges/words';

/**
 * The Train tab's space theme: each unit of the path is a planet. Colours are illustration colours (like the game
 * pictures), chosen so a node tinted with `mid` keeps a white icon readable; gold stays the colour of "collected".
 */
export interface PlanetLook {
  name: string;
  /** Lit edge, body and shadow side of the sphere. */
  colors: readonly [string, string, string];
  /** A lesson card on this planet, three stops like `cardColors`. */
  card: readonly [string, string, string];
  ring: boolean;
  /** Stripes across the body, as a share of its height. */
  bands: readonly number[];
}

export const PLANETS: Record<Family, PlanetLook> = {
  reads: {
    name: 'Nova',
    colors: ['#a9d6ff', '#3a74e0', '#10286e'],
    card: ['#3a74e0', '#2552b8', '#14307a'],
    ring: false,
    bands: [0.38, 0.62],
  },
  calls: {
    name: 'Ember',
    colors: ['#ffc58a', '#dc6a2c', '#5e1c10'],
    card: ['#dc6a2c', '#a8431c', '#6a2410'],
    ring: false,
    bands: [0.3, 0.5, 0.7],
  },
  value: { name: 'Verdant', colors: ['#8ff3da', '#1fa890', '#0a4650'], card: ['#1fa890', '#14796f', '#0a4650'], ring: true, bands: [0.45] },
  bluffs: {
    name: 'Mirage',
    colors: ['#dcc0ff', '#7b52d8', '#2a1672'],
    card: ['#7b52d8', '#5436a8', '#2a1672'],
    ring: false,
    bands: [0.35, 0.58, 0.76],
  },
};

/** A planet drawn as a sphere: lit from the top left, a soft shadow side, faint bands, and a ring on some. */
export function Planet({ family, size, dim }: { family: Family; size: number; dim?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const look = PLANETS[family];
  const [light, mid, deep] = look.colors;
  const pad = look.ring ? size * 0.42 : size * 0.06;
  const box = size + pad * 2;
  const c = box / 2;
  const r = size / 2;
  const rx = r * 1.62;
  const ry = r * 0.34;
  return (
    <View
      style={{ width: box, height: box, opacity: dim ? 0.5 : 1 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={box} height={box}>
        <Defs>
          <RadialGradient id={`b${id}`} cx="34%" cy="30%" r="80%" fx="30%" fy="26%">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.5" stopColor={mid} />
            <Stop offset="1" stopColor={deep} />
          </RadialGradient>
          <RadialGradient id={`s${id}`} cx="30%" cy="26%" r="95%">
            <Stop offset="0.55" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.45" />
          </RadialGradient>
          <ClipPath id={`c${id}`}>
            <Circle cx={c} cy={c} r={r} />
          </ClipPath>
        </Defs>
        {look.ring && (
          <G rotation={-18} origin={`${c}, ${c}`}>
            <Path
              d={`M ${c - rx} ${c} A ${rx} ${ry} 0 0 1 ${c + rx} ${c}`}
              stroke={light}
              strokeOpacity={0.55}
              strokeWidth={size * 0.07}
              fill="none"
            />
          </G>
        )}
        <Circle cx={c} cy={c} r={r} fill={`url(#b${id})`} />
        <G clipPath={`url(#c${id})`}>
          {look.bands.map((b, i) => (
            <Ellipse
              key={b}
              cx={c}
              cy={c - r + b * size * 2 * 0.5 + (i % 2) * 2}
              rx={r * 1.2}
              ry={size * 0.035}
              fill="#ffffff"
              fillOpacity={0.1 + (i % 2) * 0.05}
            />
          ))}
          <Circle cx={c} cy={c} r={r} fill={`url(#s${id})`} />
        </G>
        {look.ring && (
          <G rotation={-18} origin={`${c}, ${c}`}>
            <Path
              d={`M ${c - rx} ${c} A ${rx} ${ry} 0 0 0 ${c + rx} ${c}`}
              stroke={light}
              strokeOpacity={0.9}
              strokeWidth={size * 0.07}
              fill="none"
            />
          </G>
        )}
      </Svg>
    </View>
  );
}

/** Small deterministic generator so the stars are the same every time (no flicker on re-render). */
function stars(count: number, seed: number, w: number, h: number) {
  let s = seed;
  const next = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => ({ x: next() * w, y: next() * h, r: 0.5 + next() * 1.3, o: 0.35 + next() * 0.65 }));
}

const W = 390;
const H = 900;

/**
 * Stars behind the whole screen: a still layer, and a smaller one that slowly brightens and dims (opacity only,
 * UI thread; still under Reduce Motion or off screen, through `useDrift`).
 */
export function Starfield() {
  const still = useMemo(() => stars(70, 11, W, H), []);
  const twinkle = useMemo(() => stars(22, 97, W, H), []);
  const { t } = useDrift(4200);
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 + t.get() * 0.65 }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice" style={{ position: 'absolute' }}>
        {still.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#ffffff" fillOpacity={p.o * 0.7} />
        ))}
      </Svg>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, glow]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice">
          {twinkle.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={p.r + 0.5} fill="#cfe2ff" fillOpacity={p.o} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}
