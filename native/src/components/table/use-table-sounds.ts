// Plays the table's sounds by watching how the game changes, as the web does (src/ui/useTableSounds.ts): cards
// dealt and turned, chips going in, folds and checks, your turn, the pot being won, and each mini game's moment.
// Nothing plays for what was already there when you arrived.
import { useEffect, useRef } from 'react';

import { gameLook } from '@design/gameArt';
import { toTableTime, variantOf, type Game, type Seat } from '@/engine';

import { playSound, setSoundMood, type SoundName } from './sounds';

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

export function useTableSounds(game: Game, myId: string | undefined): void {
  const prev = useRef<Snapshot | null>(null);
  const hand = game.hand;
  const variant = variantOf(game);
  useEffect(() => setSoundMood(gameLook(variant).pitch), [variant]);

  useEffect(() => {
    if (!hand) {
      prev.current = null;
      return;
    }
    const last: Record<string, string> = {};
    for (const s of hand.seats) last[s.playerId] = keyOf(s);
    const snap: Snapshot = { hand: hand.number, board: hand.board.length, last, resulted: !!hand.result, myTurn: !hand.result && !!myId && hand.toAct === myId };
    const before = prev.current;
    prev.current = snap;
    if (!before) return;

    const newHand = before.hand !== snap.hand;
    let delay = 0;
    if (newHand) {
      playSound('shuffle');
      const mine = hand.seats.find((x) => x.playerId === myId);
      mine?.cards.forEach((_, i) => playSound('place', 300 + i * 180));
      delay = 650;
    } else if (snap.board > before.board) {
      // The flop is three cards one after another; the turn and river are one.
      for (let i = 0; i < snap.board - before.board; i++) playSound('place', i * 160);
    }
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

  // The mini games' own moments: the die, the ghost taking a pot, the vote, a red river.
  const dice = hand?.dice ? `${hand.number}` : '';
  const kept = hand?.result?.ghost?.kept ? `${hand.number}` : '';
  const voting = hand?.variant === 'imposter' && hand.result?.imposter ? `${hand.number}` : '';
  const reds = hand?.variant === 'redriver' && hand.board.length > 5 ? `${hand.number}:${hand.board.length}` : '';
  const seen = useRef<Record<string, string> | null>(null);
  useEffect(() => {
    const now = { dice, kept, voting, reds };
    const before = seen.current;
    seen.current = now;
    if (!before) return;
    if (dice && dice !== before.dice) playSound('dice');
    if (kept && kept !== before.kept) playSound('spook');
    if (voting && voting !== before.voting) playSound('sting');
    if (reds && reds !== before.reds) playSound('splash');
  }, [dice, kept, voting, reds]);

  // A tick for each of your last five seconds.
  const deadline = snapTurn(game, myId);
  useEffect(() => {
    if (!deadline) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let s = 5; s >= 1; s--) {
      const at = (deadline - s * 1000 - toTableTime(Date.now(), game.fast)) / (game.fast ? 2 : 1);
      if (at > 0) timers.push(setTimeout(() => playSound('tick'), at));
    }
    return () => timers.forEach(clearTimeout);
  }, [deadline]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Your turn's deadline, when it's your turn on a clock. */
function snapTurn(game: Game, myId: string | undefined): number | null {
  const hand = game.hand;
  return hand && !hand.result && myId && hand.toAct === myId && hand.deadline ? hand.deadline : null;
}
