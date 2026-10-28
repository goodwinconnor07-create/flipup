import type { CSSProperties, ReactNode } from 'react';
import { CIRCLE_HOURS, CROSS_CELLS } from '../game/variants';
import type { Variant } from '../game';

// One picture per game, built from playing cards in the same four-colour deck the table uses: each game shows
// its own layout (the cross, the three rivers, the wild twos...) over a big faded suit. No faces, no scenes.
// Every picture fills the same 200 × 120 box edge to edge. Cards carry the class `deal` so the picker can land
// them one by one; on Home the pictures stand still.

const SUIT: Record<string, string> = { '♠': '#16161d', '♥': '#e5322d', '♦': '#2563eb', '♣': '#16a34a' };
const GOLD = '#ffc933';

/** A playing card, centred on (x, y), tilted by `r` degrees. `back` draws it face down, `glow` gives it a gold edge. */
function Pc({ x, y, r = 0, rank = '', suit = '♠', s = 1, back, glow, faded }: { x: number; y: number; r?: number; rank?: string; suit?: string; s?: number; back?: boolean; glow?: boolean; faded?: boolean }) {
  const colour = SUIT[suit] ?? '#16161d';
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
          <text x={-15} y={-13} fontSize={15} fontWeight={800} fill={colour} fontFamily="system-ui, sans-serif">
            {rank}
          </text>
          <text x={0} y={17} fontSize={28} textAnchor="middle" fill={colour} fontFamily="system-ui, sans-serif">
            {suit}
          </text>
        </>
      )}
      {glow && <rect x={-21} y={-30} width={42} height={60} rx={6} fill="none" stroke={GOLD} strokeWidth={3} />}
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

/** The faded suit behind a picture, cropped by the edge of the box. */
function Mark({ suit, x = 160, y = 96, size = 150 }: { suit: string; x?: number; y?: number; size?: number }) {
  return (
    <>
      <rect width={200} height={120} fill="#000" opacity={0.18} />
      <text x={x} y={y} fontSize={size} textAnchor="middle" fill="#fff" opacity={0.14} fontFamily="system-ui, sans-serif">
        {suit}
      </text>
    </>
  );
}

function Die({ x, y, r, pips }: { x: number; y: number; r: number; pips: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const at: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-7, -7], [7, 7]],
    3: [[-8, -8], [0, 0], [8, 8]],
    4: [[-7, -7], [7, -7], [-7, 7], [7, 7]],
    5: [[-8, -8], [8, -8], [0, 0], [-8, 8], [8, 8]],
    6: [[-7, -9], [7, -9], [-7, 0], [7, 0], [-7, 9], [7, 9]],
  };
  return (
    <g className="roll" transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x={-19} y={-19} width={38} height={38} rx={8} fill="#000" opacity={0.3} transform="translate(2 4)" />
      <rect x={-19} y={-19} width={38} height={38} rx={8} fill="#fffaf0" />
      {at[pips].map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={3.6} fill="#c0283f" />
      ))}
    </g>
  );
}

const Label = ({ x, y, children, size = 11 }: { x: number; y: number; children: ReactNode; size?: number }) => (
  <text x={x} y={y} fontSize={size} fontWeight={800} textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif" letterSpacing={1.5}>
    {children}
  </text>
);

/** A row of cards across the middle, for the games with a long board. */
function Row({ cards, y, s, gap, glowFrom }: { cards: [string, string][]; y: number; s: number; gap: number; glowFrom?: number }) {
  const start = 100 - ((cards.length - 1) * gap) / 2;
  return (
    <>
      {cards.map(([rank, suit], i) => (
        <Deal key={i} i={i}>
          <Pc x={start + i * gap} y={y} rank={rank} suit={suit} s={s} glow={glowFrom !== undefined && i >= glowFrom} />
        </Deal>
      ))}
    </>
  );
}

