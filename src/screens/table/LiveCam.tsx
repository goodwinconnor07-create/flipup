import { useEffect, useRef, useState } from 'react';
import { botsOnly, seatFor, type Game, type Seat } from '../../game';
import { useApp } from '../../state/store';
import { bubbleText } from './Bubbles';
import type { CamMove, CamStage } from './camStage';

/** A bot on the clock for less than this never gets the cam: a snap fold would only flash. */
const SHOW_AFTER = 300;
/** How long the cam stays on a bot's move before it goes, or cuts to the next bot. */
const HOLD = 1300;
const CUT_AFTER = 800;

type Shot = { id: string; done: boolean; move: Seat['last'] };

/**
 * Which bot the cam is on. It comes on once a bot has been thinking a moment, stays through its move and a beat
 * after (to show the reaction), then goes, or cuts to the next bot to act. Never on a fast table or once only bots
 * are left in the hand (they hurry then), and never during an all-in run-out.
 */
function useShot(game: Game): Shot | null {
  const hand = game.hand;
  const p = hand && !hand.result && !hand.runout && hand.toAct ? game.players.find((x) => x.id === hand.toAct) : undefined;
  const candidate = p?.bot && !game.fast && !botsOnly(game) ? p.id : null;
  const [shot, setShot] = useState<Shot | null>(null);
  const cand = useRef(candidate);
  cand.current = candidate;
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    // The bot on camera has moved: hold on its reaction.
    if (shot && !shot.done && shot.id !== candidate) {
      setShot({ ...shot, done: true, move: seatFor(gameRef.current.hand, shot.id)?.last ?? null });
      return;
    }
    if (!candidate || (shot?.id === candidate && !shot.done)) return;
    const t = setTimeout(() => cand.current === candidate && setShot({ id: candidate, done: false, move: null }), shot ? CUT_AFTER : SHOW_AFTER);
    return () => clearTimeout(t);
  }, [candidate, shot]);

  useEffect(() => {
    if (!shot?.done) return;
    const t = setTimeout(() => setShot((s) => (s === shot ? null : s)), HOLD);
    return () => clearTimeout(t);
  }, [shot]);

  return shot;
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The live cam: when a bot is thinking, a glass card slides down over the row of players and shows it in 3D,
 * sitting at a real table and giving off its tell. The seats themselves stay as emoji.
 */
export function LiveCam({ game }: { game: Game }) {
  const shot = useShot(game);
  const felt = useApp((s) => s.look.felt);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<CamStage | null>(null);
  const [ready, setReady] = useState(false);
  // Keep the last one on screen while the card slides away.
  const last = useRef<Shot | null>(null);
  if (shot) last.current = shot;
  const shown = last.current;
  const player = shown ? game.players.find((x) => x.id === shown.id) : undefined;

  // three.js is in its own file, loaded the first time a bot is on the clock, when the phone has a moment to
  // spare: opening the table and the first deal never wait for it. The first shot may come a moment late.
  const wanted = useRef(false);
  if (shot) wanted.current = true;
  const want = wanted.current;
  useEffect(() => {
    if (!want) return;
    let alive = true;
    const load = () =>
      import('./camStage')
        .then(({ CamStage }) => {
          if (!alive || !canvas.current) return;
          stage.current = new CamStage(canvas.current, { reduced: reducedMotion() });
          setReady(true);
        })
        // No WebGL, or it's drawn without a graphics chip: the table plays on without a cam.
        .catch(() => {});
    if (typeof requestIdleCallback === 'function') {
      const idle = requestIdleCallback(load, { timeout: 1500 });
      return () => {
        alive = false;
        cancelIdleCallback(idle);
      };
    }
    const t = setTimeout(load, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [want]);
  useEffect(
    () => () => {
      stage.current?.dispose();
      stage.current = null;
    },
    [],
  );

  const s = stage.current;
  const emoji = player?.emoji;
  const take = shot && !shot.done ? `${shot.id}:${game.hand?.number}:${game.hand?.seq}` : '';
  useEffect(() => {
    if (s && take && emoji) s.cut(emoji);
  }, [s, take]);
  useEffect(() => {
    if (s && shot?.done && shot.move && shot.move.move !== 'sb' && shot.move.move !== 'bb') s.react(shot.move.move as CamMove);
  }, [s, shot]);
  const board = game.hand?.board ?? [];
  useEffect(() => {
    s?.setBoard(board);
  }, [s, board.join('')]);
  useEffect(() => {
    s?.setFelt(felt);
  }, [s, felt]);
  useEffect(() => {
    if (!s) return;
    if (shot) s.start();
    else {
      // Let the card finish sliding away before the picture stops.
      const t = setTimeout(() => s.stop(), 400);
      return () => clearTimeout(t);
    }
  }, [s, !!shot]);

  const on = !!shot && ready;
  const label = shown?.done && shown.move && shown.move.move !== 'sb' && shown.move.move !== 'bb' ? bubbleText(shown.move) : null;
  return (
    <div
      className={`live-cam${on ? ' on' : ''}`}
      role="img"
      aria-hidden={!on}
      aria-label={player ? `Live cam: ${player.name}${label ? `, ${label}` : ', thinking'}` : undefined}
    >
      <canvas ref={canvas} className="cam-canvas" />
      <span className="cam-vignette" aria-hidden />
      <span className="cam-live" aria-hidden>
        <i />
        LIVE
      </span>
      {player && (
        <span className="cam-name" aria-hidden>
          {player.name}
        </span>
      )}
      {label && (
        <span key={label} className={`cam-move pop${shown?.move?.move === 'fold' || shown?.move?.move === 'check' ? '' : ' money'}`} aria-hidden>
          {label}
        </span>
      )}
    </div>
  );
}
