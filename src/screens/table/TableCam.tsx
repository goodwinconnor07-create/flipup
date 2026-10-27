import { useEffect, useRef, useState, type ReactNode } from 'react';
import { pot, positionOf, seatFor, type Game, type Player, type Talk } from '../../game';
import { dispatch, openSheet, useApp } from '../../state/store';
import { chips, Count, PlayingCard, PositionChips } from '../../ui/components';
import { useDesktop } from '../../ui/useDesktop';
import { Bubble, moveSig, Thread } from './Bubbles';
import { pct } from './Pods';
import type { CamMove, LabelSpot, TableStage, TableView } from './camStage';

/**
 * The table cam: on a phone, everyone else at the table is shown in 3D, sitting round a real table as a
 * Mii-style character, in place of the row of seats. Each one has their name and chips floating over their head,
 * with their speech bubbles above that, and a tap on it does what a tap on their seat did. The camera flies to
 * whoever is acting and moves in for the big moments (see camStage.ts).
 *
 * Where there's no graphics chip to draw it (or on a computer, which seats everyone round the table already),
 * the row of seats stays: `fallback`.
 */

let gpu: boolean | null = null;
/** Whether this device draws 3D with a graphics chip. Drawn in software, the room would slow the table down. */
function hardware3d(): boolean {
  if (gpu !== null) return gpu;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return (gpu = false);
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    gpu = !/swiftshader|llvmpipe|software|basic render/i.test(name);
  } catch {
    gpu = false;
  }
  return gpu;
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The table as the 3D room needs it: only what this phone can see. */
function viewOf(game: Game, others: Player[], meId: string | undefined, say: Record<string, Talk>, felt: string): TableView {
  const hand = game.hand;
  const live = !!hand && !hand.result && !hand.runout;
  const actor = live && hand.toAct && hand.toAct !== meId ? hand.toAct : null;
  let bigBet = false;
  if (actor && hand) {
    const s = seatFor(hand, actor);
    const toCall = s ? hand.currentBet - s.bet : 0;
    const p = pot(hand);
    const shove = hand.seats.some((x) => x.allIn && !x.folded && x.playerId !== actor && x.bet >= hand.currentBet && x.bet > 0);
    const stack = game.players.find((x) => x.id === actor)?.stack ?? 0;
    bigBet = toCall > 0 && (toCall >= p * 0.5 || toCall >= stack * 0.4 || shove);
  }
  return {
    hand: hand?.number ?? 0,
    seats: others.map((p) => {
      const s = seatFor(hand, p.id);
      const last = s?.last;
      const move = last && last.move !== 'sb' && last.move !== 'bb' ? (last.move as CamMove) : null;
      return {
        id: p.id,
        who: `${p.name}${p.emoji}`,
        inHand: !!s,
        folded: !!s?.folded,
        allIn: !!s?.allIn,
        cards: s?.cards ?? [],
        stack: p.stack,
        bet: s?.bet ?? 0,
        move,
        moveKey: hand && last ? moveSig(hand.number, last) : '',
        talking: !!say[p.id]?.shown.length,
        out: (p.stack === 0 && !s) || p.sittingOut,
        away: p.sittingOut,
      };
    }),
    board: hand?.board ?? [],
    pot: hand ? pot(hand) : 0,
    bb: game.settings.bigBlind,
    actor,
    bigBet,
    result: hand?.result
      ? {
          winners: Object.entries(hand.result.won)
            .filter(([, n]) => n > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id),
          showdown: hand.result.showdown,
        }
      : null,
    felt,
  };
}

