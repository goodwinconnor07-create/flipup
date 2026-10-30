// Chat bubble colours. Blue and grey are the free look, and Green is free too; the rest are FlipUp Premium's. The style rides along with a
// player's name and emoji, so everyone at the table sees it. The look itself lives in table.css (`.fx-<id>`).

export interface BubbleStyle {
  id: string;
  name: string;
  /** One line for the picker. */
  note: string;
  /** Anyone can use it, without Premium. */
  free?: boolean;
}

export const BUBBLE_STYLES: BubbleStyle[] = [
  { id: 'green', name: 'Green', note: 'Free for everyone', free: true },
  { id: 'sunset', name: 'Sunset', note: 'Pink to orange' },
  { id: 'gold', name: 'Gold', note: 'A slow shine' },
  { id: 'aurora', name: 'Aurora', note: 'Drifting northern lights' },
  { id: 'neon', name: 'Neon', note: 'A glowing outline' },
  { id: 'rainbow', name: 'Rainbow', note: 'Cycles every colour' },
  { id: 'ocean', name: 'Ocean', note: 'Deep blue to teal, rolling' },
  { id: 'candy', name: 'Candy', note: 'Pink and lilac stripes' },
  { id: 'fire', name: 'Fire', note: 'A flickering flame' },
  { id: 'galaxy', name: 'Galaxy', note: 'Stars over purple' },
  { id: 'frost', name: 'Frost', note: 'Icy white with a cool glow' },
  { id: 'toxic', name: 'Toxic', note: 'Glowing slime green' },
];

export const bubbleById = (id: string | undefined): BubbleStyle | undefined => BUBBLE_STYLES.find((b) => b.id === id);

export const isBubbleId = (v: unknown): v is string => typeof v === 'string' && BUBBLE_STYLES.some((b) => b.id === v);
