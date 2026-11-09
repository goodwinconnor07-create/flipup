import model from './responseWeightsV2.json';
import { RESPONSE_FEATURES, responseFeatures, responseProbabilities, type ResponseView } from './responseModel';
const levels = [0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const RESPONSE_FEATURES_V2 = [...RESPONSE_FEATURES, ...levels.map((n) => `level${n}`), ...levels.map((n) => `facingLevel${n}`)];
if (
  model.features.join('|') !== RESPONSE_FEATURES_V2.join('|') ||
  model.weights.length !== 3 ||
  model.weights.some((r) => r.length !== RESPONSE_FEATURES_V2.length || r.some((v) => !Number.isFinite(v)))
)
  throw new Error('Incompatible V2 response weights');
/** Nonlinear hand groups separate rare strong-hand aggression from the dominant passive class. */
export function responseFeaturesV2(v: ResponseView) {
  const x = responseFeatures(v),
    level = Math.round(x[1] * 11);
  return [...x, ...levels.map((n) => Number(n === level)), ...levels.map((n) => Number(n === level && v.toCall > 0))];
}
export function responseProbabilitiesV2(v: ResponseView, weights = model.weights) {
  return responseProbabilities(v, weights, responseFeaturesV2);
}
