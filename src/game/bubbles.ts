// Chat bubble colours. Blue and grey are the free look; these are FlipUp Premium's. The style rides along with a
// player's name and emoji, so everyone at the table sees it. The look itself lives in table.css (`.fx-<id>`).

export interface BubbleStyle {
  id: string;
  name: string;
  /** One line for the picker. */
  note: string;
}

export const BUBBLE_STYLES: BubbleStyle[] = [
  { id: 'sunset', name: 'Sunset', note: 'Pink to orange' },
  { id: 'gold', name: 'Gold', note: 'A slow shine' },
  { id: 'aurora', name: 'Aurora', note: 'Drifting northern lights' },
  { id: 'neon', name: 'Neon', note: 'A glowing outline' },
  { id: 'rainbow', name: 'Rainbow', note: 'Cycles every colour' },
];

export const isBubbleId = (v: unknown): v is string => typeof v === 'string' && BUBBLE_STYLES.some((b) => b.id === v);
