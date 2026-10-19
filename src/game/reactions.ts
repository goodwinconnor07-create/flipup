// Quick messages a player can send to the table. Only these ids are accepted, so nobody can type anything.

export interface Reaction {
  id: string;
  text: string;
}

/** Phrases first, then emoji reactions. */
export const REACTIONS: Reaction[] = [
  { id: 'nice', text: 'Nice hand!' },
  { id: 'lucky', text: 'Lucky!' },
  { id: 'wow', text: 'Wow!' },
  { id: 'gl', text: 'Good luck!' },
  { id: 'oops', text: 'Oops!' },
  { id: 'gg', text: 'GG' },
  { id: 'clap', text: '👏' },
  { id: 'laugh', text: '😂' },
  { id: 'grimace', text: '😬' },
  { id: 'fire', text: '🔥' },
];

export const isReactionId = (v: unknown): v is string => typeof v === 'string' && REACTIONS.some((r) => r.id === v);

export const reactionText = (id: string): string => REACTIONS.find((r) => r.id === id)?.text ?? '';
