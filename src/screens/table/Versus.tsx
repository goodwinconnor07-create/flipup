import { useEffect, useState } from 'react';
import { legendById, TIMING, type Game, type Player } from '../../game';
import { chips, Emoji } from '../../ui/components';
import { haptic } from '../../ui/effects';
import { playSound } from '../../ui/sound';
import { LEGEND_SCENES, sceneFor } from '../botScenes';

/**
 * The fighting-game intro before a heads-up game: two panels cut by a slash fly in from either side,
 * the faces slam in behind them, VS lands with a shake and a flash, the names slide in, and it
 * ends on "Deal!". It runs on the game's own start wait (`TIMING.versusDelay`) and is gone the
 * moment the first hand is dealt. Tap it to skip the show.
 */
export function Versus({ game, me, foe }: { game: Game; me: Player; foe: Player }) {
  const [skipped, setSkipped] = useState(false);
  // The slam: a haptic and a thud on the beat VS lands.
  useEffect(() => {
    const t = setTimeout(() => {
      haptic('heavy');
      playSound('allin');
    }, 1000);
    return () => clearTimeout(t);
  }, []);
  if (skipped) return null;

  const legend = foe.legend ? legendById(foe.legend) : undefined;
  const scene = legend ? LEGEND_SCENES[legend.id] : undefined;
  const foeScene = scene ?? sceneFor(foe.emoji);
  const tag = legend ? `Legend · Level ${legend.rung}` : foe.ai ? 'AI twin' : foe.bot ? 'Bot' : 'Player';
  const ms = TIMING.versusDelay;
  return (
    <div
      className={`versus${legend ? ' legend' : ''}`}
      style={{ ['--vs-ms' as string]: `${ms}ms`, ['--foe-top' as string]: foeScene.bg[0], ['--foe-bot' as string]: foeScene.bg[1] }}
      role="img"
      aria-label={`${me.name} versus ${foe.name}`}
      onClick={() => setSkipped(true)}
    >
      <div className="vs-half vs-you">
        <i className="vs-glow" aria-hidden />
        <span className="vs-face">
          <Emoji emoji={me.emoji} size={150} />
        </span>
        <span className="vs-plate">
          <small>{tag === 'Player' ? 'Player' : 'You'}</small>
          <b>{me.name}</b>
        </span>
      </div>
      <div className="vs-half vs-foe">
        <i className="vs-glow" aria-hidden />
        {foeScene.props.map((p, i) => (
          <span key={i} className={`vs-prop vs-prop-${i}`} aria-hidden>
            {p}
          </span>
        ))}
        <span className="vs-face">
          <Emoji emoji={foe.emoji} size={150} />
        </span>
        <span className="vs-plate">
          <small>{tag}</small>
          <b>{foe.name}</b>
        </span>
      </div>
      <i className="vs-slash" aria-hidden />
      <i className="vs-ring" aria-hidden />
      <span className="vs-vs" aria-hidden>
        VS
      </span>
      <i className="vs-flash" aria-hidden />
      <span className="vs-blinds">
        Blinds {chips(game.settings.smallBlind)}/{chips(game.settings.bigBlind)}
      </span>
      <span className="vs-deal" aria-hidden>
        Deal!
      </span>
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} className={`vs-line vs-line-${i % 7}`} style={{ ['--i' as string]: i }} aria-hidden />
      ))}
    </div>
  );
}
