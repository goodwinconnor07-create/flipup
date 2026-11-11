import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
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
 * the screen and spins, a flat die, blurred while it tumbles and sharpening as it comes to rest on the roll, and the result: which
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
    const refresh = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 100);
    const stop = setTimeout(() => clearInterval(t), Math.max(0, until - Date.now()) + 200);
    return () => {
      clearTimeout(refresh);
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [until]);
  if (!live || !hand?.dice || !until) return null;
  return <Show key={`${hand.number}-${until}`} at={Math.max(0, now - (until - TIMING.diceShow))} dice={hand.dice} />;
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

/** Isometric geometry for a die standing still: the hexagon's radius, and sin/cos of 30°. */
const R = 108;
const C30 = Math.cos(Math.PI / 6);
/** The three faces you see: the corner they share is the middle of the die. [origin, across, down] in points from the centre. */
const TOP = { o: [0, -R], u: [R * C30, R / 2], v: [-R * C30, R / 2], fill: '#ffffff' };
const LEFT = { o: [-R * C30, -R / 2], u: [R * C30, R / 2], v: [0, R], fill: '#dfe4f1' };
const RIGHT = { o: [R * C30, -R / 2], u: [-R * C30, R / 2], v: [0, R], fill: '#bcc5dc' };
const SIZE = R * 2 + 24;
const GRID = [0.27, 0.5, 0.73];

/** Opposite faces add up to seven. */
const opposite = (n: number) => 7 - n;

/** Three faces that can be seen together (none opposite another), with the given number on top. */
function sides(top: number, pick: number): [number, number] {
  const rest = [1, 2, 3, 4, 5, 6].filter((n) => n !== top && n !== opposite(top));
  const left = rest[pick % rest.length];
  const right = rest.filter((n) => n !== left && n !== opposite(left))[Math.floor(pick / rest.length) % 2];
  return [left, right];
}

function Face({ g, n, cx, cy }: { g: typeof TOP; n: number; cx: number; cy: number }) {
  const [ox, oy] = [cx + g.o[0], cy + g.o[1]];
  const pts = [
    [ox, oy],
    [ox + g.u[0], oy + g.u[1]],
    [ox + g.u[0] + g.v[0], oy + g.u[1] + g.v[1]],
    [ox + g.v[0], oy + g.v[1]],
  ];
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('') + 'Z';
  return (
    <>
      {/* A stroke in the face's own colour with rounded joins rounds the corners. */}
      <Path d={d} fill={g.fill} stroke={g.fill} strokeWidth={14} strokeLinejoin="round" />
      {/* The pips live in the face's own 0 to 1 square, so the slant of the face squashes them for free. */}
      <G transform={`matrix(${g.u[0]} ${g.u[1]} ${g.v[0]} ${g.v[1]} ${ox} ${oy})`}>
        {PIPS[n].map(([x, y], i) => (
          <Circle key={i} cx={GRID[x]} cy={GRID[y]} r={0.085} fill={n === 1 ? '#d7263d' : '#141c38'} />
        ))}
      </G>
    </>
  );
}

/**
 * A 3D-looking die that never moves: it sits dead centre in a fixed pose (top, left and right faces, lit from above
 * so the top is the brightest). Rolling is its faces changing, a frame at a time like a sprite, fast and then slower
 * and slower, each frame a different valid die (no two opposite faces ever show), until it stops with the roll on top.
 * It flashes a ring of light and gives a firm haptic as it stops. Under Reduce Motion it just shows the roll.
 */
function Die({ roll, reduce }: { roll: number; reduce: boolean }) {
  const [top, setTop] = useState(() => reduce ? roll : 1 + Math.floor(Math.random() * 6));
  const [pick, setPick] = useState(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    let wait = 60;
    let t: ReturnType<typeof setTimeout>;
    const started = Date.now();
    const next = () => {
      if (Date.now() - started > ROLL_MS - 300) {
        setTop(roll);
        setPick(Math.floor(Math.random() * 6));
        glow.set(withSequence(withTiming(1, { duration: 120, easing: EASE_OUT }), withTiming(0, { duration: 500, easing: EASE_OUT })));
        haptic.turn();
        return;
      }
      setTop((f) => {
        const n = 1 + Math.floor(Math.random() * 6);
        return n === f ? (n % 6) + 1 : n;
      });
      setPick(Math.floor(Math.random() * 6));
      haptic.select();
      wait = Math.min(260, wait * 1.16);
      t = setTimeout(next, wait);
    };
    t = setTimeout(next, 80);
    return () => clearTimeout(t);
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const [left, right] = sides(top, pick);
  const ring = useAnimatedStyle(() => ({ opacity: glow.get() }));
  const c = SIZE / 2;
  return (
    <View accessible={false} style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: SIZE * 1.5, height: SIZE * 1.5, ...gradient('radial-gradient(circle at center, rgba(125, 170, 255, 0.6) 0%, rgba(125, 170, 255, 0) 62%)') }, ring]} />
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Face g={LEFT} n={left} cx={c} cy={c} />
        <Face g={RIGHT} n={right} cx={c} cy={c} />
        <Face g={TOP} n={top} cx={c} cy={c} />
      </Svg>
    </View>
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
