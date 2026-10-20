import { PlayingCard } from '../ui/components';

// Chips and cards drifting slowly behind Home. All CSS, no image files.
const CHIPS = [
  { x: 12, y: 24, s: 30, c: 'var(--red)', d: 0, t: 26 },
  { x: 82, y: 20, s: 26, c: 'var(--blue)', d: -7, t: 32 },
  { x: 24, y: 64, s: 34, c: 'var(--green)', d: -13, t: 30 },
  { x: 74, y: 70, s: 28, c: 'var(--gold)', d: -4, t: 36 },
  { x: 50, y: 88, s: 24, c: 'var(--red)', d: -19, t: 28 },
  { x: 90, y: 52, s: 22, c: 'var(--blue)', d: -10, t: 34 },
];

const CARDS = [
  { card: 'Qd', x: 6, y: 40, d: -3, t: 38 },
  { card: 'Jc', x: 84, y: 58, d: -15, t: 42 },
  { card: 'Ts', x: 48, y: 74, d: -22, t: 40 },
];

export function CasinoBackdrop() {
  return (
    <div className="casino" aria-hidden>
      {CHIPS.map((c, i) => (
        <i key={i} className="drift-chip" style={{ left: `${c.x}%`, top: `${c.y}%`, width: c.s, height: c.s, ['--chip' as string]: c.c, animationDelay: `${c.d}s`, animationDuration: `${c.t}s` }} />
      ))}
      {CARDS.map((c) => (
        <PlayingCard key={c.card} card={c.card} size="sm" className="drift-card" style={{ left: `${c.x}%`, top: `${c.y}%`, animationDelay: `${c.d}s`, animationDuration: `${c.t}s` }} />
      ))}
    </div>
  );
}
