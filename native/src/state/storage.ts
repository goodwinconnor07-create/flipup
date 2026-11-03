// Settings and small records kept on the phone, as JSON under `flipup.*` keys (the same names the web app uses).
// expo-sqlite's localStorage on iPhone; the browser's own on the web build. Writes tell anyone listening.
import 'expo-sqlite/localStorage/install';
import { useSyncExternalStore } from 'react';

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();
const cache = new Map<string, unknown>();

/** A stored value read once, outside a component. */
export function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value = fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) value = JSON.parse(raw) as T;
  } catch {
    // A broken or blocked value reads as the default.
  }
  cache.set(key, value);
  return value;
}

export function save<T>(key: string, value: T | null): void {
  cache.delete(key);
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the app still works for this visit.
    if (value !== null) cache.set(key, value);
  }
  listeners.get(key)?.forEach((fn) => fn());
}

/** Calls `fn` whenever `key` is saved. Returns the way to stop. */
export function subscribe(key: string, fn: Listener): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(fn);
  return () => listeners.get(key)?.delete(fn);
}

/** A stored value that redraws whoever reads it when it changes. */
export function useStored<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    (fn) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(fn);
      return () => listeners.get(key)?.delete(fn);
    },
    () => read(key, fallback),
  );
}

/**
 * Deletes every `flipup.*` value on this phone except the ones named ("Delete my data"). Anyone reading one of them
 * redraws with its default.
 */
export function wipeAll(keep: readonly string[]): void {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('flipup.') && !keep.includes(k)) keys.push(k);
    }
  } catch {
    // Storage blocked: nothing to delete.
  }
  for (const k of new Set([...keys, ...[...cache.keys()].filter((k) => k.startsWith('flipup.') && !keep.includes(k))])) save(k, null);
}
