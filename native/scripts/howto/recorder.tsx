// How to Play's recorder: plays one bots-only hand after another of each game on the app's own table, like a person
// (it waits a moment on its turn, then checks or calls, never folds; it throws away, hits, points and votes when the
// game asks), and at each moment the steps talk about asks the Mac running the iPhone simulator for a screenshot
// (`host.mjs`, `xcrun simctl io screenshot`). When a game's time is up it tells the host which hand showed the game
// best. It never ships: `install.mjs` copies it into src/ and mounts it on the root layout only for the shooting
// build in .github/workflows/howto-shots.yml. See docs/HOW_TO_PLAY.md.
import { router } from 'expo-router';
import { useEffect } from 'react';

import { shotsNeeded } from '@/components/how-to/steps';
import { count21, DEFAULT_SETTINGS, options, powerInfo, powerTargets, rankOf, toTableTime, withVariant, type Game, type Hand, type Variant } from '@/engine';
import { currentTable, dispatch, leaveTable, me, openLocalTable } from '@/state/session';
import { save } from '@/state/storage';

const HOST = 'http://127.0.0.1:8123';
const ALL: Variant[] = ['holdem', 'pineapple', 'deuces', 'ghost', 'pittsburgh', 'dice', 'redriver', 'crucifix', 'circle', 'memory', 'beanstalk', 'bjholdem', 'imposter', 'power'];
/** How long each game may play for its best hand. */
const BUDGET_MS = 7 * 60_000;
/** A hand scoring this much is as good as it gets: stop there. */
const ENOUGH: Partial<Record<Variant, number>> = { deuces: 5, redriver: 9, dice: 5, imposter: 2, power: 6 };

const sleep = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

async function call(path: string, params: Record<string, string | number> = {}): Promise<string> {
  const q = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  try {
    const res = await fetch(`${HOST}${path}?${q}`);
    return await res.text();
  } catch {
    return '';
  }
}
const log = (msg: string) => call('/log', { msg });

export function HowToRecorder() {
  useEffect(() => {
    void run();
  }, []);
  return null;
}

let started = false;
async function run(): Promise<void> {
  if (started) return;
  started = true;
  // A first-time player's prompts would cover the table: the rules sheet, the hand tools tip, the rating prompt.
  save('flipup.rulesseen', ALL);
  save('flipup.handtoolstip', true);
  save('flipup.reviewasked', true);
  save('flipup.muted', true);
  save('flipup.profile', { name: 'You', emoji: '😎' });
  await sleep(4000);
  const asked = (await call('/games')).split(',').filter((g): g is Variant => (ALL as string[]).includes(g));
  for (const v of asked.length ? asked : ALL) {
    await log(`${v}: start`);
    try {
      await shootGame(v);
    } catch (e) {
      await log(`${v}: failed, ${(e as Error).message}`);
    }
  }
  await call('/done');
}

function openTable(v: Variant): void {
  leaveTable();
  const settings = { ...withVariant({ ...DEFAULT_SETTINGS }, v), turnSeconds: 0, rebuys: false };
  openLocalTable(settings, 4, 'You', '😎');
  dispatch({ type: 'start' });
}

interface Planned {
  name: string;
  /** Not before this (ms, real time). */
  at: number;
  /** Wait for your turn (so your buttons show) until `deadline`. */
  mine?: boolean;
  deadline: number;
}

interface Played {
  key: string;
  number: number;
  shots: Set<string>;
  /** Power Cards: powers played so far, whether you tried yours, and whether the picture is of yours. */
  powersSeen?: number;
  powerTried?: boolean;
  playedMine?: boolean;
  street: string;
  dice?: number;
  hitDone?: boolean;
  pointed?: boolean;
  voted?: boolean;
  discarded?: boolean;
  nextSent?: boolean;
  /** Notes for the score. */
  deuceHole?: boolean;
  deuceFlop?: boolean;
  deuceBoard?: boolean;
  board: number;
  won?: boolean;
  /** Other players whose cards are face up at the end. */
  shown?: number;
  reachedShowdown?: boolean;
  doneAt?: number;
}

