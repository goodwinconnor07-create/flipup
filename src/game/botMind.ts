// How a bot feels, hand to hand. Bad beats, big losses and getting bluffed put it on tilt (looser,
// more aggressive, sloppier); winning makes it confident. It also holds a grudge against whoever
// took a big pot off it. Everything here comes from public results plus the bot's own cards.
// It all fades over a few hands, like it would for a person.

import { boardInfo, tierWith, toInt } from './botEval';
import { playerStyle, type Style } from './botStyles';
import type { BotMind, Game, Hand } from './types';

const CALM: BotMind = { tilt: 0, confidence: 0 };

export function mindOf(game: Game, playerId: string): BotMind {
  return game.minds?.[playerId] ?? CALM;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Did `id` have the best hand before the river (cards shown), and lose on it? */
function rivered(hand: Hand, id: string, winners: string[]): boolean {
  if (hand.board.length < 5) return false;
  const mine = hand.seats.find((s) => s.playerId === id);
  if (!mine || mine.cards.length !== 2) return false;
  const turn = boardInfo(hand.board.slice(0, 4).map(toInt));
  const scratch: number[] = [];
  const strength = (cards: string[]) => tierWith(toInt(cards[0]), toInt(cards[1]), turn, scratch);
  return winners.some((w) => {
    const seat = hand.seats.find((s) => s.playerId === w);
    return !!seat?.shown && seat.cards.length === 2 && strength(mine.cards) > strength(seat.cards);
  });
}

/** After each hand: every bot in it takes the result to heart (or doesn't). */
export function updateMinds(game: Game, hand: Hand): void {
  const result = hand.result;
  if (!result) return;
  const bb = game.settings.bigBlind;
  const minds = { ...game.minds };
  const winners = Object.keys(result.won);
  const scratch: number[] = [];
  for (const seat of hand.seats) {
    const player = game.players.find((p) => p.id === seat.playerId);
    if (!player?.bot) continue;
    const style = playerStyle(player);
    const before = minds[seat.playerId] ?? CALM;
    const mind: BotMind = {
      tilt: before.tilt * 0.88,
      confidence: before.confidence * 0.9,
      winStreak: before.winStreak ?? 0,
      lossStreak: before.lossStreak ?? 0,
      previousLosses: 0,
      grudges: {},
    };
    for (const [id, g] of Object.entries(before.grudges ?? {})) if (g * 0.92 > 0.05) mind.grudges![id] = g * 0.92;
    const net = ((result.won[seat.playerId] ?? 0) - seat.total) / bb;
    if (net > 0) {
      mind.previousLosses = before.lossStreak ?? 0;
      mind.winStreak = (before.winStreak ?? 0) + 1;
      mind.lossStreak = 0;
    } else if (net < -1) {
      mind.lossStreak = (before.lossStreak ?? 0) + 1;
      mind.winStreak = 0;
    }
    if (net <= -20) {
      let hurt = Math.min(1, -net / 80);
      // A strong hand beaten, or a lead lost on the river, hurts more.
      const strong = hand.board.length === 5 && seat.cards.length === 2 && !seat.folded && tierWith(toInt(seat.cards[0]), toInt(seat.cards[1]), boardInfo(hand.board.map(toInt)), scratch) >= 5;
      if (result.showdown && !seat.folded && (strong || rivered(hand, seat.playerId, winners))) hurt *= 1.7;
      mind.tilt += style.mind.tilt * hurt;
      mind.confidence -= 0.3 * hurt;
      for (const w of winners) if (w !== seat.playerId) mind.grudges![w] = Math.min(1, (mind.grudges![w] ?? 0) + style.mind.grudge * hurt);
      if (player.stack === 0) mind.tilt += style.mind.tilt * 0.3;
    } else if (net >= 20) {
      mind.confidence += Math.min(0.4, net / 100);
      mind.tilt -= 0.12;
    }
    // Folded to a bet and then saw it was a bluff (the winner showed).
    const folded = seat.folded && (hand.actions ?? []).some((a) => a.playerId === seat.playerId && a.move === 'fold' && a.street !== 'preflop');
    if (folded && !result.showdown && hand.board.length >= 3) {
      for (const w of winners) {
        const ws = hand.seats.find((s) => s.playerId === w);
        if (!ws?.shown || ws.cards.length !== 2) continue;
        if (tierWith(toInt(ws.cards[0]), toInt(ws.cards[1]), boardInfo(hand.board.map(toInt)), scratch) <= 1) {
          mind.tilt += style.mind.tilt * 0.35;
          mind.grudges![w] = Math.min(1, (mind.grudges![w] ?? 0) + style.mind.grudge * 0.6);
        }
      }
    }
    mind.tilt = clamp(mind.tilt, 0, 1);
    mind.confidence = clamp(mind.confidence, -1, 1);
    if (!Object.keys(mind.grudges!).length) delete mind.grudges;
    minds[seat.playerId] = mind;
  }
  game.minds = minds;
}

/**
 * A style as it plays right now, with its mood on top. Tilt makes most bots looser, more aggressive
 * and sloppier; the nervous kind tighten up and get even more scared instead. `grudge` (0 to 1) is
 * how much it wants chips back from the player it's up against.
 */
export function inTheMoment(style: Style, mind: BotMind, grudge: number): Style {
  const t = mind.tilt;
  const c = mind.confidence;
  if (t < 0.02 && Math.abs(c) < 0.02 && grudge < 0.02) return style;
  const rattled = style.post.scared >= 0.5;
  const pre = { ...style.pre };
  const post = { ...style.post };
  if (rattled) {
    pre.tight = Math.min(0.95, pre.tight + 0.1 * t);
    post.scared = Math.min(Math.max(1, post.scared * 1.3), post.scared + 0.4 * t);
    post.sticky -= 0.05 * t;
  } else {
    pre.tight *= 1 - 0.45 * t;
    pre.loose = Math.min(1, pre.loose + 0.35 * t);
    pre.aggro = Math.min(1, pre.aggro + 0.25 * t);
    pre.callShove += 0.05 * t;
    post.bet += 0.06 * t;
    post.bluff += 0.05 * t;
    post.sticky += 0.08 * t;
    post.sense *= 1 - 0.4 * t;
  }
  post.wobble *= 1 + t;
  post.bet += 0.02 * c;
  post.bluff += 0.02 * c;
  post.sticky += 0.07 * grudge;
  post.raise += 0.04 * grudge;
  return { ...style, pre, post };
}

/**
 * Someone turned their cards over after the hand. If they won without a showdown and it was a
 * bluff (they bet the turn or river with nothing much), the bots take note: it counts in their read
 * on that player, and every bot that folded to it after the flop gets a little tilted and holds a
 * grudge. Returns the bots that folded to the bluff (for a reaction).
 */
export function cardsShown(game: Game, hand: Hand, playerId: string): string[] {
  const result = hand.result;
  const seat = hand.seats.find((s) => s.playerId === playerId);
  if (!result || result.showdown || !(playerId in result.won) || !seat || seat.cards.length !== 2 || hand.board.length < 3) return [];
  const acts = hand.actions ?? [];
  const bets = acts.filter(
    (a) => a.playerId === playerId && a.street !== 'preflop' && (a.move === 'bet' || a.move === 'raise' || a.move === 'allin'),
  );
  if (!bets.length) return [];
  const last = bets[bets.length - 1];
  const board = hand.board.slice(0, last.street === 'flop' ? 3 : last.street === 'turn' ? 4 : 5).map(toInt);
  const bluff = tierWith(toInt(seat.cards[0]), toInt(seat.cards[1]), boardInfo(board), []) <= 1;
  if (last.street !== 'flop') {
    const r = game.reads?.[playerId];
    if (r) {
      r.shownBets = (r.shownBets ?? 0) + 1;
      if (bluff) r.shownBluffs = (r.shownBluffs ?? 0) + 1;
      if (r.recent) {
        r.recent.shownBets = (r.recent.shownBets ?? 0) + 1;
        if (bluff) r.recent.shownBluffs = (r.recent.shownBluffs ?? 0) + 1;
      }
    }
  }
  if (!bluff) return [];
  const victims = hand.seats
    .filter(
      (s) =>
        s.folded &&
        game.players.find((p) => p.id === s.playerId)?.bot &&
        acts.some((a) => a.playerId === s.playerId && a.move === 'fold' && a.street !== 'preflop'),
    )
    .map((s) => s.playerId);
  const minds = { ...game.minds };
  for (const id of victims) {
    const style = playerStyle(game.players.find((p) => p.id === id));
    const m = minds[id] ?? CALM;
    minds[id] = {
      ...m,
      tilt: clamp(m.tilt + style.mind.tilt * 0.35, 0, 1),
      confidence: m.confidence,
      grudges: { ...m.grudges, [playerId]: Math.min(1, (m.grudges?.[playerId] ?? 0) + style.mind.grudge * 0.6) },
    };
  }
  game.minds = minds;
  return victims;
}
