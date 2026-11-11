// Plays bots-only tables of every game mode with half the bots on the game-mode upgrade (botVariants.ts) and half
// playing the old way (`lab.legacy`), then swaps the halves on the same seeds so seats and styles cancel out. Prints
// how many big blinds per 100 hands the upgraded bots win from the old ones at each game.
//
//   npx tsx scripts/variantLab.ts [hands per run] [runs] [game,game...]
// ALL_LEGACY=1 plays every bot the old way, to see the noise. Imposter is mostly noise: nobody can fold, so pots are huge.

import { lab, variantDecide } from '../src/game/botVariants';
import { pendingDiscards, pendingVoters } from '../src/game/holdem';
import { botVote, keepTwoQuick } from '../src/game/variants';
import { seededRng } from '../src/game/cards';
import { applyAction, createTable, DEFAULT_SETTINGS } from '../src/game/reducer';
import type { Action, Game } from '../src/game/types';
import { VARIANTS, type Variant } from '../src/game/variants';


const HANDS = Number(process.argv[2] ?? 300);
const RUNS = Number(process.argv[3] ?? 4);
const only = process.argv[4]?.split(',');
const BB = 10;
const STACK = 100;
const BOTS = 6;

function play(variant: Variant, seed: number, legacyEven: boolean): { upgraded: number; old: number } {
  const rng = seededRng(seed);
  let clock = 1_000_000;
  let game: Game = createTable({
    hostDeviceId: 'lab',
    name: 'Host',
    emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, variant, startingStack: BB * STACK, smallBlind: BB / 2, bigBlind: BB, turnSeconds: 30, rebuys: true },
    bots: BOTS,
    code: null,
    now: clock,
    rng,
  });
  game.legacyBotSimulation = true;
  const step = (action: Action) => {
    const r = applyAction(game, action, { deviceId: 'lab', now: clock, rng });
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    game = r.game;
  };
  const bots = game.players.filter((p) => p.bot);
  lab.legacy.clear();
  bots.forEach((p, i) => (process.env.ALL_LEGACY || (i % 2 === 0) === legacyEven) && lab.legacy.add(p.id));
  // The host is a person to the table (a table needs one); the lab plays its seat the old way and doesn't score it.
  const host = game.players.find((p) => !p.bot)!;
  lab.legacy.add(host.id);
  step({ type: 'start' });
  let guard = 0;
  while ((game.hands ?? 0) < HANDS && guard++ < HANDS * 500) {
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    if (!game.hand || game.hand.result)
      for (const p of game.players)
        if (p.stack === 0) {
          p.stack = BB * STACK;
          p.bought += BB * STACK;
        }
    const hand = game.hand;
    if (hand && !hand.result) {
      const seat = hand.seats.find((x) => x.playerId === host.id);
      if (seat && hand.discarding && pendingDiscards(game).some((x) => x.playerId === host.id)) {
        step({ type: 'discard', hand: hand.number, card: seat.cards.find((c) => !keepTwoQuick(seat.cards, hand.board.slice(0, 3)).includes(c))! });
        continue;
      }
      if (seat && hand.voting && pendingVoters(game).some((x) => x.playerId === host.id)) {
        step({ type: 'vote', hand: hand.number, playerId: botVote(hand, host.id)! });
        continue;
      }
      if (seat && hand.toAct === host.id && !hand.runout) {
        const t = variantDecide(game, hand, seat, rng)!;
        step({ type: 'act', hand: hand.number, seq: hand.seq, ...t.move } as Action);
        continue;
      }
    }
    const r = applyAction(game, { type: 'tick' }, { deviceId: 'server', now: clock, rng });
    if (r.ok) game = r.game;
    else if (guard < 3) console.error(r.error);
  }
  if (process.env.DEBUG) console.error(variant, game.hands, game.players.map((p) => `${p.name}:${p.stack}/${p.bought}${p.sittingOut ? ' out' : ''}`).join(' '));
  let upgraded = 0;
  let old = 0;
  for (const p of bots) {
    const now = game.players.find((q) => q.id === p.id)!;
    const net = (now.stack - now.bought) / BB;
    if (lab.legacy.has(p.id)) old += net;
    else upgraded += net;
  }
  return { upgraded, old };
}

const games = VARIANTS.map((v) => v.id).filter((id) => id !== 'holdem' && (!only || only.includes(id))) as Variant[];
for (const v of games) {
  const started = Date.now();
  let diff = 0;
  let hands = 0;
  for (let run = 0; run < RUNS; run++)
    for (const legacyEven of [true, false]) {
      const r = play(v, 1000 + run, legacyEven);
      diff += (r.upgraded - r.old) / (BOTS / 2);
      hands += HANDS;
    }
  const per100 = (diff / hands) * 100;
  console.log(`${v.padEnd(11)} upgraded bot vs old: ${per100 >= 0 ? '+' : ''}${per100.toFixed(1)} bb/100  (${hands} hands, ${((Date.now() - started) / 1000).toFixed(0)}s)`);
}
