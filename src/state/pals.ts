// Friends you play parties with. Each phone claims a friend code (a name and a picture on the server, no
// account). Adding someone by code sends them a friend request: you've agreed by asking, so they go on your list
// at once, marked Pending, and they accept or deny on their phone. Requests waiting for you arrive by polling
// (`watchRequests()`) and on a pull to refresh. The list lives on this phone; friends added before requests
// existed stay as they are. (Friends' AI twins are separate: see friends.ts.)

import { useSyncExternalStore } from 'react';
import { campaignCard, parseCampaignCard, type CampaignCard, type FriendCardInfo, type FriendRequest } from '../game';
import { answerFriendRequest, createFriendCard, fetchFriendCard, fetchFriendInbox, fetchFriendRequests, sendFriendRequest, unfriendOnServer, updateFriendCard } from './api';
import { getCampaign } from './campaign';
import { loadDeviceId, loadProfile, read, write } from './persist';

const KEY = 'flipup.pals';
const MINE = 'flipup.palcode';
const CHANGED = 'flipup:pals';

export interface Pal {
  code: string;
  name: string;
  emoji: string;
  addedAt: number;
  /** How their campaign is going, as their friend card last said. */
  campaign?: CampaignCard;
  /** You've asked them and they haven't accepted yet. */
  pending?: boolean;
}

export function loadPals(): Pal[] {
  const all = read<Pal[]>(KEY);
  return Array.isArray(all) ? all.filter((p) => p && typeof p.code === 'string' && typeof p.name === 'string' && typeof p.emoji === 'string') : [];
}

// ── The shared snapshot every friends screen reads (`usePals()`) ─────────────

export interface PalsView {
  pals: Pal[];
  /** Friend requests waiting for this phone's answer, oldest first. */
  requests: FriendRequest[];
  /** A pull to refresh is running: the friend rows show placeholders. */
  refreshing: boolean;
}

let view: PalsView = { pals: loadPals(), requests: [], refreshing: false };
const listeners = new Set<() => void>();

function publish(patch: Partial<PalsView>): void {
  view = { ...view, ...patch };
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The friends list, the requests waiting, and whether a refresh is running. Every screen sees a change at once. */
export function usePals(): PalsView {
  return useSyncExternalStore(subscribe, () => view);
}

/** The requests waiting right now (for code outside React). */
export const pendingRequests = (): FriendRequest[] => view.requests;

function savePals(pals: Pal[]): void {
  write(KEY, pals.slice(-100));
  publish({ pals: loadPals() });
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED));
}

/** Fires when the list changes, so an open screen reads it again. */
export const PALS_CHANGED = CHANGED;

export const isPal = (code: string): boolean => loadPals().some((p) => p.code === code);

/** This phone's friend code, once it has one. */
export const myPalCode = (): string | undefined => read<string>(MINE) ?? undefined;

/** Makes sure this phone has a friend code (and that the server has its latest name and picture). */
export async function ensureMyCode(): Promise<string> {
  const { name, emoji } = loadProfile();
  const body = { deviceId: loadDeviceId(), name, emoji, campaign: campaignCard(getCampaign(), Date.now()) };
  const have = myPalCode();
  if (have && (await updateFriendCard(have, body))) return have;
  const code = await createFriendCard(body);
  write(MINE, code);
  // A new card is just a name and picture: the campaign goes on it straight after.
  await updateFriendCard(code, body).catch(() => false);
  return code;
}

/**
 * Sends a friend request by code and puts them on the list straight away: Pending until they accept, or a friend
 * at once if they'd asked you too. Throws with a plain sentence when it can't.
 */
