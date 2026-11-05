import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient } from '@/theme';

import { GrainBackground } from '../grain-background';

/** How the room feels: waiting, or the answer's verdict. */
export type Mood = 'idle' | 'best' | 'ok' | 'miss';

const MOOD_GLOW: Record<Exclude<Mood, 'idle'>, string> = {
  best: 'rgba(255, 201, 51, 0.30)',
  ok: 'rgba(90, 140, 255, 0.30)',
  miss: 'rgba(90, 110, 160, 0.20)',
};

/**
 * Range training's room: the night grain page (GrainBackground), a soft spotlight over the table, and two layers
 * that answer the play. On a verdict the light warms to gold for the best play, cools to violet for a good one and
 * dims for a miss (0.6s). `energy` (0 to 1, Blitz's run) adds a glow that breathes faster the hotter you are.
 * Under Reduce Motion nothing breathes; the verdict still changes the light, as a fade.
 */
export function StudyRoom({ mood, energy = 0, children }: { mood: Mood; energy?: number; children?: ReactNode }) {
  const reduce = useReduceMotion();
  const verdict = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    verdict.set(withTiming(mood === 'idle' ? 0 : 1, { duration: 600, easing: Easing.bezier(0.23, 1, 0.32, 1) }));
  }, [mood, verdict]);

  useEffect(() => {
    if (reduce || energy <= 0) {
      cancelAnimation(pulse);
      pulse.set(withTiming(energy > 0 ? 0.5 : 0, { duration: 300 }));
      return;
    }
    // From one breath every 2.4s to one every 0.8s at full heat.
    const half = 1200 - 800 * Math.min(1, energy);
    pulse.set(withSequence(withTiming(0, { duration: 200 }), withRepeat(withTiming(1, { duration: half, easing: Easing.inOut(Easing.sin) }), -1, true)));
    return () => cancelAnimation(pulse);
  }, [energy, reduce, pulse]);

  const verdictStyle = useAnimatedStyle(() => ({ opacity: verdict.get() }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: (0.35 + 0.65 * pulse.get()) * Math.min(1, energy * 1.4), transform: [{ scale: 1 + 0.08 * pulse.get() }] }));
  const glow = mood === 'idle' ? MOOD_GLOW.ok : MOOD_GLOW[mood];

  return (
    <GrainBackground>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {/* The spotlight: a pool of light over where the table sits. */}
        <View style={{ position: 'absolute', left: '-30%', right: '-30%', top: '4%', height: '58%', ...gradient('radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 38%, transparent 66%)') }} />
        <Animated.View style={[{ position: 'absolute', left: '-40%', right: '-40%', top: '-10%', height: '80%', ...gradient(`radial-gradient(ellipse at 50% 40%, ${glow} 0%, transparent 62%)`) }, verdictStyle]} />
        {energy > 0 && (
          <Animated.View style={[{ position: 'absolute', left: '-50%', right: '-50%', bottom: '-25%', height: '75%', ...gradient('radial-gradient(ellipse at 50% 60%, rgba(245,183,0,0.22) 0%, rgba(70,120,255,0.16) 35%, transparent 65%)') }, pulseStyle]} />
        )}
      </View>
      {children}
    </GrainBackground>
  );
}
