import { isCard, type Card } from '../game/cards';
import { options, type Options } from '../game/selectors';
import type { Game, HandAction, Street } from '../game/types';
import type { BotMove } from '../game/botPlay';

/** Whitelist boundary: no deck, other hole cards, server logs or other bot state. */
export interface InformationSet {
  version: 1;
  variant: 'holdem';
  tableId: string;
  hand: number;
  sequence: number;
  heroId: string;
  buttonId: string;
  street: Street;
  bigBlind: number;
  smallBlind: number;
  currentBet: number;
  hole: Card[];
  board: Card[];
  players: { id: string; seat: number; stack: number; bet: number; total: number; folded: boolean; allIn: boolean }[];
  actions: HandAction[];
  legal: Options;
}

export function informationFor(game: Game, heroId: string): InformationSet {
  const h = game.hand;
  const hero = h?.seats.find((s) => s.playerId === heroId);
  if (!h || !hero || h.toAct !== heroId || h.result || h.runout || hero.folded || hero.allIn) throw new Error('No decision required');
  if ((h.variant ?? game.settings.variant ?? 'holdem') !== 'holdem') throw new Error('Unsupported variant');
  const info: InformationSet = {
    version: 1,
    variant: 'holdem',
    tableId: game.id,
    hand: h.number,
    sequence: h.seq,
    heroId,
    buttonId: h.buttonId,
    street: h.street,
    bigBlind: game.settings.bigBlind,
    smallBlind: game.settings.smallBlind,
    currentBet: h.currentBet,
    hole: [...hero.cards],
    board: [...h.board],
    players: h.seats.map((s) => {
      const p = game.players.find((p) => p.id === s.playerId);
      if (!p) throw new Error('Missing player');
      return { id: s.playerId, seat: p.seat, stack: p.stack, bet: s.bet, total: s.total, folded: s.folded, allIn: s.allIn };
    }),
    actions: (h.actions ?? []).map((a) => ({
      playerId: a.playerId,
      street: a.street,
      move: a.move,
      to: a.to,
      ...(a.outOfTurn ? { outOfTurn: true } : {}),
    })),
    legal: options(game, h, hero),
  };
  validateInformation(info);
  return info;
}

export function validateInformation(i: InformationSet): void {
  if (i.version !== 1 || i.variant !== 'holdem') throw new Error('Unsupported information version');
  const cards = [...i.hole, ...i.board];
  if (
    i.hole.length !== 2 ||
    i.board.length !== { preflop: 0, flop: 3, turn: 4, river: 5 }[i.street] ||
    cards.some((c) => !isCard(c)) ||
    new Set(cards).size !== cards.length
  )
    throw new Error('Invalid visible cards');
  if (
    i.players.length < 2 ||
    i.players.length > 9 ||
    new Set(i.players.map((p) => p.id)).size !== i.players.length ||
    !i.players.some((p) => p.id === i.heroId)
  )
    throw new Error('Invalid players');
  const chips = [
    i.bigBlind,
    i.smallBlind,
    i.currentBet,
    i.legal.toCall,
    i.legal.minTo,
    i.legal.maxTo,
    ...i.players.flatMap((p) => [p.stack, p.bet, p.total]),
  ];
  if (i.bigBlind <= 0 || chips.some((x) => !Number.isSafeInteger(x) || x < 0)) throw new Error('Invalid chip amounts');
}

/** Runtime projection also protects direct backend callers and persisted diagnostics from extra fields. */
export function copyInformation(i: InformationSet): InformationSet {
  const result: InformationSet = {
    version: i.version,
    variant: i.variant,
    tableId: i.tableId,
    hand: i.hand,
    sequence: i.sequence,
    heroId: i.heroId,
    buttonId: i.buttonId,
    street: i.street,
    bigBlind: i.bigBlind,
    smallBlind: i.smallBlind,
    currentBet: i.currentBet,
    hole: [...i.hole],
    board: [...i.board],
    players: i.players.map((p) => ({
      id: p.id,
      seat: p.seat,
      stack: p.stack,
      bet: p.bet,
      total: p.total,
      folded: p.folded,
      allIn: p.allIn,
    })),
    actions: i.actions.map((a) => ({
      playerId: a.playerId,
      street: a.street,
      move: a.move,
      to: a.to,
      ...(a.outOfTurn ? { outOfTurn: true } : {}),
    })),
    legal: {
      toCall: i.legal.toCall,
      canCheck: i.legal.canCheck,
      callIsAllIn: i.legal.callIsAllIn,
      canRaise: i.legal.canRaise,
      minTo: i.legal.minTo,
      maxTo: i.legal.maxTo,
      word: i.legal.word,
      canFold: i.legal.canFold,
      canHit: i.legal.canHit,
    },
  };
  validateInformation(result);
  return result;
}

/** Engine bounds are authoritative, including short all-ins and reopening. */
export function legalActions(i: InformationSet): BotMove[] {
  const o = i.legal;
  const p = i.players.find((p) => p.id === i.heroId)!;
  const pot = i.players.reduce((n, p) => n + p.total, 0);
  const moves: BotMove[] = o.canCheck ? [{ move: 'check' }] : [{ move: 'fold' }, { move: 'call' }];
  if (o.canRaise) {
    const sizes = [o.minTo, ...[0.33, 0.75, 1.25].map((f) => Math.round(p.bet + o.toCall + (pot + o.toCall) * f)), o.maxTo];
    for (const to of new Set(sizes.map((n) => Math.max(o.minTo, Math.min(o.maxTo, n)))))
      moves.push({ move: i.currentBet ? 'raise' : 'bet', to });
  }
  return moves;
}
