import type { ReactNode } from 'react';

// A drawn portrait for each AI Legend, caught in the move they're known for. These are cartoon drawings in
// the spirit of each player (a hat, a stare, a famous hand), not likenesses, and never photos.
// Every portrait is 160 × 180 and fills its box edge to edge.

const INK = '#16161d';
const RED = '#e5322d';

interface Look {
  skin: string;
  /** A slightly darker skin tone for shading and ears. */
  shade: string;
  shirt: string;
  shirtShade: string;
}

/** A small playing card, centred on (x, y). */
function Card({ x, y, r = 0, rank, suit, red, s = 1 }: { x: number; y: number; r?: number; rank: string; suit: string; red?: boolean; s?: number }) {
  const c = red ? RED : INK;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <rect x={-14} y={-20} width={28} height={40} rx={4} fill="#000" opacity={0.25} transform="translate(1.5 3)" />
      <rect x={-14} y={-20} width={28} height={40} rx={4} fill="#fff" />
      <text x={-10} y={-8} fontSize={10} fontWeight={800} fill={c} fontFamily="system-ui, sans-serif">
        {rank}
      </text>
      <text x={0} y={11} fontSize={17} textAnchor="middle" fill={c} fontFamily="system-ui, sans-serif">
        {suit}
      </text>
    </g>
  );
}

