// Talk sweep: plays bot tables in every game with a person at them, records every line a bot says with what was
// going on at that moment, and prints only the lines that don't fit, grouped so one problem is one line:
//   - bad text: "{you}" or another {slot} left in, "undefined", double spaces, stray "|" pairs at the ends
//   - said out of turn: a line about being in the hand from a bot that has folded, a winner's line from a bot
//     that lost (and the other way round), a street line on the wrong street, "short stack" from the chip leader…
//   - said too often: the same bot saying the same line within a few hands, or the table hearing it twice running
//   - a static pass over every line a bot can say (length, slots, doubled spaces, the same text twice in one list)
// Run: npx tsx scripts/talkSweep.ts [tablesPerGame=3] [handsPerTable=25]
//   GAMES=holdem,onion   some games only;  MAX=12  kinds listed per check;  SHOW=check  every sighting of one check
// Nothing here ships in the app.
import { seededRng } from '../src/game/cards';
import { allLines, botLineText } from '../src/game/botTalk';
import { applyAction, createTable, DEFAULT_SETTINGS } from '../src/game/reducer';
import { reactionText } from '../src/game/reactions';
import { VARIANTS, type Variant } from '../src/game/variants';
import type { Game } from '../src/game/types';

const TABLES = Number(process.argv[2] ?? 3);
const HANDS = Number(process.argv[3] ?? 25);
const GAMES = (process.env.GAMES?.split(',') ?? VARIANTS.map((v) => v.id)) as Variant[];
const MAX = Number(process.env.MAX ?? 12);
const ME = 'sim';

interface Finding {
  check: string;
  /** What groups it: the check plus the line's event and, where it matters, the text. */
  key: string;
  text: string;
  where: string;
}
const found: Finding[] = [];
const add = (check: string, key: string, text: string, where: string) => found.push({ check, key: `${check}|${key}`, text, where });

// ---------------------------------------------------------------- what each kind of line assumes about its speaker

/** Lines that only make sense from a bot still in the hand. */
const IN_HAND = new Set(['thinkHard', 'thinkEasy', 'allin', 'raise', 'callLight', 'sweat', 'tank', 'beforeTurn', 'beforeRiver', 'beforeShowdown']);
/** Lines from a bot that just won the pot, and from one that just lost it. */
const WON = new Set(['sweatWin', 'bluffWon', 'bigWin', 'win']);
const LOST = new Set(['sweatLose', 'badBeat', 'lostToYou', 'bluffCaught', 'gotBluffed']);
/** Lines about the street just dealt, by how many board cards Texas Hold'em has then. */
const STREET: Record<string, number> = { flop: 3, turn: 4, river: 5 };

