// The campaign bankroll on this phone (`flipup.campaign`). The rules are pure, in game/campaign.ts; the
// commands that sit you down at a table and settle it are in store.ts.

import { useSyncExternalStore } from 'react';
import { cleanCampaign, type Campaign } from '../game';
import { dayKey, read, write } from './persist';

const KEY = 'flipup.campaign';

let current: Campaign = cleanCampaign(read(KEY));
const listeners = new Set<() => void>();

export function getCampaign(): Campaign {
  return current;
}

export function setCampaign(c: Campaign): void {
  if (c === current) return;
  current = c;
  write(KEY, c);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCampaign(): Campaign {
  return useSyncExternalStore(subscribe, getCampaign);
}

/** Today on this phone's calendar: the salary comes once per day. */
export const today = (): string => dayKey(new Date());

/** Milliseconds until midnight here, when the next salary is due. */
export function untilTomorrow(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
