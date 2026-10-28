import type { ReactNode } from 'react';
import type { Variant } from '../game';

// One drawn picture per game, for its card on Home, its start sheet and the picker. Each is its own little
// scene (200 x 150) built from shapes and playing cards, so no two games look alike.

const INK = '#16161d';
const RED = '#e5322d';

/** A playing card, centred on (x, y) and tilted by `r` degrees. */
function Pc({ x, y, r = 0, rank, suit, red, s = 1, back }: { x: number; y: number; r?: number; rank?: string; suit?: string; red?: boolean; s?: number; back?: string }) {
  const colour = red ? RED : INK;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <rect x={-23} y={-33} width={46} height={66} rx={7} fill="#000" opacity={0.22} transform="translate(2 4)" />
      <rect x={-23} y={-33} width={46} height={66} rx={7} fill={back ?? '#fff'} />
      {back ? (
        <rect x={-17} y={-27} width={34} height={54} rx={4} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={2} />
      ) : (
        <>
          <text x={-16} y={-14} fontSize={15} fontWeight={800} fill={colour} fontFamily="system-ui, sans-serif">
            {rank}
          </text>
          <text x={0} y={16} fontSize={30} textAnchor="middle" fill={colour} fontFamily="system-ui, sans-serif">
            {suit}
          </text>
        </>
      )}
    </g>
  );
}

function Chip({ x, y, c, s = 1 }: { x: number; y: number; c: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={5} rx={17} ry={7} fill="#000" opacity={0.28} />
      <ellipse cx={0} cy={0} rx={17} ry={7} fill={c} />
      <ellipse cx={0} cy={-1} rx={17} ry={7} fill={c} stroke="#fff" strokeWidth={2} strokeDasharray="5 4" />
    </g>
  );
}

function Spark({ x, y, s = 1, c = '#fff' }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4Z" fill={c} />;
}

function Die({ x, y, r, pips }: { x: number; y: number; r: number; pips: number }) {
  const at: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-9, -9], [9, 9]],
    3: [[-10, -10], [0, 0], [10, 10]],
    4: [[-9, -9], [9, -9], [-9, 9], [9, 9]],
    5: [[-10, -10], [10, -10], [0, 0], [-10, 10], [10, 10]],
    6: [[-9, -11], [9, -11], [-9, 0], [9, 0], [-9, 11], [9, 11]],
  };
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x={-26} y={-26} width={52} height={52} rx={11} fill="#000" opacity={0.25} transform="translate(2 5)" />
      <rect x={-26} y={-26} width={52} height={52} rx={11} fill="#fff" />
      {at[pips].map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={4.6} fill="#c0283f" />
      ))}
    </g>
  );
}

