// The chat lab: plays whole bot tables with a person at them (on a simulated clock), feeds everything the
// bots say through the same conversation lane the phone uses, and measures how the talk would feel:
// how long until a line starts, how often bubbles are up, how long each message can be read, how often a
// bot moves before it finished its line, how often lines are dropped. Run with
// `npx tsx scripts/chatLab.ts [tables] [handsPerTable] [out.md]`. Nothing here ships in the app.

import { writeFileSync } from 'node:fs';
import { decide } from '../src/game/botPlay';
import { seededRng } from '../src/game/cards';
import { BEFORE_MOVE, botSay, CHAT, ChatLane, readMs, worthSaying, type Say } from '../src/game/chat';
import { applyAction, createTable, DEFAULT_SETTINGS } from '../src/game/reducer';
import { reactionBeats } from '../src/game/reactions';
import { options } from '../src/game/selectors';
import type { Game } from '../src/game/types';

const TABLES = Number(process.argv[2] ?? 24);
const HANDS = Number(process.argv[3] ?? 60);
const OUT = process.argv[4];

interface Sample {
  /** Time from a line being said (by the server) to its first message landing. */
  latency: number[];
  /** How long each message was up. */
  visible: number[];
  /** How many times each message was up for less than it needed to be read. */
  tooShort: number;
  messages: number;
  lines: number;
  /** Bots that moved before their line had all landed. */
  cutOff: number;
  botMoves: number;
  /** Lines that never got said (stale, replaced or about a moment that passed). */
  unsaid: number;
  /** Simulated seconds, and the share of them with at least one bubble up, and with someone typing. */
  seconds: number;
  anyUp: number;
  typing: number;
  /** Seconds with 0, 1, 2, 3+ seats talking. */
  seats: number[];
  /** Seconds each hand lasted, for the talk-per-minute figure. */
  handSeconds: number;
  /** Gaps between a bot's move and its own earlier line landing (positive = it waited). */
  slack: number[];
  /** What the lines were about. */
  events: Map<string, number>;
}

const blank = (): Sample => ({ latency: [], visible: [], tooShort: 0, messages: 0, lines: 0, cutOff: 0, botMoves: 0, unsaid: 0, seconds: 0, anyUp: 0, typing: 0, seats: [0, 0, 0, 0], handSeconds: 0, slack: [], events: new Map() });