const slotsLeft = (t: string) => /\{[a-z]+\}/i.test(t);
const textProblem = (t: string): string | null => {
  if (!t.trim()) return 'empty';
  if (slotsLeft(t)) return 'slot left in';
  if (/\bundefined\b|\bnull\b|\bNaN\b|\[object/.test(t)) return 'code word';
  if (/ {2,}/.test(t.replace(/\|+/g, ' ').replace(/ +/g, ' ').trim()) || / {2,}/.test(t)) return 'double space';
  if (/^\s|\s$/.test(t)) return 'space at an end';
  if (/^\||\|$/.test(t)) return '| at an end';
  return null;
};

// ---------------------------------------------------------------- the static pass

for (const { voice, event, text } of allLines()) {
  const p = textProblem(text);
  if (p && !(p === 'slot left in' && /\{you\}/.test(text) && !/\{(?!you\})[a-z]+\}/i.test(text))) add('line-text', `${p}`, text, `${voice}:${event}`);
  if (text.replace(/\|/g, '').length > 60) add('line-long', event, text, `${voice}:${event} (${text.length} letters)`);
}
{
  // The same words twice in one list (ignoring "|" and case) make that line come up twice as often. A style's list is
  // its tone's list plus its own lines, so a repeat inside the tone's list is reported once, under the tone.
  const toneKeys = new Set<string>();
  const seen = new Set<string>();
  for (const { voice, event, text } of allLines()) {
    const words = text.replace(/\|+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const k = `${voice}|${event}|${words}`;
    const tone = voice === 'trash' || voice === 'friendly';
    if (seen.has(k) && (tone || !toneKeys.has(`${event}|${words}|dup`))) add('line-twice', `${voice}:${event}`, text, `${voice}:${event}`);
    if (tone && seen.has(k)) toneKeys.add(`${event}|${words}|dup`);
    seen.add(k);
  }
}

// ---------------------------------------------------------------- playing tables

function play(variant: Variant, seed: number, bots: number) {
  const rng = seededRng(seed);
  let clock = 1_000_000;
  let g: Game = createTable({ hostDeviceId: ME, name: 'Sam', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, variant, turnSeconds: 0 }, bots, code: null, now: clock, rng });
  const apply = (a: Parameters<typeof applyAction>[1], device = ME) => {
    const r = applyAction(g, a, { deviceId: device, now: clock, rng });
    if (r.ok) g = r.game;
    return r.ok;
  };
  apply({ type: 'start' });
  const meId = g.players.find((p) => p.deviceId === ME)!.id;
  const seen: Record<string, number> = {};
  /** Per bot: the hand numbers each text was said in. */
  const history = new Map<string, Map<string, number>>();
  let lastTableText = '';
  let lastTableHand = -1;

  const observe = () => {
    const hand = g.hand;
    for (const [who, r] of Object.entries(g.reactions ?? {})) {
      if (seen[who] === r.n) continue;
      seen[who] = r.n;
      if (!r.id.startsWith('b:')) continue;
      const bot = g.players.find((p) => p.id === who);
      const to = g.players.find((p) => p.id === r.to);
      const text = reactionText(r.id, to?.name);
      const event = r.id.startsWith('b:local:') ? `local:${r.id.split(':')[2]}` : r.id.split(':')[2];
      const n = hand?.number ?? 0;
      const where = `${variant} ${bots + 1}p seed ${seed} hand ${n} · ${bot?.name}`;
      const show = (s: string) => `${s}: "${text}"`;
      const p = textProblem(text);
      if (p) add('said-text', `${p}`, text, where);
      if (!botLineText(r.id) && !r.id.startsWith('b:local:')) add('said-text', 'unknown line id', r.id, where);
      if (r.to && !to) add('said-to', 'to a player not at the table', text, where);

      const seat = hand?.seats.find((s) => s.playerId === who);
      const result = hand?.result;
      const winners = new Set(result?.pots.flatMap((pot) => pot.winners) ?? []);
      if (IN_HAND.has(event) && hand && !result && (!seat || seat.folded)) add('said-when', `${event} from a bot that ${seat ? 'folded' : 'was not dealt in'}`, show(event), where);
      if (WON.has(event) && result && !winners.has(who)) add('said-when', `${event} from a bot that didn't win`, show(event), where);
      if (LOST.has(event) && result && winners.has(who) && winners.size === 1) add('said-when', `${event} from the bot that won`, show(event), where);
      if (event === 'foldBig' && seat && !seat.folded) add('said-when', 'foldBig from a bot still in', show(event), where);
      if (variant === 'holdem' && STREET[event] && hand && hand.board.length !== STREET[event]) add('said-when', `${event} line with ${hand.board.length} cards out`, show(event), where);
      const stacks = g.players.filter((p) => p.stack > 0).map((p) => p.stack);
      if (event === 'shortStack' && bot && bot.stack === Math.max(...stacks)) add('said-when', 'shortStack from the chip leader', show(event), where);
      // A big stack is 1.8 times the table's average when the hand starts (dealTalk), so only a short one is wrong.
      if (event === 'chipLead' && bot && bot.stack + (seat?.total ?? 0) < stacks.reduce((a, b) => a + b, 0) / stacks.length) add('said-when', 'chipLead from a stack under the average', show(event), where);
      if (event === 'button' && hand && hand.buttonId !== who) add('said-when', 'button line off the button', show(event), where);
      if ((event === 'hello' || event === 'welcome') && n > 1) add('said-when', `${event} after hand 1`, show(event), where);

      // Said too often: the same bot within 5 hands, or the table twice running.
      const mine = history.get(who) ?? new Map<string, number>();
      const before = mine.get(text);
      if (before !== undefined && n - before < 5) add('repeat', `same bot within ${n - before} hands`, text, where);
      mine.set(text, n);
      history.set(who, mine);
      if (text === lastTableText && n - lastTableHand <= 1) add('repeat', 'the table hears it twice running', text, where);
      lastTableText = text;
      lastTableHand = n;
    }
  };

  let guard = 0;
  while ((g.hand?.number ?? 0) <= HANDS && g.status !== 'ended' && guard++ < HANDS * 400) {
    observe();
    const h = g.hand;
    if (h && h.toAct === meId && !h.result) {
      const seat = h.seats.find((s) => s.playerId === meId)!;
      const move = h.currentBet - seat.bet > 0 ? (rng() < 0.25 ? 'fold' : 'call') : rng() < 0.2 ? 'raise' : 'check';
      const to = move === 'raise' ? h.currentBet + h.minRaise : undefined;
      if (apply({ type: 'act', hand: h.number, seq: h.seq, move, to }) || apply({ type: 'act', hand: h.number, seq: h.seq, move: 'call' }) || apply({ type: 'act', hand: h.number, seq: h.seq, move: 'check' })) continue;
    }
    if (h?.result && !h.result.showdown && rng() < 0.1) apply({ type: 'react', id: 'nh' });
    clock = Math.max(clock + 50, g.wakeAt ?? clock + 1000);
    if (!apply({ type: 'tick' }, 'server')) break;
    const out = g.players.find((p) => p.id === meId);
    if (out && out.stack === 0 && !g.hand?.seats.some((s) => s.playerId === meId && !s.folded)) apply({ type: 'rebuy' });
  }
  observe();
}