function Chips({ x, y, c, n, s = 1 }: { x: number; y: number; c: string; n: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={3} rx={11} ry={4} fill="#000" opacity={0.3} />
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(0 ${-i * 3.4})`}>
          <ellipse rx={10} ry={3.8} fill={c} />
          <ellipse cy={-0.6} rx={10} ry={3.8} fill={c} stroke="#fff" strokeWidth={1.3} strokeDasharray="2.8 2.6" />
        </g>
      ))}
    </g>
  );
}

/** The backdrop: a gradient, a soft light behind the head and the table's edge along the bottom. */
function Room({ id, bg, felt = '#1f7a4d', children }: { id: string; bg: [string, string]; felt?: string; children?: ReactNode }) {
  return (
    <>
      <defs>
        <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bg[0]} />
          <stop offset="1" stopColor={bg[1]} />
        </linearGradient>
        <radialGradient id={`lglow-${id}`} cx="0.5" cy="0.38" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity={0.35} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={160} height={180} fill={`url(#lg-${id})`} />
      <rect width={160} height={180} fill={`url(#lglow-${id})`} />
      {children}
      <path d="M0 150 H160 V180 H0Z" fill="#4a2a12" />
      <path d="M0 150 H160 V160 H0Z" fill={felt} />
      <path d="M0 150 H160" stroke="#fff" strokeOpacity={0.2} strokeWidth={1.2} />
    </>
  );
}

/** Shoulders and chest, sitting behind the table. */
function Body({ look, collar }: { look: Look; collar?: ReactNode }) {
  return (
    <>
      <path d="M71 86 H89 V100 H71Z" fill={look.shade} />
      <path d="M26 160 L32 118 Q36 100 60 96 L100 96 Q124 100 128 118 L134 160Z" fill={look.shirt} />
      <path d="M60 96 Q80 112 100 96" fill="none" stroke={look.shirtShade} strokeWidth={3} />
      <path d="M32 118 Q36 104 52 98 L56 160 H26Z" fill={look.shirtShade} opacity={0.35} />
      {collar}
    </>
  );
}

/** An arm from the shoulder to a hand, as a thick sleeve with the hand at the end. */
function Arm({ from, mid, to, look, sleeve }: { from: [number, number]; mid: [number, number]; to: [number, number]; look: Look; sleeve?: string }) {
  return (
    <>
      <path d={`M${from[0]} ${from[1]} Q${mid[0]} ${mid[1]} ${to[0]} ${to[1]}`} fill="none" stroke={sleeve ?? look.shirt} strokeWidth={15} strokeLinecap="round" />
      <circle cx={to[0]} cy={to[1]} r={8} fill={look.skin} />
      <circle cx={to[0] - 2} cy={to[1] - 2} r={3} fill="#fff" opacity={0.2} />
    </>
  );
}

/** A head with ears, a little shading and a nose. Eyes, mouth and hair are drawn on top by each legend. */
function Head({ look }: { look: Look }) {
  return (
    <>
      <ellipse cx={57} cy={66} rx={5} ry={7} fill={look.shade} />
      <ellipse cx={103} cy={66} rx={5} ry={7} fill={look.shade} />
      <ellipse cx={80} cy={62} rx={23} ry={27} fill={look.skin} />
      <path d="M62 76 Q80 92 98 76 Q96 88 80 90 Q64 88 62 76Z" fill={look.shade} opacity={0.4} />
      <path d="M80 62 Q77 71 80 73 Q83 74 84 72" fill="none" stroke={look.shade} strokeWidth={1.8} strokeLinecap="round" />
      <circle cx={68} cy={74} r={4} fill="#ff8a80" opacity={0.25} />
      <circle cx={92} cy={74} r={4} fill="#ff8a80" opacity={0.25} />
    </>
  );
}

function Eyes({ y = 60, narrow, look }: { y?: number; narrow?: boolean; look: Look }) {
  return narrow ? (
    <g stroke={INK} strokeWidth={2.4} strokeLinecap="round">
      <path d={`M66 ${y} Q71 ${y - 2.5} 75 ${y}`} fill="none" />
      <path d={`M85 ${y} Q89 ${y - 2.5} 94 ${y}`} fill="none" />
      <circle cx={71} cy={y + 0.6} r={1.6} fill={INK} stroke="none" />
      <circle cx={89} cy={y + 0.6} r={1.6} fill={INK} stroke="none" />
    </g>
  ) : (
    <g>
      <ellipse cx={71} cy={y} rx={4} ry={4.6} fill="#fff" />
      <ellipse cx={89} cy={y} rx={4} ry={4.6} fill="#fff" />
      <circle cx={71.5} cy={y + 0.5} r={2.4} fill={INK} />
      <circle cx={89.5} cy={y + 0.5} r={2.4} fill={INK} />
      <circle cx={72.3} cy={y - 0.4} r={0.8} fill="#fff" />
      <circle cx={90.3} cy={y - 0.4} r={0.8} fill="#fff" />
      <path d={`M66 ${y - 2} Q71 ${y - 6} 76 ${y - 3}`} fill="none" stroke={look.shade} strokeWidth={1} opacity={0.5} />
    </g>
  );
}

const BRUNSON: Look = { skin: '#f2c9a0', shade: '#d9a578', shirt: '#7a4a2a', shirtShade: '#5a341c' };
const HELLMUTH: Look = { skin: '#f5cfaa', shade: '#dba982', shirt: '#1d1d24', shirtShade: '#0b0b10' };
const NEGREANU: Look = { skin: '#f0c49c', shade: '#d39f74', shirt: '#2f6fd6', shirtShade: '#1f4f9e' };
const IVEY: Look = { skin: '#7a4a2e', shade: '#5c341e', shirt: '#2a2a33', shirtShade: '#15151b' };
const DWAN: Look = { skin: '#f3cba6', shade: '#d6a67c', shirt: '#7d8597', shirtShade: '#5b6272' };
const RAMPAGE: Look = { skin: '#efc59a', shade: '#d2a072', shirt: '#d1294d', shirtShade: '#9e1a37' };

const PORTRAITS: Record<string, () => ReactNode> = {
  // Doyle Brunson: the white cowboy hat and glasses, tipping his hat as he turns over ten-deuce.
  brunson: () => (
    <>
      <Room id="brunson" bg={['#ffd9a0', '#c9742f']}>
        <circle cx={128} cy={34} r={14} fill="#fff1c9" opacity={0.9} />
        <path d="M0 120 L14 108 L26 116 L40 102 L54 114 L54 150 H0Z" fill="#a85a22" opacity={0.5} />
        <path d="M150 150 V112 M150 124 H142 V116 M150 132 H158 V122" stroke="#4f7a2a" strokeWidth={6} strokeLinecap="round" fill="none" />
      </Room>
      <Body look={BRUNSON} collar={<path d="M72 98 L80 112 L88 98" fill="none" stroke="#e8d7a8" strokeWidth={2.5} />} />
      <circle cx={80} cy={112} r={3} fill="#c0c7d6" stroke="#8a93a6" />
      <path d="M80 115 V132" stroke="#2a1a10" strokeWidth={1.6} />
      <Head look={BRUNSON} />
      <path d="M62 80 Q80 102 98 80 Q96 92 80 96 Q64 92 62 80Z" fill="#f4f1ea" />
      <path d="M68 78 Q80 74 92 78 Q86 82 80 81 Q74 82 68 78Z" fill="#f4f1ea" />
      <path d="M74 86 Q80 89 86 86" fill="none" stroke="#7a4a3a" strokeWidth={2} strokeLinecap="round" />
      <Eyes y={60} look={BRUNSON} />
      <g fill="none" stroke="#3a3a44" strokeWidth={2}>
        <circle cx={71} cy={60} r={7} />
        <circle cx={89} cy={60} r={7} />
        <path d="M78 60 H82 M64 59 L58 57 M96 59 L102 57" />
      </g>
      <path d="M64 50 Q71 46 77 50 M83 50 Q89 46 96 50" stroke="#e8e4da" strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <g transform="rotate(-10 80 40)">
        <ellipse cx={80} cy={42} rx={46} ry={8} fill="#efe9da" />
        <ellipse cx={80} cy={44} rx={46} ry={6} fill="#d8d0bc" opacity={0.6} />
        <path d="M56 42 Q56 14 80 12 Q104 14 104 42Z" fill="#f6f1e4" />
        <path d="M70 14 Q80 22 90 14" fill="none" stroke="#d8d0bc" strokeWidth={2} />
        <path d="M56 38 Q80 46 104 38 L104 33 Q80 41 56 33Z" fill="#6b4a2a" />
      </g>
      <Arm from={[118, 108]} mid={[140, 86]} to={[124, 40]} look={BRUNSON} />
      <Arm from={[42, 110]} mid={[34, 140]} to={[54, 146]} look={BRUNSON} />
      <Card x={44} y={150} r={-14} rank="10" suit="♠" s={0.9} />
      <Card x={70} y={152} r={8} rank="2" suit="♥" red s={0.9} />
      <Chips x={120} y={160} c="#e5322d" n={4} />
      <Chips x={140} y={164} c="#efe7d4" n={3} />
    </>
  ),

  // Phil Hellmuth: dark shades and a black jacket, on his feet with both hands up after a bad beat,
  // gold bracelets stacked up his wrists.
  hellmuth: () => (
    <>
      <Room id="hellmuth" bg={['#ffc2b0', '#b3261e']}>
        <g fill="#fff" opacity={0.35}>
          <path d="M20 30 L28 44 L12 44Z" />
          <path d="M140 40 L148 54 L132 54Z" />
        </g>
        <text x={22} y={82} fontSize={22} fontWeight={900} fill="#fff" opacity={0.85} fontFamily="system-ui, sans-serif" transform="rotate(-14 22 82)">
          !!
        </text>
        <text x={128} y={84} fontSize={22} fontWeight={900} fill="#fff" opacity={0.85} fontFamily="system-ui, sans-serif" transform="rotate(14 128 84)">
          ?!
        </text>
      </Room>
      <Body look={HELLMUTH} collar={<path d="M70 96 L80 110 L90 96" fill="#e9e9ef" />} />
      <path d="M80 110 V160" stroke="#3a3a44" strokeWidth={1.5} />
      <Head look={HELLMUTH} />
      <path d="M58 52 Q60 30 80 30 Q102 30 102 52 Q96 40 80 40 Q66 40 58 52Z" fill="#e6c27a" />
      <path d="M62 44 Q70 34 82 36 Q74 38 70 46Z" fill="#f2d79a" />
      <g>
        <rect x={62} y={54} width={16} height={11} rx={4} fill={INK} />
        <rect x={82} y={54} width={16} height={11} rx={4} fill={INK} />
        <path d="M78 58 H82 M62 57 L57 55 M98 57 L103 55" stroke={INK} strokeWidth={2} />
        <path d="M65 57 L70 57" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
        <path d="M85 57 L90 57" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
      </g>
      <path d="M64 50 L76 53 M96 50 L84 53" stroke="#b08a4a" strokeWidth={2.4} strokeLinecap="round" />
      <ellipse cx={80} cy={81} rx={7} ry={5.6} fill="#5a1a1a" />
      <path d="M74 79 Q80 77 86 79" stroke="#fff" strokeWidth={1.6} fill="none" />
      <Arm from={[42, 108]} mid={[18, 84]} to={[26, 44]} look={HELLMUTH} />
      <Arm from={[118, 108]} mid={[142, 84]} to={[134, 44]} look={HELLMUTH} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={20} y={54 + i * 5} width={13} height={3.6} rx={1.6} fill="#ffcf3d" stroke="#b8860b" strokeWidth={0.6} transform={`rotate(-12 26 ${56 + i * 5})`} />
          <rect x={128} y={54 + i * 5} width={13} height={3.6} rx={1.6} fill="#ffcf3d" stroke="#b8860b" strokeWidth={0.6} transform={`rotate(12 134 ${56 + i * 5})`} />
        </g>
      ))}
      <Card x={54} y={156} r={-10} rank="A" suit="♠" s={0.85} />
      <Card x={76} y={157} r={6} rank="A" suit="♣" s={0.85} />
      <Chips x={126} y={162} c="#111" n={3} />
    </>
  ),

  // Daniel Negreanu: the friendly grin, chin in hand, reading your cards; a thought bubble shows the read.
  negreanu: () => (
    <>
      <Room id="negreanu" bg={['#ffe39a', '#ff8f3d']}>
        <g fill="#fff" opacity={0.95}>
          <circle cx={118} cy={46} r={4} />
          <circle cx={126} cy={34} r={6} />
          <ellipse cx={138} cy={16} rx={20} ry={14} />
        </g>
      </Room>
      <Card x={130} y={16} r={-10} rank="K" suit="♣" s={0.55} />
      <Card x={146} y={16} r={10} rank="Q" suit="♦" red s={0.55} />
      <Body look={NEGREANU} collar={<path d="M66 96 L74 108 L80 98 L86 108 L94 96" fill="#2457b8" stroke="#1f4f9e" strokeWidth={1.5} />} />
      <Head look={NEGREANU} />
      <path d="M57 56 Q56 32 80 30 Q104 32 103 56 Q100 44 92 42 Q84 46 74 42 Q62 44 57 56Z" fill="#3a2a22" />
      <path d="M66 36 Q78 30 92 34" stroke="#5a463a" strokeWidth={2} fill="none" />
      <Eyes y={60} narrow look={NEGREANU} />
      <path d="M64 52 Q70 48 76 51 M84 51 Q90 47 96 50" stroke="#3a2a22" strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <path d="M68 77 Q80 90 92 77 Q80 82 68 77Z" fill="#fff" stroke="#7a3a2a" strokeWidth={1.6} />
      <path d="M62 78 Q80 98 98 78" fill="none" stroke={NEGREANU.shade} strokeWidth={1} strokeDasharray="1 2.4" />
      <Arm from={[116, 108]} mid={[112, 120]} to={[90, 92]} look={NEGREANU} />
      <path d="M86 88 Q88 82 94 84" stroke={NEGREANU.shade} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Arm from={[44, 110]} mid={[36, 136]} to={[56, 148]} look={NEGREANU} />
      <Card x={46} y={156} r={-8} rank="J" suit="♠" s={0.8} />
      <Card x={66} y={158} r={8} rank="J" suit="♥" red s={0.8} />
      <Chips x={122} y={162} c="#2563eb" n={3} />
      <Chips x={142} y={164} c="#ffcf3d" n={2} />
    </>
  ),

  // Phil Ivey: the stare. Calm, dark sweater, pushing a tall stack of chips forward: all in.
  ivey: () => (
    <>
      <Room id="ivey" bg={['#4a4a62', '#0b0b12']} felt="#14402c">
        <path d="M0 0 L50 0 L80 70 Z" fill="#fff" opacity={0.05} />
        <path d="M160 0 L110 0 L80 70 Z" fill="#fff" opacity={0.05} />
        <circle cx={132} cy={30} r={10} fill="#e9e9ef" opacity={0.6} />
        <circle cx={128} cy={27} r={9} fill="#3a3a52" />
      </Room>
      <Body look={IVEY} collar={<path d="M64 96 Q80 106 96 96 L96 100 Q80 112 64 100Z" fill="#3a3a46" />} />
      <Head look={IVEY} />
      <path d="M58 52 Q58 34 80 33 Q102 34 102 52 Q98 40 80 39 Q62 40 58 52Z" fill="#1b1410" />
      <path d="M60 50 Q62 40 72 37" stroke="#2c221c" strokeWidth={2} fill="none" />
      <g>
        <path d="M65 60 Q71 56 77 60 Q71 63 65 60Z" fill="#fff" />
        <path d="M83 60 Q89 56 95 60 Q89 63 83 60Z" fill="#fff" />
        <circle cx={71} cy={60} r={2.2} fill={INK} />
        <circle cx={89} cy={60} r={2.2} fill={INK} />
        <path d="M64 54 L77 56 M96 54 L83 56" stroke="#1b1410" strokeWidth={2.8} strokeLinecap="round" />
      </g>
      <path d="M72 81 H88" stroke="#3a1e12" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M66 84 Q80 92 94 84" fill="none" stroke="#1b1410" strokeWidth={1} strokeDasharray="1 2" opacity={0.7} />
      <Arm from={[42, 110]} mid={[40, 132]} to={[66, 140]} look={IVEY} />
      <Arm from={[118, 110]} mid={[120, 132]} to={[96, 140]} look={IVEY} />
      <Chips x={81} y={150} c="#111" n={6} s={1.2} />
      <Chips x={66} y={156} c="#7c3aed" n={4} />
      <Chips x={96} y={156} c="#e5322d" n={5} />
      <g stroke="#fff" strokeOpacity={0.6} strokeWidth={2} strokeLinecap="round">
        <path d="M50 128 L40 124 M110 128 L120 124 M81 116 V108" />
      </g>
      <Card x={136} y={160} r={14} rank="A" suit="♦" red s={0.7} />
    </>
  ),

  // Tom Dwan: the young gun in a grey hoodie with headphones round his neck, throwing a big bet in with a grin.
  dwan: () => (
    <>
      <Room id="dwan" bg={['#8ae8ff', '#1f5bff']}>
        <path d="M20 20 L30 34 L22 34 L32 52" stroke="#fff" strokeWidth={3} fill="none" strokeLinejoin="round" opacity={0.8} />
        <path d="M138 14 L146 26 L140 26 L148 40" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinejoin="round" opacity={0.7} />
      </Room>
      <Body look={DWAN} collar={<path d="M58 98 Q80 118 102 98 Q100 92 80 100 Q60 92 58 98Z" fill="#6a7284" />} />
      <path d="M74 112 V130 M86 112 V130" stroke="#e9e9ef" strokeWidth={2} strokeLinecap="round" />
      <path d="M56 92 Q58 104 70 104 M104 92 Q102 104 90 104" stroke="#2a2a33" strokeWidth={5} fill="none" strokeLinecap="round" />
      <circle cx={58} cy={98} r={6} fill="#2a2a33" />
      <circle cx={102} cy={98} r={6} fill="#2a2a33" />
      <Head look={DWAN} />
      <path d="M56 58 Q52 30 78 28 Q104 28 104 56 Q100 44 96 46 Q92 36 84 42 Q78 34 72 42 Q64 38 60 50Z" fill="#4a3226" />
      <path d="M66 32 Q74 26 80 32 M84 30 Q92 28 96 34" stroke="#6a4a38" strokeWidth={2} fill="none" />
      <Eyes y={61} look={DWAN} />
      <path d="M64 52 Q70 49 76 52 M84 51 Q90 47 96 50" stroke="#4a3226" strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <path d="M70 79 Q82 86 92 76" fill="none" stroke="#7a3a2a" strokeWidth={2.4} strokeLinecap="round" />
      <Arm from={[118, 108]} mid={[136, 100]} to={[136, 74]} look={DWAN} />
      <Arm from={[42, 110]} mid={[38, 136]} to={[56, 148]} look={DWAN} />
      {[
        [120, 56, '#e5322d'], [134, 48, '#ffcf3d'], [112, 40, '#16a34a'], [146, 62, '#2563eb'], [124, 30, '#e5322d'],
      ].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${i * 30})`}>
          <ellipse rx={7} ry={7} fill={c as string} />
          <ellipse rx={7} ry={7} fill="none" stroke="#fff" strokeWidth={1.4} strokeDasharray="2.4 2.2" />
        </g>
      ))}
      <Card x={46} y={156} r={-12} rank="7" suit="♥" red s={0.82} />
      <Card x={66} y={157} r={6} rank="2" suit="♣" s={0.82} />
      <Chips x={126} y={164} c="#16a34a" n={3} />
    </>
  ),

  // Ethan "Rampage" Yau: cap on backwards, filming the moment for the vlog and fist-pumping the win.
  rampage: () => (
    <>
      <Room id="rampage" bg={['#ffb199', '#d1294d']}>
        <g fill="#fff" opacity={0.85}>
          <circle cx={22} cy={22} r={4} />
          <rect x={18} y={30} width={8} height={3} rx={1.5} />
        </g>
        <text x={12} y={52} fontSize={9} fontWeight={800} fill="#fff" fontFamily="system-ui, sans-serif">
          REC
        </text>
        <circle cx={8} cy={49} r={3} fill="#ff2d2d" />
      </Room>
      <Body look={RAMPAGE} collar={<path d="M60 98 Q80 114 100 98" fill="none" stroke="#9e1a37" strokeWidth={6} />} />
      <rect x={66} y={118} width={28} height={14} rx={3} fill="#9e1a37" />
      <text x={80} y={128.5} fontSize={8} fontWeight={900} textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif">
        GO!
      </text>
      <Head look={RAMPAGE} />
      <path d="M57 58 Q56 38 80 36 Q104 38 103 58 L100 50 Q80 46 60 50Z" fill="#141018" />
      <g>
        <path d="M58 46 Q58 28 80 27 Q102 28 102 46 Q80 40 58 46Z" fill="#1d1d24" />
        <path d="M58 44 Q50 46 46 52 Q52 50 60 48Z" fill="#1d1d24" />
        <rect x={74} y={42} width={12} height={4} rx={2} fill="#9e9eab" />
        <circle cx={80} cy={28} r={2} fill="#3a3a44" />
      </g>
      <path d="M66 58 Q71 54 76 58" stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <path d="M84 58 Q89 54 94 58" stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <path d="M66 51 L76 53 M94 51 L84 53" stroke="#141018" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M68 74 Q80 92 92 74Z" fill="#5a1a1a" />
      <path d="M71 75 Q80 78 89 75 L88 77 Q80 80 72 77Z" fill="#fff" />
      <Arm from={[42, 108]} mid={[18, 98]} to={[24, 64]} look={RAMPAGE} />
      <g transform="translate(24 64)">
        <rect x={-7} y={-12} width={14} height={9} rx={3} fill={RAMPAGE.shade} />
      </g>
      <Arm from={[118, 108]} mid={[140, 108]} to={[132, 84]} look={RAMPAGE} />
      <g transform="translate(132 72) rotate(-8)">
        <rect x={-4} y={4} width={8} height={18} rx={3} fill="#2a2a33" />
        <rect x={-14} y={-14} width={28} height={20} rx={4} fill="#2a2a33" />
        <circle cx={0} cy={-4} r={6.5} fill="#5aa9ff" stroke="#111" strokeWidth={2.4} />
        <circle cx={-2} cy={-6} r={2} fill="#fff" opacity={0.7} />
        <circle cx={10} cy={-10} r={1.8} fill="#ff2d2d" />
      </g>
      <Card x={52} y={156} r={-8} rank="9" suit="♠" s={0.82} />
      <Card x={72} y={157} r={8} rank="9" suit="♦" red s={0.82} />
      <Chips x={120} y={162} c="#ffcf3d" n={5} />
      <Chips x={140} y={164} c="#e5322d" n={3} />
    </>
  ),
};

/** A legend's portrait, or null for a legend that doesn't have one drawn yet. */
export function LegendPortrait({ id, className }: { id: string; className?: string }) {
  const draw = PORTRAITS[id];
  if (!draw) return null;
  return (
    <svg className={className} viewBox="0 0 160 180" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      {draw()}
    </svg>
  );
}

export const hasPortrait = (id: string): boolean => id in PORTRAITS;
