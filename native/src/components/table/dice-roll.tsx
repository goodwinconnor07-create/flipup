import { useEffect, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, Keyframe, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { TIMING, variantOf, type Card, type Game } from '@/engine';
import { EASE_OUT, enter } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient, ROUNDED } from '@/theme';

import { haptic } from '../haptics';
import { PlayingCard } from './playing-card';

/** The show, in ms from its start: three counts, the die falling and tumbling, then the result until `dice.until`. */
const COUNT_MS = 800;
const COUNT_END = COUNT_MS * 3;
const ROLL_MS = 1900;
const RESULT_AT = COUNT_END + ROLL_MS;
const DIE = 168;

/** Where the pips sit on a 3 × 3 grid for each face. */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

/** A big number arriving: from a little larger and see-through, down to its size (ease-out, no bounce). */
const COUNT_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.35 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.bezier(0.23, 1, 0.32, 1) },
}).duration(320);

/**
 * Die on the River's roll as a show over the whole table: "Rolling the die in 3, 2, 1", then a big die drops onto
 * the screen and tumbles, its faces flickering slower and slower until it lands on the roll, and the result: which
 * board card went and which came in, or that the board stays. The engine holds the river's betting for exactly this
 * long (`TIMING.diceShow`, `hand.dice.until`), so nothing happens under it. A phone that comes back in the middle
 * picks up where the show is; one that missed it sees nothing. Under Reduce Motion the die fades in on its face.
 */
export function DiceRoll({ game }: { game: Game }) {
  const hand = game.hand;
  const until = variantOf(game) === 'dice' ? hand?.dice?.until : undefined;
  const [now, setNow] = useState(() => Date.now());
  const live = !!until && now < until;
  useEffect(() => {
    if (!until) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 100);
    const stop = setTimeout(() => clearInterval(t), Math.max(0, until - Date.now()) + 200);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [until]);
  if (!live || !hand?.dice || !until) return null;
  return <Show key={`${hand.number}-${until}`} at={now - (until - TIMING.diceShow)} dice={hand.dice} />;
}

function Show({ at, dice }: { at: number; dice: NonNullable<NonNullable<Game['hand']>['dice']> }) {
  const reduce = useReduceMotion();
  const count = at < COUNT_END ? 3 - Math.floor(at / COUNT_MS) : 0;
  const rolling = at >= COUNT_END;
  const result = at >= RESULT_AT;

  // A tick on each number, and a firm one when the die lands, and the result.
  useEffect(() => {
    if (count > 0) haptic.select();
  }, [count]);
  useEffect(() => {
    if (result) haptic.success();
  }, [result]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
      accessibilityLabel={result ? resultWords(dice) : count ? `Rolling the die in ${count}` : 'Rolling the die'}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(4, 9, 26, 0.95)' }}
    >
      {count > 0 ? (
        <View style={{ alignItems: 'center' }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 24, fontWeight: '800', color: 'rgba(255,255,255,0.8)' }}>
            Rolling the die in
          </Text>
          <Animated.View key={count} style={{ height: 250, alignItems: 'center' }} entering={reduce ? FadeIn.duration(150) : COUNT_IN} exiting={FadeOut.duration(90)}>
            <Text maxFontSizeMultiplier={1} style={{ fontFamily: ROUNDED, fontSize: 220, lineHeight: 250, fontWeight: '900', color: '#ffffff', textShadowColor: 'rgba(91,139,255,0.8)', textShadowRadius: 40 }}>
              {count}
            </Text>
          </Animated.View>
        </View>
      ) : null}
      {rolling && (
        <View style={{ alignItems: 'center', gap: 28 }}>
          <Die roll={dice.roll} reduce={reduce} />
          {result && <Result dice={dice} />}
        </View>
      )}
    </Animated.View>
  );
}

const resultWords = (d: { roll: number; out?: string; in?: string }) =>
  d.roll <= 5 && d.out && d.in ? `Rolled a ${d.roll}. Board card ${d.roll} is swapped.` : `Rolled a ${d.roll}. The board stays.`;

/**
 * The die: a white face with its pips, a darker slab under and beside it for depth, dropping in from above the screen
 * (ease-out, motion rule 1), one small hop when it hits, and tumbling in perspective as it settles (tilts kept under 35°, so iOS never
 * projects it past the screen). Its face flickers through random numbers, slower and slower, until it shows the roll.
 */
