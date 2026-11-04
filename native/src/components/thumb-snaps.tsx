import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { GameThumb } from '@/components/game-picture';
import { VARIANTS, type Variant } from '@/engine';
import { radius } from '@/theme';

/**
 * Pictures of the game tiles, taken once per launch so the Party tab's belts can show plain images.
 *
 * Each tile is an SVG (cards, letters, suits) and the belts show about sixty of them; iOS draws them all the first
 * time the tab appears, which made the first visit stutter as the belts started moving. `ThumbSnapper` (on Home)
 * draws each game's tile off screen once the app has settled, saves it as a PNG, and `useThumbSnaps()` hands the
 * files out. Until they're ready (and on the web build, which has no pictures) the belts draw the SVGs as before.
 */

/** The Party tab's tile size for a screen this tall: bigger on taller phones, so the belts fill the poster. */
export const partyTile = (height: number, gap = 12) => Math.round(Math.max(76, Math.min(112, (height * 0.4 - gap * 2) / 3)));

type Snaps = Partial<Record<Variant, string>>;
let snaps: { size: number; files: Snaps } = { size: 0, files: {} };
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const EMPTY: Snaps = {};

/** The saved tile pictures at `size`, once every game has one (an empty object until then). */
export function useThumbSnaps(size: number): Snaps {
  const now = useSyncExternalStore(subscribe, () => snaps);
  return now.size === size && Object.keys(now.files).length === VARIANTS.length ? now.files : EMPTY;
}

/** Draws every game's tile off screen once the app has settled, and saves each as a picture. Mounted on Home. */
export function ThumbSnapper({ size }: { size: number }) {
  const [draw, setDraw] = useState(false);
  const refs = useRef<Partial<Record<Variant, unknown>>>({});
  const busy = useRef(false);
  const done = snaps.size === size;
  useEffect(() => {
    if (Platform.OS !== 'ios' || done) return;
    // Wait for the launch to finish and the first screen to settle, so this never competes with it.
    const t = setTimeout(() => setDraw(true), 1500);
    return () => clearTimeout(t);
  }, [done]);
  if (!draw || done) return null;
  const snap = async () => {
    if (busy.current) return;
    busy.current = true;
    const files: Snaps = {};
    try {
      for (const v of VARIANTS) {
        const ref = refs.current[v.id];
        if (!ref) return;
        files[v.id] = await captureRef(ref as never, { format: 'png', quality: 1, result: 'tmpfile' });
      }
      snaps = { size, files };
      listeners.forEach((f) => f());
    } catch {
      // No pictures: the belts keep drawing the tiles themselves.
    } finally {
      setDraw(false);
    }
  };
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Off screen, but laid out and drawn. Waits a frame after layout so every tile has been drawn.
      onLayout={() => requestAnimationFrame(() => void snap())}
      style={{ position: 'absolute', left: -10_000, top: 0, flexDirection: 'row' }}
    >
      {VARIANTS.map((v) => (
        <View
          key={v.id}
          collapsable={false}
          ref={(r) => {
            refs.current[v.id] = r ?? undefined;
          }}
          style={{ width: size, height: size }}
        >
          <GameThumb variant={v.id} size={size} rounded={radius.lg} />
        </View>
      ))}
    </View>
  );
}