export async function addPal(code: string): Promise<Pal> {
  if (code === myPalCode()) throw new Error("That's your own code.");
  if (!loadProfile().name.trim()) throw new Error('Add your name first, so they know who’s asking.');
  const card = await fetchFriendCard(code);
  if (!card) throw new Error('No one has that friend code. Check it with them.');
  const mine = await ensureMyCode();
  const status = await sendFriendRequest(code, { deviceId: loadDeviceId(), fromCode: mine });
  const had = loadPals().find((p) => p.code === code);
  const campaign = parseCampaignCard(card.campaign);
  // Someone already on the list stays a friend; only a new ask is Pending.
  const pending = status === 'sent' && (!had || had.pending === true);
  const pal: Pal = { code, name: card.name, emoji: card.emoji, addedAt: had?.addedAt ?? Date.now(), ...(campaign ? { campaign } : {}), ...(pending ? { pending: true } : {}) };
  cancelRemoval(code);
  savePals([...loadPals().filter((p) => p.code !== code), pal]);
  return pal;
}

/** Removal reaches the server only once the Undo has had its chance. */
const UNDO_MS = 7500;
const removals = new Map<string, ReturnType<typeof setTimeout>>();

function cancelRemoval(code: string): void {
  clearTimeout(removals.get(code));
  removals.delete(code);
}

/** Takes a friend (or a Pending ask) off the list. A few seconds later, unless undone, it ends on both sides. */
export function removePal(code: string): Pal | null {
  const pal = loadPals().find((p) => p.code === code) ?? null;
  savePals(loadPals().filter((p) => p.code !== code));
  const mine = myPalCode();
  if (pal && mine) {
    cancelRemoval(code);
    removals.set(
      code,
      setTimeout(() => {
        removals.delete(code);
        void unfriendOnServer(mine, { deviceId: loadDeviceId(), other: code }).catch(() => undefined);
      }, UNDO_MS),
    );
  }
  return pal;
}

export function restorePal(pal: Pal): void {
  cancelRemoval(pal.code);
  savePals([...loadPals().filter((p) => p.code !== pal.code), pal]);
}

// ── Requests waiting for you ────────────────────────────────────────────────

/** Requests answered on this phone that a poll already in flight may still list. */
const answered = new Set<string>();

/** Says yes: they move into your friends at once, and the server makes it mutual. Throws a plain sentence. */
export async function acceptRequest(from: string): Promise<void> {
  const req = view.requests.find((r) => r.from === from);
  const mine = myPalCode();
  if (!req || !mine) return;
  answered.add(from);
  const had = loadPals().find((p) => p.code === from);
  publish({ requests: view.requests.filter((r) => r.from !== from) });
  savePals([...loadPals().filter((p) => p.code !== from), { code: from, name: req.name, emoji: req.emoji, addedAt: had?.addedAt ?? Date.now() }]);
  try {
    await answerFriendRequest(mine, { deviceId: loadDeviceId(), from, accept: true });
  } catch (e) {
    publish({ requests: [...view.requests, req] });
    savePals(had ? loadPals().map((p) => (p.code === from ? had : p)) : loadPals().filter((p) => p.code !== from));
    throw e;
  } finally {
    answered.delete(from);
  }
}

/** Says no, quietly: nothing tells them, their ask just ends. Throws a plain sentence. */
export async function denyRequest(from: string): Promise<void> {
  const req = view.requests.find((r) => r.from === from);
  const mine = myPalCode();
  if (!req || !mine) return;
  answered.add(from);
  publish({ requests: view.requests.filter((r) => r.from !== from) });
  try {
    await answerFriendRequest(mine, { deviceId: loadDeviceId(), from, accept: false });
  } catch (e) {
    publish({ requests: [...view.requests, req] });
    throw e;
  } finally {
    answered.delete(from);
  }
}

/**
 * Brings the list in line with the server: the requests waiting, and each Pending ask (accepted → a friend; denied
 * or gone → off the list). Friends you added before requests existed are left alone. `cards` updates names and
 * pictures when the call had them.
 */
