import { Directory, File, Paths } from 'expo-file-system';
import { PixelRatio, Platform } from 'react-native';

import { gameLook, gameThumb } from '@design/gameArt';
import { VARIANTS, type Variant } from '@/engine';

/**
 * Saved pictures of the game tiles (`GameThumb`), kept in the phone's cache folder between launches.
 *
 * A tile is an SVG (cards, letters, suits) and Home, the setup game row and the Party tab's belts show dozens of
 * them; iOS draws every one the first time it appears, which made launch and the Party tab's first visit heavy.
 * Once a tile at a size has been drawn, `ThumbSnapper` (in the root layout) photographs it off screen and saves it
 * here, and every tile at that size after that is a plain image. The folder's name carries a fingerprint of the
 * game art, so changing a picture or adding a game makes new ones. iOS only: the web build keeps drawing SVGs.
 */

export const SNAPS_ON = Platform.OS === 'ios';

/** A short fingerprint of everything a tile is drawn from, so new art never shows an old picture. */
function fingerprint(): string {
  const text = JSON.stringify([PixelRatio.get(), VARIANTS.map((v) => [v.id, gameThumb(v.id), gameLook(v.id).card])]);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

let dir: Directory | null = null;
function folder(): Directory | null {
  if (!SNAPS_ON) return null;
  if (dir) return dir;
  try {
    dir = new Directory(Paths.cache, `tiles-${fingerprint()}`);
    dir.create({ idempotent: true, intermediates: true });
  } catch {
    dir = null;
  }
  return dir;
}

export interface TileSpec {
  variant: Variant;
  size: number;
  rounded: number;
}

export const tileKey = (s: TileSpec) => `${s.variant}-${Math.round(s.size)}-${Math.round(s.rounded)}`;

/** Known answers: the picture's uri, or null when there isn't one yet. Checked on disk once per tile per launch. */
const known = new Map<string, string | null>();
/** Tiles that were drawn as SVG and should be photographed. */
const wanted = new Map<string, TileSpec>();
/** Tiles whose photo failed this launch: drawn as SVG, never asked for again until the next launch. */
const gaveUp = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

export function subscribeTiles(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}
export const tilesVersion = () => version;
// Tiles are asked for while a screen is drawing, so listeners hear about it just after, once per batch.
let pending = false;
const changed = () => {
  if (pending) return;
  pending = true;
  setTimeout(() => {
    pending = false;
    version++;
    listeners.forEach((f) => f());
  }, 0);
};

/** The saved picture for this tile, or null. On a miss the tile is queued to be photographed. */
export function tilePicture(spec: TileSpec): string | null {
  const d = folder();
  if (!d) return null;
  const key = tileKey(spec);
  if (!known.has(key)) {
    try {
      const f = new File(d, `${key}.png`);
      known.set(key, f.exists ? f.uri : null);
    } catch {
      known.set(key, null);
    }
  }
  const uri = known.get(key) ?? null;
  if (!uri && !wanted.has(key) && !gaveUp.has(key)) {
    wanted.set(key, spec);
    changed();
  }
  return uri;
}

/** The tiles waiting to be photographed. */
export const wantedTiles = (): TileSpec[] => [...wanted.values()];

/** Keeps a photographed tile (`tmp` is the file react-native-view-shot made). */
export function keepTile(spec: TileSpec, tmp: string): void {
  const d = folder();
  const key = tileKey(spec);
  wanted.delete(key);
  if (!d) return;
  try {
    const target = new File(d, `${key}.png`);
    new File(tmp).moveSync(target, { overwrite: true });
    known.set(key, target.uri);
  } catch {
    // Not saved: it stays a drawn tile, and isn't asked for again this launch.
    gaveUp.add(key);
  }
}

/** Gives up on a tile for this launch (the photo failed). */
export function dropTile(spec: TileSpec): void {
  wanted.delete(tileKey(spec));
  gaveUp.add(tileKey(spec));
}

/** Whether every game has a picture at this size and corner (for the Party belts, which swap all at once). */
export function allTiles(size: number, rounded: number): boolean {
  return VARIANTS.every((v) => !!tilePicture({ variant: v.id, size, rounded }));
}

/** After a batch has been saved, tell the snapper and anyone waiting on a set (the Party belts). */
export const tilesSaved = changed;
