// Profile pictures are emojis: pick one from the grid or type any emoji you like.

// One row per line of the picker.
// prettier-ignore
export const EMOJIS = [
  '😎', '🤠', '🥸', '🤩', '😈', '👻', '🤖', '👽',
  '🐸', '🦊', '🐼', '🐯', '🦁', '🐙', '🦄', '🐵',
  '🐶', '🐱', '🐻', '🐨', '🐷', '🐔', '🦖', '🦈',
  '🧌', '🧙', '🧛', '🥷', '🦸', '👑', '💎', '🔥',
  '🍀', '🌵', '🍕', '🌮', '🍩', '🍒', '🎲', '🃏',
] as const;

export const DEFAULT_EMOJI = '😎';

const ONE_EMOJI =
  /^(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)$/u;

/** One emoji (flags, skin tones and joined ones like 🧑\u200D🚀 count as one), nothing else. */
export function isEmoji(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 16 && ONE_EMOJI.test(value);
}

/** The first emoji in some typed text, or null. */
export function firstEmoji(text: string): string | null {
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  const parts = Segmenter ? [...new Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment) : [...text];
  return parts.find(isEmoji) ?? null;
}
