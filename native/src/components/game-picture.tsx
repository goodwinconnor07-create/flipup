import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text } from 'react-native-svg';

import { gameLook, gameScene, gameThumb, GLOW, PIPS, SUIT_COLOUR, type CardShape, type Shape } from '@design/gameArt';
import type { Variant } from '@/engine';
import { gradient, radius } from '@/theme';

/** The system font (SF Pro on iPhone); SVG text falls back to a serif without it. */
const FONT = process.env.EXPO_OS === 'web' ? 'system-ui, -apple-system, sans-serif' : 'System';

// A game's picture, the same shapes the web draws (src/design/gameArt.ts), on the game's card gradient.

function Card({ x, y, r = 0, rank = '', suit = '♠', s = 1, back, glow, faded }: CardShape) {
  const colour = SUIT_COLOUR[suit] ?? SUIT_COLOUR['♠'];
  return (
    <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={faded ? 0.45 : 1}>
      <Rect x={-19} y={-26} width={42} height={60} rx={6} fill="#000" opacity={0.3} />
      {back ? (
        <>
          <Rect x={-21} y={-30} width={42} height={60} rx={6} fill="#27314f" />
          <Rect x={-16} y={-25} width={32} height={50} rx={4} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={2} />
          <Path d="M-10 -14 L10 14 M10 -14 L-10 14" stroke="#fff" strokeOpacity={0.3} strokeWidth={2} />
        </>
      ) : (
        <>
          <Rect x={-21} y={-30} width={42} height={60} rx={6} fill="#fff" />
          <Text fontFamily={FONT} x={-15} y={-13} fontSize={15} fontWeight="800" fill={colour}>
            {rank}
          </Text>
          <Text fontFamily={FONT} x={0} y={17} fontSize={28} textAnchor="middle" fill={colour}>
            {suit}
          </Text>
        </>
      )}
      {glow && <Rect x={-21} y={-30} width={42} height={60} rx={6} fill="none" stroke={GLOW} strokeWidth={3} />}
    </G>
  );
}

function draw(shape: Shape, key: number) {
  switch (shape.kind) {
    case 'mark':
      return (
        <G key={key}>
          <Rect width={200} height={120} fill="#000" opacity={0.18} />
          <Text fontFamily={FONT} x={shape.x} y={shape.y} fontSize={shape.size} textAnchor="middle" fill="#fff" opacity={0.14}>
            {shape.suit}
          </Text>
        </G>
      );
    case 'card':
      return <Card key={key} {...shape} />;
    case 'die':
      return (
        <G key={key} transform={`translate(${shape.x} ${shape.y}) rotate(${shape.r})`}>
          <Rect x={-17} y={-15} width={38} height={38} rx={8} fill="#000" opacity={0.3} />
          <Rect x={-19} y={-19} width={38} height={38} rx={8} fill="#fffaf0" />
          {PIPS[shape.pips].map(([px, py], i) => (
            <Circle key={i} cx={px} cy={py} r={3.6} fill="#c0283f" />
          ))}
        </G>
      );
    case 'label':
      return (
        <Text key={key} fontFamily={FONT} x={shape.x} y={shape.y} fontSize={11} fontWeight="800" textAnchor="middle" fill="#fff" letterSpacing={1.5}>
          {shape.text}
        </Text>
      );
    case 'glyph':
      return (
        <Text key={key} fontFamily={FONT} x={shape.x} y={shape.y} fontSize={shape.size} fontWeight={shape.bold ? '800' : undefined} textAnchor="middle" fill={shape.ink}>
          {shape.text}
        </Text>
      );
  }
}

/** The game's picture filling a box (cropped to its shape), on the game's gradient. */
export function GamePicture({ variant, width, height, rounded = radius.md }: { variant: Variant; width: number; height: number; rounded?: number }) {
  const [top, bottom] = gameLook(variant).card;
  return (
    <View
      style={{ width, height, borderRadius: rounded, borderCurve: 'continuous', overflow: 'hidden', ...gradient(`linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`) }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
        {gameScene(variant).map(draw)}
      </Svg>
    </View>
  );
}

/**
 * A game's small square picture, for lists: its own layout of one to three big cards (gameThumb in gameArt.ts) on
 * the game's gradient, made to read at 30 to 52 points. The wide picture is for the big cards and sheets.
 */
export function GameThumb({ variant, size, rounded = size * 0.24 }: { variant: Variant; size: number; rounded?: number }) {
  const [top, bottom] = gameLook(variant).card;
  return (
    <View
      style={{ width: size, height: size, borderRadius: rounded, borderCurve: 'continuous', overflow: 'hidden', ...gradient(`linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`) }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {gameThumb(variant).map(draw)}
      </Svg>
    </View>
  );
}
