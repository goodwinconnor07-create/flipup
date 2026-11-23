import { type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { gameLook } from '@design/gameArt';
import { VARIANTS, type Variant } from '@/engine';
import { EASE_OUT } from '@/motion/presets';
import { useDrift } from '@/motion/use-drift';
import { gradient } from '@/theme';

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

const radial = (stops: string) => gradient(`radial-gradient(circle at center, ${stops})`);

/**
 * One game's whole page: its colour from top to bottom, a little lighter behind its picture (`focus`) and deepest at
 * the foot, so white type reads anywhere and the buttons sit on the game's darkest tone.
 */
function GameField({ variant, focus }: { variant: Variant; focus: DimensionValue }) {
  const look = gameLook(variant);
  const field = look.card[0];
  return (
    <>
      <View style={{ position: 'absolute', inset: 0, ...gradient(`linear-gradient(175deg, ${shade(field, 0.42)} 0%, ${shade(field, 0.62)} 48%, ${shade(look.band, 0.84)} 100%)`) }} />
      <View
        style={{
          position: 'absolute',
          top: focus,
          left: '50%',
          width: '170%',
          aspectRatio: 1,
          transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
          ...radial(`${alpha(look.tone, 0.45)} 0%, ${alpha(field, 0.2)} 30%, transparent 60%`),
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
      <GameField variant={variant} focus={focus} />
    </Animated.View>
  );
}

/**
 * The page for one game (Home, the lobbies, the game sheet, the deal wipe): the whole page in the game's own colour,
 * lighter behind its picture (23 Nov 2026, the owner: the full-page colour back, but none of the blue and still calm).
 * Two faint white lights drift over it on slow 22 and 31 second clocks, and the colour breathes a few percent on a 27
 * second one, so it's only noticed when looked for. All transforms on the UI thread, paused off screen and in the
 * background, and still under Reduce Motion (`useDrift`).
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
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: 1.04 + 0.04 * v.get() }, { translateY: `${-1.5 + 3 * u.get()}%` }] }));
  const low = useAnimatedStyle(() => ({ transform: [{ translateX: `${-12 + 24 * t.get()}%` }, { translateY: `${8 - 16 * u.get()}%` }] }));
  const white = useAnimatedStyle(() => ({ transform: [{ translateX: `${10 - 20 * u.get()}%` }, { translateY: `${-6 + 12 * t.get()}%` }] }));
  return (
    <View style={[{ flex: 1, overflow: 'hidden', backgroundColor: '#05070f' }, style]}>
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
            <GameField variant={variant} focus={focus} />
          </Animated.View>
        )}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: '-30%', bottom: '-35%', width: '120%', aspectRatio: 1, ...radial('rgba(255, 255, 255, 0.04) 0%, transparent 62%') }, low]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: '-35%', top: '-20%', width: '100%', aspectRatio: 1, ...radial('rgba(255, 255, 255, 0.05) 0%, transparent 62%') }, white]} />
      {children}
    </View>
  );
}
