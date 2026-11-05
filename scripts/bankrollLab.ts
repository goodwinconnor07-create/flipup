// Bankroll lab: plays whole months with scripted players at 50 hands a day, the month-long reads on, and reports
// bankrolls, bust rates, who survives each cut, and whether the bots' reads make a one-note player (the constant
// bluffer) lose more as the month goes on. Results in docs/BANKROLL.md.
//
//   npx tsx scripts/bankrollLab.ts [months per player] [days]
import {
  applyAction,
  BANKROLL,
  createBankrollTable,
  dayOf,
  seasonOf,
  type Game,
  type PlayerRead,
} from '../src/game';
import { scriptMove, type Script } from '../src/game/botSim';

const MONTHS = Number(process.argv[2] ?? 6);
const DAYS = Number(process.argv[3] ?? 30);
const PLAYERS: Script[] = ['tightBot', 'abc', 'lightBot', 'bluffBot'];

function rngOf(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One day's 50 hands in one sitting. Returns the bankroll after and the read. */
function day(script: Script, bankroll: number, read: PlayerRead | undefined, d: number, rng: () => number): { bankroll: number; read?: PlayerRead } {
  let clock = Date.UTC(2026, 10, d, 9);
  let game: Game = createBankrollTable({ deviceId: 'me', name: 'Lab', emoji: '🧪', bankroll, season: seasonOf(clock), day: dayOf(clock), today: 0, dayStart: bankroll, read, now: clock, rng });
  const step = (a: Parameters<typeof applyAction>[1], who: string) => {
    const r = applyAction(game, a, { deviceId: who, now: clock, rng });
    if (r.ok) game = r.game;
  };
  step({ type: 'start' }, 'me');
  for (let i = 0; i < 200_000 && game.status === 'playing'; i++) {
    const hand = game.hand;
    const me = game.players.find((p) => p.deviceId === 'me')!;
    if (hand && !hand.result && hand.toAct === me.id && !hand.runout) {
      const seat = hand.seats.find((s) => s.playerId === me.id)!;
      step({ type: 'act', hand: hand.number, seq: hand.seq, ...scriptMove(script, game, hand, seat, rng) }, 'me');
    } else {
      clock = Math.max(clock + 1, game.wakeAt ?? clock + 1000);
      step({ type: 'tick' }, 'server');
    }
  }
  const me = game.players.find((p) => !p.bot);
  return { bankroll: game.bankroll!.bank + (me?.stack ?? 0), read: me ? game.reads?.[me.id] : read };
}

for (const script of PLAYERS) {
  const finals: number[] = [];
  let busts = 0;
  const firstHalf: number[] = [];
  const secondHalf: number[] = [];
  for (let m = 0; m < MONTHS; m++) {
    const rng = rngOf(1000 * m + script.length);
    let bankroll: number = BANKROLL.start;
    let read: PlayerRead | undefined;
    let rebuy = true;
    for (let d = 1; d <= DAYS; d++) {
      const before = bankroll;
      ({ bankroll, read } = day(script, bankroll, read, d, rng));
      (d <= DAYS / 2 ? firstHalf : secondHalf).push(bankroll - before);
      if (bankroll <= 0) {
        if (!rebuy) break;
        rebuy = false;
        busts++;
        bankroll = BANKROLL.rebuy;
      }
    }
    finals.push(bankroll);
  }
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));
  finals.sort((a, b) => a - b);
  console.log(
    `${script.padEnd(9)} final median ${finals[Math.floor(finals.length / 2)].toLocaleString().padStart(7)}  best ${finals.at(-1)!.toLocaleString().padStart(7)}  broke ${finals.filter((f) => f <= 0).length}/${MONTHS}  rebuys ${busts}  per day: first half ${avg(firstHalf)}, second half ${avg(secondHalf)}`,
  );
}