function playTable(seed: number, bots: number, hands: number, fast: boolean): Sample {
  const s = blank();
  const rng = seededRng(seed);
  let clock = 1_000_000;
  let game: Game = createTable({ hostDeviceId: 'sim', name: 'Sam', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, turnSeconds: 0 }, bots, code: null, now: clock });
  if (fast) game.fast = true;
  const step = (action: Parameters<typeof applyAction>[1], deviceId = 'sim') => {
    const r = applyAction(game, action, { deviceId, now: clock, rng });
    if (!r.ok) throw new Error(r.error);
    game = r.game;
  };
  step({ type: 'start' });

  const lane = new ChatLane();
  const seen: Record<string, number> = {};
  const pushedAt = new Map<string, number>();
  const firstLand = new Map<string, number>();
  const up = new Map<string, { from: number; to: number; text: string }>();
  const lastMove: Record<string, string> = {};
  const finishedAt = new Map<string, number>();
  let moment = '0-0-live';
  let personAt = 0;
  let personTurn = '';
  let handsDone = 0;
  let lastHand = 0;
  let handStart = clock;
  let laneAt = clock;

  const momentOf = (g: Game) => `${g.hand?.number ?? 0}-${g.hand?.board.length ?? 0}-${g.hand?.result ? 'over' : 'live'}`;

  // Everything the phone does when the game changes.
  const observe = () => {
    const m = momentOf(game);
    if (m !== moment) {
      moment = m;
      const before = lane.talk.bind(lane);
      void before;
      lane.retain(worthSaying(moment));
    }
    for (const seat of game.hand?.seats ?? []) {
      const sig = seat.last ? `${game.hand!.number}:${seat.last.move}-${seat.last.amount ?? ''}-${seat.last.street ?? ''}` : '';
      if (lastMove[seat.playerId] !== undefined && lastMove[seat.playerId] !== sig && sig) {
        const p = game.players.find((x) => x.id === seat.playerId);
        if (p?.bot) {
          s.botMoves++;
          // Did it move before its line had all landed?
          const pending = lane.talk(seat.playerId, clock);
          const waiting = pending?.typing;
          if (waiting) s.cutOff++;
          const done = finishedAt.get(seat.playerId);
          if (done !== undefined) s.slack.push(clock - done);
        }
        lane.clear(seat.playerId, (q) => BEFORE_MOVE.has(q.event));
      }
      lastMove[seat.playerId] = sig;
    }
    for (const [who, r] of Object.entries(game.reactions ?? {})) {
      if (seen[who] === r.n) continue;
      seen[who] = r.n;
      if (!r.id.startsWith('b:')) continue;
      const name = game.players.find((p) => p.id === r.to)?.name;
      const say: Say = botSay({ who, lineId: r.id, n: r.n, beats: reactionBeats(r.id, name), at: clock, moment, sig: lastMove[who] ?? '', luck: rng() });
      lane.push(say);
      pushedAt.set(say.key, clock);
      s.lines++;
      const kind = r.id.split(':')[2];
      s.events.set(kind, (s.events.get(kind) ?? 0) + 1);
    }
  };

  // Runs the lane up to `to`, sampling what's on screen at every wake-up.
  const runLane = (to: number) => {
    let guard = 0;
    while (laneAt < to && guard++ < 10_000) {
      const due = lane.nextDue(laneAt);
      const next = Math.min(to, due === null ? to : Math.max(laneAt + 1, due));
      // The state over [laneAt, next) is what it was after the last advance.
      const dt = (next - laneAt) / 1000;
      let talking = 0;
      let typing = false;
      for (const p of game.players) {
        const t = lane.talk(p.id, laneAt);
        if (!t) continue;
        talking++;
        if (t.typing) typing = true;
      }
      s.seconds += dt;
      if (talking) s.anyUp += dt;
      if (typing) s.typing += dt;
      s.seats[Math.min(3, talking)] += dt;
      laneAt = next;
      lane.advance(laneAt);
      for (const p of game.players) {
        const t = lane.talk(p.id, laneAt);
        for (const m of t?.shown ?? []) {
          if (!up.has(m.key)) {
            up.set(m.key, { from: m.at, to: m.until, text: m.text });
            const line = m.key.split('#')[0];
            if (!firstLand.has(line)) {
              firstLand.set(line, m.at);
              s.latency.push(m.at - (pushedAt.get(line) ?? m.at));
            }
            s.messages++;
          }
        }
        // When its last message has landed and no dots remain, the speaker is done.
        if (t && !t.typing) finishedAt.set(p.id, Math.max(finishedAt.get(p.id) ?? 0, ...t.shown.map((m) => m.at)));
      }
      for (const who of lane.takeRetired()) void who;
    }
  };

  let guard = 0;
  while (handsDone < hands && guard++ < hands * 300) {
    const hand = game.hand;
    if (hand && hand.number !== lastHand) {
      if (lastHand) s.handSeconds += (clock - handStart) / 1000;
      handStart = clock;
      lastHand = hand.number;
      handsDone++;
    }
    // A person's turn: they take a human moment, then play like a bot would.
    const me = game.players.find((p) => p.deviceId === 'sim')!;
    if (hand && !hand.result && hand.toAct === me.id) {
      if (personTurn !== `${hand.number}:${hand.seq}`) {
        personTurn = `${hand.number}:${hand.seq}`;
        personAt = clock + 900 + Math.floor(rng() * 1800);
      }
    } else personAt = Infinity;
    const wake = Math.min(game.wakeAt ?? Infinity, personAt);
    clock = Math.max(clock + 1, Number.isFinite(wake) ? wake : clock + 1000);
    runLane(clock);
    if (hand && !hand.result && hand.toAct === me.id && clock >= personAt) {
      const seat = hand.seats.find((x) => x.playerId === me.id)!;
      const m = decide(game, hand, seat, rng).move;
      const r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: m.move, to: m.to }, { deviceId: 'sim', now: clock, rng });
      if (r.ok) game = r.game;
      else step({ type: 'act', hand: hand.number, seq: hand.seq, move: options(game, hand, seat).canCheck ? 'check' : 'fold' });
    } else step({ type: 'tick' });
    // Top up anyone who's run out so the table carries on.
    for (const p of game.players) if (p.stack === 0 && (!game.hand || game.hand.result)) p.stack = DEFAULT_SETTINGS.startingStack;
    observe();
  }
  runLane(clock + 8000);
  // Message visibility and anything that never got said.
  for (const [, m] of up) {
    const need = readMs(m.text);
    s.visible.push(m.to - m.from);
    if (m.to - m.from < need) s.tooShort++;
  }
  s.unsaid = Math.max(0, s.lines - firstLand.size);
  return s;
}

