// Quick messages a player can send to the table. Only these ids are accepted, so nobody can type anything.
// Bots also have their own fixed lines (botTalk.ts), which phones can't send.

import { botLineText } from './botTalk';

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

/** `you` is who a bot is talking to, for lines that name them ({you}). */
export const reactionText = (id: string, you = 'you'): string => REACTIONS.find((r) => r.id === id)?.text ?? botLineText(id).replaceAll('{you}', you);
