// A seat's emoji, reacting to the hand from public moves only (moodOf() in the engine, shared with the web): a
// bounce and sparkles for a win, a shake and a 💔 when an all-in loses, a droop with dizzy stars when knocked out,
// a pop and a 🔥 on a shove, a sink on a fold, and a tremble with a sweat drop over a big bet. Each reaction plays
// from the start when the mood changes. Under Reduce Motion the face stays still and only the mark shows.
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { cancelAnimation, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';

import { MOOD_MARK, moodOf, type Game, type Mood, type Player, type Seat } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';

export function MoodFace({ game, player, seat, size }: { game: Game; player: Player; seat: Seat | undefined; size: number }) {
  const mood = moodOf(game, player, seat);
  const reduce = useReduceMotion();
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const turn = useSharedValue(0);
  const scale = useSharedValue(1);
  const key = `${game.hand?.number ?? 0}:${mood}`;
  const play = (m: NonNullable<Mood>) => {
    const spring = { damping: 9, stiffness: 260 };
    switch (m) {
      case 'win':
        y.set(withSequence(withTiming(-14, { duration: 160 }), withSpring(0, spring), withTiming(-7, { duration: 120 }), withSpring(0, spring)));
        break;
      case 'beat':
        x.set(withSequence(...[-6, 6, -5, 5, -3, 0].map((v) => withTiming(v, { duration: 60 }))));
        break;
      case 'bust':
      case 'out':
        turn.set(withSpring(-24, { damping: 12, stiffness: 120 }));
        y.set(withSpring(4, { damping: 12, stiffness: 120 }));
        break;
      case 'shove':
        scale.set(withSequence(withTiming(1.25, { duration: 140 }), withSpring(1, spring)));
        break;
      case 'fold':
        y.set(withTiming(4, { duration: 300 }));
        break;
      case 'sweat':
        turn.set(withRepeat(withSequence(withTiming(-3, { duration: 70 }), withTiming(3, { duration: 70 })), -1, true));
        break;
    }
  };

  useEffect(() => {
    [y, x, turn, scale].forEach((v) => cancelAnimation(v));
    y.set(0);
    x.set(0);
    turn.set(0);
    scale.set(1);
    if (reduce || !mood) return;
    play(mood);
  }, [key, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${turn.get()}deg` }, { scale: scale.get() }] }));
  const grey = mood === 'bust' || mood === 'out';
  const mark = mood ? MOOD_MARK[mood] : undefined;
  return (
    <View style={{ width: size + 12, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[style, { opacity: grey ? 0.5 : mood === 'fold' ? 0.75 : 1 }]}>
        <Text style={{ fontSize: size * 0.8, lineHeight: size }} maxFontSizeMultiplier={1} accessible={false}>
          {player.emoji}
        </Text>
      </Animated.View>
      {mark && (
        <Animated.Text key={key} entering={reduce ? FadeIn : ZoomIn.springify().damping(12)} accessible={false} maxFontSizeMultiplier={1} style={{ position: 'absolute', top: -2, right: -2, fontSize: size * 0.34 }}>
          {mark}
        </Animated.Text>
      )}
    </View>
  );
}
