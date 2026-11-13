import { seededRng } from '../src/game/cards';
import { botHits, variantDecide } from '../src/game/botVariants';
import { canHit, pendingDiscards, pendingVoters } from '../src/game/holdem';
import { botPowerPlan, playablePower } from '../src/game/powers';
import { botVote, keepTwoQuick } from '../src/game/variants';
import { applyAction, createTable, DEFAULT_SETTINGS } from '../src/game/reducer';
import { VariantFeel } from '../src/game/variantFeel';
import { VARIANTS, type Variant } from '../src/game/variants';
import type { Action, Game } from '../src/game/types';

// npm run bot:variants [hands per run] [runs] [game,game...]
// Plays an all-bot table of each game and prints how it feels against each number's band, plus the game's own goals.
const HANDS = Number(process.argv[2] ?? 150);
const RUNS = Number(process.argv[3] ?? 2);
const only = process.argv[4]?.split(',');
const BB = 10;
const STACK = 100;

function play(variant: Variant, seed: number, feel: VariantFeel): void {
  const rng = seededRng(seed);
  let clock = 1_000_000;
  let game: Game = createTable({
    hostDeviceId: 'lab',
    name: 'Host',
    emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, variant, startingStack: BB * STACK, smallBlind: BB / 2, bigBlind: BB, turnSeconds: 30, rebuys: true },
    bots: 6,
    code: null,
    now: clock,
    rng,
  });
  game.legacyBotSimulation = true;
  // A table needs a person to deal. The lab's person is the host, played by the same bot brain as everyone else.
  const host = game.players.find((p) => !p.bot)!;
  feel.hostId = host.id;
  const step = (action: Action): boolean => {
    feel.before(game, rng);
    const r = applyAction(game, action, { deviceId: 'lab', now: clock, rng });
    if (r.ok) game = r.game;
    feel.after(game);
    return r.ok;
  };
  step({ type: 'start' } as Action);
  let guard = 0;
  while ((game.hands ?? 0) < HANDS && guard++ < HANDS * 700) {
    clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
    if (!game.hand || game.hand.result)
      for (const p of game.players)
        if (p.stack === 0) {
          p.stack = BB * STACK;
          p.bought += BB * STACK;
        }
    const hand = game.hand;
    const seat = hand && !hand.result ? hand.seats.find((x) => x.playerId === host.id) : undefined;
    if (hand && seat && !seat.folded) {
      if (hand.discarding && pendingDiscards(game).some((x) => x.playerId === host.id)) {
        const card = seat.cards.find((c) => !keepTwoQuick(seat.cards, hand.board.slice(0, 3)).includes(c));
        if (card && step({ type: 'discard', hand: hand.number, card })) continue;
      }
      if (hand.discussing && !hand.points?.[host.id]) {
        const pick = botVote(hand, host.id);
        if (pick && step({ type: 'point', hand: hand.number, playerId: pick })) continue;
      }
      if (hand.voting && pendingVoters(game).some((x) => x.playerId === host.id)) {
        const pick = botVote(hand, host.id);
        if (pick && step({ type: 'vote', hand: hand.number, playerId: pick })) continue;
      }
      if (hand.toAct === host.id && !hand.runout) {
        if (playablePower(game, hand, seat)) {
          const plan = botPowerPlan(game, hand, seat, rng);
          if (plan && step({ type: 'power', hand: hand.number, seq: hand.seq, ...plan })) continue;
        }
        if (canHit(game, hand, seat) && botHits(game, seat, rng) && step({ type: 'hit', hand: hand.number, seq: hand.seq })) continue;
        const t = variantDecide(game, hand, seat, rng);
        if (t && step({ type: 'act', hand: hand.number, seq: hand.seq, ...t.move } as Action)) continue;
      }
    }
    feel.before(game, rng);
    const r = applyAction(game, { type: 'tick' } as Action, { deviceId: 'server', now: clock, rng });
    if (r.ok) game = r.game;
    feel.after(game);
  }
}

const games = VARIANTS.map((v) => v.id).filter((id) => id !== 'holdem' && (!only || only.includes(id))) as Variant[];
let failed = 0;
for (const v of games) {
  const started = Date.now();
  const feel = new VariantFeel(v);
  for (let run = 0; run < RUNS; run++) play(v, 2000 + run, feel);
  console.log(`\n${v}  (${HANDS * RUNS} hands, ${((Date.now() - started) / 1000).toFixed(0)}s)`);
  for (const m of feel.report()) {
    const value = m.value === null ? '   n/a' : m.value.toFixed(1).padStart(6);
    const mark = m.pass === null ? '·' : m.pass ? '✓' : '✗';
    if (m.pass === false) failed++;
    console.log(`  ${mark} ${m.label.padEnd(46)} ${value}  ${m.band ? `band ${m.band[0]}–${m.band[1]}` : 'info'.padEnd(10)}  n=${String(m.n).padStart(5)}  ${m.note}`);
  }
  if (v === 'power') console.log('  powers played:', JSON.stringify(feel.powerCounts()));
}
console.log(failed ? `\n${failed} outside their band.` : '\nAll inside their bands.');
process.exitCode = failed ? 1 : 0;
