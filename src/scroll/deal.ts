// Turns a template and a seed into one concrete card: who you play, what you're dealt, the moves played before
// you take over, and a table ready to start. The same seed always gives the same deal.

import {
  cleanName,
  createTable,
  fullDeck,
  hashString,
  seededRng,
  shuffle,
  type Card,
  type CardScene,
  type Game,
  type Settings,
  type ScriptMove,
} from '../game';
import { toCard, toInt } from '../game/botEval';
import { boardTexture, handBucket, handClass } from '../game/botPlay';
import { BOTS, type StyleId } from '../game/botStyles';
import { preflopRange, readOf, sampleHand, STRENGTH, storyOf, type Opponent } from '../game/botRange';
import { readFromHabits } from '../game/judge';
import { STYLE_NOTES } from './styleNotes';
import { TEMPLATE_BY_ID } from './templates';
import type { CardRef, Step, Template, Want } from './types';

/** Chips in a big blind on a Scroll table. */
export const BB = 10;

export interface Opponents {
  name: string;
  emoji: string;
  style: StyleId;
}

export interface Dealt {
  template: Template;
  bots: Opponents[];
  hero: Card[];
  board: Card[];
  scene: CardScene;
}

const half = (x: number) => Math.round(x * 2) / 2;

/** Picks the cards you're dealt and a board to go with them, by rejection: random deals until one fits the wish. */
function sampleDeal(want: Want, rng: () => number): { hero: Card[]; board: Card[] } {
  const count = want.street === 'preflop' ? 0 : want.street === 'flop' ? 3 : want.street === 'turn' ? 4 : 5;
  let last = { hero: [] as Card[], board: [] as Card[] };
  // Ask for one kind of hand at a time, picked evenly, so rare ones (a monster) come up as often as common ones (one pair).
  let target = want.bucket ? want.bucket[Math.floor(rng() * want.bucket.length)] : undefined;
  for (let tries = 0; tries < 6000; tries++) {
    if (tries === 2000) target = undefined;
    const deck = shuffle(fullDeck(), rng);
    const hero = deck.slice(0, 2);
    const board = deck.slice(2, 7);
    last = { hero, board };
    const [lo, hi] = want.strength ?? [0, 1];
    const strength = STRENGTH.get(handClass(hero)) ?? 0;
    if (strength < lo || strength > hi) continue;
    if (count > 0) {
      const seen = board.slice(0, count);
      const kind = handBucket(hero, seen);
      if (target ? kind !== target : want.bucket && !want.bucket.includes(kind)) continue;
      if (want.texture && !want.texture.includes(boardTexture(board.slice(0, 3)))) continue;
    }
    return { hero, board: count > 0 ? board : [] };
  }
  return { hero: last.hero, board: count > 0 ? last.board : [] };
}

/** Writes a template's steps as moves in chips, keeping track of the pot so "a bet of half the pot" comes out right (heads up). */
export function resolveScript(steps: Step[], at: number, stack: number): ScriptMove[] {
  const out: ScriptMove[] = [];
  // Heads up: who has put in how much, before this street and on it, in big blinds.
  const prior = { you: 0, bot: 0 };
  const bets = { you: at === 0 ? 0.5 : 1, bot: at === 0 ? 1 : 0.5 };
  let top = 1;
  for (const step of steps) {
    if (typeof step === 'string') {
      prior.you += bets.you;
      prior.bot += bets.bot;
      bets.you = 0;
      bets.bot = 0;
      top = 0;
      continue;
    }
    const pot = prior.you + prior.bot + bets.you + bets.bot;
    if (step.do === 'raise' || step.do === 'bet') {
      const to = half(step.to ?? (step.pot !== undefined ? step.pot * pot : step.x !== undefined ? step.x * top : top * 2));
      out.push({ by: step.by, move: top > 0 ? 'raise' : 'bet', to: to * BB });
      bets[step.by] = to;
      top = Math.max(top, to);
    } else if (step.do === 'call') {
      bets[step.by] = Math.min(stack / BB, top);
      out.push({ by: step.by, move: 'call' });
    } else if (step.do === 'allin') {
      bets[step.by] = stack / BB - prior[step.by];
      top = Math.max(top, bets[step.by]);
      out.push({ by: step.by, move: 'allin' });
    } else out.push({ by: step.by, move: step.do });
  }
  return out;
}

export const bbOf = (chips: number) => chips / BB;

/** Where you sit, in words. */
export function seatName(at: number, players: number): string {
  if (players === 2) return at === 0 ? 'on the button' : 'in the big blind';
  if (at === 0) return 'on the button';
  if (at === 1) return 'in the small blind';
  if (at === 2) return 'in the big blind';
  const early = ['under the gun', 'in the hijack', 'in the cutoff'];
  if (players === 6) return at === 3 ? 'under the gun' : at === 4 ? 'in the hijack' : 'in the cutoff';
  return early[Math.min(at - 3, early.length - 1)];
}

