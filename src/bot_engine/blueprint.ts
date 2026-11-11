import trained from '../game/botPostflop.json';
import { boardTexture, handBucket } from '../game/handBucket';
import { features } from './features';
import type { InformationSet } from './information';
import type { BotMove } from '../game/botPlay';

/** Coarse abstraction exported by gto/scripts/train_bots.py, not an exact state solve. */
export function blueprintMix(i: InformationSet, actions: BotMove[], probabilities: number[], values: number[]) {
  if (i.street === 'preflop' || i.players.filter((p) => !p.folded).length !== 2 || i.players.some((p) => p.allIn && !p.folded)) return null;
  const hero = i.players.find((p) => p.id === i.heroId)!;
  const depth = hero.stack / i.bigBlind;
  if (depth < 20 || depth > 120) return null;
  const streets = ['preflop', 'flop', 'turn', 'river'];
  const previous = streets[streets.indexOf(i.street) - 1];
  const aggressive = ['bet', 'raise', 'allin'];
  const last = [...i.actions].reverse().find((a) => a.street === previous && aggressive.includes(a.move));
  const role = last?.playerId === i.heroId ? 'agg' : 'def';
  const pot = i.players.reduce((sum, p) => sum + p.total, 0);
  const raised = i.actions.some((a) => a.street === i.street && a.playerId === i.heroId && aggressive.includes(a.move));
  const situation = i.legal.canCheck
    ? 'open'
    : raised
      ? 'raised'
      : i.legal.toCall <= 0.5 * Math.max(1, pot - i.legal.toCall)
        ? 'small'
        : 'big';
  const key = `${i.street}|${role}|${features(i).inPosition ? 'ip' : 'oop'}|${situation}|${boardTexture(i.board)}|${handBucket(i.hole, i.board)}`;
  const row = (trained.table as Record<string, number[]>)[key];
  if (!row || row.length !== 4 || row[3] < 50) return null;
  const kinds = actions.map((a) =>
    a.move === 'fold' || a.move === 'check' ? 0 : a.move === 'call' ? 1 : i.legal.canCheck && a.to! - hero.bet <= pot * 0.5 ? 1 : 2,
  );
  const best = Math.max(...values);
  const weights = actions.map((_, n) => {
    const count = kinds.filter((k) => k === kinds[n]).length;
    const guard = Math.exp(Math.min(0, (values[n] - best + pot * 0.1) / Math.max(i.bigBlind * 0.1, pot * 0.04)));
    return (row[kinds[n]] / count) * guard;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (!total) return null;
  const blend = (0.25 * row[3]) / (row[3] + 500);
  return { key, blend, probabilities: probabilities.map((p, n) => (1 - blend) * p + (blend * weights[n]) / total) };
}
