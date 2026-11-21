// The table on the Lock Screen and in the Dynamic Island (iPhone only). While you're seated at an online table that
// has been dealt, one Live Activity shows your cards, the board, the pot and whether it's your turn. It starts here,
// in the foreground, as the table deals (so registering its push token never races the app going to sleep), and the
// table's server keeps it up to date with Live Activity pushes from then on (worker/live.ts). While the app is open
// this phone updates it too, so it's right even before the first push lands. Leaving the table ends it.
//
// Bots-only tables have none: their clock runs in the app and stops when it's closed, so the activity would freeze.
//
// What it shows is `liveState()` (src/game/liveActivity.ts); the Swift side is modules/flipup-live and targets/live.
import { liveAttributes, liveState, type Game } from '@/engine';

import { FlipupLive } from '../../modules/flipup-live';
import { API_ORIGIN } from './api';
import { isLiveActivityOn } from './prefs';
import { subscribe } from './storage';

interface Current {
  id: string;
  code: string;
  /** The Check button's key from the table, once it has the push token. */
  act: string;
  /** The last state shown, as JSON, to skip updates that change nothing. */
  shown: string;
}

let current: Current | null = null;
/** A start in progress, so two quick table updates don't open two activities. */
let starting: Promise<void> | null = null;
let last: { code: string | null; game: Game | null; me: string } = { code: null, game: null, me: '' };
/** Push tokens already sent to their table (activity id → token), so a repeat of the same one isn't sent again. */
const sent = new Map<string, string>();
/** Leftovers from an earlier launch have been looked for. */
let swept = false;

/** Whether this table, as it stands, gets a Live Activity on this phone. */
function wanted(code: string | null, game: Game | null, me: string): game is Game {
  return !!code && !!game && game.code === code && game.status !== 'lobby' && game.players.some((p) => p.deviceId === me) && isLiveActivityOn();
}

/** Called with every change to the table this phone is at (session.ts's `set()`), and with null when it leaves. */
export function syncLive(code: string | null, game: Game | null, me: string): void {
  last = { code, game, me };
  if (!FlipupLive) return;
  if (starting) {
    void starting.then(() => syncLive(last.code, last.game, last.me));
    return;
  }
  if (!wanted(code, game, me)) {
    if (current) stop();
    // One left over from an earlier launch, for a table this phone has since left, goes too.
    else if (!swept) {
      swept = true;
      if (FlipupLive.running().length) void FlipupLive.end(null, null).catch(() => {});
    }
    return;
  }
  swept = true;
  if (current && current.code !== code) stop();
  if (!current) {
    starting = start(code!, game, me).finally(() => {
      starting = null;
    });
    return;
  }
  show(game, me);
}

async function start(code: string, game: Game, me: string): Promise<void> {
  const live = FlipupLive;
  if (!live?.isEnabled()) return;
  const state = liveState(game, me, Date.now());
  if (!state) return;
  try {
    // One running from before the app was closed, for this table, is picked up again rather than doubled.
    const running = live.running();
    const mine = running.find((a) => a.code === code);
    for (const other of running) if (other !== mine) void live.end(other.id, null);
    const id = mine?.id ?? (await live.start(JSON.stringify({ ...liveAttributes(game), origin: API_ORIGIN }), JSON.stringify(state)));
    current = { id, code, act: '', shown: '' };
    show(game, me);
    const token = live.tokenOf(id);
    if (token) void register(id, code, token);
  } catch {
    // Live Activities turned off for FlipUp, or too many running: the table works the same without one.
  }
}

function show(game: Game, me: string): void {
  const live = FlipupLive;
  if (!live || !current) return;
  const state = liveState(game, me, Date.now(), current.act);
  if (!state) return;
  const json = JSON.stringify(state);
  if (json === current.shown) return;
  current.shown = json;
  void live.update(current.id, json).catch(() => {});
}

/** Ends the activity at once and tells its table to stop pushing to it. */
function stop(): void {
  const old = current;
  current = null;
  if (!old) return;
  void FlipupLive?.end(old.id, null).catch(() => {});
  sent.delete(old.id);
  void post(`/api/tables/${old.code}/live/stop`, { deviceId: last.me }).catch(() => {});
}

/** Gives the table this activity's push token; the table answers with the Check button's key and pushes from then on. */
async function register(id: string, code: string, token: string): Promise<void> {
  if (sent.get(id) === token) return;
  sent.set(id, token);
  try {
    const res = await post(`/api/tables/${code}/live`, { deviceId: last.me, token, sandbox: __DEV__ });
    if (!res.ok) {
      sent.delete(id);
      return;
    }
    const { act } = (await res.json()) as { act?: string };
    if (current?.id === id && typeof act === 'string') {
      current.act = act;
      if (last.game) show(last.game, last.me);
    }
  } catch {
    // Offline: the next token or table change tries again.
    sent.delete(id);
  }
}

function post(path: string, body: unknown): Promise<Response> {
  return fetch(API_ORIGIN + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

// Apple hands each activity a push token (and sometimes a new one later): each goes to the activity's table.
FlipupLive?.addListener('onPushToken', ({ id, code, token }) => {
  if (current?.id === id) void register(id, code, token);
});

// Switching Live Activity off in Settings ends it at once; switching it back on starts one for the table you're at.
subscribe('flipup.liveactivity', () => syncLive(last.code, last.game, last.me));

/** Delete my data: every activity goes, whatever table it was for. */
export function endAllLive(): void {
  current = null;
  sent.clear();
  void FlipupLive?.end(null, null).catch(() => {});
}
