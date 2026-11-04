/** The chip beside the Pot pill: a stack that grows with the pot, in five steps. Bigger pots show the next step, never a bigger picture. */
const BANDS_BB = [5, 15, 40, 100];

export function potTier(pot: number, bigBlind: number): number {
  const bbs = pot / Math.max(bigBlind, 1);
  const i = BANDS_BB.findIndex((b) => bbs < b);
  return i === -1 ? BANDS_BB.length : i;
}

/** Each stack: centre x, half width and number of chips. The box is 24 × 20, chips are 3 tall. */
const STACKS: { x: number; rx: number; n: number }[][] = [
  [{ x: 12, rx: 8, n: 1 }],
  [{ x: 12, rx: 7, n: 3 }],
  [{ x: 12, rx: 7, n: 5 }],
  [
    { x: 7, rx: 5.5, n: 4 },
    { x: 17, rx: 5.5, n: 3 },
  ],
  [
    { x: 5.5, rx: 4.5, n: 4 },
    { x: 18.5, rx: 4.5, n: 3 },
    { x: 12, rx: 6, n: 6 },
  ],
];

export function PotChips({ pot, bigBlind }: { pot: number; bigBlind: number }) {
  const tier = potTier(pot, bigBlind);
  return (
    <i className="pot-chip" key={tier} aria-hidden>
      <svg viewBox="0 0 24 20" width="100%" height="100%">
        {STACKS[tier].flatMap((s) =>
          Array.from({ length: s.n }, (_, i) => {
            const cy = 16 - i * 3;
            return (
              <g key={`${s.x}:${i}`}>
                <rect className="chip-side" x={s.x - s.rx} y={cy} width={s.rx * 2} height={2.4} />
                <ellipse className="chip-top" cx={s.x} cy={cy} rx={s.rx} ry={2.4} />
                <ellipse className="chip-ring" cx={s.x} cy={cy} rx={s.rx * 0.6} ry={1.3} />
              </g>
            );
          }),
        )}
      </svg>
    </i>
  );
}
