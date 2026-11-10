// Demo data for screenshots of My Games, Training and Stats: a bots-only table in play, a few weeks of past games
// (online and bots), Range training answers, and a profile. Prints `{ key: jsonValue }` for every `flipup.*` key.
// Never shipped: the screenshot run (.github/workflows/ios-screens.yml) writes it into the simulator's storage.
//   npx tsx native/scripts/demoData.ts > demo.json
import { applyAction, createTable, DEFAULT_SETTINGS } from '../../src/game/reducer';
import type { Game } from '../../src/game/types';
import { SCENARIOS } from '../../src/train/ranges/scenarios';

const DEVICE = 'd' + 'demo0screens0phone0'.padEnd(20, '0').slice(0, 20);
const NOW = Date.now();
const DAY = 86_400_000;
let seed = 7;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// A table in play: you and five bots at Crazy Pineapple, a few hands in.
let game: Game = createTable({ hostDeviceId: DEVICE, name: 'Connor', emoji: '🦊', settings: { ...DEFAULT_SETTINGS, variant: 'pineapple', turnSeconds: 0 }, bots: 5, code: null, now: NOW - 600_000, rng });
const ctx = (now: number) => ({ deviceId: DEVICE, now, rng });
let t = NOW - 590_000;
const started = applyAction(game, { type: 'start' }, ctx(t));
if (started.ok) game = started.game;
// The bots play a dozen hands; you fold whenever it's your turn and throw your first card in Pineapple (only the hand
// number and who's there show in the list).
for (let i = 0; i < 40000 && (game.hand?.number ?? 0) < 12 && game.status !== 'ended'; i++) {
  const hand = game.hand;
  const me = game.players.find((p) => p.deviceId === DEVICE)!;
  const seat = hand?.seats.find((s) => s.playerId === me.id);
  if (hand && !hand.result && seat && seat.cards.length === 3 && !seat.folded) {
    const r = applyAction(game, { type: 'discard', hand: hand.number, card: seat.cards[0] }, ctx(t));
    if (r.ok && r.changed) {
      game = r.game;
      continue;
    }
  }
  if (hand && hand.toAct === me.id) {
    const r = applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: 'fold' } as never, ctx(t));
    const c = r.ok ? r : applyAction(game, { type: 'act', hand: hand.number, seq: hand.seq, move: 'check' } as never, ctx(t));
    if (c.ok) {
      game = c.game;
      continue;
    }
  }
  if (hand?.result) {
    const r = applyAction(game, { type: 'next', hand: hand.number }, ctx(t));
    if (r.ok && r.changed) game = r.game;
  }
  t = Math.max(t + 50, game.wakeAt ?? t + 50);
  const r = applyAction(game, { type: 'tick' }, ctx(t));
  if (r.ok) game = r.game;
}
// Shift the table's clock to now, so it carries on from where it is.
const shift = NOW - t;
const moved = JSON.parse(JSON.stringify(game), (k, v) => (typeof v === 'number' && v > NOW - 2 * DAY && v < NOW + DAY && /At$|^wakeAt$|^at$|^until$|^createdAt$/.test(k) ? v + shift : v)) as Game;

const people = [
  { name: 'Mia', emoji: '🐙', bot: false },
  { name: 'Theo', emoji: '🐼', bot: false },
  { name: 'Ava', emoji: '🦄', bot: false },
  { name: 'Jack', emoji: '🐯', bot: false },
  { name: 'Lena', emoji: '🌵', bot: false },
];
const bots = [
  { name: 'Ace', emoji: '🦉', bot: true },
  { name: 'Ruby', emoji: '🦩', bot: true },
  { name: 'Moose', emoji: '🫎', bot: true },
  { name: 'Pip', emoji: '🐧', bot: true },
  { name: 'Bolt', emoji: '🦖', bot: true },
];
const line = (daysAgo: number, variant: string, place: number, online: boolean, who: typeof people, extra: object = {}) => ({
  at: NOW - daysAgo * DAY - 3_600_000 * (2 + (daysAgo % 5)),
  variant,
  place,
  players: who.length + 1,
  id: `demo${daysAgo}${variant}`,
  online,
  ...(online ? { code: 'ACES42' } : {}),
  who,
  net: place === 1 ? 2400 : -600,
  hands: 30 + daysAgo,
  ...extra,
});
const games = [
  line(1, 'holdem', 1, true, [people[0], people[1], people[2], bots[0]]),
  line(2, 'ghost', 2, false, bots.slice(0, 5)),
  line(3, 'deuces', 1, true, [people[3], people[4], people[0]]),
  line(5, 'pineapple', 3, false, bots.slice(1, 5)),
  line(8, 'holdem', 2, true, [people[1], people[2], people[3], people[4], people[0], bots[2]]),
  line(12, 'river', 1, false, bots.slice(0, 3)),
  line(15, 'pittsburgh', 4, true, [people[2], people[0], bots[1], bots[3]], { left: true }),
  line(21, 'holdem', 1, false, bots.slice(0, 5)),
  line(30, 'deuces', 2, true, [people[4], people[1]]),
].sort((a, b) => a.at - b.at);

const record = {
  hands: 1284,
  won: 431,
  biggestPot: 18640,
  best: { score: 9e9, name: 'Full house, kings full of sevens', cards: ['Kh', 'Ks', 'Kd', '7c', '7h'], variant: 'holdem' },
  games,
  seen: games.map((g) => g.id),
};

// Range training: 40 answers over the last ten days.
const history = SCENARIOS.slice(0, 40).map((s, i) => ({
  id: s.id,
  pick: i % 4 === 3 ? (s.best === 'fold' ? 'call' : 'fold') : s.best,
  grade: i % 4 === 3 ? 'mistake' : i % 7 === 5 ? 'ok' : 'best',
  at: NOW - Math.floor(i / 5) * DAY - i * 600_000,
}));
const grades = Object.fromEntries(history.filter((a) => a.grade === 'best').map((a) => [a.id, 'best']));

const data: Record<string, unknown> = {
  'flipup.device': DEVICE,
  'flipup.profile': { name: 'Connor', emoji: '🦊' },
  'flipup.session': { mode: 'local', code: null, game: moved },
  'flipup.record': record,
  'flipup.rangehistory': history,
  'flipup.ranges': grades,
  'flipup.launched': true,
  'flipup.reviewasked': true,
  'flipup.rangetip': true,
  'flipup.rulesseen': ['pineapple', 'holdem', 'ghost', 'deuces', 'river', 'pittsburgh'],
};
process.stdout.write(JSON.stringify(data));
