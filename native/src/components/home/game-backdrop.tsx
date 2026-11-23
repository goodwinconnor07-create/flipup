import { type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { gameLook } from '@design/gameArt';
import { VARIANTS, type Variant } from '@/engine';
import { EASE_OUT } from '@/motion/presets';
import { useDrift } from '@/motion/use-drift';
import { brand, gradient } from '@/theme';

/** A colour mixed towards black: `k` of 0 is the colour, 1 is black. */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const part = (v: number) => Math.round(v * (1 - k));
  return `rgb(${part((n >> 16) & 255)}, ${part((n >> 8) & 255)}, ${part(n & 255)})`;
}

const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/**
 * The night blue every game's page sits on, top and bottom. Mixing a game's colour towards black turned the warm
 * ones brown (Die on the River's orange became a chocolate page); on one navy base they read as a glow instead, and
 * the bottom of the page (shortcuts, buttons, tab bar) looks the same whichever game is chosen.
 */
const BACKDROP_TOP = brand.backdropTop;
const BACKDROP_BOTTOM = brand.backdropBottom;

const radial = (stops: string) => gradient(`radial-gradient(circle at center, ${stops})`);

/**
 * One game's colour on the page: a glow centred on where its picture sits (`focus`, from the top), fading out before
 * the buttons, and a faint wash of the colour down from the top edge.
 */
function GameGlow({ variant, focus }: { variant: Variant; focus: DimensionValue }) {
  const look = gameLook(variant);
  const field = look.card[0];
  return (
    <>
      <View style={{ position: 'absolute', inset: 0, ...gradient(`linear-gradient(180deg, ${alpha(field, 0.26)} 0%, ${alpha(field, 0.08)} 38%, transparent 62%)`) }} />
      <View
        style={{
          position: 'absolute',
          top: focus,
          left: '50%',
          width: '175%',
          aspectRatio: 1,
          transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
          ...radial(`${alpha(look.tone, 0.62)} 0%, ${alpha(field, 0.34)} 24%, ${alpha(field, 0.12)} 44%, transparent 64%`),
        }}
      />
    </>
  );
}

/** Home's layer for the game at `index`: fully shown when the swiper rests on it, blending into its neighbour as the line moves. */
function SwipeLayer({ index, variant, progress, focus }: { index: number; variant: Variant; progress: SharedValue<number>; focus: DimensionValue }) {
  const style = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - Math.abs(progress.get() - index)) }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, style]}>
      <GameGlow variant={variant} focus={focus} />
    </Animated.View>
  );
}

/**
 * The page for one game (Home, the lobbies, the game sheet, the deal wipe): night blue, with the game's colour as a
 * glow around its picture and a faint wash from the top. Two soft lights (brand blue and a little white) drift over it
 * on slow 22 and 31 second clocks, and the glow breathes a few percent on a 27 second one, so it's only noticed when
 * looked for. All transforms on the UI thread, paused off screen and in the background, and still under Reduce Motion
 * (`useDrift`).
 *
 * With `progress` (Home's swiper position, in games along `VARIANTS`) the colour follows the finger: each game's glow
 * fades by its distance from the position, so dragging between two games blends their colours. Without it a new
 * game's colour fades in over the old (300ms in, 240 out).
 */
export function GameBackdrop({
  variant,
  progress,
  focus = '32%',
  style,
  children,
}: {
  variant: Variant;
  progress?: SharedValue<number>;
  /** Where the game's picture sits, from the top: the glow is centred there. */
  focus?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { t } = useDrift(22000);
  const { t: u } = useDrift(31000);
  const { t: v } = useDrift(27000);
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: 0.97 + 0.06 * v.get() }, { translateY: `${-1.5 + 3 * u.get()}%` }] }));
  const blue = useAnimatedStyle(() => ({ transform: [{ translateX: `${-12 + 24 * t.get()}%` }, { translateY: `${8 - 16 * u.get()}%` }] }));
  const white = useAnimatedStyle(() => ({ transform: [{ translateX: `${10 - 20 * u.get()}%` }, { translateY: `${-6 + 12 * t.get()}%` }] }));
  return (
    <View style={[{ flex: 1, overflow: 'hidden', backgroundColor: BACKDROP_BOTTOM }, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, ...gradient(`linear-gradient(180deg, ${BACKDROP_TOP} 0%, ${BACKDROP_BOTTOM} 100%)`) }} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, breathe]}>
        {progress ? (
          VARIANTS.map((g, i) => <SwipeLayer key={g.id} index={i} variant={g.id} progress={progress} focus={focus} />)
        ) : (
          <Animated.View
            key={variant}
            entering={FadeIn.duration(300).easing(EASE_OUT)}
            exiting={FadeOut.duration(240).easing(EASE_OUT)}
            style={{ position: 'absolute', inset: 0 }}
          >
            <GameGlow variant={variant} focus={focus} />
          </Animated.View>
        )}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: '-30%', bottom: '-35%', width: '120%', aspectRatio: 1, ...radial(`${alpha(brand.violet, 0.2)} 0%, transparent 62%`) }, blue]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: '-35%', top: '-20%', width: '100%', aspectRatio: 1, ...radial('rgba(255, 255, 255, 0.05) 0%, transparent 62%') }, white]} />
      {children}
    </View>
  );
}
