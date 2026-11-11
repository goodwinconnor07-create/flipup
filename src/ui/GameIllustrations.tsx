import type { CSSProperties, ReactNode } from 'react';
import { gameLook, gameScene, gameThumb, prims, type Prim } from '../design/gameArt';
import type { Variant } from '../game';

// One picture per game: a flat colour field and one outlined subject, drawn from the shapes in
// src/design/gameArt.ts, which the iPhone app draws too. `prims()` turns them into paths, text and groups.
// Cards carry the class `deal` so the picker can land them one by one; on Home the pictures stand still.

const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif';

function draw(p: Prim, key: number): ReactNode {
  if (p.tag === 'g') {
    const g = (
      <g key={key} className={p.roll ? 'roll' : undefined} transform={p.t} opacity={p.opacity}>
        {p.kids.map(draw)}
      </g>
    );
    return p.deal === undefined ? (
      g
    ) : (
      <g key={key} className="deal" style={{ ['--i' as string]: p.deal } as CSSProperties}>
        {g}
      </g>
    );
  }
  if (p.tag === 'text') {
    return (
      <text key={key} x={p.x} y={p.y} fontSize={p.size} fontWeight={p.weight} textAnchor={p.anchor} fill={p.fill} opacity={p.opacity} letterSpacing={p.spacing} fontFamily={FONT}>
        {p.text}
      </text>
    );
  }
  return <path key={key} d={p.d} fill={p.fill} stroke={p.stroke} strokeWidth={p.sw} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={p.dash} opacity={p.opacity} transform={p.t} />;
}

/** The picture for a game. It fills whatever box it's given (cropping the edges if the box is a different shape). */
export function GameIllustration({ variant, className }: { variant: Variant; className?: string }) {
  return (
    // The backdrop runs past the box into the card's own padding (the card clips it), so no edge shows.
    <svg className={className} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" style={{ overflow: 'visible' }} aria-hidden focusable="false">
      {prims(gameScene(variant)).map(draw)}
    </svg>
  );
}

/**
 * A game's small square picture, for lists (a party's playlist, the game row in setup): the game's subject
 * (gameThumb in gameArt.ts) on its flat field, made to read at this size.
 */
export function GameThumb({ variant, size = 40 }: { variant: Variant; size?: number }) {
  const [field] = gameLook(variant).card;
  return (
    <span className="game-thumb" style={{ width: size, height: size, background: field }} aria-hidden>
      <svg viewBox="0 0 100 100" aria-hidden focusable="false">
        {prims(gameThumb(variant)).map(draw)}
      </svg>
    </span>
  );
}
