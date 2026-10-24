// A finished hand as plain text, for sharing to a group chat. Only what this phone's log already shows.

const SUITS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };

/** "[Ah]" → "A♥", "[Td]" → "10♦" in a line of the log. */
export function plainCards(line: string): string {
  return line.replace(/\[([2-9TJQKA])([shdc])\]/g, (_m, rank: string, suit: string) => `${rank === 'T' ? '10' : rank}${SUITS[suit]}`);
}

/** The hand's log as a message: a title, your cards if you were dealt in, then each move. */
export function handLogText(number: number, lines: string[], mine?: string[]): string {
  const out = [`GTODuel · Hand #${number}`];
  if (mine && mine.length === 2) out.push(plainCards(`Your hand: ${mine.map((c) => `[${c}]`).join(' ')}`));
  // The first line is the hand's title ("Hand #7"); the rest is what happened.
  for (const line of lines.slice(1)) out.push(plainCards(line));
  return out.join('\n');
}
