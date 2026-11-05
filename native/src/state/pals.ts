// Friends. Each phone has a username it chooses (unique, changeable once a month) over a hidden six-digit friend
// code (a name and a picture on the server, no account). Typing someone's username sends them a friend request;
// once they accept, you're on each other's list. Friendships are kept by code, so a new username keeps them. The server keeps the
// list, the requests and the table invites; this phone keeps a copy (`flipup.pals`, `flipup.friendbox`, and the people
// you've asked in `flipup.palsent`, shown as Pending) and checks for news every 5 seconds while the app is open
// (`useFriendWatch()`: one cheap read of your own card, and the full list only when something changed). Friends can
// invite each other to a table.
import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { BjInvite, FriendRequest, InviteDeclined } from '@/engine';

import { normalizeUsername, USERNAME_CHANGE_MS } from '@/engine';

import { answerFriend, createFriendCard, declineTableInvite, fetchInbox, uninviteFromTable, findUsername, inviteToTable, pollFriendCard, requestFriend, setUsernameOnServer, unfriendOnServer, updateFriendCard, type FriendPoll } from './api';
import { deviceId } from './device';
import { read, save, useStored } from './storage';

const KEY = 'flipup.pals';
const MINE = 'flipup.palcode';
const BOX = 'flipup.friendbox';
/** People you've asked to be friends who haven't answered yet. */
const SENT = 'flipup.palsent';
/** Set once the friends kept on this phone before requests existed have been asked again. */
const MOVED = 'flipup.palsmoved';

export interface Pal {
  code: string;
  name: string;
  emoji: string;
  username?: string;
  addedAt: number;
}

export interface FriendBox {
  requests: FriendRequest[];
  invites: BjInvite[];
}

const clean = (all: unknown): Pal[] =>
  Array.isArray(all) ? (all as Pal[]).filter((p) => p && typeof p.code === 'string' && typeof p.name === 'string' && typeof p.emoji === 'string') : [];

const EMPTY: Pal[] = [];
const NO_BOX: FriendBox = { requests: [], invites: [] };
export const loadPals = (): Pal[] => clean(read<unknown>(KEY, EMPTY));
/** Saves only when the list really changed, so a poll that finds nothing new redraws nothing. */
const savePals = (pals: Pal[]): void => saveIfChanged(KEY, pals.slice(-200), loadPals());
export const loadSent = (): Pal[] => clean(read<unknown>(SENT, EMPTY));
const saveSent = (sent: Pal[]): void => saveIfChanged(SENT, sent.slice(-50), loadSent());

function saveIfChanged<T>(key: string, next: T, now: unknown): void {
  if (JSON.stringify(next) !== JSON.stringify(now)) save(key, next);
}

/** Your friends, oldest first. Redraws when the list changes. */
export function usePals(): Pal[] {
  return clean(useStored<unknown>(KEY, EMPTY));
}

/** People you've asked who haven't answered yet, oldest first: your list shows them as Pending. */
export function useSentRequests(): Pal[] {
  return clean(useStored<unknown>(SENT, EMPTY));
}

/** Friend requests and table invites waiting for you. */
export function useFriendBox(): FriendBox {
  const box = useStored<FriendBox | null>(BOX, null);
  return box && Array.isArray(box.requests) && Array.isArray(box.invites) ? box : NO_BOX;
}

export const isPal = (code: string): boolean => loadPals().some((p) => p.code === code);

/** This phone's friend code, once it has one. */
export const myPalCode = (): string | undefined => read<string | null>(MINE, null) ?? undefined;
export const useMyPalCode = (): string | null => useStored<string | null>(MINE, null);

const profile = () => read<{ name?: string; emoji?: string } | null>('flipup.profile', null) ?? {};
const numeric = (code: string) => /^\d+$/.test(code);

/** When this phone last asked for a new code to replace an old five-letter one. */
const SWAPPED = 'flipup.palcodeswap';
const SWAP_EVERY = 24 * 60 * 60 * 1000;

