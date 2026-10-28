import type { CSSProperties, ReactNode } from 'react';
import type { Variant } from '../game';

// One drawn scene per game: emoji players holding their cards in a place that suits the game, mid-hand.
// Every scene fills the same 200 × 120 box edge to edge. Parts carry classes the game picker animates
// (`deal` cards land one by one, `bob` players breathe, `twinkle` sparkles), so it shows a hand being played;
// on Home the scenes stand still.

const INK = '#16161d';
const RED = '#e5322d';
const HAND = '#ffcc4d';
const HAND_EDGE = '#e0a020';

/** A playing card, centred on (x, y), tilted by `r` degrees. `back` draws it face down. */
function Pc({ x, y, r = 0, rank = '', suit = '', red, s = 1, back }: { x: number; y: number; r?: number; rank?: string; suit?: string; red?: boolean; s?: number; back?: string }) {
  const colour = red ? RED : INK;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <rect x={-21} y={-30} width={42} height={60} rx={6} fill="#000" opacity={0.28} transform="translate(2 4)" />
      <rect x={-21} y={-30} width={42} height={60} rx={6} fill={back ?? '#fff'} />
      {back ? (
        <>
          <rect x={-16} y={-25} width={32} height={50} rx={4} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
          <path d="M-10 -14 L10 14 M10 -14 L-10 14" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} />
        </>
      ) : (
        <>
          <rect x={-21} y={-30} width={42} height={60} rx={6} fill="none" stroke="#000" strokeOpacity={0.1} />
          <text x={-15} y={-13} fontSize={14} fontWeight={800} fill={colour} fontFamily="system-ui, sans-serif">
            {rank}
          </text>
          <text x={0} y={15} fontSize={26} textAnchor="middle" fill={colour} fontFamily="system-ui, sans-serif">
            {suit}
          </text>
        </>
      )}
    </g>
  );
}

/** Lands with the deal in the picker; `i` is its place in the order. */
function Deal({ i, children }: { i: number; children: ReactNode }) {
  return (
    <g className="deal" style={{ ['--i' as string]: i } as CSSProperties}>
      {children}
    </g>
  );
}

/**
 * An emoji player holding their cards: the face, then a fan of cards in front of the chin with a hand at
 * each side. `cards` are [rank, suit] pairs, or 'back' for cards we can't see.
 */
function Player({ x, y, face, cards, s = 1, hand = HAND, edge = HAND_EDGE, back = '#2f5bff', b = 0 }: { x: number; y: number; face: string; cards: ([string, string] | 'back')[]; s?: number; hand?: string; edge?: string; back?: string; b?: number }) {
  const n = cards.length;
  const spread = n === 3 ? 16 : 13;
  return (
    <g className="bob" style={{ ['--b' as string]: b } as CSSProperties}>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse cx={0} cy={26} rx={20} ry={4} fill="#000" opacity={0.22} />
        <text x={0} y={0} fontSize={42} textAnchor="middle" dominantBaseline="central">
          {face}
        </text>
        {cards.map((c, i) => {
          const off = i - (n - 1) / 2;
          return c === 'back' ? (
            <Pc key={i} x={off * 10} y={20} r={off * spread} back={back} s={0.42} />
          ) : (
            <Pc key={i} x={off * 10} y={20} r={off * spread} rank={c[0]} suit={c[1]} red={c[1] === '♥' || c[1] === '♦'} s={0.42} />
          );
        })}
        <ellipse cx={-((n - 1) / 2) * 10 - 9} cy={24} rx={5.5} ry={5} fill={hand} stroke={edge} strokeWidth={1} />
        <ellipse cx={((n - 1) / 2) * 10 + 9} cy={24} rx={5.5} ry={5} fill={hand} stroke={edge} strokeWidth={1} />
      </g>
    </g>
  );
}

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
  return (
    <g className="twinkle">
      <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6Z" fill={c} />
    </g>
  );
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
    <g className="roll">
      <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
        <rect x={-19} y={-19} width={38} height={38} rx={8} fill="#000" opacity={0.3} transform="translate(2 4)" />
        <rect x={-19} y={-19} width={38} height={38} rx={8} fill="#fffaf0" />
        {at[pips].map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={3.6} fill="#c0283f" />
        ))}
      </g>
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

