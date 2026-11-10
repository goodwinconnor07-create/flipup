// The finish page's mode chip: which games the host can step through for the next table. Pure, so it's tested.
import { isPremiumVariant, VARIANTS, type Variant } from '@/engine';

/** Games played this long ago still count as "tonight". */
export const TONIGHT_MS = 12 * 60 * 60 * 1000;

/**
 * The modes the chip steps through after the one just played, in the app's game order starting after it: the ones
 * not played tonight first, then the ones that were. Premium games are left out unless the host has Premium (the
 * server refuses to host one otherwise), so the chip never offers what Play again would be refused.
 */
export function nextModes(current: Variant, played: readonly { variant: Variant; at: number }[], premium: boolean, now: number): Variant[] {
  const ids = VARIANTS.map((v) => v.id);
  const start = ids.indexOf(current);
  const ring = [...ids.slice(start + 1), ...ids.slice(0, Math.max(0, start))];
  const tonight = new Set(played.filter((g) => now - g.at < TONIGHT_MS).map((g) => g.variant));
  const open = ring.filter((id) => premium || !isPremiumVariant(id));
  return [...open.filter((id) => !tonight.has(id)), ...open.filter((id) => tonight.has(id))];
}