async function shootGame(v: Variant): Promise<void> {
  const end = Date.now() + BUDGET_MS;
  let tables = 0;
  let hand = null as Played | null;
  let plan: Planned[] = [];
  let peekFor: string | null = null;
  let turnKey = '';
  let turnSince = 0;
  let best = { key: '', score: -1 };

  openTable(v);
  tables += 1;
  router.dismissAll();
  router.push('/table');
  await sleep(1500);

  // Only the pictures this game's steps use, so one never waits behind another it doesn't need.
  const needed = new Set<string>(shotsNeeded(v));
  const want = (name: string, wait: number, opts: { mine?: boolean; deadline?: number } = {}) => {
    if (!needed.has(name)) return;
    const now = Date.now();
    plan = plan.filter((p) => p.name !== name);
    plan.push({ name, at: now + wait, mine: opts.mine, deadline: now + (opts.deadline ?? wait) });
  };

  while (Date.now() < end) {
    const t = currentTable().game;
    const now = Date.now();
    if (!t) {
      await sleep(200);
      continue;
    }
    const tableNow = toTableTime(now, !!t.fast);
    const h = t.hand;
    const mine = t.players.find((p) => p.deviceId === me);
    const seat = h?.seats.find((s) => s.playerId === mine?.id);
    const myTurn = !!h && !h.result && !!mine && h.toAct === mine.id && !(h.bettingAt && h.bettingAt > tableNow);
    // Wait out a moment (cards landing one at a time, a roll, a bust) before a picture.
    const settle = h?.moment && h.moment.until > tableNow ? h.moment.until - tableNow : 0;

    // Broke, or the table's over: a fresh table, same game.
    if (t.status === 'ended' || (mine && mine.stack <= 0 && (!h || h.result))) {
      if (hand && !hand.doneAt) hand = null;
      plan = [];
      openTable(v);
      tables += 1;
      await sleep(1500);
      continue;
    }

    // Memory Poker: the 20 cards before the hand is dealt.
    if (t.memory && t.memory.until > tableNow && (!h || h.result)) {
      const key = `${tables}-${(h?.number ?? 0) + 1}`;
      if (needed.has('peek') && peekFor !== key && t.memory.until - tableNow < 7600) {
        peekFor = key;
        if ((await call('/shot', { game: v, hand: key, name: 'peek' })) !== 'ok') peekFor = null;
      }
    }

    if (h) {
      const key = `${tables}-${h.number}`;
      if (hand?.key !== key) {
        hand = { key, number: h.number, shots: new Set(), street: h.street, board: 0 };
        plan = [];
        if (peekFor === key) hand.shots.add('peek');
        want('cards', 1800);
        want('yourturn', 900, { mine: true, deadline: 8000 });
      }
      const p = hand;
      if (!p.doneAt) {
        // Notes for choosing the hand.
        if (seat?.cards.some((c) => rankOf(c) === 2)) p.deuceHole = true;
        if (h.board.slice(0, 3).some((c) => rankOf(c) === 2)) p.deuceFlop = true;
        if (h.board.some((c) => rankOf(c) === 2)) p.deuceBoard = true;
        p.board = Math.max(p.board, h.board.length);

        if (h.street !== p.street) {
          p.street = h.street;
          if (h.street === 'flop' || h.street === 'turn' || h.street === 'river') {
            plan = plan.filter((x) => x.name !== 'yourturn');
            const mineToo = v === 'bjholdem' && h.street === 'flop';
            want(h.street, settle + 900, { mine: mineToo, deadline: settle + (mineToo ? 9000 : 900) });
          }
        }
        if (h.dice && p.dice === undefined && h.dice.until) {
          p.dice = h.dice.roll;
          // The roll is a 6s show (dice-roll.tsx): a count from three to 2.4s, the die tumbling to 4.3s, then the
          // result. The host takes each picture wholly inside its part (the table's clock is real time here).
          const t0 = h.dice.until - 6000;
          const parts: [string, number, number][] = [
            ['rolling', 2600, 4250],
            ['dice', 4500, 5950],
          ];
          for (const [name, from, to] of parts) {
            if (!needed.has(name)) continue;
            if ((await call('/window', { game: v, hand: key, name, from: t0 + from, to: t0 + to })) === 'ok') p.shots.add(name);
          }
        }
        // Power Cards: a power being played stops the table for 1.8s; take it inside that moment, and prefer yours.
        const uses = h.powerUses ?? [];
        if (uses.length > (p.powersSeen ?? 0)) {
          p.powersSeen = uses.length;
          const yours = uses[uses.length - 1].by === mine?.id;
          if (needed.has('played') && h.moment && h.moment.until > tableNow && (!p.shots.has('played') || (yours && !p.playedMine))) {
            const from = Math.max(Date.now(), h.moment.at + 250);
            if ((await call('/window', { game: v, hand: key, name: 'played', from, to: h.moment.until - 80 })) === 'ok') {
              p.shots.add('played');
              if (yours) p.playedMine = true;
            }
          }
        }
        if (h.discarding && !p.shots.has('discard') && !plan.some((x) => x.name === 'discard')) want('discard', 1100);
        if (h.discussing && !p.pointed) {
          p.pointed = true;
          const other = h.seats.find((s) => s.playerId !== mine?.id);
          if (other) setTimeout(() => dispatch({ type: 'point', hand: h.number, playerId: other.playerId }), 1200);
          want('discuss', 3600);
        }
        if (h.voting && !h.discussing && !p.shots.has('vote') && !plan.some((x) => x.name === 'vote')) want('vote', 1200);
        if (h.result) {
          p.doneAt = now;
          p.reachedShowdown = h.result.showdown && !!seat && !seat.folded;
          p.won = !!mine && (h.result.won[mine.id] ?? 0) > 0;
          p.shown = h.seats.filter((x) => x.playerId !== mine?.id && x.cards.length > 0).length;
          plan = plan.filter((x) => x.name !== 'yourturn' || p.shots.has('yourturn'));
          want(h.result.imposter ? 'reveal' : 'showdown', settle + 2600);
        }
      }

      // Pictures that are due.
      for (const shot of [...plan].sort((a, b) => a.at - b.at)) {
        if (Date.now() < shot.at) continue;
        if (shot.mine && !myTurn && Date.now() < shot.deadline) continue;
        if (shot.mine && !myTurn && shot.name === 'yourturn') {
          plan = plan.filter((x) => x !== shot);
          continue;
        }
        plan = plan.filter((x) => x !== shot);
        if (shot.mine && myTurn) await sleep(500);
        if ((await call('/shot', { game: v, hand: p.key, name: shot.name })) === 'ok') p.shots.add(shot.name);
      }

      // The hand is over and pictured: score it, then deal on.
      if (p.doneAt && !plan.length && !p.nextSent) {
        p.nextSent = true;
        const score = scoreOf(v, p, h);
        await log(`${v}: hand ${p.key} score ${score} (${[...p.shots].join(' ')})`);
        if (score > best.score) best = { key: p.key, score };
        if (score >= (ENOUGH[v] ?? 4)) break;
        await sleep(800);
        dispatch({ type: 'next', hand: h.number });
      }

      // Play like a person.
      if (!h.result) {
        const waitingForPicture = plan.some((x) => (x.name === 'discard' || x.name === 'vote' || x.name === 'discuss' || x.name === 'hit' || (x.mine && myTurn)) && x.deadline > Date.now());
        if (!waitingForPicture) {
          const k = `${h.number}-${h.seq}`;
          if (myTurn && k !== turnKey) {
            turnKey = k;
            turnSince = now;
          }
          if (act(v, t, h, p, mine?.id ?? '', myTurn, now - turnSince) === 'hit') want('hit', 1900);
        }
      }
    }
    await sleep(150);
  }
  await call('/keep', { game: v, hand: best.key, score: best.score });
  leaveTable();
  router.dismissAll();
  await sleep(1200);
}

