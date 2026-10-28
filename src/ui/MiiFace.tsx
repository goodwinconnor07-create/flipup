import { useId } from 'react';

/**
 * A test stand-in for a seat's emoji: a Mii-style head on the top of a round body, drawn flat with soft 3D shading.
 * The look is one of the twelve from the character mockups ("the cast"), picked from the player's name so it's the
 * same every time. The face follows the seat's mood, which comes from public moves only. Turned on with "Mii faces
 * (test)" in Settings; off, the seat shows its emoji as before.
 */

type Shape = 'round' | 'wide' | 'tall' | 'square' | 'chubby';
type HairStyle = 'short' | 'spiky' | 'bob' | 'long' | 'bun' | 'curly' | 'none';
type HatStyle = 'none' | 'cap' | 'beanie' | 'tophat' | 'crown' | 'bucket' | 'catEars';
type Glasses = 'none' | 'round' | 'sun' | 'aviator' | 'hearts';
type Top = 'tee' | 'stripes' | 'hoodie' | 'jacket' | 'jersey';
type Facial = 'none' | 'freckles' | 'mustache' | 'beard';

interface Look {
  name: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shape: Shape;
  eyeSize: number;
  eyeColor: string;
  hatStyle: HatStyle;
  hat: string;
  glasses: Glasses;
  top: Top;
  shirt: string;
  shirt2: string;
  facial: Facial;
  number?: string;
}

const base = { shape: 'round', eyeSize: 1.2, eyeColor: '#3b2417', hatStyle: 'none', hat: '#e0352b', glasses: 'none', top: 'tee', shirt2: '#ffffff', facial: 'none' } as const;

/** The cast from the character mockups. */
export const MII_CAST: Look[] = [
  { ...base, name: 'Maya', skin: '#f8d0ad', hairStyle: 'bob', hair: '#1d1714', hatStyle: 'catEars', shirt: '#f27aa8', top: 'stripes', eyeSize: 1.45 },
  { ...base, name: 'Rook', skin: '#6e442a', hairStyle: 'short', hair: '#1d1714', glasses: 'sun', top: 'jacket', shirt: '#2b2b2e', shirt2: '#f2f2f2', shape: 'square' },
  { ...base, name: 'Benji', skin: '#ffe3cc', hairStyle: 'spiky', hair: '#c9974a', hatStyle: 'cap', hat: '#f08a24', top: 'jersey', shirt: '#f08a24', number: '23', facial: 'freckles' },
  { ...base, name: 'Tess', skin: '#cf9466', hairStyle: 'curly', hair: '#8f3a1e', hatStyle: 'beanie', hat: '#1f8f3a', top: 'hoodie', shirt: '#7ac143', shape: 'chubby', eyeColor: '#3a9a5a' },
  { ...base, name: 'Omar', skin: '#a16a43', hairStyle: 'short', hair: '#1d1714', hatStyle: 'tophat', hat: '#2b2b2e', top: 'jacket', shirt: '#7d4cbf', shirt2: '#f4cc2a', shape: 'wide', facial: 'beard' },
  { ...base, name: 'Priya', skin: '#cf9466', hairStyle: 'long', hair: '#1d1714', hatStyle: 'crown', top: 'stripes', shirt: '#f4cc2a', shape: 'tall', eyeSize: 1.35 },
  { ...base, name: 'Jules', skin: '#eab88f', hairStyle: 'bun', hair: '#8c8783', glasses: 'round', top: 'hoodie', shirt: '#44b6e8', shirt2: '#1f5fd1', eyeColor: '#2f6fd6' },
  { ...base, name: 'Kai', skin: '#f8d0ad', hairStyle: 'spiky', hair: '#4f7dff', hatStyle: 'bucket', hat: '#f4cc2a', shirt: '#1f5fd1' },
  { ...base, name: 'Nora', skin: '#ffe3cc', hairStyle: 'bob', hair: '#ff7eb6', glasses: 'hearts', top: 'stripes', shirt: '#ffffff', shirt2: '#ff7eb6', eyeSize: 1.5 },
  { ...base, name: 'Theo', skin: '#eab88f', hairStyle: 'short', hair: '#6b3f22', glasses: 'aviator', shirt: '#e0352b', shape: 'square', facial: 'mustache' },
  { ...base, name: 'Ines', skin: '#6e442a', hairStyle: 'curly', hair: '#1d1714', top: 'jersey', shirt: '#1f8f3a', shirt2: '#f4cc2a', number: '9', shape: 'tall', eyeSize: 1.4 },
  { ...base, name: 'Dev', skin: '#a16a43', hairStyle: 'short', hair: '#3b2417', hatStyle: 'cap', hat: '#1f5fd1', top: 'hoodie', shirt: '#8e8e93', shape: 'wide' },
];

