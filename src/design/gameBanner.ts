// The lobby's game card as a scene (21 Nov 2026, the owner's ask, from a reference card where the picture is the
// whole card): each game's own sticker subject drawn big on the left with a set behind it (a table's rail, a night
// with a moon, a bridge over three rivers...). It stands still (23 Nov 2026, the owner: with the page's light moving
// too, a card full of bobbing cards and falling particles was a step too far). Pure data in the gameArt.ts system: flat
// fields, the shared ink outline and the hard shadow, no gradients or blurs inside the picture. The app draws it in
// native/src/components/lobby/game-banner.tsx.
//
// Units: the subject's own 100 × 100 square sits at the left of the card with its bottom on the card's bottom, so
// y = 100 is the card's bottom edge and the card shows whatever height and width it has above and to the right.
// Set pieces reach well past the right (to 600) and up (to -60), so every card size is covered.
import { CIRCLE_HOURS, type Variant } from '../game/variants';
import { flat, gameLook, gameSubject, GLOW, GREEN, GREEN_DARK, INK, ink, oval, OUTLINE, POWER_FRAME, rr, SCATTER, SUIT_PATH, WHITE, type PathShape, type Shape } from './gameArt';

/** One layer of the scene, back to front. `box` is the part of the picture it's drawn in (x, y, w, h). */
export interface BannerLayer {
  shapes: Shape[];
  /** Left out: the whole card. */
  box?: [number, number, number, number];
}

export interface Banner {
  /** Back to front: the set, then the subject's parts. */
  layers: BannerLayer[];
}

// ── Pieces of a set ─────────────────────────────────────────────────────────

const n = (v: number) => Math.round(v * 100) / 100;

/** A light tone's suit scattered across the card's right side (it shows dimly through the shade behind the words). */
function scatter(v: Variant, tone: string, at: [number, number, number, number][] = SCATTER_AT): Shape[] {
  const d = SUIT_PATH[SCATTER[v]];
  return at.map(([x, y, r, s]) => flat(d, tone, { t: `translate(${x} ${y}) rotate(${r}) scale(${s})` }));
}
const SCATTER_AT: [number, number, number, number][] = [
  [-4, 12, -18, 1.1],
  [120, 14, -14, 1.3],
  [158, 80, 12, 1.0],
  [206, 30, 20, 1.6],
  [250, 88, -10, 1.2],
  [292, 18, 8, 1.0],
  [334, 66, -18, 1.5],
  [384, 26, 14, 1.2],
  [436, 78, -8, 1.4],
];

/** A row of waves from far left to far right, crests at `y`, filled down past the bottom. `flow` slides it by 20. */
function wavePath(y: number, shift: number): string {
  let d = `M${-60 + shift} ${y}`;
  for (let x = -60 + shift; x < 640; x += 20) d += 'q5 -7 10 0t10 0';
  return d;
}
const wideWaves = (y: number, fill: string, shift = 0): PathShape => flat(`${wavePath(y, shift)}V140H${-60 + shift}Z`, fill);
/** The crests' outline, for a layer that only shows it beside the picture (`WAVE_LINES`): it would cross the words. */
const waveLine = (y: number, shift = 0): PathShape => ({ kind: 'path', d: wavePath(y, shift), stroke: INK, sw: 2.4 });
/** Where the waves' outline shows: under the picture, ending before the words. */
const waveLines = (y: number): [number, number, number, number] => [-10, y - 10, 112, 24];

/** Little white glints on water. */
const glints = (pts: [number, number][], opacity = 0.55): PathShape => ({ kind: 'path', d: pts.map(([x, y]) => `M${x} ${y}q4 -4 8 0`).join(''), stroke: WHITE, sw: 1.8, opacity });

/** Stars: small white dots, some brighter. */
function stars(pts: [number, number, number][]): Shape[] {
  return pts.map(([x, y, r]) => flat(oval(x, y, r), WHITE, { opacity: r > 0.9 ? 0.75 : 0.45 }));
}
const STARS: [number, number, number][] = [
  [8, 6, 0.8],
  [30, -4, 1.1],
  [96, 4, 0.7],
  [114, 40, 0.9],
  [146, -2, 1.2],
  [172, 22, 0.7],
  [208, 6, 1],
  [236, 34, 0.7],
  [262, -6, 0.9],
  [298, 16, 1.2],
  [330, 40, 0.7],
  [362, 4, 1],
  [404, 28, 0.8],
  [452, 10, 1.1],
];

