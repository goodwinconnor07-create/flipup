// "The story so far" on a card's intro: what was played before it's your turn, a line for each street.

import { BB, type Dealt } from './deal';

const STREETS = ['Preflop', 'Flop', 'Turn', 'River'] as const;
const WORDS = ['No one', 'A player', 'Two players', 'Three players', 'Four players', 'Five players'];
const big = (chips: number) => String(Number((chips / BB).toFixed(1)));

export function storyLines(dealt: Dealt): string[] {
  const { template: t, scene } = dealt;
  const name = dealt.bots.length === 1 ? dealt.bots[0].name : 'A bot';
  const lines: { street: number; items: string[] }[] = [{ street: 0, items: [] }];
  let i = 0;
  let folds = 0;
  const flush = () => {
    if (folds) lines[lines.length - 1].items.push(`${WORDS[Math.min(folds, WORDS.length - 1)]} folded.`);
    folds = 0;
  };
  for (const step of t.script) {
    if (typeof step === 'string') {
      flush();
      lines.push({ street: STREETS.findIndex((s) => s.toLowerCase() === step), items: [] });
      continue;
    }
    const m = scene.script[i++];
    if (!m) break;
    const current = lines[lines.length - 1];
    if (m.move === 'fold' && m.by === 'bot' && dealt.bots.length > 1) {
      folds++;
      continue;
    }
    flush();
    const who = m.by === 'you' ? 'You' : name;
    const verbs: Record<string, string> = {
      fold: 'folded',
      check: 'checked',
      call: 'called',
      allin: 'went all in',
      bet: `bet ${big(m.to ?? 0)}`,
      raise: `raised to ${big(m.to ?? 0)}`,
    };
    current.items.push(`${who} ${verbs[m.move]}.`);
  }
  flush();
  const first = STREETS.findIndex((s) => s.toLowerCase() === t.want.street);
  const last = lines[lines.length - 1];
  if (last.street !== first) lines.push({ street: first, items: ['Your move.'] });
  else last.items.push('Your move.');
  return lines.filter((l) => l.items.length).map((l) => `${STREETS[l.street]}: ${l.items.join(' ')}`);
}