/**
 * Makes sure this phone has a friend code (and that the server has its latest name and picture). A phone with one
 * of the old five-letter codes asks for a number instead, so friend codes never look like game codes, but at most
 * once a day: a server that still hands out letters would otherwise get a new code on every call, and a phone soon
 * hits the limit on new codes ("Too many codes made").
 */
export async function ensureMyCode(): Promise<string> {
  const { name = '', emoji = '' } = profile();
  const body = { deviceId: deviceId(), name, emoji };
  const have = myPalCode();
  if (have) {
    const swapDue = !numeric(have) && Date.now() - read<number>(SWAPPED, 0) > SWAP_EVERY;
    if (!swapDue && (await updateFriendCard(have, body))) return have;
    if (swapDue) save(SWAPPED, Date.now());
  }
  const code = await createFriendCard(body);
  save(MINE, code);
  return code;
}

const USERNAME = 'flipup.username';

/** Your username and when you last set it. */
export function useMyUsername(): { username: string | null; nextChange: number } {
  const u = useStored<{ username: string; at: number } | null>(USERNAME, null);
  return { username: u?.username ?? null, nextChange: u ? u.at + USERNAME_CHANGE_MS : 0 };
}

/** Sets your username (making your hidden friend code first if you have none). Throws with a sentence to show. */
export async function setMyUsername(input: string): Promise<string> {
  const code = await ensureMyCode();
  const username = await setUsernameOnServer(code, { deviceId: deviceId(), username: normalizeUsername(input) });
  const had = read<{ username: string; at: number } | null>(USERNAME, null);
  if (had?.username !== username) save(USERNAME, { username, at: Date.now() });
  return username;
}

/** Sends a friend request to a username. Throws with a plain sentence when there's no such person. */
export async function requestByUsername(input: string): Promise<{ status: 'sent' | 'friends'; name: string }> {
  const username = normalizeUsername(input);
  if (username === read<{ username: string } | null>(USERNAME, null)?.username) throw new Error("That's your own username.");
  const card = await findUsername(username);
  if (!card) throw new Error('No one has that username. Check it with them.');
  return { status: await sendFriendRequest(card.code, card), name: card.name };
}

/**
 * Sends a friend request to a friend code (a party board's + Friend). The person shows on your list as Pending at
 * once (with `who`'s name and picture when known), then the list is fetched. Throws with a plain sentence when it can't.
 */
export async function sendFriendRequest(code: string, who?: { name: string; emoji: string; username?: string }): Promise<'sent' | 'friends'> {
  const mine = await ensureMyCode();
  if (code === mine) throw new Error("That's your own code.");
  if (isPal(code)) return 'friends';
  const status = await requestFriend(code, { deviceId: deviceId(), fromCode: mine });
  if (status === 'sent' && who && !loadSent().some((p) => p.code === code)) {
    saveSent([...loadSent(), { code, name: who.name, emoji: who.emoji, ...(who.username ? { username: who.username } : {}), addedAt: Date.now() }]);
  }
  await syncFriends();
  return status;
}

/** Yes or no to a friend request. */
export async function answerRequest(from: string, accept: boolean): Promise<void> {
  const mine = myPalCode();
  if (!mine) return;
  // The answer shows at once (docs/DESIGN_DIRECTION.md, Speed): the request leaves the list and, on a yes, they're on
  // your friends list straight away. If the server says no, both are put back and the error goes to the caller.
  const box = read<FriendBox | null>(BOX, null) ?? NO_BOX;
  const request = box.requests.find((r) => r.from === from);
  const pals = loadPals();
  save(BOX, { ...box, requests: box.requests.filter((r) => r.from !== from) });
  if (accept && request && !pals.some((p) => p.code === from)) {
    savePals([...pals, { code: from, name: request.name, emoji: request.emoji, username: request.username, addedAt: Date.now() }]);
  }
  try {
    await answerFriend(mine, { deviceId: deviceId(), from, accept });
  } catch (e) {
    const now = read<FriendBox | null>(BOX, null) ?? NO_BOX;
    if (request && !now.requests.some((r) => r.from === from)) save(BOX, { ...now, requests: [...now.requests, request] });
    savePals(loadPals().filter((p) => p.code !== from || pals.some((q) => q.code === from)));
    throw e;
  }
  await syncFriends();
}