/** A small emoji, for props that aren't players. */
function Em({ x, y, e, size = 18, cls }: { x: number; y: number; e: string; size?: number; cls?: string }) {
  return (
    <text className={cls} x={x} y={y} fontSize={size} textAnchor="middle" dominantBaseline="central">
      {e}
    </text>
  );
}

const STARS: [number, number, number][] = [
  [14, 12, 0.7], [36, 26, 0.5], [58, 8, 0.6], [92, 18, 0.5], [120, 6, 0.7], [150, 22, 0.5], [176, 10, 0.6], [188, 34, 0.4], [70, 32, 0.4], [24, 40, 0.4],
];

const SCENES: Record<Variant, () => ReactNode> = {
  // A card room: three players round the felt, the board dealt in the middle, chips in front.
  holdem: () => (
    <>
      <defs>
        <radialGradient id="felt-holdem" cx="0.5" cy="0.6" r="0.75">
          <stop offset="0" stopColor="#2fa56c" />
          <stop offset="1" stopColor="#0b3d26" />
        </radialGradient>
      </defs>
      <rect width={200} height={120} fill="#0b1f17" />
      <ellipse cx={100} cy={-20} rx={110} ry={60} fill="#fff6c9" opacity={0.07} />
      <Player x={36} y={30} face="🤠" cards={['back', 'back']} b={0} />
      <Player x={100} y={22} face="🧐" cards={['back', 'back']} b={1} back="#c0283f" />
      <Player x={164} y={30} face="😏" cards={['back', 'back']} b={2} back="#16a34a" />
      <ellipse cx={100} cy={134} rx={150} ry={76} fill="#5b3415" />
      <ellipse cx={100} cy={136} rx={140} ry={68} fill="url(#felt-holdem)" />
      {[52, 76, 100, 124, 148].map((x, i) => (
        <Deal key={x} i={i}>
          <Pc x={x} y={92} rank={['A', '7', 'K', 'Q', 'J'][i]} suit={['♣', '♦', '♠', '♥', '♠'][i]} red={i === 1 || i === 3} s={0.48} />
        </Deal>
      ))}
      <Stack x={22} y={110} c="#e5322d" n={4} s={0.8} />
      <Stack x={178} y={110} c="#2563eb" n={5} s={0.8} />
      <Spark x={150} y={68} c="#fde68a" />
    </>
  ),

  // A beach: a player in shades fans three cards on a towel, a crab plays its hand, a pineapple watches.
  pineapple: () => (
    <>
      <Back id="pine" top="#ffd25c" bottom="#ff9a3d" />
      <circle cx={170} cy={20} r={13} fill="#fff4b8" />
      <path d="M0 52 H200 V68 H0Z" fill="#2bb3d6" />
      <path d="M0 52 Q20 48 40 52 T80 52 T120 52 T160 52 T200 52" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={2} />
      <path d="M0 64 Q50 58 100 64 T200 62 V120 H0Z" fill="#ffe2a1" />
      <path d="M18 104 Q12 72 26 46" stroke="#8b5a2b" strokeWidth={5} fill="none" strokeLinecap="round" />
      <g fill="#2a9d4b">
        <path d="M26 46 Q8 36 -4 46 Q12 40 26 48Z" />
        <path d="M26 46 Q40 30 56 38 Q40 36 27 48Z" />
        <path d="M26 46 Q46 44 52 56 Q40 48 27 48Z" />
      </g>
      <path d="M58 106 L170 100 L176 116 L60 120Z" fill="#ff4f7a" />
      <path d="M72 106 L78 119 M96 104 L102 118 M120 103 L126 117 M144 102 L150 116" stroke="#fff" strokeWidth={3} opacity={0.8} />
      <Player x={86} y={66} face="😎" cards={[['A', '♦'], ['J', '♣'], ['9', '♥']]} s={1.05} b={0} />
      <Player x={146} y={72} face="🦀" cards={['back', 'back', 'back']} s={0.85} hand="#ff6a4d" edge="#c43a1e" b={1} back="#0e8577" />
      <Em x={44} y={96} e="🍍" size={22} cls="bob" />
      <Spark x={120} y={34} c="#fff" />
    </>
  ),

  // A party: a mirror ball, light beams and confetti, two players, one holding both wild deuces.
  deuces: () => (
    <>
      <Back id="deuce" top="#7a2cff" bottom="#ff4fa0" />
      <g opacity={0.2} fill="#fff">
        <path d="M100 14 L20 120 H52Z" />
        <path d="M100 14 L150 120 H186Z" />
      </g>
      <line x1={100} y1={0} x2={100} y2={6} stroke="#ddd" strokeWidth={1.5} />
      <circle cx={100} cy={14} r={9} fill="#d9d9e8" />
      <path d="M91 14 H109 M100 5 V23 M94 6 Q90 14 94 22 M106 6 Q110 14 106 22" fill="none" stroke="#9a9ab5" strokeWidth={0.8} />
      {[
        [20, 24, '#ffe14d', 20], [48, 44, '#7df9ff', -30], [150, 30, '#7df9ff', 10], [176, 56, '#ffe14d', -20], [184, 18, '#fff', 60], [24, 104, '#ffe14d', 30], [176, 104, '#7df9ff', -40], [130, 108, '#fff', 15], [62, 110, '#ff9de0', -10],
      ].map(([x, y, c, r], i) => (
        <rect key={i} className="twinkle" x={x as number} y={y as number} width={7} height={3.4} rx={1.5} fill={c as string} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <Player x={70} y={58} face="🥳" cards={[['2', '♣'], ['2', '♥']]} s={1.2} b={0} />
      <Player x={146} y={64} face="🤩" cards={['back', 'back']} s={0.95} b={1} back="#7a2cff" />
      <Deal i={2}>
        <path transform="translate(70 30) scale(0.9)" d="M0 -14 L4 -4 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -4Z" fill="#ffe14d" stroke="#fff" strokeWidth={1.2} />
      </Deal>
      <Em x={30} y={58} e="🎈" size={20} cls="bob" />
    </>
  ),

  // Night in the graveyard: a ghost holds its cards against a scared player, under the moon.
  ghost: () => (
    <>
      <Back id="ghost" top="#0d1730" bottom="#24345a" />
      {STARS.map(([x, y, r], i) => (
        <circle key={i} className={i % 3 ? undefined : 'twinkle'} cx={x} cy={y} r={r} fill="#fff" opacity={0.8} />
      ))}
      <circle cx={168} cy={22} r={12} fill="#f3f0d8" />
      <circle cx={164} cy={19} r={2.4} fill="#d8d3b4" />
      <path d="M0 92 Q50 84 100 92 T200 90 V120 H0Z" fill="#141c33" />
      <g fill="#3a4766">
        <path d="M8 104 V86 Q8 78 17 78 Q26 78 26 86 V104Z" />
        <path d="M176 104 V84 Q176 76 186 76 Q196 76 196 84 V104Z" />
      </g>
      <rect x={0} y={96} width={200} height={10} fill="#c9d6ff" opacity={0.12} />
      <path d="M60 104 H140 L146 112 H54Z" fill="#3b2a1a" />
      <Player x={72} y={60} face="👻" cards={[['A', '♠'], ['A', '♥']]} s={1.2} hand="#f4f7ff" edge="#b7c6ff" b={0} back="#24345a" />
      <Player x={140} y={66} face="😨" cards={['back', 'back']} s={0.95} b={1} back="#3a4766" />
      <Deal i={1}>
        <Em x={100} y={30} e="🦇" size={14} />
      </Deal>
      <Deal i={3}>
        <Em x={36} y={26} e="🦇" size={11} />
      </Deal>
    </>
  ),

  // Sunset over the city: a worker plays on the riverbank under the yellow bridge, three rivers in the water.
  pittsburgh: () => (
    <>
      <Back id="pitt" top="#ff9a5a" bottom="#5a3a8a" />
      <circle cx={100} cy={40} r={16} fill="#ffd36b" opacity={0.95} />
      <g fill="#24203a">
        <rect x={6} y={30} width={14} height={34} />
        <rect x={22} y={18} width={11} height={46} />
        <rect x={150} y={24} width={13} height={40} />
        <rect x={166} y={14} width={11} height={50} />
        <rect x={180} y={34} width={20} height={30} />
      </g>
      <g fill="#ffd36b" opacity={0.9}>
        {[
          [10, 36], [14, 46], [25, 24], [29, 36], [154, 30], [158, 42], [169, 20], [171, 34], [186, 42],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width={3} height={4} />
        ))}
      </g>
      <path d="M0 62 H200 V120 H0Z" fill="#3a2f6b" />
      <path d="M0 70 Q40 66 70 74 Q100 82 100 120 H0Z" fill="#4a90d9" />
      <path d="M200 70 Q160 66 130 74 Q100 82 100 120 H200Z" fill="#3778c2" />
      <path d="M70 120 Q90 86 100 84 Q110 86 130 120Z" fill="#5fb0f0" />
      <g stroke="#ffbf2e" strokeLinecap="round" fill="none">
        <path d="M14 64 H186" strokeWidth={3.5} />
        <path d="M58 64 V28 M142 64 V28" strokeWidth={4} />
        <path d="M14 64 Q36 34 58 28 Q100 60 142 28 Q164 34 186 64" strokeWidth={2.2} />
        <path d="M72 64 V44 M86 64 V52 M100 64 V55 M114 64 V52 M128 64 V44" strokeWidth={1.1} />
      </g>
      {[66, 100, 134].map((x, i) => (
        <Deal key={x} i={i}>
          <Pc x={x} y={98} r={(i - 1) * 8} rank={['10', 'J', 'Q'][i]} suit={['♦', '♠', '♥'][i]} red={i !== 1} s={0.34} />
        </Deal>
      ))}
      <Player x={30} y={86} face="👷" cards={[['K', '♠'], ['K', '♦']]} s={0.82} b={0} />
      <Player x={172} y={88} face="🧔" cards={['back', 'back']} s={0.8} b={1} back="#ffbf2e" />
    </>
  ),

  // A craps table under the marquee lights: two players watch the dice tumble over the pass line.
  dice: () => (
    <>
      <Back id="dice" top="#4a0a16" bottom="#a8182f" />
      {Array.from({ length: 13 }, (_, i) => (
        <circle key={i} className={i % 2 ? 'twinkle' : undefined} cx={8 + i * 16} cy={6} r={2.6} fill={i % 2 ? '#ffd36b' : '#fff3c4'} />
      ))}
      <rect y={11} width={200} height={3} fill="#2a0408" />
      <path d="M-10 120 Q100 50 210 120" fill="none" stroke="#efe7d4" strokeWidth={2} strokeOpacity={0.8} />
      <Die x={88} y={56} r={-18} pips={5} s={0.85} />
      <Die x={120} y={46} r={20} pips={2} s={0.85} />
      <g stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round">
        <path d="M58 44 L72 48 M56 54 L70 56" />
      </g>
      <Player x={34} y={76} face="😬" cards={[['Q', '♣'], ['Q', '♥']]} s={1} b={0} />
      <Player x={166} y={76} face="🤑" cards={['back', 'back']} s={1} b={1} back="#c0283f" />
      <Stack x={92} y={108} c="#efe7d4" n={4} s={0.8} />
      <Stack x={112} y={110} c="#16a34a" n={2} s={0.8} />
    </>
  ),

  // A canyon at dusk: a player paddles down a red river while red cards float past.
  redriver: () => (
    <>
      <Back id="red" top="#ff7a59" bottom="#5a0a0a" />
      <circle cx={156} cy={24} r={12} fill="#ffd0b0" />
      <path d="M0 26 L28 18 L40 36 L60 30 L70 64 L0 74Z" fill="#7a1d12" />
      <path d="M200 22 L172 30 L160 24 L140 42 L128 66 L200 78Z" fill="#6b170f" />
      <path d="M84 60 Q100 56 116 60 Q150 76 170 120 H30 Q50 76 84 60Z" fill="#d61f1f" />
      <path d="M90 64 Q100 61 110 64 Q136 78 146 120 H54 Q64 78 90 64Z" fill="#ff4848" />
      <g stroke="#ffc2c2" strokeOpacity={0.7} strokeWidth={1.6} fill="none" strokeLinecap="round">
        <path d="M70 92 Q78 90 84 94 M118 86 Q126 84 132 88 M62 110 Q72 106 82 112" />
      </g>
      {[
        [64, 78, -24, 'A', '♥'],
        [136, 72, 18, 'K', '♦'],
        [150, 102, 10, '7', '♥'],
      ].map(([x, y, r, rank, suit], i) => (
        <Deal key={i} i={i}>
          <Pc x={x as number} y={y as number} r={r as number} rank={rank as string} suit={suit as string} red s={0.36} />
        </Deal>
      ))}
      <path d="M72 104 Q100 118 128 104 L124 98 H76Z" fill="#8b5a2b" />
      <path d="M76 98 H124" stroke="#5a3a1a" strokeWidth={2} />
      <Player x={100} y={74} face="😰" cards={[['8', '♥'], ['9', '♥']]} s={1.05} b={0} />
    </>
  ),

  // A brick alley at night: a detective under the streetlight with their cards, suspects in the shadows.
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
      <path d="M128 8 V110" stroke="#3a3f4f" strokeWidth={4} />
      <path d="M128 10 Q118 6 108 12" stroke="#3a3f4f" strokeWidth={3} fill="none" />
      <path d="M100 12 H116 L112 18 H104Z" fill="#555b6e" />
      <circle cx={108} cy={18} r={3} fill="#fff3c4" />
      <path d="M104 18 L58 118 H160 L112 18Z" fill="#fff3c4" className="twinkle" opacity={0.16} />
      <ellipse cx={108} cy={112} rx={50} ry={6} fill="#fff3c4" opacity={0.22} />
      <Player x={104} y={72} face="🕵️" cards={[['?', '♠'], ['?', '♥']]} s={1.15} b={0} />
      <g opacity={0.55}>
        <Player x={30} y={78} face="🤔" cards={['back', 'back']} s={0.8} b={1} back="#3a3f4f" />
        <Player x={172} y={80} face="🙂" cards={['back', 'back']} s={0.8} b={2} back="#3a3f4f" />
      </g>
      <Deal i={1}>
        <text x={44} y={34} fontSize={20} fontWeight={800} fill="#fff" fontFamily="system-ui, sans-serif" transform="rotate(-12 44 34)">
          ?
        </text>
      </Deal>
      <Deal i={3}>
        <text x={168} y={40} fontSize={16} fontWeight={800} fill="#ffdd57" fontFamily="system-ui, sans-serif" transform="rotate(14 168 40)">
          ?
        </text>
      </Deal>
    </>
  ),

  // A candlelit night table: a wizard holds their cards over the board laid out in a cross.
  crucifix: () => (
    <>
      <Back id="cross" top="#1a1230" bottom="#4a3a7a" />
      {STARS.map(([x, y, r], i) => (
        <circle key={i} className={i % 3 ? undefined : 'twinkle'} cx={x} cy={y} r={r} fill="#e6dcff" opacity={0.7} />
      ))}
      <ellipse cx={100} cy={128} rx={130} ry={60} fill="#2a1f3d" />
      <ellipse cx={100} cy={128} rx={120} ry={52} fill="#3b2c5c" />
      {[14, 186].map((x) => (
        <g key={x} transform={`translate(${x} 96)`}>
          <ellipse className="twinkle" cy={-24} rx={8} ry={12} fill="#ffd36b" opacity={0.3} />
          <path d="M0 -30 Q4 -24 0 -18 Q-4 -24 0 -30Z" fill="#ffd36b" />
          <rect x={-5} y={-18} width={10} height={26} rx={2} fill="#efe7d4" />
        </g>
      ))}
      <Player x={46} y={56} face="🧙" cards={[['A', '♠'], ['K', '♠']]} s={1.05} b={0} />
      <Player x={154} y={56} face="🦉" cards={['back', 'back']} s={0.9} hand="#c99a6a" edge="#8a6236" b={1} back="#4a3a7a" />
      {[
        [100, 34, 'K', '♠'],
        [80, 64, 'Q', '♥'],
        [100, 64, 'A', '♦'],
        [120, 64, 'J', '♣'],
        [100, 94, '10', '♠'],
      ].map(([x, y, rank, suit], i) => (
        <Deal key={i} i={i}>
          <Pc x={x as number} y={y as number} rank={rank as string} suit={suit as string} red={suit === '♥' || suit === '♦'} s={0.4} />
        </Deal>
      ))}
    </>
  ),

  // A big clock: six cards dealt round the hours, a player each side, the hands ticking.
  circle: () => {
    const hours = [0, 60, 120, 180, 240, 300];
    return (
      <>
        <Back id="circ" top="#1d7fb8" bottom="#0a2a45" />
        <circle cx={100} cy={58} r={50} fill="#0a2a45" />
        <circle cx={100} cy={58} r={50} fill="none" stroke="#d9ab52" strokeWidth={4} />
        <circle cx={100} cy={58} r={44} fill="#0f3a57" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return <line key={i} x1={100 + Math.sin(a) * 40} y1={58 - Math.cos(a) * 40} x2={100 + Math.sin(a) * 44} y2={58 - Math.cos(a) * 44} stroke="#7dd3fc" strokeWidth={i % 3 ? 1 : 2.4} />;
        })}
        {hours.map((a, i) => {
          const rad = ((a - 90) * Math.PI) / 180;
          return (
            <Deal key={a} i={i}>
              <Pc x={100 + Math.cos(rad) * 31} y={58 + Math.sin(rad) * 31} r={a} rank={['A', 'K', 'Q', 'J', '10', '9'][i]} suit={['♠', '♥', '♦', '♣', '♠', '♥'][i]} red={i === 1 || i === 2 || i === 5} s={0.3} />
            </Deal>
          );
        })}
        <g className="tick" style={{ transformOrigin: '100px 58px' } as CSSProperties}>
          <path d="M100 58 V36" stroke="#ffd34d" strokeWidth={3.4} strokeLinecap="round" />
        </g>
        <path d="M100 58 L114 66" stroke="#ffd34d" strokeWidth={3} strokeLinecap="round" />
        <circle cx={100} cy={58} r={3.6} fill="#ffd34d" />
        <Player x={24} y={78} face="🤓" cards={[['A', '♥'], ['Q', '♣']]} s={0.9} b={0} />
        <Player x={176} y={78} face="⏰" cards={['back', 'back']} s={0.85} hand="#e9e9ef" edge="#9a9aa8" b={1} back="#1d7fb8" />
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

/** A game's scene as a small rounded square, for lists (a party's playlist, the game row in setup). */
export function GameThumb({ variant, size = 40 }: { variant: Variant; size?: number }) {
  return (
    <span className="game-thumb" style={{ width: size, height: size }} aria-hidden>
      <GameIllustration variant={variant} />
    </span>
  );
}
