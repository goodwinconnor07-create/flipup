// App Store screenshots' recorder: walks the app through the listing's screens (docs/APP_STORE.md, "Screenshots")
// and at each one asks the Mac running the iPhone simulator for a picture (`host.mjs`, `xcrun simctl io screenshot`).
// Tables are real bots-only tables played like a person (checks or calls, never folds; throws away, hits and votes
// when the game asks), so every picture is the app as it is. It never ships: `install.mjs` copies it into src/ and
// mounts it on the root layout only for the shooting build in .github/workflows/store-shots.yml.
import { router } from 'expo-router';
import { useEffect } from 'react';

import { DEFAULT_SETTINGS, freeThisWeek, rankOf, toTableTime, VARIANTS, withVariant, type Game, type Hand, type Variant } from '@/engine';
import { saveLastHand } from '@/state/replays';
import { currentTable, dispatch, leaveTable, me, openLocalTable } from '@/state/session';
import { save } from '@/state/storage';

const HOST = 'http://127.0.0.1:8124';
const sleep = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

async function call(path: string, params: Record<string, string | number> = {}): Promise<string> {
  const q = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  try {
    return await (await fetch(`${HOST}${path}?${q}`)).text();
  } catch {
    return '';
  }
}
const log = (msg: string) => call('/log', { msg });
const shot = (name: string) => call('/shot', { name });

export function StoreRecorder() {
  useEffect(() => {
    void run();
  }, []);
  return null;
}

/** What a table scene waits for before its picture; `null` from `ready` means keep playing. */
interface TableScene {
  name: string;
  variant: Variant;
  bots: number;
  /** True at the moment worth a picture. */
  ready: (h: Hand, g: Game, mine: string) => boolean;
  /** Wait this long after `ready` first holds (a roll landing, a bubble filling in). */
  settle?: number;
  /** Give up and take what's on screen after this long. */
  budget?: number;
}

const myTurn = (h: Hand, mine: string) => !h.result && h.toAct === mine;
const SCENES: TableScene[] = [
  // 1. A mini game mid-hand: the cross on the felt, your turn so the buttons show.
  { name: '01-crucifix', variant: 'crucifix', bots: 5, ready: (h, _g, m) => myTurn(h, m) && h.street === 'river' },
  // 2. Die on the River: the roll over the table, caught as the die lands.
  { name: '02-dice-roll', variant: 'dice', bots: 4, ready: (h) => !!h.dice, settle: 4300 },
  // 5. Haunted Pot: a showdown with the ghost's cards turned up (its second card turns 0.8s after the first).
  { name: '05-haunted-pot', variant: 'ghost', bots: 4, ready: (h) => !!h.result && h.seats.filter((s) => !s.folded).length > 1, settle: 2600 },
  // 7. Texas Hold'em with the bots talking: the flop on your turn.
  { name: '07-holdem', variant: 'holdem', bots: 5, ready: (h, _g, m) => myTurn(h, m) && h.board.length >= 3, settle: 1200 },
];

let started = false;
async function run(): Promise<void> {
  if (started) return;
  started = true;
  // A first-time player's prompts would cover the screens: the rules card, the hand tools tip, the rating prompt.
  save('flipup.rulesseen', VARIANTS.map((v) => v.id));
  save('flipup.handtoolstip', true);
  save('flipup.rangetip', true);
  save('flipup.reviewasked', true);
  save('flipup.muted', true);
  save('flipup.talk', 'chatty');
  save('flipup.profile', { name: 'Alex', emoji: '😎' });
  await sleep(5000);
  const only = (await call('/only')).split(',').filter(Boolean);
  const wanted = (name: string) => !only.length || only.some((o) => name.startsWith(o));

  for (const scene of SCENES) {
    if (!wanted(scene.name)) continue;
    try {
      await tableScene(scene);
    } catch (e) {
      await log(`${scene.name}: failed, ${(e as Error).message}`);
    }
  }
  // 8. A share card of a Texas Hold'em hand: the table above plays on to the end of its hand, which becomes the last hand.
  if (wanted('08')) {
    if (!currentTable().game) await tableScene({ ...SCENES[SCENES.length - 1], name: '07-holdem-again' });
    await playUntil((h) => !!h.result, 2500, 90_000);
    await page('08-share-card', () => {
      saveLastHand();
      router.push({ pathname: '/share-card', params: { kind: 'hand', id: 'last' } });
    }, 3500, true);
  }
  leaveTable();
  // 3. Home's game swiper on a mini game: never this week's free one, whose banner would be out of date a week later.
  if (wanted('03')) {
    const game = (['imposter', 'dice', 'ghost'] as Variant[]).find((v) => v !== freeThisWeek()) ?? 'imposter';
    await page('03-home', () => {
      save('flipup.homegame', game);
      router.dismissAll();
      router.replace('/');
    });
  }
  // 4. The lobby with its game code (an online Texas Hold'em table, made on the server like anyone's).
  if (wanted('04')) await page('04-lobby', () => router.push({ pathname: '/play-friends', params: { variant: 'holdem' } }), 6000);
  // 4b. Play bots: the same lobby page with four bots already seated (no code), to pick from with 04.
  if (wanted('04')) await page('04b-play-bots', () => router.push({ pathname: '/play-bots', params: { variant: 'holdem' } }), 3500);
  // 6. Range training's daily hand.
  if (wanted('06')) await page('06-daily-hand', () => router.push({ pathname: '/range-session', params: { daily: '1' } }), 4000);
  await call('/done');
}