export function TableCam({
  game,
  others,
  meId,
  say,
  quiet,
  odds,
  fallback,
}: {
  game: Game;
  others: Player[];
  meId: string | undefined;
  say: Record<string, Talk>;
  quiet: Record<string, string>;
  odds?: Map<string, { win: number; tie: number }>;
  fallback: ReactNode;
}) {
  const desktop = useDesktop();
  const [mode, setMode] = useState<'loading' | 'on' | 'off'>(() => (desktop || !hardware3d() ? 'off' : 'loading'));
  const felt = useApp((s) => s.look.felt);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<TableStage | null>(null);
  const labels = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (desktop) setMode('off');
  }, [desktop]);

  useEffect(() => {
    if (mode === 'off') return;
    let alive = true;
    import('./camStage')
      .then(({ TableStage }) => {
        if (!alive || !canvas.current) return;
        stage.current = new TableStage(canvas.current, {
          reduced: reducedMotion(),
          // Every frame: each name follows its player's head across the screen.
          onLabels: (spots: Record<string, LabelSpot>) => {
            for (const [id, el] of labels.current) {
              const s = spots[id];
              if (!s || !s.on) {
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
                continue;
              }
              el.style.opacity = '1';
              el.style.pointerEvents = '';
              el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(Math.max(s.y, 46))}px) translate(-50%, -100%)`;
            }
          },
        });
        stage.current.start();
        setMode('on');
      })
      // No WebGL after all, or it failed: the row of seats it is.
      .catch(() => alive && setMode('off'));
    return () => {
      alive = false;
      stage.current?.dispose();
      stage.current = null;
    };
  }, [mode === 'off']);

  const talking = others.map((p) => (say[p.id]?.shown.length ? p.id : '')).join();
  useEffect(() => {
    stage.current?.update(viewOf(game, others, meId, say, felt));
  }, [game, others.map((p) => p.id).join(), talking, felt, mode]);

  if (mode === 'off') return <>{fallback}</>;
  return (
    <div className="table-cam" aria-label="The table">
      <canvas ref={canvas} className="cam-canvas" aria-hidden />
      <span className="cam-vignette" aria-hidden />
      {mode === 'on' &&
        others.map((p) => (
          <CamLabel
            key={p.id}
            game={game}
            player={p}
            reaction={say[p.id]}
            quiet={quiet[p.id]}
            odds={odds?.get(p.id)}
            ref={(el) => {
              if (el) labels.current.set(p.id, el);
              else labels.current.delete(p.id);
            }}
          />
        ))}
    </div>
  );
}

/** A player's name and chips over their head, with what they're saying above. Tapping it is tapping their seat. */
function CamLabel({
  game,
  player,
  reaction,
  quiet,
  odds,
  ref,
}: {
  game: Game;
  player: Player;
  reaction?: Talk;
  quiet?: string;
  odds?: { win: number; tie: number };
  ref: (el: HTMLButtonElement | null) => void;
}) {
  const hand = game.hand;
  const deviceId = useApp((s) => s.deviceId);
  const host = game.hostDeviceId === deviceId;
  const seat = seatFor(hand, player.id);
  const turn = !!hand && !hand.result && hand.toAct === player.id;
  const canPeek = !!hand?.result && player.bot && !!seat && !seat.shown;
  const out = !!hand && (!seat || seat.folded);
  const won = hand?.result?.won[player.id] ?? 0;
  const status = player.stack === 0 && !seat ? 'Out' : player.sittingOut ? 'Away' : null;
  const thinking = turn && player.bot && !hand?.runout;
  return (
    <button
      ref={ref}
      type="button"
      className={`cam-label${turn ? ' turn' : ''}${out ? ' out' : ''}${won ? ' won' : ''}`}
      style={{ opacity: 0 }}
      aria-label={`${player.name}${player.ai ? ', an AI twin' : ''}${player.legend ? ', a legend' : ''}, ${chips(player.stack)} chips${turn ? ', their turn' : ''}${seat?.folded ? ', folded' : ''}${player.offline ? ', offline' : ''}`}
      onClick={() => {
        if (!host) return;
        if (canPeek) dispatch({ type: 'revealBots', hand: hand!.number, playerId: player.id });
        else openSheet({ name: 'player', playerId: player.id });
      }}
    >
      <span className="cam-say">
        {reaction ? (
          <Thread talk={reaction} />
        ) : thinking ? (
          <span className="bubble bubble-grey bubble-typing pop" aria-label={`${player.name} is thinking`}>
            <i />
            <i />
            <i />
          </span>
        ) : (
          seat?.last && quiet !== moveSig(hand!.number, seat.last) && <Bubble last={seat.last} street={hand?.street} />
        )}
      </span>
      <span className="cam-name">
        {player.legend && <span className="cam-star" aria-hidden>★</span>}
        {player.name}
        {player.ai && <span className="cam-ai" aria-hidden>AI</span>}
        <PositionChips pos={positionOf(hand, player.id)} />
      </span>
      <span className="cam-chips num">
        {status ?? <Count value={player.stack} />}
        {won > 0 ? <b className="cam-tag win">+{chips(won)}</b> : odds ? <b className="cam-tag">{pct(odds.win)}</b> : player.offline ? <b className="cam-tag">Offline</b> : null}
      </span>
      {!!seat?.cards.length && (
        <span className="cam-cards">
          {seat.cards.map((c) => (
            <PlayingCard key={c} card={c} size="sm" flip />
          ))}
        </span>
      )}
    </button>
  );
}