/** A beam of light from above, widening as it falls. */
const beam = (x: number, tilt: number, w0: number, w1: number, opacity: number): PathShape =>
  flat(`M${x - w0 / 2} -60L${x + w0 / 2} -60L${x + w1 / 2} 110L${x - w1 / 2} 110Z`, WHITE, { opacity, t: `rotate(${tilt} ${x} -60)` });

/** A cloud: three puffs and a flat base, outlined once round the whole shape. */
function cloud(x: number, y: number, s: number): Shape[] {
  const d = `M${x - 16 * s} ${y + 6 * s}a${7 * s} ${7 * s} 0 0 1 ${3 * s} ${-12 * s}a${9 * s} ${9 * s} 0 0 1 ${16 * s} ${-5 * s}a${8 * s} ${8 * s} 0 0 1 ${15 * s} ${5 * s}a${6.5 * s} ${6.5 * s} 0 0 1 ${2 * s} ${12 * s}Z`;
  return [ink(d, WHITE, { noShadow: true, sw: OUTLINE * 0.8 }), flat(`M${x - 11 * s} ${y + 2.5 * s}h${19 * s}`, '#cfe9fb')];
}

/** A small bolt of lightning. */
const bolt = (x: number, y: number, s: number, r: number, fill: string, opacity = 1): PathShape =>
  flat('M4.5 -21L-11 3H-1.5L-5.5 21L11.5 -5H1.5Z', fill, { opacity, t: `translate(${x} ${y}) rotate(${r}) scale(${s})` });

/** A point on a quadratic curve. */
const quad = (t: number, a: [number, number], c: [number, number], b: [number, number]): [number, number] => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
];

/** A suspension bridge: two towers, the deck, the main cable and its hangers. */
function bridge(fill: string, cable: string): Shape[] {
  const spans: [[number, number], [number, number], [number, number]][] = [
    [[40, 50], [92, 40], [136, 8]],
    [[136, 8], [186, 52], [236, 8]],
    [[236, 8], [280, 40], [340, 50]],
  ];
  let hangers = '';
  for (const [a, c, b] of spans) {
    for (let i = 1; i < 8; i++) {
      const [x, y] = quad(i / 8, a, c, b);
      if (y < 51) hangers += `M${n(x)} ${n(y)}V54`;
    }
  }
  const cablePath = spans.map(([a, c, b], i) => `${i ? '' : `M${a[0]} ${a[1]}`}Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`).join('');
  return [
    { kind: 'path', d: hangers, stroke: cable, sw: 1, opacity: 0.55 },
    { kind: 'path', d: cablePath, stroke: cable, sw: 2.2 },
    ink(rr(131, 2, 10, 58, 2), fill, { sw: 2.2 }),
    ink(rr(231, 2, 10, 58, 2), fill, { sw: 2.2 }),
    ink(rr(20, 53, 600, 6, 2), fill, { sw: 2.2 }),
  ];
}

/** The subject's parts as layers: `[from, to, box?]` over gameSubject()'s shapes. */
type Part = [number, number, [number, number, number, number]?];
/** The subject's square with room for its outlines and shadows. */
const SQUARE: [number, number, number, number] = [-8, -8, 116, 116];

function parts(v: Variant, list: Part[]): BannerLayer[] {
  const subject = gameSubject(v);
  return list.map(([from, to, box]) => ({ shapes: subject.slice(from, to), box: box ?? SQUARE }));
}
/** A box `r` either way round a point. */
const around = (x: number, y: number, r: number): [number, number, number, number] => [x - r, y - r, r * 2, r * 2];

// ── The games ───────────────────────────────────────────────────────────────