/** Ends a friendship, or takes back a request still waiting, for both of you. */
export async function removePal(code: string): Promise<void> {
  const mine = myPalCode();
  savePals(loadPals().filter((p) => p.code !== code));
  saveSent(loadSent().filter((p) => p.code !== code));
  if (mine) await unfriendOnServer(mine, { deviceId: deviceId(), other: code });
}

/** Asks friends to your poker table. Returns how many invites went out. */
export async function inviteFriends(codes: string[], table: string): Promise<number> {
  if (!codes.length) return 0;
  const mine = await ensureMyCode();
  const sent = await Promise.allSettled(codes.map((c) => inviteToTable(c, { deviceId: deviceId(), fromCode: mine, table })));
  return sent.filter((r) => r.status === 'fulfilled').length;
}

/** Takes back invites to a table you're not opening after all, so the banner leaves your friends' phones. */
export async function takeBackInvites(codes: string[], table: string): Promise<void> {
  const mine = myPalCode();
  if (!mine || !codes.length) return;
  await Promise.allSettled(codes.map((c) => uninviteFromTable(c, { deviceId: deviceId(), fromCode: mine, table })));
}

/** Says no to an invite: it leaves this phone at once, and the host's "Invited…" clears on their next check. */
export function declineInvite(invite: BjInvite): void {
  dismissInvite(invite);
  const mine = myPalCode();
  if (mine && invite.kind === 'table') void declineTableInvite(mine, { deviceId: deviceId(), from: invite.from, table: invite.table }).catch(() => undefined);
}

const DECLINED = 'flipup.invitesdeclined';
const NO_DECLINED: InviteDeclined[] = [];

/** The same list, read once. */
export const loadDeclined = (): InviteDeclined[] => read<InviteDeclined[] | null>(DECLINED, null) ?? NO_DECLINED;

/** Friends who said no to your table invites lately, from the 5-second check. */
export function useDeclined(): InviteDeclined[] {
  const list = useStored<InviteDeclined[] | null>(DECLINED, null);
  return Array.isArray(list) ? list : NO_DECLINED;
}

/** An invite you've joined or turned down leaves the list on this phone. */
export function dismissInvite(invite: BjInvite): void {
  const box = read<FriendBox | null>(BOX, null) ?? NO_BOX;
  save(BOX, { ...box, invites: box.invites.filter((i) => !(i.from === invite.from && i.at === invite.at)) });
  const gone = read<string[]>(DISMISSED, []);
  save(DISMISSED, [...gone, inviteKey(invite)].slice(-50));
}

const DISMISSED = 'flipup.invitesdone';
export const inviteKey = (i: BjInvite) => `${i.from}:${i.at}`;

const asPal = (f: { code: string; name: string; emoji: string; username?: string }, before: Pal[]): Pal => ({
  code: f.code,
  name: f.name,
  emoji: f.emoji,
  ...(f.username ? { username: f.username } : {}),
  addedAt: before.find((p) => p.code === f.code)?.addedAt ?? Date.now(),
});

/** Keeps the requests and the poker-table invites you haven't joined or turned down. */
function saveBox(requests: FriendRequest[], invites: BjInvite[]): void {
  const done = new Set(read<string[]>(DISMISSED, []));
  const next: FriendBox = { requests, invites: invites.filter((i) => i.kind === 'table' && !done.has(inviteKey(i))) };
  saveIfChanged(BOX, next, read<FriendBox | null>(BOX, null));
}

