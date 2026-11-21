import { createTable, DEFAULT_SETTINGS } from '../game/reducer';
import { dealNextStreet, makeMove, startHand } from '../game/holdem';
import { fullDeck, seededRng, type Card } from '../game/cards';
import type { HandAction, Street } from '../game/types';
import { everydayThought } from './everydayLive';
import type { DecisionTrace } from './service';

/**
 * Why did the bots play a saved hand the way they did? `explainHand()` rebuilds the hand through the real engine (the
 * same seats, button, blinds, cards and moves) and, before each bot move, asks that bot what it would do now: every
 * option with its chance, which of the layers after the model changed it (sizing, habits, multiway, pot odds) and the
 * bot's own equity estimate. `npm run bot:explain <file>` prints it; the file is a saved hand from the app (Saved hands,
 * long press, Copy hand data). A rebuilt table starts with fresh bot memories, so a bot that had learned about you over
 * many hands may lean a little differently than it did live. Plain Texas Hold'em only.
 */

/** The fields of a saved hand (`Replay` in `native/src/state/replays.ts`) this needs. */
export interface SavedHand {
  variant: string;
  smallBlind: number;
  bigBlind: number;
  buttonId: string;
  sbId: string | null;
  bbId: string;
  me: string;
  /** In seat order. */
  players: { id: string; name: string; stack: number; bot?: boolean }[];
  actions: HandAction[];
  board: Card[];
  holes: Record<string, Card[]>;
}

export interface ExplainedMove {
  street: Street;
  board: Card[];
  name: string;
  hole: Card[];
  toCall: number;
  pot: number;
  /** What the bot did in the saved hand. */
  played: string;
  /** Each option and its chance now. */
  options: { label: string; chance: number }[];
  /** The layers after the model that changed the choice, and the bot's own equity estimate. */
  notes: string[];
  equity: number | null;
}

const label = (a: { move: string; to?: number }) =>
  a.to !== undefined && (a.move === 'bet' || a.move === 'raise' || a.move === 'allin') ? `${a.move} ${a.to}` : a.move;
const POST = { flop: 3, turn: 4, river: 5 } as const;

export function explainHand(saved: SavedHand): ExplainedMove[] {
  if (saved.variant !== 'holdem') throw new Error('Only plain Texas Hold\'em hands can be explained (the game modes use other bots).');
  const n = saved.players.length;
  const ctx = { now: 0, deviceId: 'explain', rng: seededRng(1) };
  const game = createTable({
    hostDeviceId: 'explain',
    name: 'You',
    emoji: '🙂',
    settings: { ...DEFAULT_SETTINGS, smallBlind: saved.smallBlind, bigBlind: saved.bigBlind },
    bots: n - 1,
    code: null,
    now: 0,
    rng: ctx.rng,
  });
  game.id = 'explain';
  saved.players.forEach((s, k) => {
    const p = game.players[k];
    p.id = s.id;
    p.name = s.name;
    p.stack = s.stack;
    p.bot = s.id === saved.me ? false : s.bot !== false;
    p.seat = k;
  });
  // The button moves to the next seat on, so start it one seat before the saved hand's.
  const button = saved.players.findIndex((p) => p.id === saved.buttonId);
  game.buttonSeat = (button - 1 + n) % n;
  startHand(game, ctx);
  const h = game.hand!;
  if (h.buttonId !== saved.buttonId || h.bbId !== saved.bbId) throw new Error('The rebuilt hand put the blinds in different seats.');
  // The saved cards where known; anyone else (an online player who never showed) gets unused cards.
  const known = new Set([...saved.board, ...Object.values(saved.holes).flat()]);
  const spare = fullDeck().filter((c) => !known.has(c));
  for (const seat of h.seats) seat.cards = saved.holes[seat.playerId]?.length === 2 ? [...saved.holes[seat.playerId]] : spare.splice(0, 2);
  // Each street burns a card, then deals its cards, in board order.
  const [b1, b2, b3, ...rest] = spare;
  h.deck = [b1, ...saved.board.slice(0, 3), b2, ...saved.board.slice(3, 4), b3, ...saved.board.slice(4, 5), ...rest];

  const explainNow = (id: string, played: string): ExplainedMove => {
    everydayThought(game, id);
    const trace: DecisionTrace = game.botTable!.traces.at(-1)!;
    const i = trace.information;
    return {
      street: h.street,
      board: h.board.slice(0, h.street === 'preflop' ? 0 : POST[h.street as keyof typeof POST]),
      name: game.players.find((p) => p.id === id)!.name,
      hole: [...i.hole],
      toCall: i.legal.toCall,
      pot: i.players.reduce((s, p) => s + p.total, 0),
      played,
      options: trace.prediction.actions.map((a, k) => ({ label: label(a), chance: trace.finalDistribution[k] })),
      notes: [trace.sizing, trace.habit, trace.multiway, trace.potOdds?.note].filter((x): x is string => !!x),
      equity: trace.prediction.equity ?? null,
    };
  };
  const out: ExplainedMove[] = [];
  for (const action of saved.actions.filter((a) => !a.outOfTurn)) {
    while (h.street !== action.street && !h.result) {
      if (h.toAct) throw new Error(`The rebuilt hand is still waiting on ${h.toAct} on the ${h.street}.`);
      dealNextStreet(game, ctx);
    }
    if (h.toAct !== action.playerId) throw new Error(`The rebuilt hand expected ${h.toAct} to act, the saved one has ${action.playerId}.`);
    const player = game.players.find((p) => p.id === action.playerId)!;
    if (player.bot) out.push(explainNow(player.id, label(action)));
    const error = makeMove(game, action.move, action.move === 'bet' || action.move === 'raise' ? action.to : undefined, ctx);
    if (error) throw new Error(`The saved move ${player.name} ${label(action)} was refused: ${error}`);
  }
  // Saved moves that stop short of the end (a spot in knownSpots.test.ts): deal on to whoever acts next and, when it's a
  // bot, explain that decision too, with nothing played yet. Never past the saved board.
  while (!h.toAct && !h.result && h.board.length < saved.board.length) dealNextStreet(game, ctx);
  const next = h.toAct ? game.players.find((p) => p.id === h.toAct) : undefined;
  if (next?.bot && !h.result) out.push(explainNow(next.id, '(to act)'));
  return out;
}

/** The explanation as plain text, one block per bot move. */
export function explainText(moves: ExplainedMove[]): string {
  if (!moves.length) return 'No bot made a move in this hand.';
  return moves
    .map((m) => {
      const where = `${m.street}${m.board.length ? ` (${m.board.join(' ')})` : ''}`;
      const facing = m.toCall ? `facing ${m.toCall} into ${m.pot}` : `pot ${m.pot}, nobody has bet`;
      const options = m.options
        .filter((o) => o.chance >= 0.005)
        .sort((a, b) => b.chance - a.chance)
        .map((o) => `${o.label} ${Math.round(o.chance * 100)}%`)
        .join(', ');
      const extra = [m.equity !== null ? `equity ${Math.round(m.equity * 100)}%` : '', ...m.notes].filter(Boolean).join(' · ');
      return `${where}: ${m.name} [${m.hole.join(' ')}], ${facing}\n  played ${m.played}; now: ${options}${extra ? `\n  ${extra}` : ''}`;
    })
    .join('\n\n');
}
