// Secret Missions: the missions and the race's numbers, as data. Kept on its own so the game list in variants.ts can
// show them in the rules without importing the engine. See missions.ts and docs/RULES.md.

import type { MissionId } from './types';

export interface SecretMissionInfo {
  id: MissionId;
  name: string;
  emoji: string;
  /** What you have to do, in a line. */
  text: string;
  /** 1 easy, 2 medium, 3 hard. */
  tier: 1 | 2 | 3;
}

export const SECRET_MISSIONS: SecretMissionInfo[] = [
  { id: 'smallball', name: 'Small Ball', emoji: '🃏', text: 'Win a pot with one pair or less.', tier: 1 },
  { id: 'silent', name: 'Silent Winner', emoji: '🤫', text: 'Win a pot after the flop without showing your cards.', tier: 1 },
  { id: 'slowroll', name: 'Slow Roll', emoji: '🐌', text: 'Win a pot without betting or raising: only checks and calls.', tier: 2 },
  { id: 'herocall', name: 'Hero Call', emoji: '👀', text: 'Call a bet on the river and win.', tier: 2 },
  { id: 'pressure', name: 'Pressure', emoji: '🎯', text: 'Make someone fold to your bet or raise on the river.', tier: 2 },
  { id: 'lucky7', name: 'Lucky Seven', emoji: '7️⃣', text: 'Win a pot holding a 7.', tier: 2 },
  { id: 'biggame', name: 'Big Game', emoji: '🏔️', text: 'Win a pot of 25 big blinds or more.', tier: 2 },
  { id: 'relentless', name: 'Relentless', emoji: '💪', text: 'Bet or raise on every street you play (two or more) and win.', tier: 3 },
  { id: 'monster', name: 'Monster', emoji: '🌈', text: 'Win with a straight or better.', tier: 3 },
  { id: 'knockout', name: 'Knockout', emoji: '🔥', text: 'Knock a player out: win a pot that leaves them with no chips.', tier: 3 },
  { id: 'bluffmaster', name: 'Bluff Master', emoji: '🎭', text: 'Win a pot with high card.', tier: 3 },
];

export const SECRET_MISSION_IDS = SECRET_MISSIONS.map((m) => m.id);
export const secretMission = (id: MissionId): SecretMissionInfo => SECRET_MISSIONS.find((m) => m.id === id)!;

/** Big blinds each other player pays for a completed mission, by tier. */
export const MISSION_REWARD: Record<1 | 2 | 3, number> = { 1: 5, 2: 7, 3: 10 };
export const rewardOf = (id: MissionId): number => MISSION_REWARD[secretMission(id).tier];
/** Missions to complete to finish a race. */
export const MISSION_GOAL = 5;
/** A mission nobody completes in this many hands is swapped for a new one. */
export const MISSION_SWAP_AFTER = 15;
/** What each place in a race does to a stack: 1st +150%, 2nd +100% … 8th (and 9th) −75%. */
export const RACE_CHANGE = [1.5, 1, 0.5, 0.25, 0, -0.25, -0.5, -0.75];
export const raceChange = (place: number): number => RACE_CHANGE[Math.min(place, RACE_CHANGE.length - 1)];