const SCENES: Record<Variant, () => ReactNode> = {
  holdem: () => (
    <>
      <Mark suit="♠" />
      <Deal i={0}><Pc x={80} y={60} r={-12} rank="A" suit="♠" s={1.35} /></Deal>
      <Deal i={1}><Pc x={122} y={58} r={10} rank="K" suit="♥" s={1.35} /></Deal>
    </>
  ),
  pineapple: () => (
    <>
      <Mark suit="♦" x={40} />
      <Deal i={0}><Pc x={64} y={58} r={-14} rank="Q" suit="♦" s={1.15} /></Deal>
      <Deal i={1}><Pc x={102} y={54} r={-2} rank="J" suit="♣" s={1.15} /></Deal>
      <Deal i={2}><Pc x={146} y={72} r={24} rank="3" suit="♠" s={1.05} faded /></Deal>
      <Label x={146} y={104}>TOSS ONE</Label>
    </>
  ),
  deuces: () => (
    <>
      <Mark suit="♣" />
      <Deal i={0}><Pc x={54} y={62} r={-10} rank="2" suit="♠" s={1.1} glow /></Deal>
      <Deal i={1}><Pc x={100} y={56} r={0} rank="2" suit="♥" s={1.1} glow /></Deal>
      <Deal i={2}><Pc x={146} y={62} r={10} rank="2" suit="♦" s={1.1} glow /></Deal>
      <Label x={100} y={108}>WILD</Label>
    </>
  ),
  ghost: () => (
    <>
      <Mark suit="♠" x={40} />
      <Deal i={0}><Pc x={58} y={62} r={-8} rank="A" suit="♠" s={1.15} /></Deal>
      <Deal i={1}><Pc x={96} y={58} r={4} rank="A" suit="♥" s={1.15} /></Deal>
      <Deal i={2}><Pc x={150} y={60} r={8} rank="K" suit="♦" s={1.15} faded /></Deal>
      <Pc x={150} y={60} r={8} s={1.15} back faded />
      <Label x={150} y={106}>THE GHOST</Label>
    </>
  ),
  pittsburgh: () => (
    <>
      <Mark suit="♥" />
      <Row cards={[['9', '♣'], ['5', '♦'], ['K', '♠'], ['Q', '♥'], ['7', '♦']]} y={52} s={0.86} gap={36} glowFrom={2} />
      <Label x={100} y={104}>THREE RIVERS</Label>
    </>
  ),
  dice: () => (
    <>
      <Mark suit="♦" />
      <Row cards={[['T', '♠'], ['8', '♦'], ['4', '♣'], ['J', '♥']]} y={48} s={0.8} gap={32} />
      <Die x={158} y={84} r={14} pips={5} />
      <Label x={64} y={104}>DIE ON THE RIVER</Label>
    </>
  ),
  redriver: () => (
    <>
      <Mark suit="♥" />
      <Row cards={[['9', '♠'], ['4', '♣'], ['K', '♥'], ['6', '♦'], ['Q', '♥'], ['2', '♦']]} y={52} s={0.74} gap={29} glowFrom={2} />
      <Label x={100} y={104}>RED KEEPS COMING</Label>
    </>
  ),
  imposter: () => (
    <>
      <Mark suit="♣" x={40} />
      <Deal i={0}><Pc x={70} y={60} r={-8} rank="K" suit="♠" s={1.15} /></Deal>
      <Deal i={1}><Pc x={120} y={58} r={8} s={1.15} back /></Deal>
      <text x={120} y={70} fontSize={34} fontWeight={800} textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif">?</text>
      <Label x={100} y={106}>WHO'S BLUFFING</Label>
    </>
  ),
  crucifix: () => (
    <>
      <Mark suit="♠" x={44} />
      {CROSS_CELLS.map(([row, col], i) => (
        <Deal key={i} i={i}>
          <Pc x={100 + (col - 3) * 21} y={60 + (row - 3) * 22} rank={['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6'][i]} suit={['♠', '♥', '♦', '♣'][i % 4]} s={0.34} glow={i === 0} />
        </Deal>
      ))}
    </>
  ),
  circle: () => (
    <>
      <Mark suit="♥" x={44} />
      {CIRCLE_HOURS.map((h, i) => {
        const a = (h / 12) * 2 * Math.PI;
        return (
          <Deal key={i} i={i}>
            <Pc x={100 + Math.sin(a) * 52} y={60 - Math.cos(a) * 34} rank={['A', 'K', 'Q', 'J', 'T', '9'][i]} suit={['♠', '♥', '♦', '♣', '♠', '♥'][i]} s={0.5} glow={i < 2} />
          </Deal>
        );
      })}
    </>
  ),
};

/** The picture for a game. It fills whatever box it's given (cropping the edges if the box is a different shape). */
export function GameIllustration({ variant, className }: { variant: Variant; className?: string }) {
  const scene = SCENES[variant] ?? SCENES.holdem;
  return (
    <svg className={className} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      {scene()}
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
