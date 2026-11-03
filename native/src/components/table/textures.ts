// Surface detail for the table, drawn with the only gradients iOS has (linear and radial): a gradient with many hard
// stops stands in for a repeating one. Kept faint, so they read as material, never as pattern.

/** Stripes from `stops` (start%, end%) pairs in one colour, transparent between. */
function stripes(angle: number, colour: string, bands: [number, number][]): string {
  const parts = ['transparent 0%'];
  for (const [a, b] of bands) parts.push(`transparent ${a}%`, `${colour} ${a}%`, `${colour} ${b}%`, `transparent ${b}%`);
  parts.push('transparent 100%');
  return `linear-gradient(${angle}deg, ${parts.join(', ')})`;
}

/** Uneven grain lines along a wooden rail: dark and light bands of different widths, with a little knot shading. */
export const WOOD_GRAIN = [
  stripes(178, 'rgba(40, 18, 4, 0.22)', [[4, 5.5], [11, 11.8], [17, 19.5], [26, 26.6], [31, 33], [40, 40.7], [47, 49.5], [55, 55.8], [61, 63.5], [70, 70.6], [76, 78.5], [85, 85.7], [91, 93]]),
  stripes(176, 'rgba(255, 220, 170, 0.10)', [[7, 9], [21, 22.5], [36, 38], [51, 52], [66, 68], [80, 81.5], [94, 96]]),
  'radial-gradient(ellipse 18% 9% at 22% 30%, rgba(40, 18, 4, 0.22) 0%, transparent 100%)',
  'radial-gradient(ellipse 14% 7% at 74% 72%, rgba(40, 18, 4, 0.18) 0%, transparent 100%)',
].join(', ');

const weaveBands = (step: number, width: number): [number, number][] => Array.from({ length: Math.floor(100 / step) }, (_, i) => [i * step, i * step + width] as [number, number]);

/** A fine cross-weave over the felt, like the nap of a real cloth. */
export const FELT_WEAVE = [stripes(45, 'rgba(255, 255, 255, 0.035)', weaveBands(1.6, 0.6)), stripes(-45, 'rgba(0, 0, 0, 0.05)', weaveBands(1.6, 0.6))].join(', ');