const pctile = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const lines: string[] = [];
const out = (t = '') => {
  lines.push(t);
  console.log(t);
};

const configs: { label: string; bots: number; fast: boolean }[] = [
  { label: 'heads-up', bots: 1, fast: false },
  { label: '3 bots', bots: 3, fast: false },
  { label: '5 bots', bots: 5, fast: false },
  { label: '8 bots', bots: 8, fast: false },
  { label: '5 bots, fast', bots: 5, fast: true },
];

out('# Chat lab');
out();
out(`${TABLES} tables a setting, ${HANDS} hands each. Times in milliseconds unless noted.`);
out();
out('| Table | lines/min | messages/line | start p50 | start p95 | up p5 | up p50 | too short | talk time | typing | 2+ talking | cut off | unsaid |');
out('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const totals = blank();
let mix = new Map<string, number>();
for (const c of configs) {
  const all = blank();
  for (let t = 0; t < TABLES; t++) {
    const r = playTable(1000 + t * 7 + c.bots, c.bots, HANDS, c.fast);
    all.latency.push(...r.latency);
    all.visible.push(...r.visible);
    all.tooShort += r.tooShort;
    all.messages += r.messages;
    all.lines += r.lines;
    all.cutOff += r.cutOff;
    all.botMoves += r.botMoves;
    all.unsaid += r.unsaid;
    all.seconds += r.seconds;
    all.anyUp += r.anyUp;
    all.typing += r.typing;
    all.handSeconds += r.handSeconds;
    r.seats.forEach((x, i) => (all.seats[i] += x));
    for (const [k, v] of r.events) all.events.set(k, (all.events.get(k) ?? 0) + v);
  }
  if (c.label === '5 bots') mix = all.events;
  const pc = (x: number) => `${(x * 100).toFixed(0)}%`;
  out(
    `| ${c.label} | ${((all.lines / all.seconds) * 60).toFixed(1)} | ${(all.messages / Math.max(1, all.lines - all.unsaid)).toFixed(2)} | ${pctile(all.latency, 50)} | ${pctile(all.latency, 95)} | ${pctile(all.visible, 5)} | ${pctile(all.visible, 50)} | ${all.tooShort} | ${pc(all.anyUp / all.seconds)} | ${pc(all.typing / all.seconds)} | ${pc((all.seats[2] + all.seats[3]) / all.seconds)} | ${all.cutOff}/${all.botMoves} | ${all.unsaid}/${all.lines} |`,
  );
  totals.tooShort += all.tooShort;
  totals.messages += all.messages;
  totals.cutOff += all.cutOff;
  totals.botMoves += all.botMoves;
  totals.unsaid += all.unsaid;
  totals.lines += all.lines;
}
out();
out('What the lines were about at the 5 bot table (per 100 hands):');
out([...mix].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${((v / (TABLES * HANDS)) * 100).toFixed(1)}`).join(', '));
out();
out(`Settings: type ${CHAT.typeBase}+${CHAT.typePerChar}/char (max ${CHAT.typeMax}), follow-ups x${CHAT.burst}, settle ${CHAT.settle}, afterthought ${CHAT.afterthought}, hold ${CHAT.holdBase}+${CHAT.holdPerChar}/char (${CHAT.holdMin}–${CHAT.holdMax}), reply gap ${CHAT.replyGap}, read ${CHAT.readTime}.`);
out(`Overall: ${totals.messages} messages from ${totals.lines} lines; ${totals.tooShort} up for less than their read time; ${totals.cutOff} of ${totals.botMoves} bot moves came while the bot was still typing; ${totals.unsaid} lines never said.`);
if (OUT) writeFileSync(OUT, lines.join('\n') + '\n');
void mean;
