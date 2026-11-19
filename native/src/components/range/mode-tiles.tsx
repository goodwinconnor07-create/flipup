// Range training's other ways to train, under today's hand on the Train tab: three tiles in a row, built like Play's
// game tiles (`GameTile` in game-tile.tsx): the square sticker picture on its flat field (src/design/trainArt.ts,
// drawn with the games' own shapes), the name in white rounded capitals on a band in a darker shade of the field, and
// the same ink-and-yellow crown on what needs Premium. Today's hand isn't one of them: it's the card above
// (`DailyCard` in train-home.tsx), the one thing to do each day (19 Nov 2026, the owner's pick from a mock-up).
//  - Endless: hand after hand until you stop (Premium).
//  - Sets: five hands, scored at the end (Premium).
//  - Gaps: a set built from the spots you miss (Premium). Until you've missed some, it waits, dimmed.
import type { ReactNode } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Svg from 'react-native-svg';

import { TRAIN_LOOK, trainThumb, type TrainMode } from '@design/trainArt';
import { draw } from '@/components/game-picture';
import { tileHeight } from '@/components/game-tile';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ROUNDED, spacing, useShadows } from '@/theme';

export type { TrainMode };

type OtherMode = Exclude<TrainMode, 'daily'>;

const MODES: Record<OtherMode, { name: string; hook: string }> = {
  endless: { name: 'Endless', hook: 'Hand after hand' },
  sets: { name: 'Sets', hook: 'Five, scored' },
  gaps: { name: 'Gaps', hook: 'Spots you miss' },
};

const ORDER: OtherMode[] = ['endless', 'sets', 'gaps'];
const GAP = 10;

/**
 * Endless, Sets and Gaps in one row under "Keep training". Without Premium, `veil` (the blurred lock, `LockVeil`) lies
 * over the whole row, as it does over Home's Host button, and the tiles drop their own crowns. `gapsWaiting` dims Gaps and says it comes after a few hands (nothing missed yet to build it from), and with Premium
 * it can't be tapped until then. A tap goes through `onPick`, which starts the mode or opens the offer.
 */
export function ModeTiles({ veil, gapsWaiting, onPick }: { veil?: ReactNode; gapsWaiting: boolean; onPick: (mode: OtherMode) => void }) {
  const locked = !!veil;
  const { width } = useWindowDimensions();
  const tile = Math.min(170, Math.floor((Math.min(width, 560 + spacing.md * 2) - spacing.md * 2 - GAP * 2) / 3));
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="title3" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800', paddingHorizontal: spacing.xxs }}>
        Keep training
      </ThemedText>
      {/* The veil covers the tiles and their lines; the row clips its corners. Under it the tiles are hidden from VoiceOver. */}
      <View style={locked ? { borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden' } : undefined}>
      <View accessibilityElementsHidden={locked} importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'} style={{ flexDirection: 'row', justifyContent: 'center', gap: GAP }}>
        {ORDER.map((m) => {
          const waiting = m === 'gaps' && gapsWaiting;
          const hook = waiting ? 'After a few hands' : MODES[m].hook;
          return (
            <View key={m} style={{ width: tile, gap: 6 }}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${MODES[m].name}. ${hook}.${locked ? ' Premium.' : ''}`}
                accessibilityState={{ disabled: waiting && !locked }}
                onPress={waiting && !locked ? undefined : () => onPick(m)}
              >
                <View style={{ opacity: waiting ? 0.45 : 1 }}>
                  <ModeTile mode={m} width={tile} />
                </View>
              </PressableScale>
              <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ textAlign: 'center' }}>
                {hook}
              </ThemedText>
            </View>
          );
        })}
      </View>
      {veil}
      </View>
    </View>
  );
}

/** One mode as a tile: `GameTile`'s shape, band and type, with the mode's own picture and colours. */
function ModeTile({ mode, width }: { mode: OtherMode; width: number }) {
  const shadows = useShadows();
  const look = TRAIN_LOOK[mode];
  const height = tileHeight(width);
  const corner = Math.round(width * 0.2);
  const band = Math.round(width * 0.27);
  return (
    // The shadow sits on the outer view: iOS drops the shadow of a view that clips.
    <View style={{ width, height, borderRadius: corner, borderCurve: 'continuous', boxShadow: shadows.card }}>
      <View style={{ width, height, borderRadius: corner, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: look.field }}>
        <Svg width={width} height={width} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {trainThumb(mode).map(draw)}
        </Svg>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: band, paddingHorizontal: Math.round(width * 0.06), alignItems: 'center', justifyContent: 'center', backgroundColor: look.band }}>
          <Text
            maxFontSizeMultiplier={1.15}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{ fontFamily: ROUNDED, fontSize: Math.max(10, Math.min(17, width * 0.1)), lineHeight: Math.max(11, Math.min(19, width * 0.112)), fontWeight: '800', letterSpacing: 0.4, textAlign: 'center', textTransform: 'uppercase', color: '#ffffff' }}
          >
            {MODES[mode].name}
          </Text>
        </View>
      </View>
    </View>
  );
}
