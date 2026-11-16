// Secret Missions: what your mission card and its panel show, worked out from the table you can see (only your own
// mission ever reaches this phone). Pure, like power-view.ts, and tested in tests/mission-view.test.ts.
import { MISSION_GOAL, MISSION_SWAP_AFTER, rewardOf, secretMission, type Game, type SecretMissionInfo } from '@/engine';

/** none: no mission yet (before the first deal). active: one to complete. done: completed this hand, a new one next deal. */
export type MissionState = 'none' | 'active' | 'done';

export interface MissionView {
  state: MissionState;
  info: SecretMissionInfo | null;
  /** Missions you've completed in this race, out of `goal`. */
  done: number;
  goal: number;
  race: number;
  /** What completing it pays, from each other player still in. */
  reward: number;
  /** Hands until an uncompleted mission is swapped for a new one. */
  swapsIn: number;
  /** Everyone in the race, most missions first: you as "You". */
  standings: { id: string; name: string; emoji: string; done: number; me: boolean }[];
}

export function myMission(game: Game, meId: string | undefined): MissionView {
  const m = game.missions;
  const mine = meId ? m?.players[meId] : undefined;
  const standings = !m
    ? []
    : Object.entries(m.players)
        .map(([id, p]) => ({ id, p, who: game.players.find((x) => x.id === id) }))
        .filter((x) => !!x.who)
        .sort((a, b) => b.p.done - a.p.done || Number(b.id === meId) - Number(a.id === meId))
        .map(({ id, p, who }) => ({ id, name: id === meId ? 'You' : who!.name, emoji: who!.emoji, done: p.done, me: id === meId }));
  const base = { done: mine?.done ?? 0, goal: MISSION_GOAL, race: m?.race ?? 1, standings };
  if (!mine || !game.hand) return { ...base, state: 'none', info: null, reward: 0, swapsIn: 0 };
  if (!mine.mission) return { ...base, state: 'done', info: null, reward: 0, swapsIn: 0 };
  const info = secretMission(mine.mission);
  return {
    ...base,
    state: 'active',
    info,
    reward: rewardOf(info.id) * game.settings.bigBlind,
    swapsIn: Math.max(0, MISSION_SWAP_AFTER - (game.hand.number - mine.since)),
  };
}
