// Card packs: the back design of your cards. The default is the plain dark back; these five are FlipUp Premium's,
// and each one shines in its own colour. The pack rides along with a player's name and emoji, so at an online
// table everyone sees it on the back of that player's cards. The look itself lives in premium.css (`.pack-<id>`).

export interface CardPack {
  id: string;
  name: string;
  /** One line for the picker. */
  note: string;
}

export const CARD_PACKS: CardPack[] = [
  { id: 'gold', name: 'Gold Rush', note: 'Gold foil with a white-gold shine' },
  { id: 'neon', name: 'Neon Grid', note: 'A glowing grid, cyan and pink' },
  { id: 'aurora', name: 'Aurora', note: 'Green and violet northern lights' },
  { id: 'holo', name: 'Holo', note: 'Rainbow foil that changes colour' },
  { id: 'ruby', name: 'Ruby Ember', note: 'Deep red with a hot orange glint' },
  { id: 'emerald', name: 'Emerald', note: 'Green gem facets with a white glint' },
  { id: 'sapphire', name: 'Sapphire', note: 'Deep blue with a silver shine' },
  { id: 'obsidian', name: 'Obsidian', note: 'Black glass with a purple edge' },
  { id: 'sakura', name: 'Sakura', note: 'Soft pink petals' },
  { id: 'galaxy', name: 'Galaxy', note: 'Stars drifting through a nebula' },
  { id: 'circuit', name: 'Circuit', note: 'Green traces on a dark board' },
];

export const isPackId = (v: unknown): v is string => typeof v === 'string' && CARD_PACKS.some((p) => p.id === v);
