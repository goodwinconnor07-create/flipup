import { Image } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { iconColours, type IconId } from '@design/gameIcons';
import { gradient } from '@/theme';

// Every game's and solo card's icon (docs/DESIGN_DIRECTION.md): drawn as SVG by scripts/drawGameIcons.mjs and turned
// into pictures by scripts/renderGameIcons.mjs, because the detailed icons are a few hundred shapes each and some
// screens show dozens at once. Metro needs each picture named in full.
const PICTURES: Record<IconId, number> = {
  holdem: require('../../assets/game-icons/holdem.webp'),
  pineapple: require('../../assets/game-icons/pineapple.webp'),
  deuces: require('../../assets/game-icons/deuces.webp'),
  ghost: require('../../assets/game-icons/ghost.webp'),
  pittsburgh: require('../../assets/game-icons/pittsburgh.webp'),
  dice: require('../../assets/game-icons/dice.webp'),
  redriver: require('../../assets/game-icons/redriver.webp'),
  crucifix: require('../../assets/game-icons/crucifix.webp'),
  circle: require('../../assets/game-icons/circle.webp'),
  memory: require('../../assets/game-icons/memory.webp'),
  beanstalk: require('../../assets/game-icons/beanstalk.webp'),
  bjholdem: require('../../assets/game-icons/bjholdem.webp'),
  imposter: require('../../assets/game-icons/imposter.webp'),
  shortStack: require('../../assets/game-icons/shortStack.webp'),
  detective: require('../../assets/game-icons/detective.webp'),
  rewind: require('../../assets/game-icons/rewind.webp'),
  ranges: require('../../assets/game-icons/ranges.webp'),
};

export const iconPicture = (id: IconId): number => PICTURES[id];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
/** `a` moved `t` of the way to `b` (0 to 1). */
export const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};

/**
 * The colour a panel under (or a sheet behind) a game's art takes: between its icon's two colours, toward the
 * darker, and darkened a little more so white text always reads on it (Apple's Games app tints its cards this way).
 */
export const panelTint = (id: IconId) => {
  const [top, bottom] = iconColours(id);
  return mix(mix(top, bottom, 0.62), '#000000', 0.22);
};

/** The corner of an app icon this size: Apple's icon grid rounds about 22.5% of the side. */
export const iconCorner = (size: number) => Math.round(size * 0.225);

/**
 * A game's or solo card's icon as an app icon: the square picture with continuous corners. `rounded` overrides the
 * corner (0 for a picture that sits flush in a card).
 */
export function GameIcon({ id, size, rounded = iconCorner(size), style }: { id: IconId; size: number; rounded?: number; style?: StyleProp<ViewStyle> }) {
  const [top, bottom] = iconColours(id);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size, borderRadius: rounded, borderCurve: 'continuous', overflow: 'hidden', ...gradient(`linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`) }, style]}
    >
      <Image source={PICTURES[id]} style={{ width: size, height: size }} contentFit="cover" cachePolicy="memory" transition={null} />
    </View>
  );
}

/**
 * The icon's own art, blurred and darkened, filling its box: the backdrop for a wide card or a sheet's header, so
 * the colour always comes from the game (Apple's Games app does the same with a game's key art).
 */
export function ArtBackdrop({ id, dim = 0.25, blur = 28 }: { id: IconId; dim?: number; blur?: number }) {
  const [top, bottom] = iconColours(id);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...gradient(`linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`) }}>
      <Image source={PICTURES[id]} blurRadius={blur} contentFit="cover" cachePolicy="memory" transition={null} style={{ position: 'absolute', inset: -40 }} />
      {dim > 0 && <View style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0, 0, 0, ${dim})` }} />}
    </View>
  );
}

/** A wide picture of a game or solo card: its icon centred on its own blurred art, with a soft shadow under it. */
export function IconBanner({ id, width, height, icon = Math.round(height * 0.62), rounded = 0 }: { id: IconId; width: number; height: number; icon?: number; rounded?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: rounded, borderCurve: 'continuous', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >
      <ArtBackdrop id={id} />
      <View style={{ borderRadius: iconCorner(icon), borderCurve: 'continuous', boxShadow: '0 10px 24px -8px rgba(0, 0, 0, 0.55)' }}>
        <GameIcon id={id} size={icon} />
      </View>
    </View>
  );
}
