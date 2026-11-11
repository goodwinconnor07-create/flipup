// Plays bots-only tables of each game mode (every bot on the current brain) and prints the average and median pot,
// in big blinds, and how often a hand saw the flop. For checking the mini-game bots build real pots.
//
//   npx tsx scripts/potLab.ts [hands] [game,game...]

import { variantDecide } from '../src/game/botVariants';
import { pendingDiscards, pendingVoters } from '../src/game/holdem';
import { seededRng } from '../src/game/cards';
import { applyAction, createTable, DEFAULT_SETTINGS } from '../src/game/reducer';
import type { Action, Game } from '../src/game/types';
import { botVote, keepTwoQuick, VARIANTS, type Variant } from '../src/game/variants';

const HANDS = Number(process.argv[2] ?? 150);
const only = process.argv[3]?.split(',');
const BB = 10;

function play(variant: Variant, seed: number): { pots: number[]; flops: number } {
  const rng = seededRng(seed);
  let clock = 1_000_000;
  let game: Game = createTable({
    hostDeviceId: 'lab', name: 'Host', emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, variant, startingStack: BB * 100, smallBlind: BB / 2, bigBlind: BB, turnSeconds: 30, rebuys: true },
    bots: 5, code: null, now: clock, rng,
  });
  game.legacyBotSimulation = true;
  const host = game.players.find((p) => !p.bot)!;
  const step = (a: Action) => {
    const r = applyAction(game, a, { deviceId: 'lab', now: clock, rng });
    if (!r.ok) throw new Error(r.error);
    game = r.game;
  };
  step({ type: 'start' });
  const pots: number[] = [];
  let flops = 0;
  let lastHand = 0;
  let guard = 0;
  while ((game.hands ?? 0) < HANDS && guard++ < HANDS * 500) {
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    const hand = game.hand;
    if (hand?.result && hand.number !== lastHand) {
      lastHand = hand.number;
      pots.push(hand.seats.reduce((s, x) => s + x.total, 0) / BB);
      if (hand.board.length >= 3 && hand.seats.filter((x) => !x.folded).length >= 2) flops++;
    }
    if (!hand || hand.result) for (const p of game.players) if (p.stack === 0) { p.stack = BB * 100; p.bought += BB * 100; }
    if (hand && !hand.result) {
      const seat = hand.seats.find((x) => x.playerId === host.id);
      if (seat && hand.discarding && pendingDiscards(game).some((x) => x.playerId === host.id)) { step({ type: 'discard', hand: hand.number, card: seat.cards.find((c) => !keepTwoQuick(seat.cards, hand.board.slice(0, 3)).includes(c))! }); continue; }
      if (seat && hand.voting && pendingVoters(game).some((x) => x.playerId === host.id)) { step({ type: 'vote', hand: hand.number, playerId: botVote(hand, host.id)! }); continue; }
      if (seat && hand.toAct === host.id && !hand.runout) { const t = variantDecide(game, hand, seat, rng); if (t) { step({ type: 'act', hand: hand.number, seq: hand.seq, ...t.move } as Action); continue; } }
    }
    const r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
    if (r.ok) game = r.game;
  }
  return { pots, flops };
}

for (const v of VARIANTS.map((x) => x.id).filter((id) => id !== 'holdem' && id !== 'imposter' && (!only || only.includes(id))) as Variant[]) {
  const { pots, flops } = play(v, 7);
  const sorted = [...pots].sort((a, b) => a - b);
  const avg = pots.reduce((a, b) => a + b, 0) / Math.max(1, pots.length);
  console.log(`${v.padEnd(11)} avg pot ${avg.toFixed(1)}bb  median ${(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(1)}bb  saw a flop ${((flops / Math.max(1, pots.length)) * 100).toFixed(0)}%`);
}
