import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { EASE_OUT } from '@/motion/presets';

import { haptic } from '../haptics';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The cube's box on screen, in points: room for its corners while it spins, so none is ever clipped. */
export const CUBE = 300;
/** How far the camera sits from the cube's middle (the cube is 2 across): closer is more dramatic perspective. */
const CAMERA = 5.2;
/** Points per unit at the cube's middle. */
const SCALE = 74 * CAMERA;
/** How the cube sits once it has stopped: tipped back and turned, so the face on top of the roll shows with two sides. */
const TILT_X = 17;
const TILT_Y = 20;

type V = [number, number, number];

/**
 * The six faces: the number on it, its outward normal, and the two directions across it (for the pips). Opposite
 * faces add up to seven, like a real die.
 */
const FACES: { n: number; normal: V; u: V; v: V }[] = [
  { n: 1, normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: 6, normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  { n: 3, normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { n: 4, normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: 2, normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { n: 5, normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
];

/** Pips on a face, in its own across-and-down units (-1 to 1). */
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.5, -0.5], [0.5, 0.5]],
  3: [[-0.5, -0.5], [0, 0], [0.5, 0.5]],
  4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
  5: [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]],
  6: [[-0.5, -0.55], [0.5, -0.55], [-0.5, 0], [0.5, 0], [-0.5, 0.55], [0.5, 0.55]],
};
const PIP_R = 0.17;
const PIP_STEPS = 12;

/** The turn (about x, then y) that brings each number's face round to the front. */
const FRONT: Record<number, [number, number]> = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [90, 0], 5: [-90, 0] };

function rotate(p: V, ax: number, ay: number, az: number): V {
  'worklet';
  // About z, then y, then x (degrees), then the resting tilt: y, then x.
  const r = Math.PI / 180;
  let [x, y, z] = p;
  let c = Math.cos(az * r), s = Math.sin(az * r);
  [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(ay * r);
  s = Math.sin(ay * r);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(ax * r);
  s = Math.sin(ax * r);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(TILT_Y * r);
  s = Math.sin(TILT_Y * r);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(TILT_X * r);
  s = Math.sin(TILT_X * r);
  [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}

function project(p: V): [number, number] {
  'worklet';
  const k = SCALE / (CAMERA - p[2]);
  return [CUBE / 2 + p[0] * k, CUBE / 2 - p[1] * k];
}

function at(face: (typeof FACES)[number], a: number, b: number): V {
  'worklet';
  const { normal: n, u, v } = face;
  return [n[0] + u[0] * a + v[0] * b, n[1] + u[1] * a + v[1] * b, n[2] + u[2] * a + v[2] * b];
}

/** One face of the cube at angles (ax, ay, az): its outline, its pips, and how much light it catches. */
function faceShape(i: number, ax: number, ay: number, az: number): { face: string; pips: string; light: number } {
  'worklet';
  const f = FACES[i];
  const n = rotate(f.normal, ax, ay, az);
  // Facing away from the camera: not drawn (the cube is convex, so the faces never overlap otherwise).
  if (n[2] <= 0.02) return { face: 'M0 0', pips: 'M0 0', light: 0 };
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  let face = '';
  for (let k = 0; k < 4; k++) {
    const [x, y] = project(rotate(at(f, corners[k][0], corners[k][1]), ax, ay, az));
    face += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  face += 'Z';
  let pips = '';
  for (const [pa, pb] of PIPS[f.n]) {
    for (let k = 0; k <= PIP_STEPS; k++) {
      const t = (k / PIP_STEPS) * Math.PI * 2;
      const [x, y] = project(rotate(at(f, pa + Math.cos(t) * PIP_R, pb + Math.sin(t) * PIP_R), ax, ay, az));
      pips += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    pips += 'Z';
  }
  // Light from above, the left and the front.
  const light = Math.max(0, Math.min(1, 0.35 + 0.65 * (n[2] * 0.62 + n[1] * 0.55 - n[0] * 0.25)));
  return { face: face || 'M0 0', pips: pips || 'M0 0', light };
}

function Face({ i, spin, roll }: { i: number; spin: SharedValue<number>; roll: number }) {
  const [fx, fy] = FRONT[roll];
  const props = useAnimatedProps(() => {
    // Whole extra turns on every axis that unwind to the face of the roll: fast at first, settling at the end.
    const left = 1 - spin.get();
    const s = faceShape(i, fx + 720 * left, fy + 540 * left, 450 * left);
    const g = Math.round(172 + 83 * s.light);
    return { d: s.face, fill: `rgb(${g}, ${Math.round(g * 0.99)}, ${Math.min(255, g + 6)})` };
  });
  const pipProps = useAnimatedProps(() => {
    const left = 1 - spin.get();
    return { d: faceShape(i, fx + 720 * left, fy + 540 * left, 450 * left).pips };
  });
  const pip = FACES[i].n === 1 ? '#d7263d' : '#141c38';
  return (
    <>
      <AnimatedPath animatedProps={props} stroke="#7f88a6" strokeWidth={2.5} strokeLinejoin="round" />
      <AnimatedPath animatedProps={pipProps} fill={pip} />
    </>
  );
}

/**
 * A true 3D die, drawn as the six faces of a cube turned in space and projected with perspective each frame (the
 * faces pointing away aren't drawn), lit from above so its sides read as solid. It drops in from above the screen,
 * hops once as it hits and spins on all three axes, fast and then slower, until it comes to rest with the roll on
 * its front face, tipped back to show two sides. Under Reduce Motion it's simply there, at rest.
 */
export function DiceCube({ roll, reduce, duration }: { roll: number; reduce: boolean; duration: number }) {
  const { height } = useWindowDimensions();
  const drop = useSharedValue(reduce ? 0 : -height * 0.8);
  const spin = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) return;
    drop.set(
      withSequence(
        withTiming(0, { duration: 460, easing: EASE_OUT }),
        withTiming(-34, { duration: 150, easing: EASE_OUT }),
        withTiming(0, { duration: 170, easing: EASE_OUT }),
      ),
    );
    spin.set(withTiming(1, { duration, easing: EASE_OUT }));
    const hit = setTimeout(() => haptic.turn(), 460);
    const stop = setTimeout(() => haptic.turn(), duration - 80);
    return () => {
      clearTimeout(hit);
      clearTimeout(stop);
    };
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const fall = useAnimatedStyle(() => ({ transform: [{ translateY: drop.get() }] }));
  return (
    <Animated.View accessible={false} style={[{ width: CUBE, height: CUBE }, fall]}>
      <Svg width={CUBE} height={CUBE}>
        {FACES.map((_, i) => (
          <Face key={i} i={i} spin={spin} roll={roll} />
        ))}
      </Svg>
    </Animated.View>
  );
}