async function page(name: string, open: () => void, wait = 3000, keepTable = false): Promise<void> {
  try {
    // A sheet over the table (the share card) keeps the table under it; everything else starts from Home.
    if (!keepTable) router.dismissAll();
    await sleep(900);
    open();
    await sleep(wait);
    await shot(name);
    await log(`${name}: taken`);
  } catch (e) {
    await log(`${name}: failed, ${(e as Error).message}`);
  }
}

async function tableScene(s: TableScene): Promise<void> {
  leaveTable();
  router.dismissAll();
  const settings = { ...withVariant({ ...DEFAULT_SETTINGS }, s.variant), turnSeconds: 0, rebuys: true };
  openLocalTable(settings, s.bots, 'Alex', '😎');
  dispatch({ type: 'start' });
  router.push('/table');
  await sleep(1500);
  if (await playUntil(s.ready, s.settle ?? 600, s.budget ?? 4 * 60_000)) {
    await shot(s.name);
    await log(`${s.name}: taken at hand ${currentTable().game?.hand?.number ?? '?'}`);
  } else {
    // The moment never came in time: keep what's on screen, so the set is never short.
    await shot(s.name);
    await log(`${s.name}: taken after its time ran out (the moment it waits for didn't come)`);
  }
}

/**
 * Plays the table like a person (a moment's thought, then check or call; throws away and votes when asked; the next
 * hand after a moment) until `ready` has held for `settle` ms. False when `budget` ran out first.
 */
async function playUntil(ready: TableScene['ready'], settle: number, budget: number): Promise<boolean> {
  const end = Date.now() + budget;
  let readyAt = 0;
  let turnKey = '';
  let turnSince = 0;
  let discarded = -1;
  let voted = -1;
  let nextAsked = -1;
  while (Date.now() < end) {
    const g = currentTable().game;
    const h = g?.hand;
    const mine = g?.players.find((p) => p.deviceId === me)?.id ?? '';
    if (!g || !h) {
      await sleep(200);
      continue;
    }
    if (ready(h, g, mine)) {
      if (!readyAt) readyAt = Date.now();
      if (Date.now() - readyAt >= settle) return true;
      await sleep(100);
      continue;
    }
    readyAt = 0;
    const seat = h.seats.find((x) => x.playerId === mine);
    const tableNow = toTableTime(Date.now(), !!g.fast);
    if (h.result) {
      // The next hand, after a moment to see this one.
      if (nextAsked !== h.number) {
        nextAsked = h.number;
        await sleep(1500);
        dispatch({ type: 'next', hand: h.number });
      }
    } else if (seat) {
      if (h.discarding && discarded !== h.number && seat.cards.length > 2 && !seat.folded) {
        discarded = h.number;
        dispatch({ type: 'discard', hand: h.number, card: [...seat.cards].sort((a, b) => rankOf(a) - rankOf(b))[0] });
      } else if (h.voting && !h.discussing && voted !== h.number) {
        const other = h.seats.find((x) => x.playerId !== mine);
        if (other) {
          voted = h.number;
          dispatch({ type: 'vote', hand: h.number, playerId: other.playerId });
        }
      } else if (h.toAct === mine && !(h.bettingAt && h.bettingAt > tableNow)) {
        const k = `${h.number}-${h.seq}`;
        if (k !== turnKey) {
          turnKey = k;
          turnSince = Date.now();
        }
        if (Date.now() - turnSince > 1200) dispatch({ type: 'act', hand: h.number, seq: h.seq, move: h.currentBet - seat.bet > 0 ? 'call' : 'check' });
      }
    }
    await sleep(150);
  }
  return false;
}
