// The friends you've asked to the table you're setting up, and how each invite is going: Invited… while it's out,
// Joined once they sit down, then back to nothing if they say no or it runs out. Kept here (not in a screen) so the
// Play with friends page and the lobby after it show the same pills. One table at a time: opening a new lobby
// starts the list again.
import { useEffect, useSyncExternalStore } from 'react';

import { INVITE_MS, type Game, type InviteDeclined } from '@/engine';

import { inviteFriends, loadDeclined, takeBackInvites, type Pal } from './pals';
import { me } from './session';

export type InviteStatus = 'invited' | 'joined' | 'declined' | 'expired';

export interface TableInvite {
  status: InviteStatus;
  /** When the invite went out. */
  at: number;
  /** Goes up each time the rings should play (sent, joined), so the face replays them. */
  ring: number;
  /** A no from this friend already on the list when this invite went out (server time), so only a newer one counts. */
  oldNo?: number;
}

/** How long "Declined" or "No answer" shows before the face goes back to normal. */
export const SETTLE_MS = 2_400;

let table: string | null = null;
let invites: Record<string, TableInvite> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

function put(code: string, next: TableInvite | null): void {
  const rest = { ...invites };
  if (next) rest[code] = next;
  else delete rest[code];
  invites = rest;
  emit();
}

/** Every invite for the table being set up, by friend code. */
export function useTableInvites(): Record<string, TableInvite> {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => invites,
  );
}

/** Which table the invites are for; a different one clears them. */
export function invitesFor(code: string | null): void {
  if (code === table) return;
  table = code;
  invites = {};
  emit();
}

/**
 * Sends `pal` an invite. The pill and the rings start at once; `lobby()` gives the table (made on the first
 * invite), then the invite goes to the server. If either step fails the pill goes and the error is thrown.
 */
export async function invitePal(pal: Pal, lobby: () => Promise<string>): Promise<void> {
  const before = invites[pal.code];
  put(pal.code, { status: 'invited', at: Date.now(), ring: (before?.ring ?? 0) + 1 });
  try {
    const code = await lobby();
    const oldNo = loadDeclined().find((d) => d.by === pal.code && d.table === code)?.at;
    if (oldNo !== undefined && invites[pal.code]) invites = { ...invites, [pal.code]: { ...invites[pal.code], oldNo } };
    if (table !== code) {
      // The lobby was made just now: keep this invite as the list moves over to it.
      const mine = invites[pal.code];
      invitesFor(code);
      if (mine) put(pal.code, mine);
    }
    if ((await inviteFriends([pal.code], code)) < 1) throw new Error(`Couldn't reach ${pal.name}. Try again.`);
  } catch (e) {
    put(pal.code, null);
    throw e;
  }
}

/** Takes back an invite that's still out (a second tap on their face). */
export function uninvitePal(code: string): void {
  if (invites[code]?.status !== 'invited') return;
  put(code, null);
  if (table) void takeBackInvites([code], table);
}

/** Invites still waiting for an answer, for taking them back when the table isn't opened after all. */
export const waitingInvites = (): string[] => Object.keys(invites).filter((c) => invites[c].status === 'invited');

/** Forgets the list (the table was opened and left, or abandoned). */
export const clearInvites = (): void => invitesFor(null);

/** The seat a friend has taken at the table: same face and name (a clash at the table adds " 2"), never yours, never a bot. */
export function seatOf(game: Game | null, pal: Pal) {
  if (!game) return undefined;
  const people = game.players.filter((p) => !p.bot && p.deviceId !== me && !p.leaving);
  const named = (n: string) => n === pal.name || n.replace(/ \d+$/, '') === pal.name;
  return people.find((p) => named(p.name) && p.emoji === pal.emoji) ?? people.find((p) => named(p.name));
}

/**
 * Moves each invite on as the table and the friends check change: Joined when they sit down (the green rings), back
 * to Invited if they get up again, Declined when their no comes in, No answer when it runs out; the last two clear
 * after a moment.
 */
export function useInviteWatch(code: string | null, game: Game | null, pals: Pal[], declined: InviteDeclined[]): void {
  const all = useTableInvites();
  useEffect(() => {
    if (!code || code !== table) return;
    for (const pal of pals) {
      const inv = all[pal.code];
      if (!inv) continue;
      const seated = !!seatOf(game, pal);
      if (seated && inv.status !== 'joined') put(pal.code, { ...inv, status: 'joined', ring: inv.ring + 1 });
      else if (!seated && inv.status === 'joined') put(pal.code, { ...inv, status: 'invited', at: Date.now() });
      else if (inv.status === 'invited' && declined.some((d) => d.table === code && d.by === pal.code && d.at !== inv.oldNo))
        put(pal.code, { ...inv, status: 'declined' });
    }
  }, [code, game, pals, declined, all]);
  // Runs out: checked every few seconds while anything is still waiting.
  useEffect(() => {
    const waiting = Object.values(all).some((i) => i.status === 'invited');
    if (!waiting) return;
    const t = setInterval(() => {
      for (const [c, inv] of Object.entries(invites)) if (inv.status === 'invited' && Date.now() - inv.at > INVITE_MS) put(c, { ...inv, status: 'expired' });
    }, 5_000);
    return () => clearInterval(t);
  }, [all]);
  // Declined and No answer show for a moment, then the face is back to normal.
  useEffect(() => {
    const settling = Object.entries(all).filter(([, i]) => i.status === 'declined' || i.status === 'expired');
    if (!settling.length) return;
    const t = setTimeout(() => settling.forEach(([c]) => invites[c]?.status !== 'invited' && invites[c]?.status !== 'joined' && put(c, null)), SETTLE_MS);
    return () => clearTimeout(t);
  }, [all]);
}
