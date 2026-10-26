// Your friends' AI twins, kept on this phone. Two sources feed each one:
//  - the twin they share (a code you add, or the code on their seat at a table): their own counters,
//    cards and all, refreshed whenever you open the list;
//  - what you've seen of them at online tables you shared: their moves counted from outside, with no
//    cards, so only the numbers that don't need them.
// The shared twin wins when it has learned enough; the seen one fills in until it has.

import { addObservedHand, emptyTwin, sanitizeTwin, TWIN_READY, type HandRecord, type TwinProfile } from '../game';
import { fetchSharedTwin } from './api';
import { read, write } from './persist';

const KEY = 'flipup.friends';
const REMOVED = 'flipup.friends.removed';
/** Hands seen at tables before a friend's twin is worth playing (their cards are never seen, so it's a rougher copy). */
export const SEEN_READY = 30;
/** A shared twin is looked at again when it's older than this. */
const STALE_MS = 60 * 60_000;

export interface Friend {
  /** Their twin code: who they are across tables. */
  code: string;
  name: string;
  emoji: string;
  /** The twin they share, as last fetched. */
  shared: { profile: TwinProfile; at: number; updatedAt: number } | null;
  /** The code stopped working (they stopped sharing, or it ran out) the last time we looked. */
  gone?: boolean;
  /** Counted from hands at online tables with them. */
  seen: TwinProfile;
  addedAt: number;
  /** How many games you've played against their twin. */
  plays: number;
}

function clean(raw: unknown): Friend | null {
  const f = raw as Partial<Friend> | null;
  if (!f || typeof f.code !== 'string' || typeof f.name !== 'string' || typeof f.emoji !== 'string') return null;
  const shared = f.shared && typeof f.shared === 'object' ? { profile: sanitizeTwin(f.shared.profile), at: Number(f.shared.at) || 0, updatedAt: Number(f.shared.updatedAt) || 0 } : null;
  return { code: f.code, name: f.name, emoji: f.emoji, shared: shared && shared.profile.hands > 0 ? shared : null, ...(f.gone ? { gone: true } : {}), seen: sanitizeTwin(f.seen), addedAt: Number(f.addedAt) || 0, plays: Number(f.plays) || 0 };
}

export function loadFriends(): Friend[] {
  const all = read<unknown[]>(KEY);
  return Array.isArray(all) ? all.map(clean).filter((f): f is Friend => !!f) : [];
}

function save(friends: Friend[]): void {
  write(KEY, friends.slice(-40));
}

export const loadFriend = (code: string) => loadFriends().find((f) => f.code === code) ?? null;

/** Codes of friends you've removed, so sitting at a table with them doesn't add them back. */
function removedCodes(): string[] {
  const r = read<string[]>(REMOVED);
  return Array.isArray(r) ? r.filter((x) => typeof x === 'string') : [];
}

function put(friend: Friend): void {
  const friends = loadFriends().filter((f) => f.code !== friend.code);
  save([...friends, friend]);
}

/** Looks a code up and adds that friend (or refreshes them). Throws with a plain message when there's no such twin. */
export async function addFriendByCode(code: string): Promise<Friend> {
  const twin = await fetchSharedTwin(code);
  if (!twin) throw new Error('No twin with that code. Check it with your friend.');
  write(REMOVED, removedCodes().filter((c) => c !== code));
  const have = loadFriend(code);
  const friend: Friend = {
    code,
    name: twin.name,
    emoji: twin.emoji,
    shared: { profile: twin.profile, at: Date.now(), updatedAt: twin.updatedAt },
    seen: have?.seen ?? emptyTwin(),
    addedAt: have?.addedAt ?? Date.now(),
    plays: have?.plays ?? 0,
  };
  put(friend);
  return friend;
}

/** Fetches a friend's twin again. If the code has stopped working, what you have is kept and marked. */
export async function refreshFriend(code: string): Promise<void> {
  const have = loadFriend(code);
  if (!have) return;
  const twin = await fetchSharedTwin(code);
  if (!twin) return put({ ...have, gone: true });
  put({ ...have, name: twin.name, emoji: twin.emoji, shared: { profile: twin.profile, at: Date.now(), updatedAt: twin.updatedAt }, gone: undefined });
}

/** Quietly refreshes every friend whose copy is more than an hour old. Never throws. */
export async function refreshStale(now = Date.now()): Promise<void> {
  for (const f of loadFriends()) {
    if (f.gone || (f.shared && now - f.shared.at < STALE_MS)) continue;
    try {
      await refreshFriend(f.code);
    } catch {
      // Offline: try again next time.
    }
  }
}

export function removeFriend(code: string): void {
  save(loadFriends().filter((f) => f.code !== code));
  write(REMOVED, [...removedCodes().filter((c) => c !== code), code].slice(-40));
}

/** One more game played against a friend's twin. */
export function notePlayed(code: string): void {
  const f = loadFriend(code);
  if (f) put({ ...f, plays: f.plays + 1 });
}

/**
 * A hand from an online table: count each friend at it who shows a twin code. Someone new (and not
 * removed before) is added as a name and a picture, and their shared twin is fetched in the background.
 */
export function observeHand(record: HandRecord, key: string, myId: string): void {
  const removed = removedCodes();
  for (const p of record.players) {
    if (p.id === myId || !p.twinCode || removed.includes(p.twinCode)) continue;
    const have = loadFriend(p.twinCode);
    const friend: Friend = have ?? { code: p.twinCode, name: p.name, emoji: p.emoji, shared: null, seen: emptyTwin(), addedAt: Date.now(), plays: 0 };
    if (!addObservedHand(friend.seen, record, p.id, key) && have) continue;
    put(have ? { ...friend, name: have.shared ? have.name : p.name, emoji: have.shared ? have.emoji : p.emoji } : friend);
    // Someone met at a table: get the twin they share too.
    if (!have) void addFriendByCode(p.twinCode).catch(() => undefined);
  }
}

export type TwinSource = 'shared' | 'seen';

export interface FriendTwin {
  profile: TwinProfile;
  source: TwinSource;
  hands: number;
  /** Enough to play against. */
  ready: boolean;
}

/** The twin to play and scout: theirs if it has learned enough, otherwise what you've seen of them. */
export function bestTwin(f: Friend): FriendTwin | null {
  if (f.shared && f.shared.profile.hands >= TWIN_READY) return { profile: f.shared.profile, source: 'shared', hands: f.shared.profile.hands, ready: true };
  if (f.seen.hands >= SEEN_READY) return { profile: f.seen, source: 'seen', hands: f.seen.hands, ready: true };
  if (f.shared) return { profile: f.shared.profile, source: 'shared', hands: f.shared.profile.hands, ready: false };
  if (f.seen.hands > 0) return { profile: f.seen, source: 'seen', hands: f.seen.hands, ready: false };
  return null;
}
