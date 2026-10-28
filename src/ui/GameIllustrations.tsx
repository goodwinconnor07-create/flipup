import type { ReactNode } from 'react';
import type { Variant } from '../game';

// One drawn scene per game, for its card on Home, its start sheet and the picker. Every scene fills the same
// 200 × 120 box edge to edge (a place, a light, a few props and the cards), so the cards all have the same shape.

const INK = '#16161d';
const RED = '#e5322d';

/** A playing card, centred on (x, y), tilted by `r` degrees. */
function Pc({ x, y, r = 0, rank, suit, red, s = 1 }: { x: number; y: number; r?: number; rank: string; suit: string; red?: boolean; s?: number }) {
  const colour = red ? RED : INK;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <rect x={-21} y={-30} width={42} height={60} rx={6} fill="#000" opacity={0.28} transform="translate(2 4)" />
      <rect x={-21} y={-30} width={42} height={60} rx={6} fill="#fff" />
      <rect x={-21} y={-30} width={42} height={60} rx={6} fill="none" stroke="#000" strokeOpacity={0.1} />
      <text x={-15} y={-13} fontSize={14} fontWeight={800} fill={colour} fontFamily="system-ui, sans-serif">
        {rank}
      </text>
      <text x={0} y={15} fontSize={26} textAnchor="middle" fill={colour} fontFamily="system-ui, sans-serif">
        {suit}
      </text>
      <text x={15} y={26} fontSize={9} textAnchor="middle" fill={colour} fontFamily="system-ui, sans-serif" transform="rotate(180 15 23)">
        {suit}
      </text>
    </g>
  );
}

