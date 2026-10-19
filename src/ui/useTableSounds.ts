import { useEffect, useRef } from 'react';
import type { Game, Seat } from '../game';
import { playSound, type SoundName } from './sound';

interface Snapshot {
  hand: number;
  board: number;
  last: Record<string, string>;
  resulted: boolean;
  myTurn: boolean;
}

const keyOf = (s: Seat) => (s.last ? `${s.last.move}:${s.last.amount}:${s.last.street}` : '');

/** The sound for a move. Bigger bets sound bigger. */
function moveSound(move: NonNullable<Seat['last']>['move'], amount: number, bb: number): SoundName {
  if (move === 'fold') return 'fold';
  if (move === 'check') return 'check';
  if (move === 'allin') return 'allin';
  if (move === 'sb' || move === 'bb') return 'chip';
  return amount >= bb * 8 ? 'chips' : 'chip';
}

/**
 * Plays the table's sounds by watching how the game changes: cards dealt and turned, chips going
 * in, folds and checks, your turn, and the pot being won. Nothing plays for what was already
 * there when you arrived.
 */
export function useTableSounds(game: Game, myId: string | undefined): void {
  const prev = useRef<Snapshot | null>(null);
  const hand = game.hand;

  useEffect(() => {
    if (!hand) {
      prev.current = null;
      return;
    }
    const last: Record<string, string> = {};
    for (const s of hand.seats) last[s.playerId] = keyOf(s);
    const snap: Snapshot = {
      hand: hand.number,
      board: hand.board.length,
      last,
      resulted: !!hand.result,
      myTurn: !hand.result && !!myId && hand.toAct === myId,
    };
    const before = prev.current;
    prev.current = snap;
    if (!before) return;

    const newHand = before.hand !== snap.hand;
    let delay = 0;
    if (newHand) {
      // Two cards each, so a couple of quick flicks.
      playSound('deal');
      playSound('deal', 140);
      delay = 300;
    } else if (snap.board > before.board) {
      // The flop is three cards one after another; the turn and river are one.
      const count = snap.board - before.board;
      for (let i = 0; i < count; i++) playSound('flip', i * 160);
    }

    // Anyone's new move (or blind) makes its sound.
    let k = 0;
    for (const s of hand.seats) {
      const was = newHand ? '' : (before.last[s.playerId] ?? '');
      if (s.last && keyOf(s) !== was) playSound(moveSound(s.last.move, s.last.amount, game.settings.bigBlind), delay + k++ * 120);
    }

    if (snap.resulted && !before.resulted && hand.result) {
      const mine = myId ? (hand.result.won[myId] ?? 0) : 0;
      playSound(mine > 0 ? 'win' : 'collect', 350);
    }
    if (snap.myTurn && !before.myTurn) playSound('turn', 150);
  }, [hand, myId, game.settings.bigBlind]);
}
