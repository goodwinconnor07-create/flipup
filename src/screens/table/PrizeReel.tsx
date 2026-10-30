import { useEffect, useState } from 'react';
import { FORMATS, venueById, type Game } from '../../game';
import { haptic, reducedMotion } from '../../ui/effects';
import { playSound } from '../../ui/sound';

/** How long the reel turns before it stops (matches .prize-strip's transition in campaign.css). */
const SPIN_MS = 1800;
/** How long the result stays up before the cards come. */
const HOLD_MS = 1300;
/** Laps of the reel before it stops on the draw. */
const LAPS = 4;

/**
 * A campaign tournament's prize, drawn when it opened, shown as a slot reel that spins and stops on the multiple of
 * the buy-in before the first deal. Shown once per table; a tap skips it.
 */
export function PrizeReel({ game }: { game: Game }) {
  const tag = game.campaign;
  const venue = tag?.kind === 'sng' ? venueById(tag.venue) : undefined;
  const due = !!venue && !!tag?.prize && game.status === 'playing' && !game.hand && (game.hands ?? 0) === 0;
  const [gone, setGone] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (!due || gone) return;
    const calm = reducedMotion();
    const roll = requestAnimationFrame(() => setRolling(true));
    const stop = setTimeout(
      () => {
        setStopped(true);
        haptic('success');
        playSound('collect');
      },
      calm ? 0 : SPIN_MS,
    );
    const done = setTimeout(() => setGone(true), (calm ? 0 : SPIN_MS) + HOLD_MS);
    if (!calm) playSound('reel');
    return () => {
      cancelAnimationFrame(roll);
      clearTimeout(stop);
      clearTimeout(done);
    };
  }, [due, gone]);

  if (!due || gone || !venue || !tag?.prize) return null;
  const f = FORMATS[venue.format];
  const draw = Math.round(tag.prize / venue.buyIn);
  const faces = f.draws.map(([x]) => x);
  // The reel: a few laps of every multiple, ending on the one drawn.
  const strip = [...Array.from({ length: LAPS }, () => faces).flat(), draw];
  const big = draw >= faces[3];
  return (
    <button type="button" className={`prize-reel${stopped ? ' stopped' : ''}${big ? ' big' : ''}`} onClick={() => setGone(true)} aria-label={`Prize pool ${tag.prize.toLocaleString('en-US')}. Tap to carry on.`}>
      <span className="prize-reel-card">
        <small>
          {venue.emoji} {venue.name} · {f.name}
        </small>
        <span className="prize-window" aria-hidden>
          <span className="prize-strip" style={{ transform: rolling ? `translateY(calc(-${strip.length - 1} * var(--reel-row)))` : 'translateY(0)' }}>
            {strip.map((x, i) => (
              <b key={i}>{x}×</b>
            ))}
          </span>
        </span>
        <span className="prize-total">
          Prize pool <b className="num">{stopped ? tag.prize.toLocaleString('en-US') : '…'}</b>
        </span>
        <small>{f.split.length > 1 ? `1st wins ${Math.round(f.split[0] * 100)}%, 2nd ${Math.round(f.split[1] * 100)}%` : 'Winner takes it all'}</small>
      </span>
    </button>
  );
}
