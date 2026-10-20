// Plain helpers for the solver's action labels and numbers (no React, so they can be tested and used anywhere).

/** Solver labels look like "fold", "call", "bet 75% (6.00)", "raise to 22.50", "raise all-in (100.00)". */
export function actionKind(label: string): 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin' {
  const l = label.toLowerCase();
  if (l.includes('all-in') || l.startsWith('allin')) return 'allin';
  const head = l.split(' ')[0];
  if (head === 'fold' || head === 'check' || head === 'call' || head === 'bet' || head === 'raise') return head;
  return 'bet';
}

/** CSS class for each label in a list: bets and raises get darker the bigger they are. */
export function actionClasses(labels: string[]): Record<string, string> {
  const aggressive = labels.filter((l) => ['bet', 'raise'].includes(actionKind(l)));
  const out: Record<string, string> = {};
  for (const l of labels) {
    const k = actionKind(l);
    if (k === 'bet' || k === 'raise') {
      const i = aggressive.indexOf(l);
      const step = aggressive.length <= 1 ? 2 : 1 + Math.round((2 * i) / (aggressive.length - 1));
      out[l] = `act-bet-${step}`;
    } else out[l] = `act-${k}`;
  }
  return out;
}

/** "bet 75% (6.00)" → "Bet 75%", "raise to 22.50" → "Raise to 22.5". */
export function prettyAction(label: string): string {
  const l = label.replace(/\s*\(([\d.]+)\)$/, (_, amt: string) => (/%/.test(label) ? '' : ` ${trim(amt)}`));
  const t = l.replace(/to ([\d.]+)/, (_, a: string) => `to ${trim(a)}`);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const trim = (s: string) => String(Number(Number(s).toFixed(2)));

export const pct = (x: number | null | undefined, digits = 0) => (x == null ? '–' : `${(100 * x).toFixed(digits)}%`);
export const bb = (x: number | null | undefined) => (x == null ? '–' : `${Number(x.toFixed(2))}bb`);

