// Secret Missions: everyone has one secret mission, a goal for a hand ("win a pot with one pair or less"). Complete it
// and every other player pays you; you get a new one next hand. Miss it and you keep it (it's swapped after 15 hands).
// The first players to complete five missions win the race, and the race moves everyone's stack up or down (the one
// place in the app where chips are made or taken away; owner's call, November 2026). Then a new race starts.
// This file is the pure part: the missions, how each is checked at the end of a hand, and the race. holdem.ts deals
// them and settles them (`dealMissions()`, `settleMissions()`). Rules in docs/RULES.md (Secret Missions).

import { rankOf, type Card } from './cards';
import { bestHand } from './variants';
import type { Game, Hand, MissionId } from './types';
import { SECRET_MISSION_IDS } from './missionList';

export * from './missionList';

/** A new mission at random, not the one just held (so a swap always changes it). */
export function drawMission(rng: () => number, not?: MissionId | null): MissionId {
  const pool = SECRET_MISSION_IDS.filter((id) => id !== not);
  return pool[Math.floor(rng() * pool.length)];
}

const aggressive = (move: string) => move === 'bet' || move === 'raise' || move === 'allin';

/** Did this player complete their mission in this (finished) hand? Only what the hand recorded is used. */
export function missionDone(game: Game, hand: Hand, playerId: string, mission: MissionId): boolean {
  const result = hand.result;
  const seat = hand.seats.find((s) => s.playerId === playerId);
  if (!result || !seat) return false;
  const wonPot = result.pots.some((p) => p.winners.includes(playerId));
  const mine = (hand.actions ?? []).filter((a) => a.playerId === playerId);
  const strength = () => (seat.cards.length ? bestHand('missions', seat.cards, hand.board).category : 0);
  switch (mission) {
    case 'smallball':
      return wonPot && strength() <= 1;
    case 'silent':
      return wonPot && !result.showdown && hand.board.length >= 3;
    case 'slowroll':
      return wonPot && !mine.some((a) => aggressive(a.move));
    case 'herocall': {
      const river = mine.filter((a) => a.street === 'river');
      return wonPot && result.showdown && river.length > 0 && river[river.length - 1].move === 'call';
    }
    case 'pressure': {
      // A fold on the river after this player's last bet or raise there.
      const all = (hand.actions ?? []).filter((a) => a.street === 'river');
      const last = all.map((a, i) => (a.playerId === playerId && aggressive(a.move) ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
      return last >= 0 && all.slice(last + 1).some((a) => a.move === 'fold' && a.playerId !== playerId);
    }
    case 'lucky7':
      return wonPot && seat.cards.some((c: Card) => rankOf(c) === 7);
    case 'biggame':
      return (result.won[playerId] ?? 0) >= 25 * game.settings.bigBlind && wonPot;
    case 'relentless': {
      const streets = [...new Set(mine.filter((a) => a.move !== 'fold').map((a) => a.street))];
      return wonPot && streets.length >= 2 && streets.every((st) => mine.some((a) => a.street === st && aggressive(a.move)));
    }
    case 'monster':
      return wonPot && result.showdown && strength() >= 4;
    case 'knockout': {
      // Someone who started the hand with chips has none left, and this player won a pot they were in.
      return result.pots.some(
        (p) =>
          p.winners.includes(playerId) &&
          p.eligible.some((id) => id !== playerId && (hand.startStacks?.[id] ?? 0) > 0 && (game.players.find((x) => x.id === id)?.stack ?? 1) === 0),
      );
    }
    case 'bluffmaster':
      return wonPot && strength() === 0;
    case 'suited':
      return wonPot && seat.cards.length === 2 && seat.cards[0][1] === seat.cards[1][1];
    case 'twins':
      return wonPot && seat.cards.length === 2 && rankOf(seat.cards[0]) === rankOf(seat.cards[1]);
    case 'red':
      return wonPot && seat.cards.length === 2 && seat.cards.every((c) => c[1] === 'h' || c[1] === 'd');
    case 'royalty':
      return wonPot && seat.cards.some((c) => rankOf(c) >= 11 && rankOf(c) <= 13);
    case 'button':
      return wonPot && hand.buttonId === playerId;
    case 'defender':
      return wonPot && hand.bbId === playerId;
    case 'steal':
      return wonPot && !result.showdown && hand.board.length === 0 && mine.some((a) => a.street === 'preflop' && (a.move === 'raise' || a.move === 'allin'));
    case 'riverrat':
      return wonPot && hand.board.length >= 5;
    case 'underdog':
      return wonPot && seat.cards.length > 0 && seat.cards.every((c) => rankOf(c) <= 9);
    case 'connected': {
      if (!wonPot || seat.cards.length !== 2) return false;
      const [a, b] = seat.cards.map(rankOf).sort((x, y) => x - y);
      return b - a === 1 || (a === 2 && b === 14);
    }
    case 'twopair':
      return wonPot && strength() === 2;
    case 'trapdoor':
      // On some street: a check, and later a raise.
      return ['flop', 'turn', 'river'].some((st) => {
        const moves = mine.filter((a) => a.street === st).map((a) => a.move);
        const checked = moves.indexOf('check');
        return checked >= 0 && moves.slice(checked + 1).some((mv) => mv === 'raise' || mv === 'allin');
      });
    case 'shove':
      return wonPot && (seat.allIn || mine.some((a) => a.move === 'allin'));
    case 'crowd': {
      const foldedPre = new Set((hand.actions ?? []).filter((a) => a.street === 'preflop' && a.move === 'fold').map((a) => a.playerId));
      return wonPot && hand.board.length >= 3 && hand.seats.filter((s) => !foldedPre.has(s.playerId)).length >= 4;
    }
    case 'deuce':
      return wonPot && seat.cards.some((c) => rankOf(c) === 2);
    case 'bully':
      return mine.filter((a) => aggressive(a.move)).length >= 3;
    case 'chop':
      return result.pots.some((p) => p.winners.length >= 2 && p.winners.includes(playerId));
    default:
      return false;
  }
}

/** How many players have to finish before the race is settled: half the table (rounded up). */
export const raceNeeds = (players: number): number => Math.max(1, Math.ceil(players / 2));

/**
 * The race's final order: the players who reached the goal, in the order they did, then everyone else by missions
 * completed, then by chips.
 */
export function raceOrder(game: Game): string[] {
  const m = game.missions;
  if (!m) return [];
  const stack = (id: string) => game.players.find((p) => p.id === id)?.stack ?? 0;
  const rest = Object.keys(m.players)
    .filter((id) => !m.finished.includes(id) && game.players.some((p) => p.id === id))
    .sort((a, b) => m.players[b].done - m.players[a].done || stack(b) - stack(a));
  return [...m.finished.filter((id) => game.players.some((p) => p.id === id)), ...rest];
}