/** Picks the bots: distinct faces and names, each from one of the styles the card likes. */
function pickBots(t: Template, rng: () => number): Opponents[] {
  const out: Opponents[] = [];
  const pool = BOTS.filter((b) => t.style.includes(b.style));
  const shuffled = shuffle(pool, rng);
  for (const bot of shuffled) {
    if (out.length >= t.bots) break;
    if (out.some((o) => o.emoji === bot.emoji || o.name === bot.name)) continue;
    out.push({ name: bot.name, emoji: bot.emoji, style: bot.style });
  }
  // A few styles have only four bots; a crowded table that wants more takes any bot.
  for (const bot of shuffle(BOTS, rng)) {
    if (out.length >= t.bots) break;
    if (out.some((o) => o.emoji === bot.emoji || o.name === bot.name)) continue;
    out.push({ name: bot.name, emoji: bot.emoji, style: bot.style });
  }
  return out;
}

const memo = new Map<string, Dealt>();

/** The deal for a card. The same card always gives the same deal, so it's worked out once and kept. */
export function dealCard(ref: CardRef): Dealt {
  const key = `${ref.id}:${ref.seed}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const dealt = build(ref);
  if (memo.size > 8) memo.delete(memo.keys().next().value!);
  memo.set(key, dealt);
  return dealt;
}

function build(ref: CardRef): Dealt {
  const template = TEMPLATE_BY_ID.get(ref.id);
  if (!template) throw new Error(`Unknown Scroll card: ${ref.id}`);
  const rng = seededRng(hashString(ref.id) ^ (ref.seed >>> 0));
  const bots = pickBots(template, rng);
  const { hero, board } = sampleDeal(template.want, rng);
  const script = resolveScript(template.script, template.at, template.stack * BB);
  return { template, bots, hero, board, scene: { at: template.at, hero, board, script } };
}

/** A table for the card, in the lobby, with the scene set. Start it to deal. */
export function cardTable(ref: CardRef, who: { deviceId: string; name: string; emoji: string }): { game: Game; dealt: Dealt } {
  const dealt = dealCard(ref);
  const t = dealt.template;
  const settings: Settings = { startingStack: t.stack * BB, smallBlind: BB / 2, bigBlind: BB, rebuys: false, turnSeconds: 0 };
  const game = createTable({
    hostDeviceId: who.deviceId,
    name: cleanName(who.name) || 'You',
    emoji: who.emoji,
    settings,
    bots: dealt.bots.length,
    botNames: dealt.bots.map((b) => b.name),
    code: null,
    now: Date.now(),
  });
  game.card = dealt.scene;
  return { game, dealt };
}

/**
 * Right after the deal: gives each bot still in the hand two cards that fit the way it played so far (the
 * moves the card scripted for it), not whatever the shuffle left. Its cards, yours, the board and the burn
 * cards are all kept apart, so the table is still a real deck. Returns the game, changed.
 */
export function fitBots(game: Game, dealt: Dealt, rng: () => number): Game {
  const hand = game.hand;
  if (!hand || hand.result) return game;
  const taken = new Set<number>(
    [...dealt.hero, ...dealt.board, ...hand.board, ...hand.deck.slice(0, 8), ...hand.seats.flatMap((s) => s.cards)].map(toInt),
  );
  const visible = hand.board.map(toInt);
  const bots = hand.seats.filter((s) => game.players.find((p) => p.id === s.playerId)?.bot && !s.folded);
  for (const seat of bots) {
    const player = game.players.find((p) => p.id === seat.playerId)!;
    const style = dealt.bots.find((b) => b.name === player.name)?.style ?? 'pro';
    const read = readOf(readFromHabits(STYLE_NOTES[style].habits));
    const opp: Opponent = { id: seat.playerId, read, story: storyOf(game, hand, seat.playerId) };
    const range = preflopRange(game, hand, seat.playerId, opp.story, read);
    for (const c of seat.cards) taken.delete(toInt(c));
    const pick = sampleHand(opp, range, visible, taken, rng);
    if (!pick) {
      for (const c of seat.cards) taken.add(toInt(c));
      continue;
    }
    const fresh = [toCard(pick[0]), toCard(pick[1])];
    // Keep it a real deck: the cards it holds now leave the deck, and the ones it gave up go back to the bottom.
    hand.deck = [...hand.deck.filter((c) => !fresh.includes(c)), ...seat.cards.filter((c) => !fresh.includes(c))];
    seat.cards = fresh;
    taken.add(pick[0]);
    taken.add(pick[1]);
  }
  return game;
}
