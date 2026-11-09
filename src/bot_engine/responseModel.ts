import model from './responseWeights.json';
import { handIntent } from './handPlan';
import type { continuationView } from './multiplayerPlanning';
export type ResponseView = ReturnType<typeof continuationView>;
export const RESPONSE_FEATURES = [
  'bias',
  'strength',
  'draw',
  'price',
  'depth',
  'position',
  'previousBet',
  'initiative',
  'pressure',
  'opponents',
  'turn',
  'river',
  'priceStrength',
  'priceDraw',
  'crowdStrength',
];
if (
  model.weights.length !== 3 ||
  model.features.join('|') !== RESPONSE_FEATURES.join('|') ||
  model.weights.some((r) => r.length !== RESPONSE_FEATURES.length || r.some((v) => !Number.isFinite(v)))
)
  throw new Error('Incompatible response weights');
export function responseFeatures(v: ResponseView): number[] {
  const kind = handIntent(v.hole, v.board, v.previousBoard, v.previousBet, v.facingStrength);
  const strength = kind.level / 11,
    draw = Number(kind.draw !== 'none');
  const price = Math.min(2, Math.log1p(v.toCall / Math.max(1, v.eligiblePot - v.toCall)));
  const crowd = (v.live - 2) / 7;
  return [
    1,
    strength,
    draw,
    price,
    Math.min(5, Math.log1p(v.stackToPot)),
    Number(v.inPosition),
    Number(v.previousBet),
    Number(v.initiative),
    Number(v.facingStrength),
    crowd,
    Number(v.board.length === 4),
    Number(v.board.length === 5),
    price * strength,
    price * draw,
    crowd * strength,
  ];
}
export function responseProbabilities(
  v: ResponseView,
  weights: number[][] = model.weights,
  extract = responseFeatures,
): [number, number, number] {
  if (
    v.board.length === 5 &&
    v.board.every((c) => c[1] === v.board[0][1]) &&
    ['T', 'J', 'Q', 'K', 'A'].every((r) => v.board.some((c) => c[0] === r))
  )
    return [0, 1, 0];
  const x = extract(v);
  const logits = weights.map((row) => row.reduce((s, w, k) => s + w * x[k], 0));
  const best = Math.max(...logits),
    allowed = [v.toCall > 0, true, v.canRaise];
  const exp = logits.map((a, k) => (allowed[k] ? Math.exp(Math.max(-40, a - best)) : 0)),
    sum = exp.reduce((s, v) => s + v, 0);
  return exp.map((v) => v / sum) as [number, number, number];
}
export interface ResponseExample {
  view: ResponseView;
  label: number;
}
export function fitResponses(rows: ResponseExample[], iterations = 180, extract = responseFeatures) {
  if (!rows.length) throw new Error('No response training observations');
  const weights = Array.from({ length: 3 }, () => extract(rows[0].view).map(() => 0));
  const squares = weights.map((r) => r.map(() => 1e-5));
  const data = rows.map((r) => ({ ...r, x: extract(r.view) }));
  for (let epoch = 0; epoch < iterations; epoch++) {
    const gradient = weights.map((r) => r.map(() => 0));
    for (const row of data) {
      const p = responseProbabilities(row.view, weights, extract);
      for (let a = 0; a < 3; a++)
        for (let k = 0; k < row.x.length; k++) gradient[a][k] += ((p[a] - Number(a === row.label)) * row.x[k]) / data.length;
    }
    weights.forEach((r, a) =>
      r.forEach((w, k) => {
        const g = gradient[a][k] + 0.002 * w;
        squares[a][k] += g * g;
        weights[a][k] -= (0.15 * g) / Math.sqrt(squares[a][k]);
      }),
    );
  }
  return weights;
}
export function responseScores(rows: ResponseExample[], predictor: (v: ResponseView) => number[]) {
  let loss = 0,
    brier = 0;
  for (const r of rows) {
    const p = predictor(r.view);
    loss -= Math.log(Math.max(1e-9, p[r.label]));
    brier += p.reduce((s, v, k) => s + (v - Number(k === r.label)) ** 2, 0);
  }
  return { observations: rows.length, logLoss: loss / rows.length, brier: brier / rows.length };
}
