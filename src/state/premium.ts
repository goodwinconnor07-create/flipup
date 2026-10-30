// FlipUp Premium: what it costs, what it unlocks, and the payment step.
//
// There's no payment network yet. `purchasePremium()` and `restorePurchase()` are the only two places that
// would talk to one (the App Store / Play billing, or a web checkout): swap their bodies when it's wired up and
// nothing else changes. For now a purchase just goes through after a short wait, so the whole flow can be used.

/** Shown on every Premium screen. One payment, no subscription. */
export const PREMIUM_PRICE = '$9';

/** What the player was doing when the offer opened, so it can lead with that. */
export type PremiumReason = 'bubbles' | 'packs' | 'emoji' | 'legends';

export const PREMIUM_PERKS: { id: PremiumReason; title: string; line: string }[] = [
  { id: 'bubbles', title: 'Eleven bubble effects', line: 'Fire, galaxy, neon and more. Everyone at the table sees them.' },
  { id: 'packs', title: 'Eleven card packs', line: 'Shining card backs. Your table sees them on your cards.' },
  { id: 'emoji', title: 'Any emoji as your face', line: 'Not just the grid. Type any emoji there is.' },
  { id: 'legends', title: 'AI Legends at your table', line: 'Seat Brunson, Ivey, Dwan and the rest in any game.' },
];

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Charges for Premium. Resolves true once the payment has gone through. (Stand-in: always succeeds.) */
export async function purchasePremium(): Promise<boolean> {
  await pause(1100);
  return true;
}

/** Looks for an earlier purchase on this account. (Stand-in: finds none, so Restore says so.) */
export async function restorePurchase(): Promise<boolean> {
  await pause(700);
  return false;
}