function applyServer(box: { requests: FriendRequest[]; sent: string[]; friends: string[] }, startedAt: number, cards: FriendCardInfo[] = []): void {
  const requests = box.requests.filter((r) => !answered.has(r.from));
  if (JSON.stringify(requests) !== JSON.stringify(view.requests)) publish({ requests });
  const byCode = new Map(cards.map((c) => [c.code, c]));
  let changed = false;
  const next: Pal[] = [];
  for (const pal of loadPals()) {
    let p = pal;
    if (p.pending && box.friends.includes(p.code)) {
      const { pending: _, ...rest } = p;
      p = rest;
    } else if (p.pending && !box.sent.includes(p.code) && p.addedAt < startedAt && !removals.has(p.code)) {
      // Denied (or the ask lapsed): it quietly goes. An ask made after this check started is left for the next one.
      changed = true;
      continue;
    }
    const card = byCode.get(p.code);
    if (card) {
      const campaign = parseCampaignCard(card.campaign);
      p = { ...p, name: card.name, emoji: card.emoji, ...(campaign ? { campaign } : {}) };
    }
    if (JSON.stringify(p) !== JSON.stringify(pal)) changed = true;
    next.push(p);
  }
  if (changed) savePals(next);
}

/** A friend's latest name, picture and campaign. */
function freshenCard(card: FriendCardInfo): void {
  const campaign = parseCampaignCard(card.campaign);
  const pals = loadPals();
  const next = pals.map((p) => (p.code === card.code ? { ...p, name: card.name, emoji: card.emoji, ...(campaign ? { campaign } : {}) } : p));
  if (JSON.stringify(next) !== JSON.stringify(pals)) savePals(next);
}

/** One cheap look at the requests and your asks. Never throws. */
export async function checkRequests(): Promise<void> {
  const code = myPalCode();
  if (!code) return;
  const startedAt = Date.now();
  try {
    const box = await fetchFriendRequests(code, loadDeviceId());
    if (box) applyServer(box, startedAt);
  } catch {
    // Next time.
  }
}

let polling: ReturnType<typeof setInterval> | undefined;
/** How often requests are looked for while the app is open. */
export const REQUEST_POLL_MS = 5000;

/** Looks for friend requests now, every few seconds while the app is on screen, and when it comes back. */
export function watchRequests(): () => void {
  if (polling) return () => undefined;
  const tick = () => {
    if (document.visibilityState === 'visible') void checkRequests();
  };
  tick();
  polling = setInterval(tick, REQUEST_POLL_MS);
  document.addEventListener('visibilitychange', tick);
  return () => {
    clearInterval(polling);
    polling = undefined;
    document.removeEventListener('visibilitychange', tick);
  };
}

/** Placeholders stay up at least this long, so a fast answer doesn't flash. */
const MIN_REFRESH_MS = 600;

/**
 * Pull to refresh: requests, asks, and everyone's latest name, picture and campaign. Friends from before requests
 * existed aren't on the server's list, so they're looked up one by one. Never throws.
 */
export async function refreshPals(): Promise<void> {
  if (view.refreshing) return;
  publish({ refreshing: true });
  const startedAt = Date.now();
  try {
    const code = myPalCode();
    const box = code ? await fetchFriendInbox(code, loadDeviceId()).catch(() => null) : null;
    if (box) applyServer({ requests: box.requests, sent: box.sent, friends: box.friends.map((f) => f.code) }, startedAt, box.friends);
    const known = new Set(box?.friends.map((f) => f.code) ?? []);
    for (const pal of loadPals().filter((p) => !known.has(p.code) && !p.pending)) {
      const card = await fetchFriendCard(pal.code).catch(() => undefined);
      if (card === undefined) break;
      if (card) freshenCard(card);
    }
  } finally {
    const wait = MIN_REFRESH_MS - (Date.now() - startedAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    publish({ refreshing: false });
  }
}

let shareTimer: ReturnType<typeof setTimeout> | undefined;
let shared = '';

/** Puts this phone's campaign on its friend card, a few seconds after it changes, so friends can see how it's going. Only once there's a code. */
export function shareCampaignSoon(): void {
  const code = myPalCode();
  if (!code) return;
  clearTimeout(shareTimer);
  shareTimer = setTimeout(() => {
    const { name, emoji } = loadProfile();
    const card = campaignCard(getCampaign(), Date.now());
    const key = `${card.chips}/${card.peak}/${card.wins}`;
    if (!name || key === shared) return;
    updateFriendCard(code, { deviceId: loadDeviceId(), name, emoji, campaign: card }).then(
      (ok) => ok && (shared = key),
      () => undefined,
    );
  }, 4000);
}