function Die({ roll, reduce }: { roll: number; reduce: boolean }) {
  const { height } = useWindowDimensions();
  const drop = useSharedValue(reduce ? 0 : -height * 0.75);
  const spin = useSharedValue(reduce ? 1 : 0);
  const [face, setFace] = useState(reduce ? roll : 1 + Math.floor(Math.random() * 6));
  const landed = useRef(false);

  useEffect(() => {
    if (reduce) return;
    drop.set(
      withSequence(
        withTiming(0, { duration: 460, easing: EASE_OUT }),
        withTiming(-28, { duration: 150, easing: EASE_OUT }),
        withTiming(0, { duration: 170, easing: EASE_OUT }),
      ),
    );
    spin.set(withTiming(1, { duration: ROLL_MS - 200, easing: EASE_OUT }));
    const hit = setTimeout(() => {
      landed.current = true;
      haptic.turn();
    }, 460);
    // The face flickers fast at first and slows down, then stops on the roll.
    let wait = 70;
    let t: ReturnType<typeof setTimeout>;
    const started = Date.now();
    const next = () => {
      if (Date.now() - started > ROLL_MS - 420) {
        setFace(roll);
        haptic.turn();
        return;
      }
      setFace((f) => {
        let n = 1 + Math.floor(Math.random() * 6);
        if (n === f) n = (n % 6) + 1;
        return n;
      });
      haptic.select();
      wait = Math.min(240, wait * 1.18);
      t = setTimeout(next, wait);
    };
    t = setTimeout(next, 120);
    return () => {
      clearTimeout(hit);
      clearTimeout(t);
    };
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => {
    const s = spin.get();
    const wobble = (1 - s) * 34;
    return {
      transform: [
        { perspective: 900 },
        { translateY: drop.get() },
        { rotateZ: `${s * 720}deg` },
        { rotateX: `${Math.sin(s * Math.PI * 5) * wobble}deg` },
        { rotateY: `${Math.cos(s * Math.PI * 4) * wobble}deg` },
      ],
    };
  });

  const pip = DIE * 0.15;
  const cell = DIE / 3;
  return (
    <Animated.View style={[{ width: DIE + 14, height: DIE + 14 }, style]} accessible={false}>
      {/* The die's depth: a darker slab behind, down and to the right. */}
      <View style={{ position: 'absolute', left: 14, top: 14, width: DIE, height: DIE, borderRadius: 36, borderCurve: 'continuous', backgroundColor: '#b9c2da' }} />
      <View
        style={{
          width: DIE,
          height: DIE,
          borderRadius: 36,
          borderCurve: 'continuous',
          ...gradient('linear-gradient(145deg, #ffffff 0%, #eef1f8 55%, #d6dcec 100%)'),
          backgroundColor: '#f4f6fb',
          boxShadow: '0 30px 60px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,255,255,0.9)',
        }}
      >
        {PIPS[face].map(([x, y], i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x * cell + (cell - pip) / 2,
              top: y * cell + (cell - pip) / 2,
              width: pip,
              height: pip,
              borderRadius: pip / 2,
              backgroundColor: face === 1 ? '#d7263d' : '#121a33',
              boxShadow: 'inset 0 3px 4px rgba(0,0,0,0.45)',
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}

/** What the roll did: "Rolled a 3", then the card that left and the one that came in, or that the board stays. */
function Result({ dice }: { dice: { roll: number; out?: Card; in?: Card } }) {
  const swapped = dice.roll <= 5 && !!dice.out && !!dice.in;
  return (
    <Animated.View entering={enter(false)} style={{ alignItems: 'center', gap: 14 }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 40, fontWeight: '900', color: '#ffffff' }}>
        Rolled a {dice.roll}!
      </Text>
      {swapped ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ alignItems: 'center', gap: 6, opacity: 0.6 }}>
            <PlayingCard card={dice.out!} size="md" />
            <Text style={{ color: '#ff8a8a', fontWeight: '700', fontSize: 14 }}>Out</Text>
          </View>
          <Text maxFontSizeMultiplier={1} style={{ color: '#ffffff', fontSize: 32, fontWeight: '700' }}>
            →
          </Text>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <PlayingCard card={dice.in!} size="md" glow />
            <Text style={{ color: '#7dffa8', fontWeight: '700', fontSize: 14 }}>In</Text>
          </View>
        </View>
      ) : (
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>
          A six: the board stays.
        </Text>
      )}
      {swapped && (
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
          Board card {dice.roll} is swapped.
        </Text>
      )}
    </Animated.View>
  );
}