function act(v: Variant, t: Game, h: Hand, p: Played, myId: string, myTurn: boolean, waited: number): 'hit' | void {
  const seat = h.seats.find((s) => s.playerId === myId);
  if (!seat) return;
  if (h.discarding && !p.discarded && seat.cards.length > 2 && !seat.folded) {
    p.discarded = true;
    const worst = [...seat.cards].sort((a, b) => rankOf(a) - rankOf(b))[0];
    dispatch({ type: 'discard', hand: h.number, card: worst });
    return;
  }
  if (h.voting && !h.discussing && !p.voted) {
    const other = h.seats.find((s) => s.playerId !== myId);
    if (other) {
      p.voted = true;
      dispatch({ type: 'vote', hand: h.number, playerId: other.playerId });
    }
    return;
  }
  if (!myTurn) return;
  if (waited < 1500) return;
  // Blackjack Hold'em: one hit on the flop when it can't bust.
  if (v === 'bjholdem' && h.street === 'flop' && !p.hitDone && count21(seat.cards) <= 11 && !seat.allIn) {
    p.hitDone = true;
    dispatch({ type: 'hit', hand: h.number, seq: h.seq });
    return 'hit';
  }
  // Power Cards: play yours the first time you can (one that needs no choice, or one aimed at a player).
  if (v === 'power' && !p.powerTried) {
    const can = options(t, h, seat).power;
    if (can) {
      p.powerTried = true;
      const needs = powerInfo(can.effect).needs;
      const target = needs === 'player' ? powerTargets(h, seat, can.effect)[0]?.playerId : undefined;
      if (needs === null || target) {
        dispatch({ type: 'power', hand: h.number, seq: h.seq, ...(target ? { target } : {}) });
        return;
      }
    }
  }
  const toCall = Math.max(0, h.currentBet - seat.bet);
  dispatch({ type: 'act', hand: h.number, seq: h.seq, move: toCall === 0 ? 'check' : 'call' });
}