const SCENES: Record<Variant, () => ReactNode> = {
  holdem: () => (
    <>
      <Pc x={78} y={80} r={-20} rank="K" suit="♥" red />
      <Pc x={104} y={72} r={0} rank="A" suit="♠" />
      <Pc x={130} y={80} r={20} rank="Q" suit="♦" red />
      <Chip x={52} y={128} c="#e5322d" />
      <Chip x={52} y={121} c="#2563eb" />
      <Chip x={160} y={130} c="#16a34a" s={0.9} />
      <Spark x={150} y={30} s={1.1} c="#fde68a" />
    </>
  ),
  pineapple: () => (
    <>
      <g transform="translate(100 84)">
        <ellipse cx={4} cy={50} rx={36} ry={7} fill="#000" opacity={0.2} />
        <path d="M-12 -34 L-26 -62 L-12 -50 L-4 -74 L4 -50 L18 -72 L18 -34Z" fill="#2fbf5e" />
        <path d="M-2 -34 L-6 -58 L4 -40 L12 -64 L12 -34Z" fill="#1e9a45" />
        <ellipse cx={0} cy={6} rx={36} ry={46} fill="#ffc928" />
        <ellipse cx={0} cy={6} rx={36} ry={46} fill="none" stroke="#d9890a" strokeWidth={2.5} />
        <g stroke="#d9890a" strokeWidth={2.4} strokeLinecap="round" opacity={0.85}>
          <path d="M-26 -22 L26 30M-34 -4 L16 46M-14 -36 L34 12M-34 18 L-4 48M10 -40 L34 -14" />
          <path d="M26 -22 L-26 30M34 -4 L-16 46M14 -36 L-34 12M34 18 L4 48M-10 -40 L-34 -14" />
        </g>
        <g fill="#fff8d6" opacity={0.7}>
          <ellipse cx={-16} cy={-8} rx={5} ry={9} transform="rotate(18 -16 -8)" />
        </g>
        <g transform="translate(0 -2)">
          <rect x={-26} y={-6} width={22} height={14} rx={6} fill={INK} />
          <rect x={4} y={-6} width={22} height={14} rx={6} fill={INK} />
          <rect x={-5} y={-3} width={10} height={3} fill={INK} />
        </g>
        <path d="M-10 22 Q0 32 10 22" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      </g>
      <Pc x={158} y={78} r={16} rank="A" suit="♦" red s={0.8} />
      <Spark x={44} y={40} s={1.2} c="#fff" />
      <Spark x={168} y={34} s={0.8} c="#fde68a" />
    </>
  ),
  deuces: () => (
    <>
      <Pc x={82} y={78} r={-14} rank="2" suit="♣" />
      <Pc x={122} y={78} r={14} rank="2" suit="♥" red />
      <path transform="translate(102 34) scale(2.2)" d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4Z" fill="#ffe14d" />
      <Spark x={48} y={44} s={1.4} c="#fff" />
      <Spark x={158} y={52} s={1} c="#ffd0ea" />
      <Spark x={162} y={118} s={1.3} c="#fff" />
      <circle cx={42} cy={112} r={5} fill="#7df9ff" />
      <circle cx={176} cy={84} r={4} fill="#ffe14d" />
      <rect x={30} y={78} width={10} height={4} rx={2} fill="#ffe14d" transform="rotate(30 35 80)" />
    </>
  ),
  ghost: () => (
    <>
      <Pc x={150} y={92} r={16} rank="A" suit="♠" s={0.8} />
      <g transform="translate(94 78)">
        <path d="M-34 52 L-34 -8 Q-34 -50 0 -50 Q34 -50 34 -8 L34 52 L22 40 L11 52 L0 40 L-11 52 L-22 40Z" fill="#f4f7ff" />
        <path d="M-34 52 L-34 -8 Q-34 -50 0 -50 Q34 -50 34 -8" fill="none" stroke="#b7c6ff" strokeWidth={3} />
        <ellipse cx={-12} cy={-12} rx={7} ry={10} fill={INK} />
        <ellipse cx={12} cy={-12} rx={7} ry={10} fill={INK} />
        <ellipse cx={0} cy={14} rx={7} ry={9} fill={INK} />
        <circle cx={-14} cy={-16} r={2.4} fill="#fff" />
        <circle cx={10} cy={-16} r={2.4} fill="#fff" />
      </g>
      <Spark x={36} y={46} s={1} c="#bcd1ff" />
      <Spark x={170} y={36} s={0.8} c="#bcd1ff" />
      <circle cx={40} cy={110} r={4} fill="#bcd1ff" opacity={0.6} />
    </>
  ),
  pittsburgh: () => (
    <>
      <circle cx={146} cy={44} r={20} fill="#ffcf57" />
      <g fill="#0b121a" opacity={0.55}>
        <rect x={24} y={86} width={14} height={30} />
        <rect x={40} y={74} width={12} height={42} />
        <rect x={54} y={92} width={16} height={24} />
        <rect x={150} y={80} width={12} height={36} />
        <rect x={164} y={92} width={16} height={24} />
      </g>
      <g stroke="#ffbf2e" strokeWidth={5} strokeLinecap="round" fill="none">
        <path d="M34 108 H172" />
        <path d="M62 108 V50 M142 108 V50" />
        <path d="M34 108 Q48 56 62 50 Q102 96 142 50 Q156 56 172 108" strokeWidth={3} />
      </g>
      <g stroke="#ffbf2e" strokeWidth={1.8} opacity={0.9}>
        <path d="M76 108 V78 M90 108 V90 M104 108 V92 M118 108 V90 M132 108 V80" />
      </g>
      <path d="M20 124 Q36 116 52 124 T84 124 T116 124 T148 124 T180 124 V146 H20Z" fill="#4aa3df" opacity={0.85} />
      <path d="M20 134 Q36 127 52 134 T84 134 T116 134 T148 134 T180 134" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={2} />
    </>
  ),
  dice: () => (
    <>
      <Die x={80} y={84} r={-14} pips={5} />
      <Die x={130} y={72} r={16} pips={3} />
      <Spark x={48} y={38} s={1.1} c="#ffd9a0" />
      <Spark x={166} y={118} s={1} c="#ffd9a0" />
      <Chip x={152} y={124} c="#efe7d4" s={0.9} />
      <circle cx={34} cy={118} r={5} fill="#ffd9a0" />
    </>
  ),
  redriver: () => (
    <>
      <path d="M0 96 Q25 70 50 96 T100 96 T150 96 T200 96 V150 H0Z" fill="#5a0a0a" />
      <path d="M0 110 Q25 86 50 110 T100 110 T150 110 T200 110 V150 H0Z" fill="#a31717" />
      <path d="M0 126 Q25 104 50 126 T100 126 T150 126 T200 126 V150 H0Z" fill="#ef4444" />
      <path d="M0 96 Q25 70 50 96 T100 96 T150 96 T200 96" fill="none" stroke="#ffb4b4" strokeOpacity={0.7} strokeWidth={2.5} />
      <Pc x={100} y={58} r={-8} rank="A" suit="♥" red s={1.15} />
      <Pc x={146} y={66} r={14} rank="K" suit="♦" red s={0.85} />
      <Spark x={46} y={40} s={1} c="#ffd0d0" />
    </>
  ),
  imposter: () => (
    <>
      <circle cx={104} cy={86} r={52} fill="#000" opacity={0.28} />
      <g transform="translate(96 82)">
        <path d="M-34 52 Q-34 14 0 14 Q34 14 34 52Z" fill="#3b4256" />
        <circle cx={0} cy={-2} r={24} fill="#d7dbe6" />
        <path d="M-40 -8 Q0 -22 40 -8 L34 -14 Q30 -44 0 -44 Q-30 -44 -34 -14Z" fill={INK} />
        <rect x={-40} y={-10} width={80} height={8} rx={4} fill={INK} />
        <rect x={-34} y={-18} width={68} height={5} fill="#c0283f" />
        <rect x={-18} y={0} width={36} height={9} rx={4.5} fill={INK} />
        <circle cx={-8} cy={4.5} r={2.3} fill="#fff" />
        <circle cx={8} cy={4.5} r={2.3} fill="#fff" />
      </g>
      <g transform="translate(150 106)" stroke="#fff" strokeLinecap="round">
        <circle cx={0} cy={0} r={15} fill="#9fd8ff" fillOpacity={0.3} strokeWidth={5} />
        <path d="M11 11 L27 27" strokeWidth={7} />
      </g>
      <text x={40} y={48} fontSize={34} fontWeight={800} fill="#fff" fontFamily="system-ui, sans-serif" transform="rotate(-12 40 48)">
        ?
      </text>
      <text x={168} y={48} fontSize={24} fontWeight={800} fill="#ffdd57" fontFamily="system-ui, sans-serif" transform="rotate(14 168 48)">
        ?
      </text>
    </>
  ),
  crucifix: () => (
    <>
      <Pc x={100} y={34} rank="K" suit="♠" s={0.62} />
      <Pc x={72} y={72} rank="Q" suit="♥" red s={0.62} />
      <Pc x={100} y={72} rank="A" suit="♦" red s={0.62} />
      <Pc x={128} y={72} rank="J" suit="♣" s={0.62} />
      <Pc x={100} y={110} rank="10" suit="♠" s={0.62} />
      <Spark x={40} y={40} s={1} c="#e6dcff" />
      <Spark x={166} y={118} s={1} c="#e6dcff" />
      <Spark x={164} y={36} s={0.7} c="#e6dcff" />
    </>
  ),
  circle: () => {
    const hours = [0, 60, 120, 180, 240, 300];
    return (
      <>
        <circle cx={100} cy={76} r={52} fill="#0a2a45" opacity={0.55} />
        <circle cx={100} cy={76} r={52} fill="none" stroke="#7dd3fc" strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
        {hours.map((a, i) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return <Pc key={a} x={100 + Math.cos(rad) * 52} y={76 + Math.sin(rad) * 52} r={a} rank={['A', 'K', 'Q', 'J', '10', '9'][i]} suit={['♠', '♥', '♦', '♣', '♠', '♥'][i]} red={i % 3 === 1 || i === 2} s={0.46} />;
        })}
        <g stroke="#ffd34d" strokeLinecap="round">
          <path d="M100 76 V46" strokeWidth={5} />
          <path d="M100 76 L120 88" strokeWidth={4} />
        </g>
        <circle cx={100} cy={76} r={5} fill="#ffd34d" />
      </>
    );
  },
};

/** The picture for a game, drawn to sit on the right of its gradient. */
export function GameIllustration({ variant, className }: { variant: Variant; className?: string }) {
  const scene = SCENES[variant] ?? SCENES.holdem;
  return (
    <svg className={className} viewBox="0 0 200 150" aria-hidden focusable="false">
      {scene()}
    </svg>
  );
}