/** Fetches the list, who you're waiting on, the requests and the invites. Never throws. */
export async function syncFriends(): Promise<void> {
  const mine = myPalCode();
  if (!mine || !numeric(mine)) return;
  try {
    const box = await fetchInbox(mine, deviceId());
    if (!box) return;
    const before = loadPals();
    savePals(box.friends.map((f) => asPal(f, before)));
    const friends = new Set(box.friends.map((f) => f.code));
    // A server that knows who you've asked says so; an older one doesn't, so keep this phone's own list until
    // they turn up as friends. A denied request just isn't there any more: it goes quietly.
    const sentBefore = loadSent();
    saveSent(box.sent ? box.sent.filter((f) => !friends.has(f.code)).map((f) => asPal(f, sentBefore)) : sentBefore.filter((p) => !friends.has(p.code)));
    saveBox(box.requests, box.invites);
  } catch {
    // Offline: keep what we had.
  }
}

/** Whether the cheap check found friends or asks this phone doesn't show yet (or shows and are gone). */
export function listChanged(poll: Pick<FriendPoll, 'friends' | 'sent'>, pals: Pal[], sent: Pal[]): boolean {
  const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  const friends = new Set(poll.friends);
  return !same(poll.friends, pals.map((p) => p.code)) || !same(poll.sent.filter((c) => !friends.has(c)), sent.map((p) => p.code));
}

/** When the last full fetch ran, so an older server without the cheap check isn't asked for everything every 5s. */
let lastFull = 0;
const FULL_EVERY = 15_000;

/**
 * The 5-second check: one cheap read of your own card. Requests and invites are saved straight from it; the full
 * list (every friend's card) is fetched only when someone was added, accepted, denied or removed. Never throws.
 */
let polling = false;
export async function pollFriends(): Promise<void> {
  const mine = myPalCode();
  if (!mine || !numeric(mine) || polling) return;
  polling = true;
  try {
    const poll = await pollFriendCard(mine, deviceId());
    if (poll === null) return;
    if (poll === 'old') {
      if (Date.now() - lastFull < FULL_EVERY) return;
      lastFull = Date.now();
      return syncFriends();
    }
    saveBox(poll.requests, poll.invites);
    saveIfChanged(DECLINED, poll.declined, read<InviteDeclined[] | null>(DECLINED, null) ?? NO_DECLINED);
    if (listChanged(poll, loadPals(), loadSent())) await syncFriends();
  } catch {
    // Offline: try again next time.
  } finally {
    polling = false;
  }
}

/**
 * Friends kept on this phone before requests existed: ask each of them again, once, so the list carries over when
 * they accept. Runs after this phone has a numeric code.
 */
async function moveOldPals(): Promise<void> {
  if (read<boolean>(MOVED, false)) return;
  const old = loadPals();
  save(MOVED, true);
  const mine = myPalCode();
  if (!mine || !old.length) return;
  await Promise.allSettled(old.map((p) => requestFriend(p.code, { deviceId: deviceId(), fromCode: mine })));
}

const WATCH_EVERY = 5_000;

/**
 * Keeps friends, requests and invites fresh while the app is open: the full list now and on coming back to the
 * foreground, then the cheap check every 5 seconds. Stops while the app is in the background.
 */
export function useFriendWatch(): void {
  const code = useMyPalCode();
  useEffect(() => {
    if (!code) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      void (async () => {
        // An old five-letter code becomes a number before anything else.
        if (!numeric(code) && profile().name && Date.now() - read<number>(SWAPPED, 0) > SWAP_EVERY) await ensureMyCode().catch(() => undefined);
        await syncFriends();
        await moveOldPals().catch(() => undefined);
      })();
      clearInterval(timer);
      timer = setInterval(() => void pollFriends(), WATCH_EVERY);
    };
    const stop = () => clearInterval(timer);
    start();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, [code]);
}