/** The same look for the same name, every time. */
export function miiLook(name: string): Look {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return MII_CAST[(h >>> 0) % MII_CAST.length];
}

type Eye = 'open' | 'wide' | 'happy' | 'closed' | 'sad' | 'angry' | 'half' | 'x' | 'heart' | 'spiral';
type Mouth = 'line' | 'smile' | 'grin' | 'o' | 'frown' | 'shock' | 'wavy' | 'teeth' | 'cry' | 'smirk' | 'tongue';
interface Face {
  eyes: Eye | [Eye, Eye];
  mouth: Mouth;
  raise: number;
  tilt: number;
  blush?: boolean;
  tears?: boolean;
}

/** The faces from the 3D table's Mii set (FACES in camMii.ts) that a seat's moods use. */
const FACES = {
  normal: { eyes: 'open', mouth: 'line', raise: 0, tilt: 0 },
  bigSmile: { eyes: 'happy', mouth: 'grin', raise: 0.6, tilt: 0, blush: true },
  glum: { eyes: 'sad', mouth: 'frown', raise: -0.1, tilt: -1 },
  unbelievable: { eyes: 'wide', mouth: 'shock', raise: 1, tilt: -0.4 },
  scared: { eyes: 'x', mouth: 'wavy', raise: 0.8, tilt: -1 },
  cry: { eyes: 'x', mouth: 'cry', raise: 0.3, tilt: -1, tears: true },
  determined: { eyes: 'angry', mouth: 'teeth', raise: -0.4, tilt: 1 },
} satisfies Record<string, Face>;

/** A seat's mood (moodOf() in table/Pods.tsx) as a face. */
const MOOD_FACE: Record<string, keyof typeof FACES> = {
  win: 'bigSmile',
  beat: 'unbelievable',
  bust: 'cry',
  out: 'cry',
  sweat: 'scared',
  shove: 'determined',
  fold: 'glum',
};

const SHAPES: Record<Shape, [number, number, number]> = { round: [70, 66, 0.98], wide: [80, 62, 0.95], tall: [62, 76, 0.95], square: [70, 68, 0.6], chubby: [78, 72, 0.98] };
const LIDS: Partial<Record<Eye, [string, string]>> = {
  sad: ['M-16 -16 L16 -16 L16 -9 L-16 -1Z', 'M-13 -2 L13 -9'],
  angry: ['M-16 -16 L16 -16 L16 -1 L-16 -9Z', 'M-13 -8 L13 -2'],
  half: ['M-16 -16 L16 -16 L16 -2 L-16 -2Z', 'M-13 -2 L13 -2'],
};
const INK = '#17130f';
const LIP = '#9a3b35';
const MOUTH = '#5a1f1c';
const TONGUE = '#e0625f';
const TORSO = 'M72 206 C72 186 92 176 120 176 C148 176 168 186 168 206 L174 276 C176 296 158 304 120 304 C82 304 64 296 66 276Z';

