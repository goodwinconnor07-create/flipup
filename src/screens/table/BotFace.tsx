import { useEffect, useRef, useState } from 'react';
import type { Game, Player, Seat } from '../../game';

/**
 * A prototype of bots drawn as characters instead of emoji, so their faces can move: eyes that follow the
 * action, brows, a mouth and a hand. One figure so far, dressed per bot. Everything here is read from what the
 * phone can already see (whose turn it is, the moves on the table), so the faces give nothing away.
 */

export type Pose = 'neutral' | 'leanIn' | 'leanBack' | 'lookAway' | 'tap' | 'doubleTake';
/** Where the eyes point: at another seat in the row, or down at the person holding this phone. */
export type Gaze = 'left' | 'right' | 'down' | null;

/** Bots that have a rig, by the emoji they'd otherwise wear. One shared figure, dressed differently. */
interface Look {
  skin: string;
  shade: string;
  hair: string;
  shirt: string;
}
const RIGS: Record<string, Look> = {
  '🤠': { skin: 'var(--rig-skin-1)', shade: 'var(--rig-shade-1)', hair: 'var(--rig-hair-1)', shirt: 'var(--rig-shirt-1)' },
  '😎': { skin: 'var(--rig-skin-2)', shade: 'var(--rig-shade-2)', hair: 'var(--rig-hair-2)', shirt: 'var(--rig-shirt-2)' },
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

export function BotFace({ emoji, pose, gaze, size = 76 }: { emoji: string; pose: Pose; gaze: Gaze; size?: number }) {
  const rig = RIGS[emoji];
  if (!rig) return null;
  // Looking away wins over following the action.
  const look = pose === 'lookAway' ? '' : gaze ? ` gaze-${gaze}` : '';
  const vars = { width: size, height: size, ['--skin' as string]: rig.skin, ['--shade' as string]: rig.shade, ['--hair' as string]: rig.hair, ['--shirt' as string]: rig.shirt };
  // Vector art, so it stays sharp at any size or screen density.
  return (
    <span className={`avatar rig rig-${pose}${look}`} style={vars} aria-hidden>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <g className="rig-torso">
          <path d="M10 102 C10 82 26 72 50 72 C74 72 90 82 90 102 Z" fill="var(--shirt)" />
          <path d="M40 72 L50 86 L60 72 Z" fill="var(--shade)" />
          <path d="M40 72 L46 80 L50 86 M60 72 L54 80 L50 86" fill="none" stroke="var(--rig-fold)" strokeWidth="1.2" />
          <path d="M26 84 Q30 92 28 102 M74 84 Q70 92 72 102" fill="none" stroke="var(--rig-fold)" strokeWidth="1.2" />
        </g>
        <rect x="44" y="56" width="12" height="18" rx="5" fill="var(--shade)" />
        <g className="rig-head">
          <ellipse cx="31" cy="44" rx="4" ry="6" fill="var(--shade)" />
          <ellipse cx="69" cy="44" rx="4" ry="6" fill="var(--shade)" />
          <ellipse cx="50" cy="42" rx="19" ry="22" fill="var(--skin)" />
          <path d="M30.5 42 C28 20 39 13 50 13 C62 13 73 20 69.5 42 C67 31 59 27 50 28 C41 27 33 31 30.5 42 Z" fill="var(--hair)" />
          {[42, 58].map((x) => (
            <g key={x} className="rig-eye">
              <g className="rig-lid">
                <ellipse cx={x} cy="44" rx="4.6" ry="3.4" fill="var(--rig-eye)" />
                <g className="rig-pupil">
                  <circle cx={x} cy="44.2" r="2.5" fill="var(--rig-iris)" />
                  <circle cx={x} cy="44.2" r="1.2" fill="var(--rig-pupil)" />
                  <circle cx={x + 0.8} cy="43.4" r="0.55" fill="var(--rig-eye)" />
                </g>
              </g>
            </g>
          ))}
          <path className="rig-brow rig-brow-l" d="M37 38 Q41.5 35.5 46 37.5" />
          <path className="rig-brow rig-brow-r" d="M54 37.5 Q58.5 35.5 63 38" />
          <path d="M50 45 Q48.3 50.5 51 51.2" fill="none" stroke="var(--shade)" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="38" cy="52" r="3.2" fill="var(--rig-cheek)" />
          <circle cx="62" cy="52" r="3.2" fill="var(--rig-cheek)" />
          <path className="rig-mouth rig-smile" d="M44 56 Q50 60.5 56 56" />
          <path className="rig-mouth rig-flat" d="M45 57.5 L55 57.5" />
          <ellipse className="rig-mouth rig-o" cx="50" cy="58" rx="2.2" ry="2.8" fill="var(--rig-lip)" />
        </g>
        <g className="rig-hand">
          <ellipse cx="80" cy="95" rx="7" ry="5" fill="var(--skin)" stroke="var(--shade)" strokeWidth="1" />
          <path d="M76 93 L76 97 M79 92.5 L79 97.5 M82 93 L82 97" stroke="var(--shade)" strokeWidth="0.8" />
        </g>
      </svg>
    </span>
  );
}
