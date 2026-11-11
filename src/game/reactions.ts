// Quick messages a player can send to the table. Only these ids are accepted, so nobody can type anything.
// Bots also have their own fixed lines (botTalk.ts), which phones can't send.

import { botLineText } from './botTalk';
import { lineBeats, lineText } from './chat';

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
  { id: 'nicefold', text: 'Nice fold!' },
  { id: 'bigbet', text: 'Big bet?' },
  { id: 'runit', text: 'Run it!' },
  { id: 'clap', text: '👏' },
  { id: 'laugh', text: '😂' },
  { id: 'grimace', text: '😬' },
  { id: 'fire', text: '🔥' },
  { id: 'cool', text: '😎' },
  { id: 'cry', text: '😭' },
  { id: 'pray', text: '🙏' },
  { id: 'eyes', text: '👀' },
  { id: 'mindblown', text: '🤯' },
  { id: 'shrug', text: '🤷' },
];

/** The emoji reactions, sent with one tap from the row along the top of the quick messages. */
export const EMOJI_REACTIONS: Reaction[] = REACTIONS.filter((r) => !/[A-Za-z]/.test(r.text));

/** Extra messages for an Imposter table: accusations and alibis, all fixed lines like the rest. */
export const IMPOSTER_REACTIONS: Reaction[] = [
  { id: 'sus', text: 'Sus… 👀' },
  { id: 'notme', text: "It's not me!" },
  { id: 'trust', text: 'I trust you' },
  { id: 'liar', text: 'Somebody is lying' },
  { id: 'bluff', text: 'That bet was odd' },
  { id: 'innocent', text: "I'm innocent!" },
];

export const isReactionId = (v: unknown): v is string => typeof v === 'string' && (REACTIONS.some((r) => r.id === v) || IMPOSTER_REACTIONS.some((r) => r.id === v));

const template = (id: string): string => REACTIONS.find((r) => r.id === id)?.text ?? IMPOSTER_REACTIONS.find((r) => r.id === id)?.text ?? botLineText(id);

/** A message as plain words. `you` is who a bot is talking to, for lines that name them ({you}); without it the name is left out. */
export const reactionText = (id: string, you?: string): string => lineText(template(id), you);

/** A message as the separate messages it's sent in, each on its own (see chat.ts). */
export const reactionBeats = (id: string, you?: string) => lineBeats(template(id), you);
