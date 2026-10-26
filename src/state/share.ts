// Sharing your AI twin with friends: the switch in Settings, the code, and keeping the shared copy
// fresh. Off by default. While it's on, a copy of your twin's habit counters (no cards, no hands) sits
// on the server under a five letter code, and your seat at an online table shows the code so friends
// at the table can tell who's who.

import { newIdempotencyKey, shareableTwin, TWIN_READY } from '../game';
import { createTwinShare, deleteTwinShare, UnsureError, updateTwinShare } from './api';
import { loadDeviceId, loadProfile, read, write } from './persist';
import { loadTwin } from './twin';

const KEY = 'flipup.share';
/** At least this many new hands between quiet refreshes mid-game. */
const EVERY_HANDS = 25;

export interface Share {
  code: string;
  /** Only this phone has it: it's what lets it change or stop the share. */
  secret: string;
  /** How many hands the twin had learned from when it was last sent. */
  hands: number;
  at: number;
}

export function loadShare(): Share | null {
  const s = read<Share>(KEY);
  return s && typeof s.code === 'string' && typeof s.secret === 'string' && typeof s.hands === 'number' ? { code: s.code, secret: s.secret, hands: s.hands, at: typeof s.at === 'number' ? s.at : 0 } : null;
}

/** The code to show at an online table: only while sharing is on. */
export const shareCode = () => loadShare()?.code;

/** The idempotency key of a share that may or may not have been made, so turning it on again can't make a second one. */
let shareAttempt: string | null = null;

/** Turns sharing on: copies your twin to the server and returns the code. */
export async function startSharing(): Promise<Share> {
  const have = loadShare();
  if (have) return have;
  const twin = loadTwin();
  if (twin.hands < 1) throw new Error('Play a few hands first, then your twin has something to share.');
  const profile = loadProfile();
  shareAttempt ??= newIdempotencyKey();
  let made;
  try {
    made = await createTwinShare({ deviceId: loadDeviceId(), name: profile.name, emoji: profile.emoji, profile: shareableTwin(twin) }, shareAttempt);
  } catch (e) {
    // With no answer the share might exist: the next try carries the same key. Any other failure starts over.
    if (!(e instanceof UnsureError)) shareAttempt = null;
    throw e;
  }
  shareAttempt = null;
  const share = { code: made.code, secret: made.secret, hands: twin.hands, at: Date.now() };
  write(KEY, share);
  return share;
}

/** Turns sharing off and deletes the copy on the server. Friends keep what they already downloaded. */
export async function stopSharing(): Promise<void> {
  const share = loadShare();
  if (!share) return;
  await deleteTwinShare(share.code, share.secret);
  write(KEY, null);
}

/**
 * Sends your twin's latest numbers (and your name and picture) if sharing is on. `force` sends even when
 * nothing new has been learned, such as after changing your picture. Failures are quiet: it tries again
 * next time.
 */
export async function syncShare(force = false): Promise<void> {
  const share = loadShare();
  if (!share) return;
  const twin = loadTwin();
  if (!force && twin.hands === share.hands) return;
  const profile = loadProfile();
  try {
    const kept = await updateTwinShare(share.code, { secret: share.secret, name: profile.name, emoji: profile.emoji, profile: shareableTwin(twin) });
    // It expired while this phone was away: start it again (friends' copies stay, but get a new code to refresh from).
    if (!kept) {
      write(KEY, null);
      await startSharing();
      return;
    }
    write(KEY, { ...share, hands: twin.hands, at: Date.now() });
  } catch {
    // Offline or busy: next time.
  }
}

let queued: ReturnType<typeof setTimeout> | undefined;

/** A name or picture change: sent once things settle, not on every tap. */
export function queueSync(): void {
  if (!loadShare()) return;
  clearTimeout(queued);
  queued = setTimeout(() => void syncShare(true), 1500);
}

/** Called after each hand: a refresh every so often during a long game. */
export function maybeSyncShare(): void {
  const share = loadShare();
  if (!share) return;
  if (loadTwin().hands - share.hands >= EVERY_HANDS) void syncShare();
}

/** Friends can only play a twin that has learned enough; this is what the Settings text promises. */
export const SHARE_READY = TWIN_READY;