function mix(a: string, b: string, t: number): string {
  const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = hex(a);
  const B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const line = (stroke: string, width: number) => ({ fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

function EyeShape({ kind, skin, color }: { kind: Eye; skin: string; color: string }) {
  const lid = LIDS[kind];
  if (kind === 'open' || lid) {
    return (
      <g className="mii-blink">
        <path d="M-13 0 C-11 -11 11 -12 13 -1 C11 9 -11 10 -13 0Z" fill="#fff" />
        <g transform={`translate(1 ${lid ? 2 : 1})`}>
          <ellipse rx={7} ry={8.5} fill={color} />
          <ellipse rx={3.6} ry={4.4} fill="#0d0b0a" />
          <circle cx={2.6} cy={-3.6} r={2.6} fill="#fff" />
        </g>
        {lid ? (
          <>
            <path d={lid[0]} fill={skin} />
            <path d={lid[1]} {...line(INK, 3.2)} />
          </>
        ) : (
          <path d="M-14 0 C-11 -11 11 -12 14 -1" {...line(INK, 3.4)} />
        )}
      </g>
    );
  }
  if (kind === 'wide')
    return (
      <g>
        <ellipse rx={14} ry={13} fill="#fff" stroke={INK} strokeWidth={2.6} />
        <ellipse rx={4.5} ry={5.5} fill={color} />
        <circle r={2.4} fill="#0d0b0a" />
      </g>
    );
  if (kind === 'happy') return <path d="M-12 4 Q0 -12 12 4" {...line(INK, 4.6)} />;
  if (kind === 'closed') return <path d="M-12 -1 Q0 9 12 -1" {...line(INK, 4.2)} />;
  if (kind === 'x') return <path d="M-9 -9 L8 0 L-9 9" {...line(INK, 4.8)} />;
  if (kind === 'heart') return <path d="M0 11 C-17 0 -15 -13 -6 -12.5 C-3 -12.5 0 -10 0 -7 C0 -10 3 -12.5 6 -12.5 C15 -13 17 0 0 11Z" fill="#ff3d6e" />;
  return <path d="M0 0 m-1 0 a1 1 0 1 1 2 0 a3 3 0 1 1 -5 0 a5 5 0 1 1 9 0 a7 7 0 1 1 -13 0" {...line(INK, 2.6)} />;
}

function MouthShape({ kind }: { kind: Mouth }) {
  switch (kind) {
    case 'smile':
      return <path d="M-15 -3 Q0 12 15 -3" {...line(LIP, 3.8)} />;
    case 'grin':
      return (
        <g>
          <path d="M-19 -5 Q0 -1 19 -5 Q17 19 0 20 Q-17 19 -19 -5Z" fill={MOUTH} />
          <path d="M-17 -4 Q0 -0.5 17 -4 L16 2 Q0 5 -16 2Z" fill="#fff" />
          <ellipse cy={14} rx={9} ry={5} fill={TONGUE} />
        </g>
      );
    case 'o':
      return <ellipse cy={2} rx={6.5} ry={8} fill={MOUTH} stroke={LIP} strokeWidth={2} />;
    case 'frown':
      return <path d="M-13 6 Q0 -6 13 6" {...line(LIP, 3.8)} />;
    case 'shock':
      return (
        <g>
          <ellipse cy={5} rx={12} ry={16} fill={MOUTH} />
          <ellipse cy={15} rx={7} ry={4.5} fill={TONGUE} />
        </g>
      );
    case 'wavy':
      return <path d="M-15 0 q3.75 -5 7.5 0 t7.5 0 t7.5 0 t7.5 0" {...line(LIP, 3.4)} />;
    case 'teeth':
      return (
        <g>
          <rect x={-16} y={-7} width={32} height={14} rx={6} fill="#fff" stroke={LIP} strokeWidth={2.6} />
          <path d="M-15 0 L15 0 M-8 -6 L-8 6 M0 -6 L0 6 M8 -6 L8 6" fill="none" stroke="#cfc6bd" strokeWidth={1.6} />
        </g>
      );
    case 'cry':
      return (
        <g>
          <path d="M-17 13 Q0 -15 17 13 Q0 8 -17 13Z" fill={MOUTH} />
          <ellipse cy={9.5} rx={6.5} ry={2.6} fill={TONGUE} />
        </g>
      );
    case 'smirk':
      return <path d="M-11 3 Q4 5 14 -6" {...line(LIP, 3.8)} />;
    case 'tongue':
      return (
        <g>
          <path d="M-15 -3 Q0 12 15 -3" {...line(LIP, 3.8)} />
          <path d="M1 4 Q3 16 9 14 Q14 12 11 2Z" fill={TONGUE} />
        </g>
      );
    default:
      return <path d="M-10 0 Q0 2 10 0" {...line(LIP, 3.6)} />;
  }
}

/** Hair, drawn for the mockups' first head; `hairT` fits it to this face shape. */
function Hair({ style, fill }: { style: HairStyle; fill: string }) {
  switch (style) {
    case 'short':
      return <path d="M36 98 C32 52 62 24 100 24 C138 24 168 52 164 98 C160 80 152 68 140 62 C124 70 96 72 74 60 C58 66 44 78 36 98Z" fill={fill} />;
    case 'spiky':
      return <path d="M36 96 C34 70 42 52 54 42 L48 18 L70 34 L78 8 L94 30 L108 6 L118 30 L134 12 L136 38 L156 30 C164 50 168 72 164 96 C158 78 150 68 138 62 C122 70 94 72 72 60 C56 66 44 78 36 96Z" fill={fill} />;
    case 'bob':
      return <path d="M37 92 C37 48 66 24 100 24 C134 24 163 48 163 92 L152 74 L142 78 L134 66 C118 71 82 71 66 66 L58 78 L48 74Z" fill={fill} />;
    case 'long':
      return <path d="M37 96 C34 50 64 20 104 20 C140 20 166 50 163 96 C158 76 148 62 132 54 C112 64 84 66 62 60 C50 68 42 80 37 96Z" fill={fill} />;
    case 'bun':
      return (
        <g fill={fill}>
          <circle cx={100} cy={20} r={19} />
          <path d="M36 98 C32 52 62 26 100 26 C138 26 168 52 164 98 C160 78 150 64 134 58 C118 64 82 64 66 58 C52 64 42 78 36 98Z" />
        </g>
      );
    case 'curly':
      return (
        <g fill={fill}>
          {[[42, 84, 13], [40, 64, 14], [50, 45, 15], [66, 31, 15], [84, 23, 15], [102, 21, 15], [120, 24, 15], [136, 32, 15], [150, 46, 15], [160, 64, 14], [158, 84, 13], [78, 58, 10], [98, 60, 10], [118, 58, 10]].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
          <path d="M36 92 C34 52 62 30 100 30 C138 30 166 52 164 92 C158 76 150 66 138 62 C124 68 92 70 72 60 C56 66 44 76 36 92Z" />
        </g>
      );
    default:
      return null;
  }
}

function Hat({ style, fill, light, dark, band }: { style: HatStyle; fill: string; light: string; dark: string; band: string }) {
  switch (style) {
    case 'cap':
      return (
        <g>
          <path d="M50 104 C46 54 80 34 120 34 C160 34 194 54 190 104 C170 92 146 88 120 88 C94 88 70 92 50 104Z" fill={fill} />
          <circle cx={120} cy={36} r={5} fill={dark} />
          <circle cx={120} cy={66} r={10} fill="#fff" opacity={0.9} />
          <path d="M54 100 C80 86 160 86 190 98 C204 104 206 116 192 118 C160 104 92 104 58 112 C46 110 46 104 54 100Z" fill={dark} />
        </g>
      );
    case 'beanie':
      return (
        <g>
          <path d="M48 106 C44 50 80 30 120 30 C160 30 196 50 192 106Z" fill={fill} />
          <path d="M44 92 Q120 78 196 92 L196 116 Q120 102 44 116Z" fill={light} />
          <circle cx={120} cy={26} r={15} fill={light} />
        </g>
      );
    case 'tophat':
      return (
        <g>
          <rect x={82} y={-12} width={76} height={76} rx={6} fill={fill} />
          <rect x={82} y={44} width={76} height={12} fill={band} />
          <ellipse cx={120} cy={64} rx={74} ry={13} fill={dark} />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M74 66 L72 20 L96 42 L120 8 L144 42 L168 20 L166 66Z" fill="#ffcc33" stroke="#c98a00" strokeWidth={2.5} strokeLinejoin="round" />
          <rect x={72} y={56} width={96} height={12} rx={3} fill="#f0b400" />
          <circle cx={120} cy={44} r={6.5} fill="#ff3d6e" />
        </g>
      );
    case 'bucket':
      return (
        <g>
          <path d="M64 88 C64 48 88 34 120 34 C152 34 176 48 176 88Z" fill={fill} />
          <path d="M40 98 C60 80 180 80 200 98 C206 106 200 112 190 110 C170 96 70 96 50 110 C40 112 34 106 40 98Z" fill={dark} />
        </g>
      );
    default:
      return null;
  }
}

function GlassesShape({ kind, lens }: { kind: Glasses; lens: string }) {
  if (kind === 'round')
    return (
      <g>
        <circle cx={-27} r={18} fill="#fff" fillOpacity={0.16} stroke="#2b2b2e" strokeWidth={3.6} />
        <circle cx={27} r={18} fill="#fff" fillOpacity={0.16} stroke="#2b2b2e" strokeWidth={3.6} />
        <path d="M-9 -2 Q0 -8 9 -2" {...line('#2b2b2e', 3.6)} />
      </g>
    );
  if (kind === 'sun')
    return (
      <g>
        <path d="M-50 -12 Q-50 -16 -46 -16 L-9 -16 Q-5 -16 -5 -12 C-5 4 -14 15 -27 15 C-41 15 -50 4 -50 -12Z" fill={lens} />
        <path d="M50 -12 Q50 -16 46 -16 L9 -16 Q5 -16 5 -12 C5 4 14 15 27 15 C41 15 50 4 50 -12Z" fill={lens} />
        <path d="M-6 -12 Q0 -16 6 -12" {...line('#111', 4.5)} />
        <path d="M-42 -9 L-32 -13 M14 -9 L24 -13" {...line('#fff', 2.8)} opacity={0.55} />
      </g>
    );
  if (kind === 'aviator')
    return (
      <g stroke="#c9a24a" strokeWidth={2.6}>
        <path d="M-48 -10 C-48 -17 -7 -17 -7 -10 C-7 6 -17 17 -28 17 C-41 17 -48 6 -48 -10Z" fill="#7a4a1c" fillOpacity={0.9} />
        <path d="M48 -10 C48 -17 7 -17 7 -10 C7 6 17 17 28 17 C41 17 48 6 48 -10Z" fill="#7a4a1c" fillOpacity={0.9} />
        <path d="M-7 -13 L7 -13" fill="none" />
      </g>
    );
  if (kind === 'hearts')
    return (
      <g fill="#ff4f8b" stroke="#c41f5c" strokeWidth={2.6}>
        <path d="M-27 18 C-54 2 -50 -20 -37 -19 C-32 -19 -28 -15 -27 -11 C-26 -15 -22 -19 -17 -19 C-4 -20 0 2 -27 18Z" />
        <path d="M27 18 C0 2 4 -20 17 -19 C22 -19 26 -15 27 -11 C28 -15 32 -19 37 -19 C50 -20 54 2 27 18Z" />
      </g>
    );
  return null;
}

export function MiiFace({ name, mood, size }: { name: string; mood: string | null; size: number }) {
  const id = useId().replace(/:/g, '');
  const look = miiLook(name);
  const face: Face = FACES[(mood && MOOD_FACE[mood]) || 'normal'];
  const [rx, ry, rr] = SHAPES[look.shape];
  const cx = 120;
  const cy = 118;
  const sx = rx / 70;
  const sy = ry / 66;
  const es = look.eyeSize;
  const ex = rx * 0.38;
  const ey = cy + ry * 0.08;
  const by = ey - 15 * es - 6 - face.raise * 7;
  const ba = face.tilt * 16;
  const [leftEye, rightEye] = Array.isArray(face.eyes) ? [face.eyes[1], face.eyes[0]] : [face.eyes, face.eyes];

  const covers = look.hatStyle === 'cap' || look.hatStyle === 'beanie' || look.hatStyle === 'tophat' || look.hatStyle === 'bucket';
  const hairStyle = covers && (look.hairStyle === 'spiky' || look.hairStyle === 'bun' || look.hairStyle === 'curly') ? 'short' : look.hairStyle;
  const bare = look.top !== 'hoodie' && look.top !== 'jacket';
  const skinShade = mix(look.skin, '#000000', 0.16);
  const shirtDark = mix(look.shirt, '#000000', 0.3);
  const hatDark = mix(look.hat, '#000000', 0.3);
  const hairDark = mix(look.hair, '#000000', 0.3);
  const headT = `translate(120 118) scale(${sx} ${sy}) translate(-120 -118)`;
  const hairT = `translate(120 118) scale(${sx * 1.111} ${sy * 0.985}) translate(-100 -96)`;
  const glassScale = Math.max(1, es / 1.2);
  const url = (n: string) => `url(#${n}-${id})`;

  return (
    <svg className={`mii-face${mood ? ` mii-${mood}` : ''}`} width={size} height={size} viewBox="22 -14 196 196" aria-hidden>
      <defs>
        <radialGradient id={`sk-${id}`} cx="0.4" cy="0.32" r="0.8">
          <stop offset="0" stopColor={mix(look.skin, '#ffffff', 0.4)} />
          <stop offset="0.55" stopColor={look.skin} />
          <stop offset="1" stopColor={skinShade} />
        </radialGradient>
        <radialGradient id={`rim-${id}`} cx="0.46" cy="0.42" r="0.62">
          <stop offset="0.7" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#2a0f00" stopOpacity={0.3} />
        </radialGradient>
        <radialGradient id={`spec-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity={0.75} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`hr-${id}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={mix(look.hair, '#ffffff', 0.3)} />
          <stop offset="0.65" stopColor={look.hair} />
          <stop offset="1" stopColor={hairDark} />
        </linearGradient>
        <radialGradient id={`sh-${id}`} cx="0.36" cy="0.2" r="0.95">
          <stop offset="0" stopColor={mix(look.shirt, '#ffffff', 0.3)} />
          <stop offset="0.5" stopColor={look.shirt} />
          <stop offset="1" stopColor={shirtDark} />
        </radialGradient>
        <radialGradient id={`ht-${id}`} cx="0.36" cy="0.25" r="0.9">
          <stop offset="0" stopColor={mix(look.hat, '#ffffff', 0.3)} />
          <stop offset="0.6" stopColor={look.hat} />
          <stop offset="1" stopColor={hatDark} />
        </radialGradient>
        <linearGradient id={`lens-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#48484a" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
        <clipPath id={`tor-${id}`}>
          <path d={TORSO} />
        </clipPath>
      </defs>

      {(hairStyle === 'bob' || hairStyle === 'long') && (
        <g transform={hairT}>
          <path
            d={
              hairStyle === 'bob'
                ? 'M28 100 C24 48 60 18 100 18 C140 18 176 48 172 100 L174 150 Q156 162 140 148 L140 110 L60 110 L60 148 Q44 162 26 150Z'
                : 'M30 96 C26 44 60 14 100 14 C140 14 174 44 170 96 L178 200 Q150 212 132 192 L132 120 L68 120 L68 192 Q50 212 22 200Z'
            }
            fill={url('hr')}
          />
        </g>
      )}

      <path d="M80 190 C64 196 56 222 56 250 L88 204Z" fill={bare ? url('sk') : url('sh')} />
      <path d="M160 190 C176 196 184 222 184 250 L152 204Z" fill={bare ? url('sk') : url('sh')} />
      <path d={TORSO} fill={url('sh')} />
      <g clipPath={url('tor')}>
        {look.top === 'stripes' && [200, 222].map((y) => <rect key={y} x={60} y={y} width={120} height={10} fill={look.shirt2} />)}
        {look.top === 'jacket' && <path d="M106 176 L134 176 L130 306 L110 306Z" fill={look.shirt2} />}
        {look.top === 'jersey' && (
          <text x={120} y={232} fontSize={30} fontWeight={900} fill={look.shirt2} textAnchor="middle" fontFamily="system-ui, sans-serif">
            {look.number}
          </text>
        )}
        <ellipse cx={96} cy={200} rx={26} ry={12} fill={url('spec')} opacity={0.6} />
      </g>
      {look.top === 'hoodie' && <path d="M74 190 Q120 222 166 190 Q170 202 158 208 Q120 228 82 208 Q70 202 74 190Z" fill={shirtDark} />}
      {bare && <path d="M98 182 Q120 200 142 182" {...line(shirtDark, 4)} />}

      <ellipse cx={120} cy={cy + ry - 4} rx={rx * 0.7} ry={12} fill="#000" opacity={0.2} />
      <ellipse cx={cx - rx + 3} cy={cy + 10} rx={10} ry={13} fill={url('sk')} />
      <ellipse cx={cx + rx - 3} cy={cy + 10} rx={10} ry={13} fill={url('sk')} />
      <rect x={cx - rx} y={cy - ry} width={rx * 2} height={ry * 2} rx={rx * rr} ry={ry * rr} fill={url('sk')} />
      <rect x={cx - rx} y={cy - ry} width={rx * 2} height={ry * 2} rx={rx * rr} ry={ry * rr} fill={url('rim')} />
      <g transform={headT}>
        <ellipse cx={90} cy={80} rx={30} ry={18} fill={url('spec')} transform="rotate(-24 90 80)" />
        {look.facial === 'freckles' && (
          <g fill={mix(look.skin, '#5a2a14', 0.35)} opacity={0.6}>
            {[[76, 140], [83, 145], [71, 147], [164, 140], [157, 145], [169, 147]].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r={2} />
            ))}
          </g>
        )}
        {look.facial === 'beard' && (
          <path d="M52 124 C56 178 92 192 120 192 C148 192 184 178 188 124 C180 158 162 166 146 162 C136 174 104 174 94 162 C78 166 60 158 52 124Z" fill={url('hr')} />
        )}
      </g>
      <ellipse cx={cx - rx * 0.6} cy={cy + ry * 0.38} rx={13} ry={7} fill="#ff8fa0" opacity={face.blush ? 0.75 : 0.42} />
      <ellipse cx={cx + rx * 0.6} cy={cy + ry * 0.38} rx={13} ry={7} fill="#ff8fa0" opacity={face.blush ? 0.75 : 0.42} />

      <g transform={`translate(${cx - ex} ${ey}) scale(${es} ${es})`}>
        <EyeShape kind={leftEye} skin={look.skin} color={look.eyeColor} />
      </g>
      <g transform={`translate(${cx + ex} ${ey}) scale(${-es} ${es})`}>
        <EyeShape kind={rightEye} skin={look.skin} color={look.eyeColor} />
      </g>
      <g transform={`translate(${cx - ex} ${by}) rotate(${ba})`}>
        <path d="M-13 3 Q-1 -5 13 0" {...line(hairDark, 4.4)} />
      </g>
      <g transform={`translate(${cx + ex} ${by}) scale(-1 1) rotate(${ba})`}>
        <path d="M-13 3 Q-1 -5 13 0" {...line(hairDark, 4.4)} />
      </g>
      <path transform={`translate(120 ${cy + ry * 0.36})`} d="M-4 -3 Q-1 5 5 1" {...line(mix(look.skin, '#5a2a14', 0.35), 3)} />
      {look.facial === 'mustache' && (
        <path transform={`translate(120 ${cy + ry * 0.58 - 9})`} d="M-22 2 C-16 -7 -4 -5 0 -1 C4 -5 16 -7 22 2 C14 5 6 5 0 2 C-6 5 -14 5 -22 2Z" fill={url('hr')} />
      )}
      <g transform={`translate(120 ${cy + ry * 0.58}) scale(0.82)`}>
        <MouthShape kind={face.mouth} />
      </g>
      {face.tears && (
        <g {...line('#7cc8ff', 6)} opacity={0.9}>
          <path d={`M${cx - ex} ${ey + 12} L${cx - ex - 6} ${ey + 56}`} />
          <path d={`M${cx + ex} ${ey + 12} L${cx + ex + 6} ${ey + 56}`} />
        </g>
      )}

      {look.hatStyle === 'catEars' && (
        <g transform={headT}>
          <path d="M60 74 L50 18 L98 46Z" fill={url('hr')} />
          <path d="M64 64 L58 32 L86 48Z" fill="#ff9fb2" />
          <path d="M180 74 L190 18 L142 46Z" fill={url('hr')} />
          <path d="M176 64 L182 32 L154 48Z" fill="#ff9fb2" />
        </g>
      )}
      <g transform={hairT}>
        <Hair style={hairStyle} fill={url('hr')} />
      </g>
      <g transform={headT}>
        <Hat style={look.hatStyle} fill={url('ht')} light={mix(look.hat, '#ffffff', 0.3)} dark={hatDark} band={look.shirt2} />
      </g>
      <g transform={`translate(120 ${ey}) scale(${sx * glassScale} ${glassScale})`}>
        <GlassesShape kind={look.glasses} lens={url('lens')} />
      </g>
    </svg>
  );
}
