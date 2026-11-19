// Range training's other ways to train, under today's hand on the Train tab: three tiles in a row, built like Play's
// game tiles (`GameTile` in game-tile.tsx): the square sticker picture on its flat field (src/design/trainArt.ts,
// drawn with the games' own shapes), the name in white rounded capitals on a band in a darker shade of the field, and
// the same ink-and-yellow crown on what needs Premium. Today's hand isn't one of them: it's the card above
// (`DailyCard` in train-home.tsx), the one thing to do each day (19 Nov 2026, the owner's pick from a mock-up).
//  - Endless: hand after hand until you stop (Premium).
//  - Sets: five hands, scored at the end (Premium).
//  - Gaps: a set built from the spots you miss (Premium). Until you've missed some, it waits, dimmed.
import { Text, useWindowDimensions, View } from 'react-native';
import Svg from 'react-native-svg';

import { INK } from '@design/gameArt';
import { TRAIN_LOOK, trainThumb, type TrainMode } from '@design/trainArt';
import { draw } from '@/components/game-picture';
import { tileHeight } from '@/components/game-tile';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { party, ROUNDED, spacing, useShadows } from '@/theme';

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
 * Endless, Sets and Gaps in one row under "Keep training". `locked` puts a crown on each (they need Premium);
 * `gapsWaiting` dims Gaps and says it comes after a few hands (nothing missed yet to build it from), and with Premium
 * it can't be tapped until then. A tap goes through `onPick`, which starts the mode or opens the offer.
 */
export function ModeTiles({ locked, gapsWaiting, onPick }: { locked: boolean; gapsWaiting: boolean; onPick: (mode: OtherMode) => void }) {
  const { width } = useWindowDimensions();
  const tile = Math.min(170, Math.floor((Math.min(width, 560 + spacing.md * 2) - spacing.md * 2 - GAP * 2) / 3));
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="title3" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800', paddingHorizontal: spacing.xxs }}>
        Keep training
      </ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: GAP }}>
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
                  <ModeTile mode={m} width={tile} locked={locked} />
                </View>
              </PressableScale>
              <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ textAlign: 'center' }}>
                {hook}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** One mode as a tile: `GameTile`'s shape, band, type and badges, with the mode's own picture and colours. */
function ModeTile({ mode, width, locked }: { mode: OtherMode; width: number; locked: boolean }) {
  const shadows = useShadows();
  const look = TRAIN_LOOK[mode];
  const height = tileHeight(width);
  const corner = Math.round(width * 0.2);
  const band = Math.round(width * 0.27);
  const badge = Math.max(22, Math.round(width * 0.21));
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
        {locked && (
          <View style={{ position: 'absolute', top: 6, right: 6, width: badge, height: badge, borderRadius: badge / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: INK }}>
            <Icon name="crown.fill" size={badge * 0.5} color={party.yellow} />
          </View>
        )}
      </View>
    </View>
  );
}
