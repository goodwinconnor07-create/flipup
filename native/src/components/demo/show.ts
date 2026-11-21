import { router } from 'expo-router';

import { haptic } from '@/components/haptics';
import type { Variant } from '@/engine';
import { openDemo } from '@/state/session';

/**
 * Opens the Demo of a game: free for everyone, Premium games included (it's how a free player sees what they'd get).
 * `from: 'lobby'` makes the finish card's button go back to the lobby rather than to a new table.
 */
export function showDemo(variant: Variant, from?: 'lobby'): void {
  haptic.tap();
  openDemo(variant);
  router.push({ pathname: '/demo/[id]', params: { id: variant, ...(from ? { from } : {}) } });
}