const BANNERS: Record<Variant, () => Banner> = {
  // A seat at the table: the rail across the bottom and the betting line on the felt.
  holdem: () => {
    const { tone, band } = gameLook('holdem');
    return {
      layers: [
        {
          shapes: [
            ...scatter('holdem', tone),
            flat(oval(50, 50, 44), tone),
            { kind: 'path', d: oval(230, 178, 400, 136), stroke: WHITE, sw: 1.4, dash: '4 5', opacity: 0.22 },
            ink(oval(230, 196, 360, 116), band, { noShadow: true }),
            { kind: 'path', d: oval(230, 198, 352, 109), stroke: tone, sw: 1.6, opacity: 0.7 },
          ],
        },
        ...parts('holdem', [
          [0, 2],
          [2, 3],
          [3, 4, around(76, 76, 15)],
          [4, 5, around(76, 76, 15)],
        ]),
      ],
    };
  },
  // A sunny beach: rays from behind the cards, the sun, a dune.
  pineapple: () => {
    const { tone } = gameLook('pineapple');
    const rays = Array.from({ length: 9 }, (_, i) => {
      const a = ((i * 40 - 10) * Math.PI) / 180;
      const b = ((i * 40 + 8) * Math.PI) / 180;
      return `M52 50L${n(52 + Math.cos(a) * 320)} ${n(50 + Math.sin(a) * 320)}L${n(52 + Math.cos(b) * 320)} ${n(50 + Math.sin(b) * 320)}Z`;
    }).join('');
    return {
      layers: [
        {
          shapes: [
            flat(rays, tone),
            flat(oval(52, 50, 40), tone),
            ink(oval(90, 13, 7), '#ffd23f', { noShadow: true }),
            ink('M-20 94C30 84 70 86 110 92S200 82 260 88S380 86 640 90V140H-20Z', '#ffe08a', { noShadow: true }),
            { kind: 'path', d: 'M150 96q4 -3 8 0M190 93q4 -3 8 0M240 97q4 -3 8 0', stroke: '#d9a93a', sw: 1.6 },
          ],
        },
        ...parts('pineapple', [
          [0, 2],
          [2, 3],
        ]),
      ],
    };
  },
  // Loud: a halftone of dots fading to the right, the big wild 2 and its sparkles.
  deuces: () => {
    const { tone } = gameLook('deuces');
    const dots: string[] = [];
    for (let x = 98; x < 520; x += 12) {
      for (let y = -50; y < 110; y += 12) {
        const r = Math.max(0, 3.2 - (x - 98) / 110);
        if (r > 0.4) dots.push(oval(x + ((y / 12) % 2 ? 6 : 0), y, n(r)));
      }
    }
    return {
      layers: [
        { shapes: [flat(dots.join(''), tone), flat(oval(50, 50, 44), tone), ...scatter('deuces', tone, SCATTER_AT.slice(2))] },
        ...parts('deuces', [
          [0, 1],
          [1, 2, around(17, 26, 13)],
          [2, 3, around(85, 22, 10)],
          [3, 4, around(83, 74, 14)],
          [4, 5, around(15, 72, 10)],
        ]),
      ],
    };
  },
  // A cold night: the moon, stars, hills and two headstones by the ghost.
  ghost: () => {
    const { tone, band } = gameLook('ghost');
    return {
      layers: [
        {
          shapes: [
            ...stars(STARS),
            ink(oval(90, 13, 7), '#fff4cf', { noShadow: true }),
            flat(`${oval(88, 11, 1.8)}${oval(92.5, 15.5, 1.2)}${oval(92, 9.5, 0.9)}`, '#ecdca6'),
            flat(oval(50, 50, 44), tone),
            flat('M-20 88C30 76 80 80 130 86S240 74 320 82S460 76 640 84V140H-20Z', band),
            ink(`M80 90V78a6 6 0 0 1 12 0V90Z`, '#8a8ed6', { sw: 2 }),
            ink(`M94 91V83a4.5 4.5 0 0 1 9 0V91Z`, '#8a8ed6', { sw: 2 }),
            { kind: 'path', d: 'M84 83h4M97 86.5h3', stroke: INK, sw: 1.4, opacity: 0.5 },
          ],
        },
        ...parts('ghost', [[0, 4]]),
      ],
    };
  },
  // Night over the rivers: stars, a suspension bridge, two rows of water, three cards on it.
  pittsburgh: () => {
    const { tone, band } = gameLook('pittsburgh');
    return {
      layers: [
        { shapes: [...stars(STARS), flat(oval(50, 44, 40), tone), ...bridge(band, '#c6d4e3')] },
        { shapes: [wideWaves(71, '#9fd4ff', 4)] },
        { shapes: [waveLine(71, 4)], box: waveLines(71) },
        { shapes: [wideWaves(80, '#5fa8e8'), glints([[12, 90], [46, 94], [76, 89], [128, 92], [176, 95], [224, 90]])] },
        { shapes: [waveLine(80)], box: waveLines(80) },
        ...parts('pittsburgh', [
        [3, 4, around(22, 44, 26)],
        [4, 5, around(78, 44, 26)],
        [5, 6, around(50, 38, 28)],
      ])],
    };
  },
  // A craps table: the pass line's curves, dice ghosted into the felt.
  dice: () => {
    const { tone } = gameLook('dice');
    const ghostDie = (x: number, y: number, r: number) => flat(rr(-10, -10, 20, 20, 4.5), tone, { t: `translate(${x} ${y}) rotate(${r})` });
    return {
      layers: [
        {
          shapes: [
            flat(oval(50, 50, 44), tone),
            { kind: 'path', d: 'M-20 96C60 74 220 64 640 74', stroke: WHITE, sw: 2.2, opacity: 0.4 },
            { kind: 'path', d: 'M-20 106C60 84 220 76 640 86', stroke: WHITE, sw: 1.4, dash: '5 5', opacity: 0.3 },
            ghostDie(130, 24, -16),
            ghostDie(196, 52, 22),
            ghostDie(268, 22, 8),
            ghostDie(340, 56, -10),
            flat(`${oval(126, 20, 1.8)}${oval(134, 28, 1.8)}${oval(196, 52, 1.8)}${oval(264, 18, 1.8)}${oval(272, 26, 1.8)}${oval(268, 22, 1.8)}`, gameLook('dice').card[0]),
          ],
        },
        ...parts('dice', [
          [0, 1],
          [1, 2, around(67, 66, 30)],
        ]),
      ],
    };
  },
  // Dusk on a red river: the low sun, far hills, the card riding between two rows of waves.
  redriver: () => {
    const { tone, band } = gameLook('redriver');
    return {
      layers: [
        { shapes: [flat(oval(50, 44, 40), tone), flat(oval(132, 62, 26), '#ff9c8c', { opacity: 0.55 }), flat('M-20 66C40 56 110 60 170 64S300 54 400 60S520 56 640 60V140H-20Z', band, { opacity: 0.6 })] },
        { shapes: [wideWaves(64, '#b81c2e', 6)] },
        { shapes: [waveLine(64, 6)], box: waveLines(64) },
        ...parts('redriver', [[1, 2]]),
        { shapes: [wideWaves(72, '#8f1322'), glints([[14, 84], [58, 88], [80, 80], [122, 86], [170, 90], [214, 84]], 0.5)] },
        { shapes: [waveLine(72)], box: waveLines(72) },
      ],
    };
  },
  // A chapel window: an arch of light behind the cross, beams from above, dust in the light. The cards ripple.
  crucifix: () => {
    const { tone, band } = gameLook('crucifix');
    const arch = (x: number, y: number, w: number, h: number) => `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`;
    return {
      layers: [
        {
          shapes: [
            flat(arch(8, 2, 84, 110), tone),
            ...[140, 196, 252, 308, 364].map((x) => flat(arch(x - 14, 14, 28, 70), band, { opacity: 0.7 })),
            ...[140, 196, 252, 308, 364].map((x): PathShape => ({ kind: 'path', d: `M${x} 28V84M${x - 14} 52H${x + 14}`, stroke: tone, sw: 1.4, opacity: 0.6 })),
            beam(50, -6, 30, 90, 0.08),
            beam(50, 8, 14, 60, 0.06),
          ],
        },
        ...parts(
          'crucifix',
          (
            [
              [50, 22],
              [27.5, 50],
              [72.5, 50],
              [50, 78],
              [50, 50],
            ] as const
          ).map(([x, y], i): Part => [i, i + 1, around(x, y, 19)]),
        ),
      ],
    };
  },
  // A big clock face: sixty ticks round the cards, the hands going round, the cards rippling hour by hour.
  circle: () => {
    const { tone } = gameLook('circle');
    let small = '';
    let big = '';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * 2 * Math.PI;
      const [s, c] = [Math.sin(a), Math.cos(a)];
      const r0 = i % 5 ? 45 : 42;
      const seg = `M${n(50 + s * r0)} ${n(50 - c * r0)}L${n(50 + s * 48)} ${n(50 - c * 48)}`;
      if (i % 5) small += seg;
      else big += seg;
    }
    return {
      layers: [
        {
          shapes: [
            flat(oval(50, 50, 50), tone),
            { kind: 'path', d: small, stroke: WHITE, sw: 1, opacity: 0.35 },
            { kind: 'path', d: big, stroke: WHITE, sw: 2.4, opacity: 0.6 },
            ...scatter('circle', tone, SCATTER_AT.slice(1)),
            { kind: 'path', d: `${oval(196, 46, 30)}`, stroke: tone, sw: 2.4 },
            { kind: 'path', d: `${oval(330, 30, 22)}`, stroke: tone, sw: 2 },
          ],
        },
        ...parts('circle', [[0, 1, around(50, 50, 22)]]),
        { shapes: [{ kind: 'path', d: 'M50 50L56 53.5', stroke: INK, sw: 3 }], box: around(50, 50, 14) },
        { shapes: [{ kind: 'path', d: 'M50 50V39', stroke: INK, sw: 2.6 }], box: around(50, 50, 14) },
        ...parts('circle', [[2, 3, around(50, 50, 6)]]),
        ...parts(
          'circle',
          CIRCLE_HOURS.map((h, i): Part => {
            const a = (h / 12) * 2 * Math.PI;
            return [3 + i, 4 + i, around(n(50 + Math.sin(a) * 34), n(50 - Math.cos(a) * 34), 16)];
          }),
        ),
      ],
    };
  },
  // Rows of dashed card outlines (the twenty that went), a few filled in.
  memory: () => {
    const { tone } = gameLook('memory');
    let gaps = '';
    let seen = '';
    let k = 0;
    for (let x = 108; x < 560; x += 26) {
      for (let y = -36; y < 100; y += 34) {
        k++;
        if (k % 5 === 2) seen += rr(x, y, 18, 26, 3);
        else gaps += rr(x, y, 18, 26, 3);
      }
    }
    return {
      layers: [{ shapes: [flat(oval(50, 50, 44), tone), flat(seen, tone), { kind: 'path', d: gaps, stroke: WHITE, sw: 1.2, dash: '3 3', opacity: 0.18 }] }, ...parts('memory', [
        [0, 2],
        [2, 3, around(67, 30, 13)],
        [3, 4, around(33, 72, 13)],
        [4, 5, around(33, 30, 22)],
        [5, 6, around(67, 72, 22)],
      ])],
    };
  },
  // Up in the sky: small clouds, a green hill where the stalk grows.
  beanstalk: () => {
    const { tone } = gameLook('beanstalk');
    return {
      layers: [
        { shapes: [flat(oval(50, 50, 44), tone), ...scatter('beanstalk', tone, SCATTER_AT.slice(3))] },
        { shapes: cloud(86, 11, 0.5), box: around(86, 9, 18) },
        { shapes: cloud(300, 12, 0.7), box: around(300, 10, 26) },
        { shapes: [ink('M-30 104C0 90 70 88 110 104Z', GREEN_DARK, { noShadow: true }), { kind: 'path', d: 'M10 98l2 -4M26 95l1 -4M80 96l1 -4', stroke: GREEN, sw: 1.6 }], box: [-30, 80, 150, 30] },
        ...parts('beanstalk', [[0, 12, [-8, -8, 116, 120]]]),
      ],
    };
  },
  // A casino at night: a spotlight on the hand, the table's edge and its gold line.
  bjholdem: () => {
    const { tone } = gameLook('bjholdem');
    return {
      layers: [
        {
          shapes: [
            beam(48, 0, 40, 120, 0.06),
            flat(oval(50, 50, 44), tone),
            ...scatter('bjholdem', tone, SCATTER_AT.slice(2)),
            { kind: 'path', d: oval(230, 178, 400, 136), stroke: GLOW, sw: 1.4, dash: '4 5', opacity: 0.28 },
            ink(oval(230, 196, 360, 116), '#191c27', { noShadow: true }),
            { kind: 'path', d: oval(230, 198, 352, 109), stroke: tone, sw: 1.6, opacity: 0.8 },
          ],
        },
        ...parts('bjholdem', [
          [0, 2],
          [2, 5, around(75, 75, 22)],
        ]),
      ],
    };
  },
  // Charged: rings of power round the power card, bolts in the dark.
  power: () => {
    const { tone, band } = gameLook('power');
    return {
      layers: [
        { shapes: [flat(oval(50, 50, 44), tone), bolt(132, 26, 0.7, 14, band), bolt(214, 70, 0.6, -18, band), bolt(300, 24, 0.8, 8, band), bolt(380, 66, 0.6, -6, band)] },
        { shapes: [{ kind: 'path', d: oval(62, 50, 46), stroke: POWER_FRAME, sw: 2.2, opacity: 0.6 }], box: around(62, 50, 50) },
        { shapes: [{ kind: 'path', d: oval(62, 50, 46), stroke: WHITE, sw: 1.6, opacity: 0.5 }], box: around(62, 50, 50) },
        ...parts('power', [
          [0, 1],
          [1, 2],
          [2, 3, around(86, 22, 10)],
          [3, 4, around(84, 80, 13)],
        ]),
      ],
    };
  },
};

export const gameBanner = (v: Variant): Banner => (BANNERS[v] ?? BANNERS.holdem)();

