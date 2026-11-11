import { continuationIntent, type ResponsePredictor } from './multiplayerPlanning';
import { responseProbabilities } from './responseModel';
/** V7's sampling probabilities, including legal-action masks. */
export const priorResponse: ResponsePredictor = (v) => {
  const p = continuationIntent(v);
  const aggressive = v.canRaise ? (v.toCall ? p.raiseProbability : p.betProbability) : 0;
  return v.toCall
    ? [1 - Math.max(aggressive, p.callProbability), Math.max(0, p.callProbability - aggressive), aggressive]
    : [0, 1 - aggressive, aggressive];
};
/** Fixed equal mixture acknowledges population/model uncertainty. Not a fitted confidence score. */
export const guardedResponse: ResponsePredictor = (v) => {
  const fitted = responseProbabilities(v),
    prior = priorResponse(v);
  if (fitted[1] === 1) return fitted;
  return fitted.map((p, k) => (p + prior[k]) / 2) as [number, number, number];
};
