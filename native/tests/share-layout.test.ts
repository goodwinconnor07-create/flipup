// Share cards in every game: real bot hands from each of the 13 games turned into card data, and every layout's cards
// checked against the space they're given (Bean Stalk's five hole cards, Crucifix's nine-card board, Red River's
// long ones...). layout.ts is pure, so this needs no drawing.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { DEFAULT_SETTINGS, VARIANTS, applyAction, createTable, discardWaiting, type Game, type Variant } from '@game/index';

import { handData } from '../src/components/share/data';
import { boxOf, CARD_W, handCardLayout, layoutsFor, showdownLayout, VS, type Box, type Placed } from '../src/components/share/layout';
import { lastHand, noteReplay, type Replay } from '../src/state/replays';

beforeEach(() => {
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) });
});

const ME = 'device-me-000001';

function seeded(seed: number): () => number {
  let x = seed;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
}

/** Plays a bots table of one game, calling or checking for you (and throwing away when asked), keeping each hand. */
function playHands(variant: Variant, hands: number): Replay[] {
  const rng = seeded(11);
  let game: Game = createTable({ hostDeviceId: ME, name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, variant, turnSeconds: 0 }, bots: 3, code: null, now: 1, rng });
  game.legacyBotSimulation = true;
  let now = 10;
  const step = (deviceId: string, a: Parameters<typeof applyAction>[1]) => {
    const r = applyAction(game, a, { deviceId, now, rng });
    if (r.ok) game = r.game;
    return r.ok;
  };
  const out: Replay[] = [];
  step(ME, { type: 'start' });
  for (let i = 0; i < 6000 && out.length < hands && game.status !== 'ended'; i++) {
    now = Math.max(now + 1, game.wakeAt ?? now + 1000);
    const hand = game.hand;
    const me = game.players.find((p) => p.deviceId === ME);
    if (hand && me) {
      if (discardWaiting(hand).some((s) => s.playerId === me.id)) {
        const mine = hand.seats.find((s) => s.playerId === me.id)!;
        step(ME, { type: 'discard', hand: hand.number, card: mine.cards[mine.cards.length - 1] });
      } else if (hand.toAct === me.id) {
        const owe = hand.currentBet > (hand.seats.find((s) => s.playerId === me.id)?.bet ?? 0);
        step(ME, { type: 'act', hand: hand.number, seq: hand.seq, move: owe ? 'call' : 'check' });
      }
    }
    step('clock', { type: 'tick' });
    if (game.hand?.result && !out.some((r) => r.number === game.hand!.number)) {
      noteReplay(game, ME, 'bots', game);
      const r = lastHand();
      if (r && r.number === game.hand.number) out.push(r);
    }
  }
  return out;
}

const inside = (b: Box | null, area: Box) => !b || (b.left >= area.left && b.right <= area.right && b.top >= area.top && b.bottom <= area.bottom);
const SIDES = { left: 6, right: CARD_W - 6 };

/** Every card of a hand card sits between the capsule and the big number, and the hand never runs into the board. */
function checkHandCard(holes: number, board: number) {
  const at = handCardLayout(holes, board);
  expect(at.hole).toHaveLength(holes);
  expect(at.board).toHaveLength(board);
  const hole = boxOf(at.hole);
  const b = boxOf(at.board);
  // The big number's outlined letters start at about 304.
  const area = { ...SIDES, top: 112, bottom: 300 };
  expect(inside(hole, area), `hand card: ${holes} hole cards out of their space`).toBe(true);
  expect(inside(b, area), `hand card: a board of ${board} out of its space`).toBe(true);
  if (hole && b) expect(hole.bottom, `hand card: ${holes} hole cards run into a board of ${board}`).toBeLessThanOrEqual(b.top + 1);
  for (const p of [...at.hole, ...at.board]) expect(p.s, 'cards stay readable').toBeGreaterThan(0.45);
}

/** Each side stays clear of the VS badge, the names and the other side; the board sits between the tags and the line. */
function checkShowdown(you: number, them: number, board: number) {
  const at = showdownLayout(you, them, board);
  const top = 112;
  const names = 224;
  const mine = boxOf(at.you)!;
  const theirs = boxOf(at.them);
  expect(inside(mine, { left: SIDES.left, right: VS.x - VS.r, top, bottom: names }), `showdown: your ${you} cards`).toBe(true);
  expect(inside(theirs, { left: VS.x + VS.r, right: SIDES.right, top, bottom: names }), `showdown: their ${them} cards`).toBe(true);
  expect(inside(boxOf(at.board), { ...SIDES, top: 278, bottom: 364 }), `showdown: a board of ${board}`).toBe(true);
  for (const p of [...at.you, ...at.them, ...at.board] as Placed[]) expect(p.s).toBeGreaterThan(0.45);
}

describe('share card layouts', () => {
  it('fit any hand from one to six hole cards against any board up to fourteen cards', () => {
    for (let holes = 1; holes <= 6; holes++)
      for (let board = 0; board <= 14; board++) {
        checkHandCard(holes, board);
        checkShowdown(holes, holes, board);
      }
  });
});

describe('share cards from every game', () => {
  for (const { id } of VARIANTS) {
    it(`draws real ${id} hands`, () => {
      const replays = playHands(id, 8);
      expect(replays.length).toBeGreaterThan(0);
      for (const r of replays) {
        const d = handData(r, 'Big win', { name: 'Me', emoji: '🙂' });
        expect(d.variant).toBe(id);
        expect(d.hole?.length ?? 0).toBeGreaterThan(0);
        expect(d.board).toEqual(r.board);
        for (const layout of layoutsFor(d)) {
          if (layout === 'hand') checkHandCard(d.hole!.length, d.board!.length);
          if (layout === 'showdown') checkShowdown(d.matchup!.you.cards.length, d.matchup!.them!.cards.length, d.board!.length);
          if (layout === 'odds') expect(d.odds!.every((o) => o.you >= 0 && o.you <= 1)).toBe(true);
        }
      }
    });
  }
});
