import type { CSSProperties, ReactNode } from 'react';
import { GLOW, PIPS, SUIT_COLOUR, gameScene, type CardShape, type Shape } from '../design/gameArt';
import type { Variant } from '../game';

// One picture per game, built from playing cards in the same four-colour deck the table uses. The shapes come
// from src/design/gameArt.ts, which the iPhone app draws too. Every picture fills the same 200 × 120 box edge to
// edge. Cards carry the class `deal` so the picker can land them one by one; on Home the pictures stand still.

const FONT = 'system-ui, sans-serif';

/** A playing card, centred on (x, y), tilted by `r` degrees. `back` draws it face down, `glow` gives it a gold edge. */
function Pc({ x, y, r = 0, rank = '', suit = '♠', s = 1, back, glow, faded }: CardShape) {
  const colour = SUIT_COLOUR[suit] ?? SUIT_COLOUR['♠'];
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={faded ? 0.45 : 1}>
      <rect x={-21} y={-30} width={42} height={60} rx={6} fill="#000" opacity={0.3} transform="translate(2 4)" />
      {back ? (
        <>
          <rect x={-21} y={-30} width={42} height={60} rx={6} fill="#27314f" />
          <rect x={-16} y={-25} width={32} height={50} rx={4} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={2} />
          <path d="M-10 -14 L10 14 M10 -14 L-10 14" stroke="#fff" strokeOpacity={0.3} strokeWidth={2} />
        </>
      ) : (
        <>
          <rect x={-21} y={-30} width={42} height={60} rx={6} fill="#fff" />
          <text x={-15} y={-13} fontSize={15} fontWeight={800} fill={colour} fontFamily={FONT}>
            {rank}
          </text>
          <text x={0} y={17} fontSize={28} textAnchor="middle" fill={colour} fontFamily={FONT}>
            {suit}
          </text>
        </>
      )}
      {glow && <rect x={-21} y={-30} width={42} height={60} rx={6} fill="none" stroke={GLOW} strokeWidth={3} />}
    </g>
  );
}

function Deal({ i, children }: { i: number; children: ReactNode }) {
  return (
    <g className="deal" style={{ ['--i' as string]: i } as CSSProperties}>
      {children}
    </g>
  );
}

function draw(shape: Shape, key: number): ReactNode {
  switch (shape.kind) {
    case 'mark':
      return (
        <g key={key}>
          <rect width={200} height={120} fill="#000" opacity={0.18} />
          <text x={shape.x} y={shape.y} fontSize={shape.size} textAnchor="middle" fill="#fff" opacity={0.14} fontFamily={FONT}>
            {shape.suit}
          </text>
        </g>
      );
    case 'card':
      return shape.deal === undefined ? (
        <Pc key={key} {...shape} />
      ) : (
        <Deal key={key} i={shape.deal}>
          <Pc {...shape} />
        </Deal>
      );
    case 'die':
      return (
        <g key={key} className="roll" transform={`translate(${shape.x} ${shape.y}) rotate(${shape.r})`}>
          <rect x={-19} y={-19} width={38} height={38} rx={8} fill="#000" opacity={0.3} transform="translate(2 4)" />
          <rect x={-19} y={-19} width={38} height={38} rx={8} fill="#fffaf0" />
          {PIPS[shape.pips].map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={3.6} fill="#c0283f" />
          ))}
        </g>
      );
    case 'label':
      return (
        <text key={key} x={shape.x} y={shape.y} fontSize={11} fontWeight={800} textAnchor="middle" fill="#fff" fontFamily={FONT} letterSpacing={1.5}>
          {shape.text}
        </text>
      );
    case 'glyph':
      return (
        <text key={key} x={shape.x} y={shape.y} fontSize={shape.size} fontWeight={shape.bold ? 800 : undefined} textAnchor="middle" fill={shape.ink} fontFamily={FONT}>
          {shape.text}
        </text>
      );
  }
}

/** The picture for a game. It fills whatever box it's given (cropping the edges if the box is a different shape). */
export function GameIllustration({ variant, className }: { variant: Variant; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      {gameScene(variant).map(draw)}
    </svg>
  );
}

/** A game's picture as a small rounded square, for lists (a party's playlist, the game row in setup). */
export function GameThumb({ variant, size = 40 }: { variant: Variant; size?: number }) {
  return (
    <span className="game-thumb" style={{ width: size, height: size }} aria-hidden>
      <GameIllustration variant={variant} />
    </span>
  );
}