/** How well a finished hand shows the game: -1 when it's missing a picture the steps need. */
function scoreOf(v: Variant, p: Played, h: Hand): number {
  const s = p.shots;
  const need = (...names: string[]) => names.every((n) => s.has(n));
  if (!p.reachedShowdown && !h.result?.imposter) return -1;
  if (!need('cards', v === 'imposter' ? 'reveal' : 'showdown')) return -1;
  // A showdown worth showing: someone else's cards face up, and you winning.
  const won = (p.shown ? 2 : 0) + (p.won ? 1 : 0);
  switch (v) {
    case 'holdem':
      return need('yourturn', 'flop', 'turn', 'river') ? 1 + won : -1;
    case 'pineapple':
      return need('flop', 'discard', 'turn') ? 1 + won : -1;
    case 'deuces':
      // Every 2 is wild: the hand has to show one on the board.
      if (!need('flop', 'river') || !p.deuceBoard) return -1;
      return (p.deuceHole ? 2 : 0) + (p.deuceFlop ? 2 : 0) + (p.deuceBoard ? 1 : 0);
    case 'ghost':
      return need('flop', 'river') && h.result?.ghost ? 1 + won : -1;
    case 'pittsburgh':
      return need('flop', 'river') ? 1 + won : -1;
    case 'dice':
      return need('turn', 'rolling', 'dice') ? 1 + (p.dice !== undefined && p.dice <= 5 ? 3 : 0) + (p.shown ? 1 : 0) : -1;
    case 'redriver':
      return need('flop', 'river') && p.board > 5 ? p.board + (p.shown ? 2 : 0) : -1;
    case 'crucifix':
    case 'circle':
    case 'beanstalk':
      return need('flop', 'turn', 'river') ? 1 + won : -1;
    case 'memory':
      return need('peek', 'flop', 'river') ? 1 + won : -1;
    case 'bjholdem':
      return need('flop', 'hit') ? 1 + won : -1;
    case 'imposter':
      return need('discuss', 'vote') ? 2 : -1;
    case 'power':
      return need('yourturn', 'played') ? 1 + (p.playedMine ? 2 : 0) + won : -1;
  }
  return 0;
}
