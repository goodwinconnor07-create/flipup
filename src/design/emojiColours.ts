// Written by scripts/emojiColours.mjs: don't edit. The main colour of each emoji in the profile picker, for sheets
// that take their colour from a person's emoji.
export const EMOJI_COLOURS: Record<string, string> = {
  '😎': '#af881e',
  '🤠': '#d6aa25',
  '🥸': '#eebb2b',
  '🤩': '#e1b025',
  '😈': '#c912ce',
  '👻': '#8fa3bf',
  '🤖': '#7d8fa8',
  '👽': '#8d93a6',
  '🐸': '#b6ce19',
  '🦊': '#fb6114',
  '🐼': '#5b6476',
  '🐯': '#f38907',
  '🦁': '#f8bf24',
  '🐙': '#f86e69',
  '🦄': '#e85894',
  '🐵': '#d2a36c',
  '🐶': '#d07f5f',
  '🐱': '#fbbb24',
  '🐻': '#de995d',
  '🐨': '#5b6476',
  '🐷': '#ffd1af',
  '🐔': '#fc6661',
  '🦖': '#84941d',
  '🦈': '#4f86b8',
  '🧌': '#a3ca8a',
  '🧙': '#3145ac',
  '🧛': '#8a1e3a',
  '🥷': '#3b3f4a',
  '🦸': '#c2382a',
  '👑': '#fbbd32',
  '💎': '#88cef5',
  '🔥': '#fc660c',
  '🍀': '#8bbd2c',
  '🌵': '#7db325',
  '🍕': '#fcba5e',
  '🌮': '#facc47',
  '🍩': '#eea633',
  '🍒': '#c80f23',
  '🎲': '#fc5b37',
  '🃏': '#8a6dc8',
};

/** Colours for an emoji typed in rather than picked: one of these, always the same for the same emoji. */
const TYPED = ['#8468ee', '#e0533d', '#1f9d6a', '#2f7bff', '#e0a100', '#d6409f', '#0f9fb5', '#7a5cff'];

/** The colour a sheet about this person fades from: their emoji's main colour. */
export function emojiColour(emoji: string): string {
  const known = EMOJI_COLOURS[emoji];
  if (known) return known;
  let h = 0;
  for (const ch of emoji) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return TYPED[h % TYPED.length];
}
