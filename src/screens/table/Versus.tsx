import { useEffect, useState } from 'react';
import { legendById, TIMING, type Game, type Player } from '../../game';
import { Emoji } from '../../ui/components';
import { haptic } from '../../ui/effects';
import { playSound } from '../../ui/sound';
import { LEGEND_SCENES } from '../botScenes';

/**
 * The opener for a heads-up game, in the style of a platform fighter's versus screen: two team-coloured
 * panels split by a jagged lightning seam, each fighter struck onto their panel by a bolt, VS slamming
 * down with a shake, and the rays running from the middle out to the corners of each panel. It plays
 * for `TIMING.versusDelay` (the game waits that long before the bot may speak) and then clears itself.
 * Tap it to skip. The delays in the stylesheet are timed to this length.
 */

/** The seam between the panels: a zigzag along the line from (0, 57) to (100, 43), in percent of the screen. */
const SEAM: [number, number][] = Array.from({ length: 11 }, (_, i) => {
  const x = i * 10;
  const kick = i === 0 || i === 10 ? 0 : i % 2 ? -3.2 : 3.2;
  return [x, Math.round((57 - 0.14 * x + kick) * 10) / 10];
});
const pts = (list: [number, number][]) => list.map(([x, y]) => `${x},${y}`).join(' ');
const poly = (list: [number, number][]) => `polygon(${list.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
const TOP_SHAPE = poly([[0, 0], [100, 0], ...[...SEAM].reverse()]);
const BOTTOM_SHAPE = poly([...SEAM, [100, 100], [0, 100]]);

/** Points round the edge of a panel, corners included, going from one end of the seam to the other. */
const edge = (from: [number, number], to: [number, number], steps: number): [number, number][] =>
  Array.from({ length: steps }, (_, i) => [from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps]);
const TOP_EDGE: [number, number][] = [...edge([0, 57], [0, 0], 4), ...edge([0, 0], [100, 0], 8), ...edge([100, 0], [100, 43], 4), [100, 43]];
const BOTTOM_EDGE: [number, number][] = [...edge([100, 43], [100, 100], 4), ...edge([100, 100], [0, 100], 8), ...edge([0, 100], [0, 57], 4), [0, 57]];

/** Rays from the middle of the screen (where VS lands) to evenly spaced points round the panel, so the edges of the rays meet its corners. */
function Rays({ edgePts }: { edgePts: [number, number][] }) {
  return (
    <svg className="vs-rays" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {edgePts.slice(0, -1).map((p, i) =>
        i % 2 ? null : <polygon key={i} points={`50,50 ${p[0]},${p[1]} ${edgePts[i + 1][0]},${edgePts[i + 1][1]}`} />,
      )}
    </svg>
  );
}

/** A bolt that draws itself from off the corner to where the fighter stands. */
function Bolt({ d, side }: { d: string; side: 'you' | 'foe' }) {
  return (
    <svg className={`vs-bolt vs-bolt-${side}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <polyline points={d} pathLength={1} className="vs-bolt-glow" />
      <polyline points={d} pathLength={1} className="vs-bolt-core" />
    </svg>
  );
}

export function Versus({ me, foe }: { game: Game; me: Player; foe: Player }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const beats = [
      setTimeout(() => haptic('light'), 380),
      setTimeout(() => haptic('light'), 580),
      setTimeout(() => {
        haptic('heavy');
        playSound('allin');
      }, 850),
      setTimeout(() => setDone(true), TIMING.versusDelay),
    ];
    return () => beats.forEach(clearTimeout);
  }, []);
  if (done) return null;

  const legend = foe.legend ? legendById(foe.legend) : undefined;
  const scene = legend ? LEGEND_SCENES[legend.id] : undefined;
  const tag = legend ? `Legend · Level ${legend.rung}` : foe.ai ? 'AI twin' : foe.bot ? 'Bot' : 'Player';
  return (
    <div
      className={`versus${legend ? ' legend' : ''}`}
      style={scene ? { ['--foe-top' as string]: scene.bg[0], ['--foe-bot' as string]: scene.bg[1] } : undefined}
      role="img"
      aria-label={`${me.name} versus ${foe.name}`}
      onClick={() => setDone(true)}
    >
      <div className="vs-stage">
        <div className="vs-half vs-you" style={{ clipPath: TOP_SHAPE }}>
          <Rays edgePts={TOP_EDGE} />
          <span className="vs-face">
            <Emoji emoji={me.emoji} size={150} />
          </span>
          <span className="vs-plate">
            <small>{foe.bot || foe.ai ? 'You' : 'Player 1'}</small>
            <b>{me.name}</b>
          </span>
        </div>
        <div className="vs-half vs-foe" style={{ clipPath: BOTTOM_SHAPE }}>
          <Rays edgePts={BOTTOM_EDGE} />
          <span className="vs-face">
            <Emoji emoji={foe.emoji} size={150} />
          </span>
          <span className="vs-plate">
            <small>{tag}</small>
            <b>{foe.name}</b>
          </span>
        </div>
        <Bolt side="you" d="-6,-8 8,8 3,11 17,16 11,20 26,22 21,26 33,25" />
        <Bolt side="foe" d="106,108 92,92 97,89 83,84 89,80 74,78 79,74 67,75" />
        <svg className="vs-seam" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <polyline points={pts(SEAM)} pathLength={1} className="vs-bolt-glow" />
          <polyline points={pts(SEAM)} pathLength={1} className="vs-bolt-core" />
        </svg>
        <span className="vs-vs" aria-hidden>
          VS
        </span>
      </div>
    </div>
  );
}
