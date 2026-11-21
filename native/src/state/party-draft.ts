// A party being set up on the Play with friends page. "Start a party" opens the playlist screen
// (app/party-playlist.tsx), whose Save puts the games here; the page then shows the playlist in place of the game
// row and the party's house rules in place of the table's, and Open the party creates it. Kept outside the screens
// so the playlist screen and the page share it. A fresh Play with friends page starts with no party.
import { useSyncExternalStore } from 'react';

import type { Variant } from '@/engine';

export interface PartyDraft {
  games: Variant[];
  /** Chips everyone starts each game with (one of `PARTY_STACKS`). */
  stack: number;
  /** Hands between blind levels (one of `PARTY_BLIND_HANDS`). */
  blindHands: number;
  /** Bots fill the table to this many seats (one of `PARTY_FILL`; 0 for none). */
  fill: number;
}

/** The house rules a new party starts with. */
export const PARTY_RULES = { stack: 1000, blindHands: 3, fill: 6 } as const;

let draft: PartyDraft | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function usePartyDraft(): PartyDraft | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => draft,
  );
}

export const readPartyDraft = (): PartyDraft | null => draft;

/** Saves the playlist, keeping any house rules already picked. */
export function setPartyGames(games: Variant[]): void {
  draft = { ...PARTY_RULES, ...(draft ?? {}), games: [...games] };
  emit();
}

export function setPartyRules(patch: Partial<Omit<PartyDraft, 'games'>>): void {
  if (!draft) return;
  draft = { ...draft, ...patch };
  emit();
}

/** Back to a single game. */
export function clearPartyDraft(): void {
  if (!draft) return;
  draft = null;
  emit();
}