const t0 = Date.now();
for (const v of GAMES) for (let t = 0; t < TABLES; t++) play(v, 100 + t, [1, 4, 7][t % 3]);

// ---------------------------------------------------------------- the report

const groups = new Map<string, { f: Finding; n: number; texts: Set<string>; wheres: string[] }>();
for (const f of found) {
  const g = groups.get(f.key) ?? { f, n: 0, texts: new Set(), wheres: [] };
  g.n++;
  g.texts.add(f.text);
  g.wheres.push(f.where);
  groups.set(f.key, g);
}
const ORDER = ['said-text', 'said-to', 'said-when', 'repeat', 'line-text', 'line-twice', 'line-long'];
const sorted = [...groups.values()].sort((a, b) => ORDER.indexOf(a.f.check) - ORDER.indexOf(b.f.check) || b.n - a.n);
console.log(`${GAMES.length} games × ${TABLES} tables × ${HANDS} hands in ${Math.round((Date.now() - t0) / 1000)}s. ${sorted.length} kinds of problem, ${found.length} sightings.`);
let last = '';
let shown = 0;
for (const g of sorted) {
  if (g.f.check !== last) {
    console.log(`\n## ${g.f.check}`);
    last = g.f.check;
    shown = 0;
  }
  if (process.env.SHOW !== g.f.check && ++shown > MAX) continue;
  const texts = [...g.texts].slice(0, 2).map((t) => (t.length > 70 ? `${t.slice(0, 70)}…` : t));
  console.log(`- ${g.f.key.split('|')[1]} ×${g.n}: ${texts.join(' / ')}  (${g.wheres[0]})`);
}
for (const c of ORDER) {
  const more = sorted.filter((g) => g.f.check === c).length - MAX;
  if (more > 0 && process.env.SHOW !== c) console.log(`(${c}: ${more} more kinds; SHOW=${c} lists them)`);
}
process.exit(sorted.some((g) => g.f.check.startsWith('said') || g.f.check === 'repeat') ? 1 : 0);
