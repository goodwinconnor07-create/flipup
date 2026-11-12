// FlipUp Premium: what it costs and what it unlocks.
//
// The web has no payment provider yet, so Premium isn't on sale here (`PREMIUM_ON_SALE`). The iPhone app sells it
// through Apple's in-app purchase. A phone that already has Premium keeps it (`flipup.premium`).
// TODO(before launch): wire a real web payment, then turn PREMIUM_ON_SALE on (docs/APP_STORE.md, open items).

/** Shown on every Premium screen. One payment, no subscription. */
export const PREMIUM_PRICE = '$9';

/** Whether Premium can be bought here. Off until the web has a real payment provider. */
export const PREMIUM_ON_SALE = false;

/** What the player was doing when the offer opened, so it can lead with that. */
export type PremiumReason = 'bubbles' | 'packs';

export const PREMIUM_PERKS: { id: PremiumReason; title: string; line: string }[] = [
  { id: 'bubbles', title: 'Eleven bubble effects', line: 'Fire, galaxy, neon and more. Everyone at the table sees them.' },
  { id: 'packs', title: 'Eleven card packs', line: 'Shining card backs. Your table sees them on your cards.' },
];
