// Plays bot tables for the twin lab: the first seat is the player being measured (or a fitted style).

import { simulateTable, type Agent } from '../src/game/botSim';
import type { StyleId } from '../src/game/botStyles';
import type { TwinProfile } from '../src/game/twin';
import type { TwinBrain } from '../src/game/twinFit';
import { addHandToTwin, emptyCounted } from './twinCount';

/** Tables the tracked seat (always first) plays at: mixes of the other styles. */
const FIELDS: StyleId[][] = [
  ['rock', 'maniac', 'station', 'tag', 'lag'],
  ['gambler', 'trapper', 'nervous', 'shark', 'pro'],
  ['pro', 'shark', 'station', 'nervous', 'maniac'],
];

/** Plays `hands` hands per table with the first seat as `agent` (or `twin`) and returns what it did. */
export function heroProfile(agent: Agent, hands: number, seed: number, twin?: TwinBrain, fields = FIELDS): TwinProfile {
  const profile = emptyCounted();
  fields.forEach((field, i) => {
    let heroId = '';
    simulateTable([agent, ...field], hands, seed + i * 101, 100, {}, {
      twins: twin ? { 0: twin } : undefined,
      onHand: (rec) => {
        heroId ||= rec.players.find((p) => p.name === 'Host')?.id ?? '';
        if (heroId) addHandToTwin(profile, rec, heroId, `${seed}-${i}#${rec.number}`);
      },
    });
  });
  return profile;
}
