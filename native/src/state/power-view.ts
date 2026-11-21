// Power Cards at the table, worked out from the hand this phone sees: the state of your power (a card beside your
// own two, `components/table/power-card.tsx`), what your Peek and X-ray still show on the table, the badges on seats,
// the game pill's line and the banner while a power is played. Pure, so it's tested without drawing anything
// (`tests/power-view.test.ts`). The rules are the engine's (`src/game/powers.ts`, docs/RULES.md).
import {
  copyTarget,
  effectOf,
  effectPlayable,
  playablePower,
  powerInfo,
  powerLine,
  rankName,
  type Card,
  type Game,
  type Hand,
  type PowerId,
  type PowerUse,
} from '@/engine';

const SUIT: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
/** "Q♥", "10♠". */
export const shortCard = (c: Card) => `${c[0] === 'T' ? '10' : c[0]}${SUIT[c[1]] ?? ''}`;
/** "[Qh]" in an engine line becomes "Q♥". */
export const plainLine = (text: string) => text.replace(/\[([2-9TJQKA][shdc])\]/g, (_m, c: string) => shortCard(c));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Where your power stands:
 * - `none`: no power this hand (between hands, or you weren't dealt in)
 * - `ready`: your turn, and it can be played now
 * - `waiting`: you hold it, but not now (not your turn, the wrong street, nothing to aim at, a power on show)
 * - `played`: you played it this hand
 * - `out`: you folded or you're all in, so it can't be played
 * - `over`: the hand is over and it wasn't played
 */
export type PowerState = 'none' | 'ready' | 'waiting' | 'played' | 'out' | 'over';

export interface MyPower {
  state: PowerState;
  /** The power you were dealt. */
  power?: PowerId;
  /** What it does if played now: Copycat's is the power it would copy (or null with nothing to copy). */
  effect?: PowerId | null;
  /** Your play, once made. */
  use?: PowerUse;
  /** One line on where it stands: "Play it on your turn, before your move.", "Sam has 10♥". */
  note: string;
}

/** The streets a power works on, in words, for when it can't be played on this one. */
function streetsWords(id: PowerId): string {
  const s = powerInfo(id).streets;
  if (s.length === 4) return 'any street';
  if (s.length === 3) return 'any street before the river';
  return 'the flop or the turn';
}

/** What your power showed or did once played, in a line. */
export function playedNote(use: PowerUse, name: (id: string) => string): string {
  const effect = effectOf(use);
  if (effect === 'peek' && use.seen?.[0]) return `The next card is ${shortCard(use.seen[0])}`;
  if (effect === 'xray' && use.seen?.[0] && use.target) return `${name(use.target)} has ${shortCard(use.seen[0])}`;
  if (effect === 'bounty' && use.rank) return `Bounty on ${rankName(use.rank, true)}`;
  if (effect === 'shield') return use.refund ? `Your shield saved ${use.refund.toLocaleString('en-US')}` : 'Your shield is up';
  if (effect === 'silence' && use.target) return `${name(use.target)} can't bet or raise this street`;
  if (effect === 'foldtax') return 'Folding costs a big blind this hand';
  if (effect === 'reroll' && use.out && use.in) return `${shortCard(use.out)} became ${shortCard(use.in)}`;
  if (effect === 'extra') return 'One more card is on the board';
  if (effect === 'swap') return 'You swapped a card';
  if (effect === 'passleft') return 'Everyone passed a card left';
  return 'Played';
}

/** The state of your power this hand. `meId` is your player id. */
export function myPower(game: Game, meId: string | undefined): MyPower {
  const hand = game.hand;
  const none: MyPower = { state: 'none', note: '' };
  if (!hand || hand.variant !== 'power' || !meId) return none;
  const power = hand.powers?.[meId];
  const seat = hand.seats.find((s) => s.playerId === meId);
  if (!power || !seat) return none;
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? 'Someone';
  const use = hand.powerUses?.find((u) => u.by === meId);
  if (use) return { state: 'played', power, effect: effectOf(use), use, note: playedNote(use, name) };
  const effect = power === 'copycat' ? copyTarget(hand, meId) : power;
  if (hand.result) return { state: 'over', power, effect, note: "You didn't play it this hand" };
  if (seat.folded) return { state: 'out', power, effect, note: 'You folded, so it goes unplayed' };
  if (seat.allIn) return { state: 'out', power, effect, note: "You're all in, so it can't be played" };
  if (power === 'copycat' && (!effect || effect === 'copycat'))
    return { state: 'waiting', power, effect: null, note: 'Nothing to copy yet. It copies the last power someone else plays.' };
  const copied = power === 'copycat' ? `Copies ${powerInfo(effect!).name}. ` : '';
  // The phone never holds the deck: check the street and the targets as if cards were left (the server checks the deck).
  const withDeck: Hand = hand.deck.length ? hand : { ...hand, deck: ['2c', '2d', '2h'] };
  if (!effectPlayable(withDeck, seat, effect!)) {
    const info = powerInfo(effect!);
    if (!info.streets.includes(hand.street)) return { state: 'waiting', power, effect, note: `${copied}It works on ${streetsWords(effect!)}.` };
    if (info.needs === 'player') return { state: 'waiting', power, effect, note: `${copied}There's nobody to aim it at right now.` };
    return { state: 'waiting', power, effect, note: `${copied}It can't be played right now.` };
  }
  const myTurn = hand.toAct === meId && !hand.runout;
  if (!myTurn) return { state: 'waiting', power, effect, note: `${copied}Play it on your turn, before your move.` };
  if (!playablePower(game, withDeck, seat)) return { state: 'waiting', power, effect, note: `${copied}It can't be played right now.` };
  return { state: 'ready', power, effect, note: `${copied}Play it now, then make your move.` };
}

/** True while a played power is on show: the table waits and nobody acts. */
export const powerOnShow = (hand: Hand | null | undefined, now: number): boolean => !!hand && hand.moment?.kind === 'power' && now < hand.moment.until;

// ── What your Peek and X-ray still show ──────────────────────────────────────

/**
 * The card your X-ray showed of this player, while it's still theirs as far as anyone can tell: a later Pass Left, or
 * a Swap by them, means it may not be. Only the player who played an X-ray ever has its `seen` card.
 */
export function xrayCard(hand: Hand | null | undefined, meId: string | undefined, targetId: string): Card | null {
  if (!hand?.powerUses || !meId) return null;
  const uses = hand.powerUses;
  const i = uses.findIndex((u) => u.by === meId && effectOf(u) === 'xray' && u.target === targetId && !!u.seen?.[0]);
  if (i < 0) return null;
  const stale = uses.slice(i + 1).some((u) => effectOf(u) === 'passleft' || (effectOf(u) === 'swap' && u.by === targetId));
  return stale ? null : uses[i].seen![0];
}

/** Your Peek: the next board card, until it lands (or the hand ends). */
export function peekCard(hand: Hand | null | undefined, meId: string | undefined): Card | null {
  if (!hand?.powerUses || !meId || hand.result) return null;
  const use = hand.powerUses.find((u) => u.by === meId && effectOf(u) === 'peek' && !!u.seen?.[0]);
  const card = use?.seen?.[0];
  return card && !hand.board.includes(card) ? card : null;
}

// ── Seats and the felt ──────────────────────────────────────────────────────

/**
 * A seat's power badge: 🤐 while silenced this street, 🛡️ once their shield is up, and after the hand the power they
 * were dealt (everyone's is public then).
 */
export function seatPowerBadge(hand: Hand | null | undefined, playerId: string): { text: string; hot: boolean } | null {
  if (!hand || hand.variant !== 'power') return null;
  if (hand.result) {
    const p = hand.powers?.[playerId];
    return p ? { text: powerInfo(p).emoji, hot: false } : null;
  }
  if (hand.silenced?.[playerId] === hand.street) return { text: '🤐', hot: true };
  if (hand.powerUses?.some((u) => u.by === playerId && effectOf(u) === 'shield')) return { text: '🛡️', hot: false };
  return null;
}

/**
 * The game pill at a Power Cards table: what's live on the hand (a bounty, a fold tax), else null for the game's
 * name. `short` is for a narrow phone, where the pill shares the felt's top with the pot: "🎯 Q · 💸 Tax".
 */
export function powerPill(hand: Hand | null | undefined, short = false): string | null {
  if (!hand || hand.variant !== 'power') return null;
  const live: string[] = [];
  for (const u of hand.powerUses ?? []) {
    const e = effectOf(u);
    if (e === 'bounty' && u.rank) live.push(`🎯 ${short ? RANK_CHAR[u.rank] : cap(rankName(u.rank, true))}`);
    if (e === 'foldtax' && !live.some((l) => l.startsWith('💸'))) live.push(short ? '💸 Tax' : '💸 Fold tax');
  }
  return live.length ? live.join(' · ') : null;
}

const RANK_CHAR: Record<number, string> = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: '10', 9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2' };

/** The banner over the felt while a power is played: its emoji, the line, and what it showed you (yours only). */
export function powerBanner(game: Game, meId: string | undefined, now: number): { key: string; emoji: string; text: string; seen?: Card; mine: boolean } | null {
  const hand = game.hand;
  if (!hand || !powerOnShow(hand, now)) return null;
  const uses = hand.powerUses ?? [];
  const use = uses[uses.length - 1];
  if (!use) return null;
  // You as the one who played it ("You X-rayed Sam"), or as the one it hit ("Sam X-rayed you").
  const name = (id: string) => (id === meId ? (id === use.by ? 'You' : 'you') : (game.players.find((p) => p.id === id)?.name ?? 'Someone'));
  const line = plainLine(powerLine(use, name));
  const emoji = powerInfo(effectOf(use)).emoji;
  const text = line.startsWith(emoji) ? line.slice(emoji.length).trim() : line;
  const mine = use.by === meId;
  return { key: `${hand.number}-${uses.length}`, emoji, text, ...(mine && use.seen?.[0] ? { seen: use.seen[0] } : {}), mine };
}
