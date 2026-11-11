import { describe, expect, it } from 'vitest';
import {
  completeResearchHand,
  nextResearchHand,
  researchHero,
  researchOptions,
  researchView,
  scenarioAt,
  startResearch,
  stepResearch,
  type ResearchHand,
} from './engine';
import { parseMetadata, parseResearchHand, parseFeedback, researchId, researchKey } from './protocol';
import { replayResearchHand } from './replay';
import { reviewResearch } from './review';
function play(run: ReturnType<typeof startResearch>) {
  for (let n = 0; !run.game.hand!.result && n < 500; n++) {
    if (run.game.hand!.toAct === researchHero(run.game).id) {
      const o = researchOptions(run);
      stepResearch(run, { move: o.canCheck ? 'check' : 'call' });
    } else stepResearch(run);
  }
  return completeResearchHand(run);
}
describe('Guided live-bot research', () => {
  it('covers the targeted scenarios then keeps one continuous table and independent memories', () => {
    const run = startResearch('00000000-0000-4000-8000-000000000001', 711, 12, 1000),
      hands: ResearchHand[] = [];
    let continuousId = '',
      previousMemory: unknown,
      previousProfile: unknown;
    for (let index = 0; index < 12; index++) {
      expect(run.scenario).toBe(scenarioAt(index, 12));
      const before = run.game.players.reduce((s, p) => s + p.stack, 0) + run.game.hand!.seats.reduce((s, p) => s + p.total, 0);
      const hand = play(run);
      hands.push(hand);
      expect(run.game.players.reduce((s, p) => s + p.stack, 0)).toBe(before);
      expect(hand.decisions.every((d) => d.rationale.summary && d.philosophy.actions[d.rationale.actionIndex].plausible)).toBe(true);
      const metadata = { protocol: run.protocol, engine: run.engine, seed: run.seed, limit: run.limit, startedAt: run.startedAt };
      expect(parseResearchHand(JSON.parse(JSON.stringify(hand)), metadata)).not.toBeNull();
      expect(replayResearchHand(JSON.parse(JSON.stringify(hand)))).toEqual({
        decisions: hand.decisions.length,
        mismatches: 0,
        resultMatches: true,
      });
      if (run.scenario === 'continuous') {
        if (continuousId) {
          expect(run.game.id).toBe(continuousId);
          expect(run.initial.botTable!.players['seat-1'].memory).toEqual(previousMemory);
          expect(run.initial.botTable!.players['seat-1'].profile).toEqual(previousProfile);
        }
        continuousId = run.game.id;
        previousMemory = structuredClone(run.game.botTable!.players['seat-1'].memory);
        previousProfile = structuredClone(run.game.botTable!.players['seat-1'].profile);
      }
      if (index < 11) nextResearchHand(run);
    }
    expect(new Set(hands.map((h) => h.scenario)).size).toBe(6);
    expect(hands.filter((h) => h.scenario === 'continuous').every((h) => h.events.every((e) => e.kind !== 'setup'))).toBe(true);
    const report = reviewResearch({
      metadata: { protocol: run.protocol, engine: run.engine, seed: run.seed, limit: run.limit, startedAt: run.startedAt },
      expiresAt: 0,
      hands,
    });
    expect(report.hands).toBe(12);
    expect(report.unsupportedChoices).toBe(0);
    expect(report.botDecisions).toBeGreaterThan(30);
  });
  it('keeps private research checkpoints out of the rendered view and cannot upload unfinished hands', () => {
    const r = startResearch('private', 15, 12);
    const view = researchView(r);
    expect(view.botTable).toBeUndefined();
    expect(view.hand!.deck).toEqual([]);
    expect(view.hand!.seats.filter((s) => s.playerId !== researchHero(r.game).id).every((s) => s.cards.length === 0)).toBe(true);
    expect(() => completeResearchHand(r)).toThrow('completed');
    r.paused = true;
    expect(() => stepResearch(r, { move: 'call' })).toThrow('paused');
  });
  it('separates scripted open/cold calls from measured bot choices', () => {
    const r = startResearch('cold-calls', 15, 12);
    play(r);
    nextResearchHand(r);
    expect(r.scenario).toBe('crowded');
    expect(r.events.map((e) => e.kind)).toEqual(['setup', 'setup', 'setup']);
    expect(r.game.hand!.toAct).toBe('seat-0');
    expect(r.decisions).toEqual([]);
    expect(r.game.hand!.actions!.map((a) => a.move)).toEqual(['raise', 'call', 'call']);
  });
  it('accepts a participant bet and replays that hand with the live opponents', () => {
    const r = startResearch('participant-bet', 77, 12);
    expect(r.game.hand!.toAct).toBe(researchHero(r.game).id);
    const o = researchOptions(r);
    stepResearch(r, { move: 'bet', to: o.minTo });
    const hand = play(r);
    expect(hand.events.some((e) => e.kind === 'human' && e.action.move === 'bet')).toBe(true);
    expect(replayResearchHand(hand).mismatches).toBe(0);
  });
  it('varies later cards across study seeds while keeping a unique legal deck', () => {
    const runouts = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const r = startResearch('deal-check', seed, 12);
      const h = r.game.hand!,
        cards = [...h.board, ...h.deck, ...h.seats.flatMap((s) => s.cards)];
      expect(new Set(cards).size).toBe(cards.length);
      runouts.add(h.deck.slice(0, 4).join(''));
    }
    expect(runouts.size).toBeGreaterThan(15);
  });
  it('validates session identity, feedback bounds and completed-record protocol', () => {
    expect(researchId('00000000-0000-4000-8000-000000000001')).toBe(true);
    expect(researchKey('a'.repeat(64))).toBe(true);
    expect(researchId('../other')).toBe(false);
    expect(researchKey('short')).toBe(false);
    expect(parseMetadata({ protocol: 'bot-research-1', engine: 'test', seed: 1, limit: 60, startedAt: 1 })).not.toBeNull();
    expect(parseMetadata({ protocol: 'bot-research-1', engine: 'test', seed: 1, limit: 999, startedAt: 1 })).toBeNull();
    expect(parseFeedback({ odd: true, note: 'x'.repeat(1001) })).toBeNull();
    expect(parseFeedback({ odd: false, note: '', realism: 6 })).toBeNull();
  });
});
