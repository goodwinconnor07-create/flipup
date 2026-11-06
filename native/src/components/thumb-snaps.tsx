import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { DrawnThumb } from '@/components/game-picture';
import { dropTile, keepTile, SNAPS_ON, subscribeTiles, tileKey, tilesSaved, tilesVersion, wantedTiles, type TileSpec } from '@/components/thumb-cache';

/** The Party tab's tile size for a screen this tall: bigger on taller phones, so the belts fill the poster. */
export const partyTile = (height: number, gap = 12) => Math.round(Math.max(76, Math.min(112, (height * 0.4 - gap * 2) / 3)));

/** At most this many tiles are drawn off screen at once, so a batch never costs a noticeable frame. */
const BATCH = 6;

/**
 * Photographs the game tiles that were drawn as SVG (see thumb-cache.ts), a few at a time, off screen, once the
 * app has settled. Mounted once, in the root layout. Does nothing on the web build.
 */
export function ThumbSnapper() {
  const version = useSyncExternalStore(subscribeTiles, tilesVersion, tilesVersion);
  const [ready, setReady] = useState(false);
  const [batch, setBatch] = useState<TileSpec[]>([]);
  const refs = useRef(new Map<string, unknown>());
  const busy = useRef(false);

  // Wait for the launch to finish and the first screen to settle, so this never competes with it.
  useEffect(() => {
    if (!SNAPS_ON) return;
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Pick the next few tiles whenever there are some waiting and nothing is being photographed.
  useEffect(() => {
    if (!ready || batch.length || busy.current) return;
    const next = wantedTiles().slice(0, BATCH);
    if (!next.length) return;
    const t = setTimeout(() => setBatch(next), 250);
    return () => clearTimeout(t);
  }, [ready, version, batch.length]);

  if (!batch.length) return null;
  const snap = async () => {
    if (busy.current) return;
    busy.current = true;
    for (const spec of batch) {
      const ref = refs.current.get(tileKey(spec));
      try {
        if (!ref) throw new Error('not drawn');
        keepTile(spec, await captureRef(ref as never, { format: 'png', quality: 1, result: 'tmpfile' }));
      } catch {
        dropTile(spec);
      }
    }
    busy.current = false;
    setBatch([]);
    tilesSaved();
  };
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Off screen, but laid out and drawn. Waits a frame after layout so every tile has been drawn.
      onLayout={() => requestAnimationFrame(() => void snap())}
      style={{ position: 'absolute', left: -10_000, top: 0, flexDirection: 'row', alignItems: 'flex-start' }}
    >
      {batch.map((spec) => (
        <View
          key={tileKey(spec)}
          collapsable={false}
          ref={(r) => {
            refs.current.set(tileKey(spec), r ?? undefined);
          }}
          style={{ width: spec.size, height: spec.size }}
        >
          <DrawnThumb variant={spec.variant} size={spec.size} rounded={spec.rounded} />
        </View>
      ))}
    </View>
  );
}