/** A stack of chips: `n` chips of colour `c`. */
function Stack({ x, y, c, n = 3, s = 1 }: { x: number; y: number; c: string; n?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={4} rx={13} ry={5} fill="#000" opacity={0.3} />
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(0 ${-i * 4})`}>
          <ellipse cx={0} cy={0} rx={12} ry={4.6} fill={c} />
          <ellipse cx={0} cy={-0.8} rx={12} ry={4.6} fill={c} stroke="#fff" strokeWidth={1.6} strokeDasharray="3.4 3" />
        </g>
      ))}
    </g>
  );
}

function Spark({ x, y, s = 1, c = '#fff' }: { x: number; y: number; s?: number; c?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6Z" fill={c} />;
}

function Die({ x, y, r, pips, s = 1 }: { x: number; y: number; r: number; pips: number; s?: number }) {
  const at: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-7, -7], [7, 7]],
    3: [[-8, -8], [0, 0], [8, 8]],
    4: [[-7, -7], [7, -7], [-7, 7], [7, 7]],
    5: [[-8, -8], [8, -8], [0, 0], [-8, 8], [8, 8]],
    6: [[-7, -9], [7, -9], [-7, 0], [7, 0], [-7, 9], [7, 9]],
  };
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <rect x={-19} y={-19} width={38} height={38} rx={8} fill="#000" opacity={0.3} transform="translate(2 4)" />
      <rect x={-19} y={-19} width={38} height={38} rx={8} fill="#fffaf0" />
      <rect x={-19} y={-19} width={38} height={6} rx={3} fill="#fff" opacity={0.8} />
      {at[pips].map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={3.6} fill="#c0283f" />
      ))}
    </g>
  );
}

/** A sky (or wall) from top colour to bottom colour, with an id unique to the scene. */
function Back({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width={200} height={120} fill={`url(#bg-${id})`} />
    </>
  );
}

const STARS: [number, number, number][] = [
  [14, 12, 0.7], [36, 26, 0.5], [58, 8, 0.6], [92, 18, 0.5], [120, 6, 0.7], [150, 22, 0.5], [176, 10, 0.6], [188, 34, 0.4], [70, 32, 0.4], [24, 40, 0.4],
];

const SCENES: Record<Variant, () => ReactNode> = {
  // A card room: the felt, the rail, five cards on the board and your two cards in front.
  holdem: () => (
    <>
      <defs>
        <radialGradient id="felt-holdem" cx="0.5" cy="0.55" r="0.75">
          <stop offset="0" stopColor="#2fa56c" />
          <stop offset="1" stopColor="#0b3d26" />
        </radialGradient>
      </defs>
      <rect width={200} height={120} fill="#071a12" />
      <ellipse cx={100} cy={120} rx={150} ry={108} fill="#5b3415" />
      <ellipse cx={100} cy={122} rx={140} ry={100} fill="url(#felt-holdem)" />
      <ellipse cx={100} cy={122} rx={112} ry={74} fill="none" stroke="#fff" strokeOpacity={0.14} strokeWidth={1.5} strokeDasharray="4 4" />
      <ellipse cx={100} cy={-30} rx={90} ry={60} fill="#fff6c9" opacity={0.08} />
      {[44, 72, 100, 128, 156].map((x, i) => (
        <Pc key={x} x={x} y={52} rank={['A', '7', 'K', 'Q', '2'][i]} suit={['♣', '♦', '♠', '♥', '♠'][i]} red={i === 1 || i === 3} s={0.52} />
      ))}
      <Pc x={88} y={98} r={-12} rank="A" suit="♠" s={0.8} />
      <Pc x={112} y={98} r={12} rank="K" suit="♥" red s={0.8} />
      <Stack x={30} y={98} c="#e5322d" n={4} />
      <Stack x={50} y={104} c="#2563eb" n={3} />
      <Stack x={166} y={100} c="#16a34a" n={5} />
      <g transform="translate(150 94)">
        <circle r={7} fill="#fff" />
        <circle r={7} fill="none" stroke="#000" strokeOpacity={0.2} />
        <text y={3.5} textAnchor="middle" fontSize={9} fontWeight={800} fill={INK} fontFamily="system-ui, sans-serif">
          D
        </text>
      </g>
    </>
  ),

  // A beach at noon: sun, sea, a palm, and a pineapple in shades on a towel with its three cards.
  pineapple: () => (
    <>
      <Back id="pine" top="#ffd25c" bottom="#ff9a3d" />
      <circle cx={160} cy={26} r={16} fill="#fff4b8" />
      <g stroke="#fff4b8" strokeWidth={2.5} strokeLinecap="round" opacity={0.8}>
        <path d="M160 2 V6 M160 46 V50 M136 26 H140 M180 26 H184 M143 9 L146 12 M174 40 L177 43 M177 9 L174 12 M146 40 L143 43" />
      </g>
      <path d="M0 64 H200 V80 H0Z" fill="#2bb3d6" />
      <path d="M0 64 Q20 60 40 64 T80 64 T120 64 T160 64 T200 64" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={2} />
      <path d="M0 76 Q50 70 100 76 T200 74 V120 H0Z" fill="#ffe2a1" />
      <path d="M26 112 Q20 80 34 56" stroke="#8b5a2b" strokeWidth={6} fill="none" strokeLinecap="round" />
      <g fill="#2a9d4b">
        <path d="M34 56 Q16 46 4 56 Q20 50 34 58Z" />
        <path d="M34 56 Q48 40 64 48 Q48 46 35 58Z" />
        <path d="M34 56 Q30 36 40 26 Q36 42 36 57Z" />
        <path d="M34 56 Q54 54 60 66 Q48 58 35 58Z" />
      </g>
      <path d="M58 104 L150 98 L156 112 L60 118Z" fill="#ff4f7a" />
      <path d="M70 104 L76 117 M90 102 L96 116 M110 101 L116 115 M130 100 L136 114" stroke="#fff" strokeWidth={3} opacity={0.8} />
      <g transform="translate(96 74) scale(0.62)">
        <path d="M-12 -34 L-26 -62 L-12 -50 L-4 -74 L4 -50 L18 -72 L18 -34Z" fill="#2fbf5e" />
        <path d="M-2 -34 L-6 -58 L4 -40 L12 -64 L12 -34Z" fill="#1e9a45" />
        <ellipse cx={0} cy={6} rx={34} ry={44} fill="#ffc928" />
        <g stroke="#d9890a" strokeWidth={2.6} strokeLinecap="round" opacity={0.85}>
          <path d="M-26 -22 L26 30M-34 -4 L16 46M-14 -36 L34 12M-34 18 L-4 48" />
          <path d="M26 -22 L-26 30M34 -4 L-16 46M14 -36 L-34 12M34 18 L4 48" />
        </g>
        <rect x={-26} y={-8} width={22} height={14} rx={6} fill={INK} />
        <rect x={4} y={-8} width={22} height={14} rx={6} fill={INK} />
        <rect x={-5} y={-5} width={10} height={3} fill={INK} />
        <path d="M-10 20 Q0 30 10 20" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      </g>
      <Pc x={140} y={88} r={-16} rank="A" suit="♦" red s={0.5} />
      <Pc x={156} y={86} r={0} rank="J" suit="♣" s={0.5} />
      <Pc x={172} y={90} r={16} rank="9" suit="♥" red s={0.5} />
    </>
  ),

  // A party: a mirror ball, light beams, confetti and two wild deuces under a big star.
  deuces: () => (
    <>
      <Back id="deuce" top="#7a2cff" bottom="#ff4fa0" />
      <g opacity={0.22} fill="#fff">
        <path d="M100 18 L20 120 H50Z" />
        <path d="M100 18 L150 120 H185Z" />
        <path d="M100 18 L95 120 H118Z" />
      </g>
      <line x1={100} y1={0} x2={100} y2={8} stroke="#ddd" strokeWidth={1.5} />
      <circle cx={100} cy={18} r={11} fill="#d9d9e8" />
      <g stroke="#9a9ab5" strokeWidth={0.8}>
        <path d="M89 18 H111 M91 12 H109 M91 24 H109 M100 7 V29 M94 8 Q90 18 94 28 M106 8 Q110 18 106 28" fill="none" />
      </g>
      <circle cx={96} cy={14} r={2.5} fill="#fff" />
      {[
        [20, 30, '#ffe14d', 20], [40, 70, '#7df9ff', -30], [64, 40, '#fff', 45], [140, 36, '#7df9ff', 10], [168, 64, '#ffe14d', -20], [184, 28, '#fff', 60], [30, 100, '#ffe14d', 30], [176, 104, '#7df9ff', -40], [150, 100, '#fff', 15], [56, 104, '#ff9de0', -10],
      ].map(([x, y, c, r], i) => (
        <rect key={i} x={x as number} y={y as number} width={7} height={3.4} rx={1.5} fill={c as string} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <path transform="translate(100 46) scale(1.5)" d="M0 -14 L4 -4 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -4Z" fill="#ffe14d" stroke="#fff" strokeWidth={1.2} />
      <Pc x={80} y={84} r={-14} rank="2" suit="♣" s={0.82} />
      <Pc x={120} y={84} r={14} rank="2" suit="♥" red s={0.82} />
      <g transform="translate(26 54)">
        <ellipse rx={9} ry={11} fill="#ffe14d" />
        <path d="M0 11 Q3 22 -2 34" stroke="#fff" strokeWidth={1} fill="none" />
      </g>
      <g transform="translate(176 46)">
        <ellipse rx={9} ry={11} fill="#7df9ff" />
        <path d="M0 11 Q-3 22 2 34" stroke="#fff" strokeWidth={1} fill="none" />
      </g>
      <Spark x={150} y={54} s={1.1} c="#fff" />
      <Spark x={48} y={46} s={0.9} c="#fff" />
    </>
  ),

  // Night in the graveyard: a moon, stars, bats, tombstones in the fog and a ghost holding a card.
  ghost: () => (
    <>
      <Back id="ghost" top="#0d1730" bottom="#24345a" />
      {STARS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.8} />
      ))}
      <circle cx={160} cy={28} r={16} fill="#f3f0d8" />
      <circle cx={154} cy={24} r={3} fill="#d8d3b4" />
      <circle cx={165} cy={33} r={2.2} fill="#d8d3b4" />
      <g fill="#0a0f1e">
        <path d="M40 22 q4 -4 8 0 q4 -4 8 0 q-4 1 -8 4 q-4 -3 -8 -4z" />
        <path d="M120 14 q3 -3 6 0 q3 -3 6 0 q-3 1 -6 3 q-3 -2 -6 -3z" />
      </g>
      <path d="M0 96 Q50 88 100 96 T200 94 V120 H0Z" fill="#141c33" />
      <g fill="#3a4766">
        <path d="M14 104 V86 Q14 76 24 76 Q34 76 34 86 V104Z" />
        <path d="M164 104 V82 Q164 72 175 72 Q186 72 186 82 V104Z" />
        <rect x={146} y={88} width={6} height={18} />
        <rect x={141} y={92} width={16} height={5} />
      </g>
      <text x={24} y={93} fontSize={8} textAnchor="middle" fill="#25304a" fontWeight={800} fontFamily="system-ui, sans-serif">
        RIP
      </text>
      <rect x={0} y={98} width={200} height={10} fill="#c9d6ff" opacity={0.12} />
      <g transform="translate(96 62)">
        <path d="M-26 40 L-26 -6 Q-26 -38 0 -38 Q26 -38 26 -6 L26 40 L17 31 L8 40 L0 31 L-8 40 L-17 31Z" fill="#f4f7ff" opacity={0.96} />
        <ellipse cx={-9} cy={-10} rx={5.4} ry={7.6} fill={INK} />
        <ellipse cx={9} cy={-10} rx={5.4} ry={7.6} fill={INK} />
        <ellipse cx={0} cy={10} rx={5} ry={6.6} fill={INK} />
        <circle cx={-10.5} cy={-13} r={1.8} fill="#fff" />
        <circle cx={7.5} cy={-13} r={1.8} fill="#fff" />
        <path d="M24 4 Q34 6 36 14" stroke="#f4f7ff" strokeWidth={7} strokeLinecap="round" fill="none" />
      </g>
      <Pc x={136} y={78} r={16} rank="A" suit="♠" s={0.52} />
    </>
  ),

  // Sunset over the city: lit windows, the yellow bridge and three rivers meeting under it.
  pittsburgh: () => (
    <>
      <Back id="pitt" top="#ff9a5a" bottom="#5a3a8a" />
      <circle cx={100} cy={56} r={22} fill="#ffd36b" opacity={0.95} />
      <g fill="#24203a">
        <rect x={8} y={42} width={16} height={36} />
        <rect x={26} y={30} width={12} height={48} />
        <rect x={40} y={48} width={18} height={30} />
        <rect x={142} y={36} width={14} height={42} />
        <rect x={158} y={24} width={12} height={54} />
        <path d="M164 24 L164 14" stroke="#24203a" strokeWidth={2} />
        <rect x={172} y={46} width={22} height={32} />
      </g>
      <g fill="#ffd36b" opacity={0.9}>
        {[
          [12, 48], [18, 56], [12, 64], [29, 36], [33, 46], [29, 56], [44, 54], [52, 62], [146, 42], [150, 54], [161, 30], [165, 42], [161, 54], [176, 52], [186, 60],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width={3} height={4} />
        ))}
      </g>
      <path d="M0 78 H200 V120 H0Z" fill="#3a2f6b" />
      <path d="M0 84 Q40 80 70 88 Q100 96 100 120 H0Z" fill="#4a90d9" />
      <path d="M200 84 Q160 80 130 88 Q100 96 100 120 H200Z" fill="#3778c2" />
      <path d="M70 120 Q90 98 100 96 Q110 98 130 120Z" fill="#5fb0f0" />
      <g stroke="#fff" strokeOpacity={0.4} strokeWidth={1.5} fill="none">
        <path d="M10 96 Q30 92 50 98 M150 98 Q170 92 190 96 M86 112 Q100 104 114 112" />
      </g>
      <g stroke="#ffbf2e" strokeLinecap="round" fill="none">
        <path d="M18 80 H182" strokeWidth={4} />
        <path d="M62 80 V36 M138 80 V36" strokeWidth={4.5} />
        <path d="M18 80 Q40 44 62 36 Q100 76 138 36 Q160 44 182 80" strokeWidth={2.4} />
        <path d="M74 80 V52 M86 80 V62 M100 80 V66 M114 80 V62 M126 80 V52 M30 80 V64 M44 80 V52 M156 80 V52 M170 80 V64" strokeWidth={1.2} />
      </g>
      <Pc x={70} y={104} r={-10} rank="10" suit="♦" red s={0.36} />
      <Pc x={100} y={108} rank="J" suit="♠" s={0.36} />
      <Pc x={130} y={104} r={10} rank="Q" suit="♥" red s={0.36} />
    </>
  ),

  // A craps table under the marquee lights: red felt, the pass line, two dice mid-roll and the chips.
  dice: () => (
    <>
      <Back id="dice" top="#4a0a16" bottom="#a8182f" />
      {Array.from({ length: 13 }, (_, i) => (
        <circle key={i} cx={8 + i * 16} cy={6} r={2.6} fill={i % 2 ? '#ffd36b' : '#fff3c4'} />
      ))}
      <rect y={11} width={200} height={3} fill="#2a0408" />
      <path d="M-10 120 Q100 40 210 120" fill="none" stroke="#efe7d4" strokeWidth={2} strokeOpacity={0.8} />
      <path d="M-10 120 Q100 56 210 120" fill="none" stroke="#efe7d4" strokeWidth={1} strokeOpacity={0.5} />
      <text fontSize={9} fontWeight={800} fill="#efe7d4" fillOpacity={0.85} letterSpacing={3} fontFamily="system-ui, sans-serif">
        <textPath href="#pass-arc" startOffset="50%" textAnchor="middle">
          PASS LINE
        </textPath>
      </text>
      <path id="pass-arc" d="M30 120 Q100 64 170 120" fill="none" />
      <g stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round">
        <path d="M30 40 L48 46 M26 52 L46 54 M34 62 L50 60" />
      </g>
      <Die x={78} y={50} r={-18} pips={5} />
      <Die x={122} y={42} r={20} pips={2} />
      <Stack x={40} y={100} c="#efe7d4" n={4} />
      <Stack x={62} y={106} c="#16a34a" n={2} />
      <Stack x={158} y={100} c="#111" n={5} />
      <Stack x={178} y={108} c="#2563eb" n={3} />
      <Spark x={150} y={26} c="#fff3c4" />
      <Spark x={100} y={20} s={0.7} c="#fff3c4" />
    </>
  ),

  // A canyon at dusk with a river of red water carrying the cards downstream.
  redriver: () => (
    <>
      <Back id="red" top="#ff7a59" bottom="#5a0a0a" />
      <circle cx={150} cy={30} r={14} fill="#ffd0b0" />
      <path d="M0 30 L28 22 L40 40 L60 34 L70 70 L0 80Z" fill="#7a1d12" />
      <path d="M200 26 L172 34 L160 28 L140 46 L128 72 L200 84Z" fill="#6b170f" />
      <path d="M0 52 L24 48 L44 60 L62 58 L72 78 L0 90Z" fill="#9a2a18" />
      <path d="M200 50 L176 56 L156 54 L134 76 L200 96Z" fill="#8a2414" />
      <path d="M84 66 Q100 62 116 66 Q140 80 150 120 H50 Q60 80 84 66Z" fill="#d61f1f" />
      <path d="M90 70 Q100 67 110 70 Q126 80 132 120 H68 Q74 82 90 70Z" fill="#ff4848" />
      <g stroke="#ffc2c2" strokeOpacity={0.7} strokeWidth={1.6} fill="none" strokeLinecap="round">
        <path d="M86 84 Q94 82 100 86 M104 96 Q112 94 118 98 M76 106 Q86 102 96 108 M110 112 Q120 110 128 114" />
      </g>
      <Pc x={90} y={96} r={-24} rank="A" suit="♥" red s={0.48} />
      <Pc x={114} y={80} r={18} rank="K" suit="♦" red s={0.4} />
      <Pc x={104} y={110} r={6} rank="Q" suit="♥" red s={0.44} />
      <g fill="#3a0a06">
        <path d="M30 120 L34 96 L38 120Z" />
        <path d="M166 120 L170 100 L174 120Z" />
      </g>
    </>
  ),

  // A brick alley at night: one spotlight, a figure in a hat and coat, a magnifier and question marks.
  imposter: () => (
    <>
      <Back id="imp" top="#1b1e28" bottom="#2f3441" />
      <g stroke="#11131a" strokeWidth={1.4} opacity={0.8}>
        {Array.from({ length: 9 }, (_, r) => (
          <g key={r}>
            <path d={`M0 ${r * 12 + 6} H200`} />
            {Array.from({ length: 9 }, (_, c) => (
              <path key={c} d={`M${c * 24 + (r % 2 ? 12 : 0)} ${r * 12 - 6} V${r * 12 + 6}`} />
            ))}
          </g>
        ))}
      </g>
      <path d="M100 0 L46 120 H154Z" fill="#fff3c4" opacity={0.16} />
      <ellipse cx={100} cy={114} rx={50} ry={7} fill="#fff3c4" opacity={0.22} />
      <g transform="translate(100 74)">
        <path d="M-26 40 L-20 4 Q0 -4 20 4 L26 40Z" fill="#6b5a3a" />
        <path d="M-6 4 L0 30 L6 4Z" fill="#4a3d26" />
        <path d="M-20 4 L-6 4 L-2 22 Z" fill="#7d6a46" />
        <circle cx={0} cy={-10} r={14} fill="#c9b79a" />
        <rect x={-15} y={-12} width={30} height={7} rx={3.5} fill={INK} />
        <circle cx={-6} cy={-8.5} r={1.6} fill="#fff" />
        <circle cx={6} cy={-8.5} r={1.6} fill="#fff" />
        <path d="M-26 -14 Q0 -22 26 -14 L22 -18 Q20 -38 0 -38 Q-20 -38 -22 -18Z" fill={INK} />
        <rect x={-21} y={-21} width={42} height={4} fill="#c0283f" />
        <path d="M-12 6 Q0 16 12 6 L12 2 L-12 2Z" fill="#6b5a3a" />
      </g>
      <g transform="translate(150 86)" stroke="#e9e9ef" strokeLinecap="round">
        <circle r={11} fill="#9fd8ff" fillOpacity={0.25} strokeWidth={4} />
        <path d="M8 8 L20 20" strokeWidth={6} />
      </g>
      <Pc x={50} y={84} r={-14} rank="?" suit="♠" s={0.52} />
      <text x={34} y={36} fontSize={24} fontWeight={800} fill="#fff" fontFamily="system-ui, sans-serif" transform="rotate(-12 34 36)">
        ?
      </text>
      <text x={162} y={38} fontSize={18} fontWeight={800} fill="#ffdd57" fontFamily="system-ui, sans-serif" transform="rotate(14 162 38)">
        ?
      </text>
      <text x={138} y={20} fontSize={12} fontWeight={800} fill="#fff" opacity={0.6} fontFamily="system-ui, sans-serif">
        ?
      </text>
    </>
  ),

  // A quiet night table: stars, two candles and the board laid out in a cross.
  crucifix: () => (
    <>
      <Back id="cross" top="#1a1230" bottom="#4a3a7a" />
      {STARS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#e6dcff" opacity={0.7} />
      ))}
      <ellipse cx={100} cy={124} rx={130} ry={60} fill="#2a1f3d" />
      <ellipse cx={100} cy={124} rx={120} ry={52} fill="#3b2c5c" />
      <circle cx={100} cy={64} r={46} fill="#d6c4ff" opacity={0.14} />
      {[24, 176].map((x) => (
        <g key={x} transform={`translate(${x} 90)`}>
          <ellipse cy={-24} rx={8} ry={12} fill="#ffd36b" opacity={0.3} />
          <path d="M0 -30 Q4 -24 0 -18 Q-4 -24 0 -30Z" fill="#ffd36b" />
          <rect x={-5} y={-18} width={10} height={26} rx={2} fill="#efe7d4" />
          <ellipse cy={8} rx={9} ry={3} fill="#c9b79a" />
        </g>
      ))}
      <Pc x={100} y={26} rank="K" suit="♠" s={0.5} />
      <Pc x={74} y={62} rank="Q" suit="♥" red s={0.5} />
      <Pc x={100} y={62} rank="A" suit="♦" red s={0.5} />
      <Pc x={126} y={62} rank="J" suit="♣" s={0.5} />
      <Pc x={100} y={98} rank="10" suit="♠" s={0.5} />
      <Spark x={150} y={26} c="#e6dcff" />
      <Spark x={52} y={20} s={0.7} c="#e6dcff" />
    </>
  ),

  // A big clock face: hour marks, six cards on the hours, the hands and gears in the corners.
  circle: () => {
    const hours = [0, 60, 120, 180, 240, 300];
    return (
      <>
        <Back id="circ" top="#1d7fb8" bottom="#0a2a45" />
        {[
          [16, 104, 16],
          [186, 18, 12],
        ].map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y})`} opacity={0.35}>
            <circle r={r} fill="none" stroke="#7dd3fc" strokeWidth={4} strokeDasharray="4 3.5" />
            <circle r={r * 0.45} fill="#7dd3fc" />
          </g>
        ))}
        <circle cx={100} cy={60} r={54} fill="#0a2a45" />
        <circle cx={100} cy={60} r={54} fill="none" stroke="#d9ab52" strokeWidth={4} />
        <circle cx={100} cy={60} r={48} fill="#0f3a57" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return <line key={i} x1={100 + Math.sin(a) * 44} y1={60 - Math.cos(a) * 44} x2={100 + Math.sin(a) * 48} y2={60 - Math.cos(a) * 48} stroke="#7dd3fc" strokeWidth={i % 3 ? 1 : 2.4} />;
        })}
        {hours.map((a, i) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return <Pc key={a} x={100 + Math.cos(rad) * 34} y={60 + Math.sin(rad) * 34} r={a} rank={['A', 'K', 'Q', 'J', '10', '9'][i]} suit={['♠', '♥', '♦', '♣', '♠', '♥'][i]} red={i === 1 || i === 2 || i === 5} s={0.34} />;
        })}
        <g stroke="#ffd34d" strokeLinecap="round">
          <path d="M100 60 V36" strokeWidth={3.6} />
          <path d="M100 60 L116 70" strokeWidth={3} />
        </g>
        <circle cx={100} cy={60} r={4} fill="#ffd34d" />
      </>
    );
  },
};

/** The scene for a game. It fills whatever box it's given (cropping the edges if the box is a different shape). */
export function GameIllustration({ variant, className }: { variant: Variant; className?: string }) {
  const scene = SCENES[variant] ?? SCENES.holdem;
  return (
    <svg className={className} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      {scene()}
    </svg>
  );
}

/** A game's scene as a small rounded square, for lists (the game picker, a party's playlist). */
export function GameThumb({ variant, size = 40 }: { variant: Variant; size?: number }) {
  return (
    <span className="game-thumb" style={{ width: size, height: size }} aria-hidden>
      <GameIllustration variant={variant} />
    </span>
  );
}
