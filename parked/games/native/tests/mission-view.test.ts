import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/localStorage/install', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { DEFAULT_SETTINGS, MISSION_GOAL, applyAction, createTable, redactForDevice, rewardOf, type Game } from '@game/index';

import { myMission } from '../src/state/mission-view';

const ME = 'device-me-000001';

function seeded(seed = 5): () => number {
  let x = seed;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
}

/** A Secret Missions bots table, before the deal and once the first hand is dealt (as this phone sees it). */
function table(): { lobby: Game; dealt: Game; me: string } {
  const rng = seeded();
  let game = createTable({ hostDeviceId: ME, name: 'Me', emoji: '🙂', settings: { ...DEFAULT_SETTINGS, variant: 'missions', turnSeconds: 0 }, bots: 3, code: null, now: 1, rng });
  const lobby = game;
  let now = 10;
  const step = (deviceId: string, a: Parameters<typeof applyAction>[1]) => {
    const r = applyAction(game, a, { deviceId, now, rng });
    if (r.ok) game = r.game;
  };
  step(ME, { type: 'start' });
  for (let i = 0; i < 50 && !game.hand; i++) {
    now = Math.max(now + 1, game.wakeAt ?? now + 1000);
    step('clock', { type: 'tick' });
  }
  return { lobby, dealt: redactForDevice(game, ME), me: game.players.find((p) => p.deviceId === ME)!.id };
}

describe('mission card', () => {
  it('is face down before the first deal', () => {
    const { lobby, me } = table();
    expect(myMission(lobby, me).state).toBe('none');
  });

  it('shows your mission, what it pays and the race once dealt', () => {
    const { dealt, me } = table();
    const v = myMission(dealt, me);
    expect(v.state).toBe('active');
    expect(v.info).toBeTruthy();
    expect(v.reward).toBe(rewardOf(v.info!.id) * dealt.settings.bigBlind);
    expect(v.goal).toBe(MISSION_GOAL);
    expect(v.swapsIn).toBeGreaterThan(0);
    // Everyone at the table is in the race, you named "You".
    expect(v.standings).toHaveLength(dealt.players.length);
    expect(v.standings.filter((s) => s.me).map((s) => s.name)).toEqual(['You']);
  });

  it('only ever knows your own mission', () => {
    const { dealt, me } = table();
    for (const [id, p] of Object.entries(dealt.missions!.players)) if (id !== me) expect(p.mission).toBeFalsy();
  });

  it('turns to Done once the mission is completed this hand', () => {
    const { dealt, me } = table();
    const done = { ...dealt, missions: { ...dealt.missions!, players: { ...dealt.missions!.players, [me]: { ...dealt.missions!.players[me], mission: null, done: 2 } } } };
    const v = myMission(done, me);
    expect(v.state).toBe('done');
    expect(v.done).toBe(2);
    expect(v.standings[0].me).toBe(true);
  });
});
