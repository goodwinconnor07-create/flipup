import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { ART_GOLD, challengeLook, challengeScene, type ArcShape, type ChallengeShape, type ChipsShape, type GridShape, type LensShape, type SoloId } from '@design/challengeArt';
import { gradient, radius } from '@/theme';

import { draw } from './game-picture';

// A solo card's picture (src/design/challengeArt.ts): the games' playing cards, plus chips, a magnifying glass, a
// rewind arrow or Range training's grid of hands, on its gradient.

function Chips({ x, y, colours, r = 22 }: ChipsShape) {
  const t = 7;
  const ry = r * 0.36;
  return (
    <G>
      <Ellipse cx={x + 2} cy={y + 3} rx={r + 2} ry={ry + 1} fill="#000" opacity={0.3} />
      {colours.map((c, i) => {
        const bottom = y - i * t;
        const top = bottom - t;
        return (
          <G key={i}>
            <Ellipse cx={x} cy={bottom} rx={r} ry={ry} fill={c} />
            <Ellipse cx={x} cy={bottom} rx={r} ry={ry} fill="#000" opacity={0.22} />
            <Rect x={x - r} y={top} width={r * 2} height={t} fill={c} />
            <Rect x={x - r} y={top} width={r * 2} height={t} fill="#000" opacity={0.12} />
            {[-0.62, 0, 0.62].map((k) => (
              <Rect key={k} x={x + k * r - 2.5} y={top + 1.5} width={5} height={t - 3} rx={1} fill="#fff" opacity={0.85} />
            ))}
            <Ellipse cx={x} cy={top} rx={r} ry={ry} fill={c} />
            <Ellipse cx={x} cy={top} rx={r * 0.64} ry={ry * 0.64} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.6} strokeDasharray="4 3" />
          </G>
        );
      })}
    </G>
  );
}

function Lens({ x, y, r }: LensShape) {
  const a = r * 0.72;
  const b = r * 1.45;
  return (
    <G>
      <Line x1={x + a + 2} y1={y + a + 3} x2={x + b + 2} y2={y + b + 3} stroke="#000" strokeOpacity={0.3} strokeWidth={9} strokeLinecap="round" />
      <Circle cx={x + 2} cy={y + 3} r={r} fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={6} />
      <Circle cx={x} cy={y} r={r} fill="#fff" opacity={0.16} />
      <Line x1={x + a} y1={y + a} x2={x + b} y2={y + b} stroke={ART_GOLD} strokeWidth={8} strokeLinecap="round" />
      <Circle cx={x} cy={y} r={r} fill="none" stroke={ART_GOLD} strokeWidth={5} />
      <Path d={`M${x - r * 0.55} ${y - r * 0.2} A ${r * 0.6} ${r * 0.6} 0 0 1 ${x - r * 0.15} ${y - r * 0.58}`} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" />
    </G>
  );
}

/** A point on the arc: 0 degrees is straight up, going clockwise. */
const at = (x: number, y: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [x + r * Math.sin(a), y - r * Math.cos(a)] as const;
};

function Arc({ x, y, r, from, to }: ArcShape) {
  const [sx, sy] = at(x, y, r, from);
  const [ex, ey] = at(x, y, r, to);
  const back = to < from;
  const large = Math.abs(from - to) > 180 ? 1 : 0;
  const d = `M${sx} ${sy} A ${r} ${r} 0 ${large} ${back ? 0 : 1} ${ex} ${ey}`;
  // The way the arrow travels at its end, and the head round it.
  const a = (to * Math.PI) / 180;
  const dir = back ? [-Math.cos(a), -Math.sin(a)] : [Math.cos(a), Math.sin(a)];
  const perp = [-dir[1], dir[0]];
  const tip = [ex + dir[0] * 9, ey + dir[1] * 9];
  const l = [ex - dir[0] * 4 + perp[0] * 9, ey - dir[1] * 4 + perp[1] * 9];
  const rr = [ex - dir[0] * 4 - perp[0] * 9, ey - dir[1] * 4 - perp[1] * 9];
  const head = `M${tip[0]} ${tip[1]} L${l[0]} ${l[1]} L${rr[0]} ${rr[1]} Z`;
  return (
    <G>
      <G transform="translate(2 3)" opacity={0.3}>
        <Path d={d} fill="none" stroke="#000" strokeWidth={6} strokeLinecap="round" />
        <Path d={head} fill="#000" />
      </G>
      <Path d={d} fill="none" stroke={ART_GOLD} strokeWidth={6} strokeLinecap="round" />
      <Path d={head} fill={ART_GOLD} strokeLinejoin="round" stroke={ART_GOLD} strokeWidth={2} />
    </G>
  );
}

function Grid({ x, y, cols, rows, cell, on }: GridShape) {
  const gap = 2;
  const lit = new Set(on);
  return (
    <G>
      <Rect x={x - 4 + 2} y={y - 4 + 3} width={cols * cell + 8 - gap} height={rows * cell + 8 - gap} rx={6} fill="#000" opacity={0.3} />
      <Rect x={x - 4} y={y - 4} width={cols * cell + 8 - gap} height={rows * cell + 8 - gap} rx={6} fill="#fff" opacity={0.1} />
      {Array.from({ length: cols * rows }, (_, i) => (
        <Rect key={i} x={x + (i % cols) * cell} y={y + Math.floor(i / cols) * cell} width={cell - gap} height={cell - gap} rx={2.5} fill={lit.has(i) ? ART_GOLD : '#fff'} opacity={lit.has(i) ? 1 : 0.16} />
      ))}
    </G>
  );
}

function drawChallenge(shape: ChallengeShape, key: number) {
  if (shape.kind === 'chips') return <Chips key={key} {...shape} />;
  if (shape.kind === 'lens') return <Lens key={key} {...shape} />;
  if (shape.kind === 'arc') return <Arc key={key} {...shape} />;
  if (shape.kind === 'grid') return <Grid key={key} {...shape} />;
  return draw(shape, key);
}

/** A solo card's picture filling a box (cropped to its shape), on its gradient. */
export function ChallengePicture({ id, width, height, rounded = radius.md }: { id: SoloId; width: number; height: number; rounded?: number }) {
  const [a, b] = challengeLook(id).card;
  return (
    <View
      style={{ width, height, borderRadius: rounded, borderCurve: 'continuous', overflow: 'hidden', ...gradient(`linear-gradient(150deg, ${a} 0%, ${b} 100%)`) }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
        {challengeScene(id).map(drawChallenge)}
      </Svg>
    </View>
  );
}
