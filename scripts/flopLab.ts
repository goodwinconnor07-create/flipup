// npm run bot:flops [bots] [hands] [seed]
// How many players see the flop at a phone table: you plus N Casual bots, played through the real engine and tick loop
// (applyAction, the way the app runs a bots-only table), where you always check or call, as when trying to get a
// multiway pot. A busted-out table is replaced by a fresh one. Prints the spread of players at the flop and how the
// bots enter pots (raise or call). The numbers in docs/BOTS.md "Home game preflop" came from this.
import { applyAction, createTable, DEFAULT_SETTINGS } from '../src/game/reducer';
import { seededRng, BOTS } from '../src/game/index';

// How many players see the flop at a phone table: you plus N bots, played through the real engine and tick loop,
// you always check or call (as when trying to get a multiway pot). Prints the distribution.
const HOST = 'd0123456789abcdefghij';
const others = Number(process.argv[2] ?? 5), HANDS = Number(process.argv[3] ?? 300), seedBase = Number(process.argv[4] ?? 1);
let T = 1_000_000;
const rng = seededRng(seedBase);
const names = BOTS.map((b: any) => b.name);
let tables = 0;
function fresh() {
  tables++;
  let t = createTable({ hostDeviceId: HOST, name: 'You', emoji: '😎', settings: { ...DEFAULT_SETTINGS, rebuys: true, turnSeconds: 0 }, bots: 0, code: null, now: T, rng });
  for (let i = 0; i < others; i++) { const a = applyAction(t, { type: 'addBot', name: names[(i * 7 + tables * 3 + seedBase) % names.length] } as any, { deviceId: HOST, now: T, rng }); if (a.ok) t = a.game; }
  const s = applyAction(t, { type: 'start' } as any, { deviceId: HOST, now: T, rng }); if (!s.ok) throw new Error(s.error);
  return s.game;
}
let g: any = fresh(); let r: any;
let meId = g.players.find((p: any) => p.deviceId === HOST)!.id;
const refresh = (why: string) => { if (process.env.DEBUG) console.log('new table after', why, 'hand', g.hand?.number); g = fresh(); meId = g.players.find((p: any) => p.deviceId === HOST)!.id; };
const atFlop: number[] = []; const seen = new Set<string>(); const done = new Set<string>();
const key = (h: any) => tables + ':' + h.number;
let botEntries = 0, botHands = 0, botRaises = 0, botLimps = 0; const counted = new Set<string>();
for (let i = 0; i < 400000 && done.size < HANDS; i++) {
  const h = g.hand;
  if (h && h.board.length >= 3 && !seen.has(key(h))) { seen.add(key(h)); atFlop.push(h.seats.filter((s: any) => !s.folded).length); }
  if (h?.result && !counted.has(key(h))) {
    counted.add(key(h));
    for (const s of h.seats) {
      if (s.playerId === meId) continue;
      botHands++;
      const acts = (h.actions ?? []).filter((a: any) => a.street === 'preflop' && a.playerId === s.playerId);
      if (acts.some((a: any) => ['call', 'raise', 'bet', 'allin'].includes(a.move))) botEntries++;
      if (acts.some((a: any) => ['raise', 'bet', 'allin'].includes(a.move))) botRaises++;
      else if (acts.some((a: any) => a.move === 'call')) botLimps++;
    }
  }
  if (h?.result && !done.has(key(h))) {
    done.add(key(h));
    if (!seen.has(key(h))) { seen.add(key(h)); atFlop.push(h.board.length >= 3 ? h.seats.filter((s: any) => !s.folded).length : 0); }
  }
  if (h && !h.result && h.toAct === meId) {
    const seat = h.seats.find((s: any) => s.playerId === meId)!;
    const owe = h.currentBet - (seat.bet ?? 0);
    const move = owe > 0 ? 'call' : 'check';
    const a = applyAction(g, { type: 'act', hand: h.number, seq: h.seq, move } as any, { deviceId: HOST, now: T, rng });
    if (a.ok) { g = a.game; continue; }
  }
  T = Math.max(T + 1, (g as any).wakeAt ?? T + 1000);
  r = applyAction(g, { type: 'tick' } as any, { deviceId: 'server', now: T, rng });
  if (!r.ok) { if (/finished/i.test(r.error)) { refresh(r.error); continue; } throw new Error(r.error); }
  g = r.game; if (g.status !== 'playing') refresh('status ' + g.status + ' ' + JSON.stringify((g as any).closed ?? (g as any).endReason ?? ''));
}
const n = atFlop.length, dist: Record<string, number> = {};
for (const k of atFlop) dist[k] = (dist[k] ?? 0) + 1;
const flops = atFlop.filter((k) => k > 0);
const pct = (x: number) => ((100 * x) / n).toFixed(1) + '%';
console.log(`table: you + ${others} bots, ${n} hands over ${tables} tables, you always call`);
console.log('no flop (everyone folded to a raise or to you):', pct(dist[0] ?? 0));
for (let k = 2; k <= others + 1; k++) console.log(`${k} players saw the flop:`, pct(dist[k] ?? 0));
console.log('average players at a flop:', (flops.reduce((a, b) => a + b, 0) / Math.max(1, flops.length)).toFixed(2));
console.log(`bots: entered ${(100*botEntries/botHands).toFixed(1)}% of hands (raised ${(100*botRaises/botHands).toFixed(1)}%, called/limped ${(100*botLimps/botHands).toFixed(1)}%)`);
console.log('all', others + 1, 'players at the flop:', dist[others + 1] ?? 0, 'times');
