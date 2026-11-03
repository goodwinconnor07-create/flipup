// Friends. Each phone has a username it chooses (unique, changeable once a month) over a hidden six-digit friend
// code (a name and a picture on the server, no account). Typing someone's username sends them a friend request;
// once they accept, you're on each other's list. Friendships are kept by code, so a new username keeps them. The server keeps the
// list, the requests and the table invites; this phone keeps a copy (`flipup.pals`, `flipup.friendbox`) and checks
// for news every 15 seconds while the app is open (`useFriendWatch()`). Friends can invite each other to a table.
import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { BjInvite, FriendRequest } from '@/engine';

import { normalizeUsername, USERNAME_CHANGE_MS } from '@/engine';

import { answerFriend, createFriendCard, fetchInbox, findUsername, inviteToTable, requestFriend, setUsernameOnServer, unfriendOnServer, updateFriendCard } from './api';
import { deviceId } from './device';
import { read, save, useStored } from './storage';

const KEY = 'flipup.pals';
const MINE = 'flipup.palcode';
const BOX = 'flipup.friendbox';
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
const savePals = (pals: Pal[]): void => save(KEY, pals.slice(-200));

/** Your friends, oldest first. Redraws when the list changes. */
export function usePals(): Pal[] {
  return clean(useStored<unknown>(KEY, EMPTY));
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

/**
 * Makes sure this phone has a friend code (and that the server has its latest name and picture). A phone with one
 * of the old five-letter codes gets a number instead, so friend codes never look like game codes.
 */
export async function ensureMyCode(): Promise<string> {
  const { name = '', emoji = '' } = profile();
  const body = { deviceId: deviceId(), name, emoji };
  const have = myPalCode();
  if (have && numeric(have) && (await updateFriendCard(have, body))) return have;
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
  return { status: await sendFriendRequest(card.code), name: card.name };
}

/** Sends a friend request to a friend code (a party board's + Friend). Throws with a plain sentence when it can't. */
export async function sendFriendRequest(code: string): Promise<'sent' | 'friends'> {
  const mine = await ensureMyCode();
  if (code === mine) throw new Error("That's your own code.");
  if (isPal(code)) return 'friends';
  const status = await requestFriend(code, { deviceId: deviceId(), fromCode: mine });
  if (status === 'friends') await syncFriends();
  return status;
}

/** Yes or no to a friend request. */
export async function answerRequest(from: string, accept: boolean): Promise<void> {
  const mine = myPalCode();
  if (!mine) return;
  const box = read<FriendBox | null>(BOX, null) ?? NO_BOX;
  save(BOX, { ...box, requests: box.requests.filter((r) => r.from !== from) });
  await answerFriend(mine, { deviceId: deviceId(), from, accept });
  await syncFriends();
}

/** Ends a friendship, for both of you. */
export async function removePal(code: string): Promise<void> {
  const mine = myPalCode();
  savePals(loadPals().filter((p) => p.code !== code));
  if (mine) await unfriendOnServer(mine, { deviceId: deviceId(), other: code });
}

/** Asks friends to your poker table. Returns how many invites went out. */
export async function inviteFriends(codes: string[], table: string): Promise<number> {
  if (!codes.length) return 0;
  const mine = await ensureMyCode();
  const sent = await Promise.allSettled(codes.map((c) => inviteToTable(c, { deviceId: deviceId(), fromCode: mine, table })));
  return sent.filter((r) => r.status === 'fulfilled').length;
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

/** Fetches the list, the requests and the invites. Never throws. */
export async function syncFriends(): Promise<void> {
  const mine = myPalCode();
  if (!mine || !numeric(mine)) return;
  try {
    const box = await fetchInbox(mine, deviceId());
    if (!box) return;
    const before = loadPals();
    savePals(box.friends.map((f) => ({ code: f.code, name: f.name, emoji: f.emoji, ...(f.username ? { username: f.username } : {}), addedAt: before.find((p) => p.code === f.code)?.addedAt ?? Date.now() })));
    const done = new Set(read<string[]>(DISMISSED, []));
    save(BOX, { requests: box.requests, invites: box.invites.filter((i) => i.kind === 'table' && !done.has(inviteKey(i))) });
  } catch {
    // Offline: keep what we had.
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

const WATCH_EVERY = 15_000;

/** Keeps friends, requests and invites fresh while the app is open: now, every 15 seconds and on coming back. */
export function useFriendWatch(): void {
  const code = useMyPalCode();
  useEffect(() => {
    if (!code) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      void (async () => {
        // An old five-letter code becomes a number before anything else.
        if (!numeric(code) && profile().name) await ensureMyCode().catch(() => undefined);
        await syncFriends();
        await moveOldPals().catch(() => undefined);
      })();
      clearInterval(timer);
      timer = setInterval(() => void syncFriends(), WATCH_EVERY);
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
