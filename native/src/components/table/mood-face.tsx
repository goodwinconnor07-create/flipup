// A seat's emoji, reacting to the hand from public moves only (moodOf() in the engine, shared with the web), with
// the web's own keyframes (the mood rules at the end of table.css):
// - win: jumps three times, squashing and tilting, while ✨ twinkles
// - beat (an all-in lost at showdown): a shake and a 💔
// - shove: pops to 122% and back, a 🔥 under it
// - fold: slumps down and tilts
// - bust/out: tips over, greyed, while 💫 spins over it
// - sweat (a big bet to face): a fast tremble while 💦 drips
// Each reaction plays from the start when the mood changes. Under Reduce Motion nothing moves; the marks still show.
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, type EasingFunction, type EasingFunctionFactory, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

import { MOOD_MARK, moodOf, type Game, type Player, type Seat } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';

/** Runs `steps` (fractions of `ms` and values) on a shared value, `times` times (-1 forever). */
function keys(_v: SharedValue<number>, ms: number, steps: [number, number][], times = 1, easing: EasingFunction | EasingFunctionFactory = Easing.inOut(Easing.quad)) {
  let at = 0;
  const seq = steps.map(([to, value]) => {
    const d = Math.max(1, (to - at) * ms);
    at = to;
    return withTiming(value, { duration: d, easing });
  });
  const one = seq.length > 1 ? withSequence(...seq) : seq[0];
  return times === 1 ? one : withRepeat(one, times);
}

export function MoodFace({ game, player, seat, size }: { game: Game; player: Player; seat: Seat | undefined; size: number }) {
  const mood = moodOf(game, player, seat);
  const reduce = useReduceMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rot = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const op = useSharedValue(1);
  const my = useSharedValue(0);
  const ms = useSharedValue(1);
  const mo = useSharedValue(1);
  const mr = useSharedValue(0);
  const key = `${game.hand?.number ?? 0}:${mood}`;

  useEffect(() => {
    const all = [x, y, rot, sx, sy, op, my, ms, mo, mr];
    all.forEach((v) => cancelAnimation(v));
    [x, y, rot, my, mr].forEach((v) => v.set(0));
    [sx, sy, op, ms, mo].forEach((v) => v.set(1));
    if (!mood) return;
    // Knocked out stays knocked over, even without motion.
    if (reduce) {
      if (mood === 'bust' || mood === 'out') {
        rot.set(-80);
        sx.set(0.86);
        sy.set(0.86);
        op.set(0.5);
      }
      return;
    }
    const pop = Easing.bezier(0.3, 1.6, 0.5, 1);
    switch (mood) {
      case 'win': {
        const jump = Easing.bezier(0.3, 0.7, 0.4, 1);
        y.set(keys(y, 700, [[0.35, -16], [0.6, 0], [1, 0]], 3, jump));
        sx.set(keys(sx, 700, [[0.35, 1.1], [0.6, 0.95], [1, 1]], 3, jump));
        sy.set(keys(sy, 700, [[0.35, 0.94], [0.6, 1.06], [1, 1]], 3, jump));
        rot.set(keys(rot, 700, [[0.35, -6], [0.6, 0], [1, 0]], 3, jump));
        ms.set(0.6);
        mo.set(0.3);
        ms.set(keys(ms, 900, [[0.5, 1.2], [1, 0.6]], 3));
        mo.set(keys(mo, 900, [[0.5, 1], [1, 0.3]], 3));
        break;
      }
      case 'beat':
        x.set(keys(x, 600, [[0.2, -5], [0.4, 5], [0.6, -3], [0.8, 2], [1, 0]], 1, Easing.ease));
        rot.set(keys(rot, 600, [[0.2, -6], [0.4, 6], [0.6, -3], [0.8, 2], [1, 0]], 1, Easing.ease));
        ms.set(1);
        ms.set(keys(ms, 600, [[0.45, 1.22], [1, 1]], 1, pop));
        break;
      case 'shove':
        sx.set(keys(sx, 600, [[0.45, 1.22], [1, 1]], 1, pop));
        sy.set(keys(sy, 600, [[0.45, 1.22], [1, 1]], 1, pop));
        ms.set(keys(ms, 600, [[0.45, 1.22], [1, 1]], 1, pop));
        break;
      case 'fold':
        y.set(withTiming(5, { duration: 500 }));
        rot.set(withTiming(8, { duration: 500 }));
        sx.set(withTiming(0.92, { duration: 500 }));
        sy.set(withTiming(0.92, { duration: 500 }));
        op.set(withTiming(0.8, { duration: 500 }));
        break;
      case 'bust':
      case 'out': {
        const fall = Easing.bezier(0.5, 0, 0.6, 1.4);
        rot.set(keys(rot, 900, [[0.3, 12], [1, -80]], 1, fall));
        y.set(keys(y, 900, [[0.3, -3], [1, 0]], 1, fall));
        sx.set(withDelay(270, withTiming(0.86, { duration: 630, easing: fall })));
        sy.set(withDelay(270, withTiming(0.86, { duration: 630, easing: fall })));
        op.set(withDelay(270, withTiming(0.5, { duration: 630 })));
        mr.set(withRepeat(withTiming(360, { duration: 1600, easing: Easing.linear }), 4, false));
        break;
      }
      case 'sweat':
        ms.set(0.6);
        mo.set(0);
        x.set(keys(x, 160, [[0.25, -1.2], [0.75, 1.2], [1, 0]], -1, Easing.linear));
        rot.set(keys(rot, 160, [[0.25, -1], [0.75, 1], [1, 0]], -1, Easing.linear));
        my.set(keys(my, 1200, [[0.25, 0], [1, 14]], -1, Easing.in(Easing.quad)));
        ms.set(keys(ms, 1200, [[0.25, 1], [1, 0.9]], -1, Easing.in(Easing.quad)));
        mo.set(keys(mo, 1200, [[0.25, 1], [1, 0]], -1, Easing.in(Easing.quad)));
        break;
    }
  }, [key, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const face = useAnimatedStyle(() => ({
    opacity: op.get(),
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${rot.get()}deg` }, { scaleX: sx.get() }, { scaleY: sy.get() }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mo.get(),
    transform: [{ translateY: my.get() }, { rotate: `${mr.get()}deg` }, { scale: ms.get() }],
  }));
  const mark = mood ? MOOD_MARK[mood] : undefined;
  const above = mood === 'bust' || mood === 'out';
  const under = mood === 'shove';
  return (
    <View style={{ width: size + 6, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={face}>
        <Text style={{ fontSize: size * 0.82, lineHeight: size }} maxFontSizeMultiplier={1} accessible={false}>
          {player.emoji}
        </Text>
      </Animated.View>
      {mark && (
        <Animated.View
          key={key}
          pointerEvents="none"
          style={[{ position: 'absolute', zIndex: 2 }, above ? { top: -16, alignSelf: 'center' } : under ? { bottom: -6, right: -10 } : { top: -10, right: -10 }, markStyle]}
        >
          <Text accessible={false} maxFontSizeMultiplier={1} style={{ fontSize: 22, lineHeight: 26, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 }}>
            {mark}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

