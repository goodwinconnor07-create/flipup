import { useEffect, useRef, useState } from 'react';
import type { Game, Player, Seat } from '../../game';

/**
 * A prototype of bots drawn as characters instead of emoji, so their faces can move: eyes that follow the
 * action, brows, a mouth and a hand. Only one rig so far (the frog). Everything here is read from what the
 * phone can already see (whose turn it is, the moves on the table), so the faces give nothing away.
 */

export type Pose = 'neutral' | 'leanIn' | 'leanBack' | 'lookAway' | 'tap' | 'doubleTake';
/** Where the eyes point: at another seat in the row, or down at the person holding this phone. */
export type Gaze = 'left' | 'right' | 'down' | null;

/** Bots that have a rig, by the emoji they'd otherwise wear. */
const RIGS: Record<string, { skin: string; shade: string }> = {
  '🐸': { skin: 'var(--rig-frog)', shade: 'var(--rig-frog-shade)' },
};

export const hasRig = (p: Player) => p.bot && p.emoji in RIGS;

const moveKey = (s: Seat) => (s.last ? `${s.playerId}:${s.last.move}-${s.last.amount}-${s.last.street}` : '');

/** How long a pose set off by a move holds before the face settles again. */
const HOLD = { doubleTake: 1200, other: 1700 };

/**
 * What the face is doing now. While it thinks it taps the table or looks off to the side; after its own move it
 * leans in (chips going in), sits back (check or call) or looks away (fold); when someone else raises or moves in,
 * it does a double take.
 */
export function usePose(game: Game, player: Player, seat: Seat | undefined, thinking: boolean): Pose {
  const hand = game.hand;
  const [flash, setFlash] = useState<{ pose: Pose; k: number } | null>(null);
  const mine = hand && seat ? `${hand.number}:${moveKey(seat)}` : '';
  const theirs = (hand?.seats ?? [])
    .filter((s) => s.playerId !== player.id && (s.last?.move === 'raise' || s.last?.move === 'allin'))
    .map((s) => `${hand!.number}:${moveKey(s)}`)
    .join('|');
  const before = useRef({ mine, theirs });
  const k = useRef(0);

  useEffect(() => {
    if (before.current.mine === mine) return;
    before.current.mine = mine;
    const move = seat?.last?.move;
    if (!move || move === 'sb' || move === 'bb') return;
    const pose: Pose = move === 'fold' ? 'lookAway' : move === 'check' || move === 'call' ? 'leanBack' : 'leanIn';
    setFlash({ pose, k: ++k.current });
  }, [mine]);

  useEffect(() => {
    const was = before.current.theirs;
    before.current.theirs = theirs;
    // Only a new raise in the same hand, and only while this seat is still in it.
    const old = was.split('|');
    if (!theirs.split('|').some((m) => m && !old.includes(m)) || !seat || seat.folded) return;
    setFlash({ pose: 'doubleTake', k: ++k.current });
  }, [theirs]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), flash.pose === 'doubleTake' ? HOLD.doubleTake : HOLD.other);
    return () => clearTimeout(t);
  }, [flash]);

  if (thinking) return (hand?.seq ?? 0) % 2 ? 'tap' : 'lookAway';
  return flash?.pose ?? 'neutral';
}

export function BotFace({ emoji, pose, gaze, size = 50 }: { emoji: string; pose: Pose; gaze: Gaze; size?: number }) {
  const rig = RIGS[emoji];
  if (!rig) return null;
  // Looking away wins over following the action.
  const look = pose === 'lookAway' ? '' : gaze ? ` gaze-${gaze}` : '';
  return (
    <span
      className={`avatar rig rig-${pose}${look}`}
      style={{ width: size, height: size, ['--skin' as string]: rig.skin, ['--shade' as string]: rig.shade }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <ellipse className="rig-body" cx="50" cy="98" rx="30" ry="14" fill="var(--shade)" />
        <g className="rig-head">
          <circle cx="34" cy="30" r="14" fill="var(--skin)" />
          <circle cx="66" cy="30" r="14" fill="var(--skin)" />
          <ellipse cx="50" cy="58" rx="38" ry="28" fill="var(--skin)" />
          {[34, 66].map((x) => (
            <g key={x} className="rig-eye">
              <g className="rig-lid">
                <circle cx={x} cy="29" r="9.5" fill="var(--rig-eye)" />
                <circle className="rig-pupil" cx={x} cy="30" r="4.5" fill="var(--rig-pupil)" />
              </g>
            </g>
          ))}
          <path className="rig-brow rig-brow-l" d="M25 13 Q34 9 42 13" />
          <path className="rig-brow rig-brow-r" d="M58 13 Q66 9 75 13" />
          <circle cx="24" cy="62" r="5" fill="var(--rig-cheek)" />
          <circle cx="76" cy="62" r="5" fill="var(--rig-cheek)" />
          <path className="rig-mouth rig-smile" d="M36 62 Q50 73 64 62" />
          <path className="rig-mouth rig-flat" d="M39 66 L61 66" />
          <ellipse className="rig-mouth rig-o" cx="50" cy="67" rx="4" ry="5" fill="var(--rig-ink)" />
        </g>
        <circle className="rig-hand" cx="80" cy="94" r="8" fill="var(--skin)" stroke="var(--shade)" strokeWidth="2" />
      </svg>
    </span>
  );
}
