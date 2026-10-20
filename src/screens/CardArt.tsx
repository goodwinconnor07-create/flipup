import { Emoji } from '../ui/components';

// Little scenes for Home's Host and Bots cards: glossy 3D-ish chips and a mini table drawn in SVG,
// with the players as Apple emoji on top. Everything sits in a 200×120 box on the card's right side.

type ChipColour = 'red' | 'gold' | 'green' | 'black' | 'blue';

const CHIP: Record<ChipColour, [string, string, string]> = {
  // top, side, edge spots
  red: ['#ff4d4a', '#b3151a', '#ffffff'],
  gold: ['#ffc23d', '#c47a00', '#fff7e0'],
  green: ['#34c759', '#167a35', '#ffffff'],
  black: ['#3a3a40', '#111114', '#ffd166'],
  blue: ['#2f93ff', '#0050b3', '#ffffff'],
};

/** Gradients shared by every chip and the table. */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      {(Object.keys(CHIP) as ChipColour[]).map((c) => (
        <radialGradient key={c} id={`${id}-chip-${c}`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor={CHIP[c][0]} />
          <stop offset="1" stopColor={CHIP[c][1]} />
        </radialGradient>
      ))}
      <radialGradient id={`${id}-felt`} cx="50%" cy="35%" r="70%">
        <stop offset="0" stopColor="#3fae78" />
        <stop offset="1" stopColor="#0f5a3c" />
      </radialGradient>
      <linearGradient id={`${id}-rail`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b9773f" />
        <stop offset="1" stopColor="#6b3d1c" />
      </linearGradient>
      <radialGradient id={`${id}-shadow`} cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#000" stopOpacity="0.35" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** A chip seen from slightly above: a coloured top with edge spots and a shine, and its rim below. */
function Chip({ id, c, x, y, r = 11, tilt = 0.42 }: { id: string; c: ChipColour; x: number; y: number; r?: number; tilt?: number }) {
  const ry = r * tilt;
  const side = r * 0.32;
  const spots = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      <ellipse cx={x} cy={y + side} rx={r} ry={ry} fill={CHIP[c][1]} />
      <rect x={x - r} y={y} width={r * 2} height={side} fill={CHIP[c][1]} />
      <ellipse cx={x} cy={y} rx={r} ry={ry} fill={`url(#${id}-chip-${c})`} />
      {spots.map((a) => {
        const t = (a * Math.PI) / 180;
        return <ellipse key={a} cx={x + Math.cos(t) * r * 0.82} cy={y + Math.sin(t) * ry * 0.82} rx={r * 0.13} ry={ry * 0.2} fill={CHIP[c][2]} opacity="0.95" />;
      })}
      <ellipse cx={x} cy={y} rx={r * 0.55} ry={ry * 0.55} fill="none" stroke={CHIP[c][2]} strokeOpacity="0.7" strokeWidth={r * 0.08} />
      <ellipse cx={x - r * 0.25} cy={y - ry * 0.35} rx={r * 0.45} ry={ry * 0.25} fill="#fff" opacity="0.35" />
    </g>
  );
}

/** A stack of chips, bottom first. */
function Stack({ id, colours, x, y, r = 10 }: { id: string; colours: ChipColour[]; x: number; y: number; r?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + r * 0.7} rx={r * 1.4} ry={r * 0.45} fill={`url(#${id}-shadow)`} />
      {colours.map((c, i) => (
        <Chip key={i} id={id} c={c} x={x} y={y - i * r * 0.36} r={r} />
      ))}
    </g>
  );
}

/** A chip in the air: it spins and arcs (CSS animates the group). */
function Flying({ id, c, x, y, r, n }: { id: string; c: ChipColour; x: number; y: number; r: number; n: number }) {
  return (
    <g className={`fly fly-${n}`} style={{ transformOrigin: `${x}px ${y}px` }}>
      <Chip id={id} c={c} x={x} y={y} r={r} tilt={0.75} />
    </g>
  );
}

function Face({ emoji, x, y, size }: { emoji: string; x: number; y: number; size: number }) {
  return (
    <span className="art-face" style={{ left: `${(x / 200) * 100}%`, top: `${(y / 120) * 100}%`, width: size, height: size, fontSize: size }}>
      <Emoji emoji={emoji} size={size} />
    </span>
  );
}

/** Three friends (faces no bot uses) round a little table, flicking chips into the pot. */
export function HostArt() {
  const id = 'host';
  return (
    <span className="card-art" aria-hidden>
      <svg viewBox="0 0 200 120" preserveAspectRatio="xMaxYMid meet">
        <Defs id={id} />
        <Flying id={id} c="gold" x={74} y={26} r={9} n={0} />
        <Flying id={id} c="red" x={146} y={22} r={8} n={1} />
        <Flying id={id} c="black" x={110} y={12} r={7} n={2} />
      </svg>
      <Face emoji="🎃" x={50} y={66} size={40} />
      <Face emoji="🤑" x={108} y={52} size={40} />
      <Face emoji="😸" x={166} y={66} size={40} />
      <span className="art-bubble">Free to Play!</span>
      <svg viewBox="0 0 200 120" preserveAspectRatio="xMaxYMid meet" className="card-art-front">
        <Defs id={`${id}f`} />
        <ellipse cx="112" cy="108" rx="92" ry="14" fill={`url(#${id}f-shadow)`} />
        <ellipse cx="112" cy="96" rx="86" ry="22" fill={`url(#${id}f-rail)`} />
        <ellipse cx="112" cy="93" rx="76" ry="16" fill={`url(#${id}f-felt)`} />
        <ellipse cx="112" cy="93" rx="64" ry="11" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="1" />
        <Stack id={`${id}f`} colours={['red', 'red', 'gold', 'gold']} x={92} y={92} r={9} />
        <Stack id={`${id}f`} colours={['black', 'green', 'green']} x={122} y={94} r={9} />
        <Stack id={`${id}f`} colours={['blue', 'red']} x={146} y={92} r={8} />
      </svg>
    </span>
  );
}

const LINEUP = ['🐸', '🤩', '🦊', '🐼', '🤠', '🐙'];

/** The bots lined up, each flipping a chip. */
export function BotsArt() {
  const id = 'bots';
  const colours: ChipColour[] = ['red', 'gold', 'green', 'black', 'blue', 'gold'];
  return (
    <span className="card-art" aria-hidden>
      <svg viewBox="0 0 200 120" preserveAspectRatio="xMaxYMid meet">
        <Defs id={id} />
        <ellipse cx="116" cy="110" rx="86" ry="9" fill={`url(#${id}-shadow)`} />
        {LINEUP.map((_, i) => (
          <Flying key={i} id={id} c={colours[i]} x={50 + i * 26} y={30 + (i % 2) * 12} r={7} n={i % 4} />
        ))}
        
      </svg>
      {LINEUP.map((e, i) => (
        <Face key={e} emoji={e} x={50 + i * 26} y={82 - (i % 2) * 5} size={30} />
      ))}
    </span>
  );
}
