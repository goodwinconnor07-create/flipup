import { describe, expect, it } from 'vitest';
import { decisionFixture } from './testFixtures';
import { informationFor } from './information';
import { updateEverydayMemory, everydayThought } from './everydayLive';
import { updateHumanPokerMemory } from './live';
import { makeMove, dealNextStreet } from '../game/holdem';
import { validateMemory } from './memory';

function table() {
  const f = decisionFixture([100, 100, 100]);
  // Two independent observers, including the player whose turn it is.
  const actor = f.game.hand!.toAct!;
  f.game.players.forEach((p, k) => {
    p.bot = p.id === actor || k === 1;
  });
  if (f.game.players.filter((p) => p.bot).length < 2) f.game.players.find((p) => p.id !== actor)!.bot = true;
  return { ...f, actor };
}

describe('Independent table agents', () => {
  it('makes the same live decision when opponents change origin, private cards or private bot state', () => {
    const { game, actor } = table();
    updateEverydayMemory(game);
    const changed = structuredClone(game);
    for (const p of changed.players)
      if (p.id !== actor) {
        p.bot = !p.bot;
        p.name = 'Different hidden system identity';
        p.botKind = 'human-poker';
        const privateState = changed.botTable!.players[p.id];
        if (privateState) {
          privateState.profile.traits.aggression = 1;
          privateState.profile.seed = 42;
          privateState.memory.opponents = {};
        }
      }
    changed.hand!.deck.reverse();
    let nextCard = 0;
    for (const seat of changed.hand!.seats)
      if (seat.playerId !== actor) {
        seat.cards = changed.hand!.deck.slice(nextCard, nextCard + 2);
        nextCard += 2;
      }
    expect(informationFor(changed, actor)).toEqual(informationFor(game, actor));
    expect(everydayThought(changed, actor)).toEqual(everydayThought(game, actor));
    const before = game.botTable!.traces.at(-1)!,
      after = changed.botTable!.traces.at(-1)!;
    expect(after.prediction).toEqual(before.prediction);
    expect(after.finalDistribution).toEqual(before.finalDistribution);
    expect(after.rationale).toEqual(before.rationale);
    expect(JSON.stringify(after.information)).not.toMatch(/botKind|Different hidden|deck|traits|botTable/);
  });

  it('learns about human and bot actions through the same public observation path, with separate beliefs', () => {
    const { game, ctx } = table();
    const state = updateEverydayMemory(game)!;
    for (let n = 0; n < 3; n++) {
      const h = game.hand!,
        seat = h.seats.find((s) => s.playerId === h.toAct)!;
      expect(makeMove(game, seat.bet < h.currentBet ? 'call' : 'check', undefined, ctx)).toBeNull();
      updateEverydayMemory(game);
    }
    dealNextStreet(game, ctx);
    for (let n = 0; n < 3; n++) {
      expect(makeMove(game, 'check', undefined, ctx)).toBeNull();
      updateEverydayMemory(game);
    }
    const observers = Object.values(state.players);
    expect(observers).toHaveLength(2);
    for (const { memory } of observers) {
      expect(Object.keys(memory.behavior!.opponents).sort()).toEqual(
        game.players
          .filter((p) => p.id !== memory.botId)
          .map((p) => p.id)
          .sort(),
      );
      expect(memory.behavior!.opponents[memory.botId]).toBeUndefined();
      validateMemory(memory);
    }
    const human = game.players.find((p) => !p.bot)!.id;
    expect(observers[0].memory.behavior!.opponents[human]).not.toBe(observers[1].memory.behavior!.opponents[human]);
    const original = structuredClone(observers[1].memory);
    observers[0].memory.behavior!.opponents[human].cells = {};
    expect(observers[1].memory).toEqual(original);
  });

  it('keeps identities and memories on reload, but resets both when starting a different table', () => {
    const { game, actor } = table();
    everydayThought(game, actor);
    const state = game.botTable!;
    const loaded = JSON.parse(JSON.stringify(game));
    expect(updateEverydayMemory(loaded)).toEqual(state);
    loaded.id += '-new-table';
    const fresh = updateEverydayMemory(loaded)!;
    for (const [id, value] of Object.entries(fresh.players)) {
      const old = state.players[id];
      expect(value.profile.seed).not.toBe(old.profile.seed);
      expect(value.profile.latent).not.toEqual(old.profile.latent);
      expect(value.profile.traits).not.toEqual(old.profile.traits);
      expect(value.memory.opponents).toEqual({});
      expect(value.memory.handStory).toBeUndefined();
      expect(value.memory.pendingHandStory).toBeUndefined();
      expect(value.memory.sessionFeel).toBeUndefined();
    }
    expect(fresh.traces).toEqual([]);
  });

  it('also gives the experimental variant a fresh private instance for each table', () => {
    const { game, actor } = table();
    game.players.forEach((p) => {
      delete p.botKind;
    });
    game.players.find((p) => p.id === actor)!.botKind = 'human-poker';
    const state = updateHumanPokerMemory(game)!;
    const loaded = JSON.parse(JSON.stringify(game));
    expect(updateHumanPokerMemory(loaded)).toEqual(state);
    loaded.id += '-new-table';
    const fresh = updateHumanPokerMemory(loaded)!;
    expect(fresh.instanceBase!.seed).not.toBe(state.instanceBase!.seed);
    expect(fresh.instanceBase!.latent).not.toEqual(state.instanceBase!.latent);
    expect(fresh.profile).not.toBe(fresh.instanceBase);
    const previous = structuredClone(state);
    fresh.profile!.traits.aggression = 1;
    expect(state).toEqual(previous);
    expect(fresh.memory.opponents).toEqual({});
  });
});
