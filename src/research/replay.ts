import { makeMove, dealNextStreet, runoutStep, showdown } from '../game/holdem';
import { hashString, seededRng } from '../game/cards';
import { everydayThought, updateEverydayMemory } from '../bot_engine/everydayLive';
import { RESEARCH_DEVICE, RESEARCH_ENGINE, type ResearchHand } from './engine';
/** Recompute every free bot choice from the pre-play checkpoint, never from terminal cards or other agents' state. */
export function replayResearchHand(record: ResearchHand) {
  if (record.engine !== RESEARCH_ENGINE) throw new Error('Replay requires the recorded engine release.');
  const game = structuredClone(record.initial);
  let decision = 0,
    mismatches = 0;
  const ctx = () => ({
    now: game.createdAt + record.durationMs,
    deviceId: RESEARCH_DEVICE,
    rng: seededRng(hashString(`${record.seed}:${record.index}:${game.hand!.seq}`)),
  });
  for (const event of record.events.filter((e) => e.kind !== 'setup')) {
    for (let guard = 0; !game.hand!.toAct && !game.hand!.result && guard < 8; guard++) {
      if (game.hand!.showdownAt != null) {
        game.hand!.showdownAt = null;
        showdown(game, ctx());
      } else if (game.hand!.runout) runoutStep(game, ctx());
      else if (game.hand!.nextStreetAt != null) dealNextStreet(game, ctx());
      else throw new Error('Replay reached an unexpected wait.');
      updateEverydayMemory(game);
    }
    if (game.hand!.toAct !== event.action.playerId || game.hand!.street !== event.action.street)
      throw new Error('Replay action order mismatch.');
    if (event.kind === 'bot') {
      const thought = everydayThought(game, event.action.playerId),
        original = record.decisions[decision++];
      if (!thought || !original) throw new Error('Replay is missing a bot decision.');
      const trace = game.botTable!.traces.at(-1)!;
      if (
        JSON.stringify(thought.move) !== JSON.stringify(original.action) ||
        JSON.stringify(trace.finalDistribution) !== JSON.stringify(original.finalDistribution)
      )
        mismatches++;
    }
    const error = makeMove(game, event.action.move, event.action.to, ctx());
    if (error) throw new Error(`Replay rejected action: ${error}`);
    updateEverydayMemory(game);
  }
  for (let guard = 0; !game.hand!.result && guard < 8; guard++) {
    if (game.hand!.showdownAt != null) {
      game.hand!.showdownAt = null;
      showdown(game, ctx());
    } else if (game.hand!.runout) runoutStep(game, ctx());
    else if (game.hand!.nextStreetAt != null) dealNextStreet(game, ctx());
    else throw new Error('Replay hand did not finish.');
  }
  if (decision !== record.decisions.length) throw new Error('Replay has unmatched bot decisions.');
  const resultMatches = JSON.stringify(game.hand!.result?.won) === JSON.stringify(record.result?.won);
  return { decisions: decision, mismatches, resultMatches };
}
