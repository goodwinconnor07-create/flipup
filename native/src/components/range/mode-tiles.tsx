// Range training's ways to train, as tiles built exactly like Play's game tiles (`GameTile` in game-tile.tsx): the
// square sticker picture on its flat field (src/design/trainArt.ts, drawn with the games' own shapes), the name in
// white rounded capitals on a band in a darker shade of the field, the same corner, band and type sizes, and the
// same ink-and-yellow crown on what needs Premium.
//  - Daily hand: one free hand a day, the same for everyone.
//  - Endless: hand after hand until you stop (Premium).
//  - Sets: five hands, scored at the end (Premium).
//  - Gaps: a set built from the spots you miss (Premium).
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

const MODES: Record<TrainMode, { name: string; hook: string }> = {
  daily: { name: 'Daily hand', hook: 'One free hand a day' },
  endless: { name: 'Endless', hook: 'Hand after hand' },
  sets: { name: 'Sets', hook: 'Five hands, scored' },
  gaps: { name: 'Gaps', hook: 'The spots you miss' },
};

const ORDER: TrainMode[] = ['daily', 'endless', 'sets', 'gaps'];

/**
 * The four modes two to a row. `locked` puts a crown on the Premium ones; `done` marks today's hand as played.
 * A tap goes through `onPick`, which starts the mode or opens the offer.
 */
export function ModeTiles({ locked, done, onPick }: { locked: boolean; done: boolean; onPick: (mode: TrainMode) => void }) {
  const { width } = useWindowDimensions();
  const tile = Math.min(220, Math.floor((Math.min(width, 560 + spacing.md * 2) - spacing.md * 2 - spacing.sm) / 2));
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="title3" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800', paddingHorizontal: spacing.xxs }}>
        Ways to train
      </ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: spacing.sm, rowGap: spacing.md }}>
        {ORDER.map((m) => (
          <View key={m} style={{ width: tile, gap: 6 }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`${MODES[m].name}. ${MODES[m].hook}.${locked && m !== 'daily' ? ' Premium.' : ''}${m === 'daily' && done ? ' Played today.' : ''}`}
              onPress={() => onPick(m)}
            >
              <ModeTile mode={m} width={tile} locked={locked && m !== 'daily'} tag={m === 'daily' ? (done ? 'PLAYED' : locked ? 'FREE' : 'TODAY') : undefined} />
            </PressableScale>
            <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={1} style={{ textAlign: 'center' }}>
              {MODES[m].hook}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** One mode as a tile: `GameTile`'s shape, band, type and badges, with the mode's own picture and colours. */
function ModeTile({ mode, width, locked, tag }: { mode: TrainMode; width: number; locked: boolean; tag?: string }) {
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
        {tag && (
          <View style={{ position: 'absolute', top: 6, left: 6, height: badge, paddingHorizontal: 8, borderRadius: badge / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderWidth: 2, borderColor: INK }}>
            <Text maxFontSizeMultiplier={1.1} style={{ fontFamily: ROUNDED, fontSize: Math.max(10, badge * 0.42), fontWeight: '800', letterSpacing: 0.6, color: INK }}>
              {tag}
            </Text>
          </View>
        )}
        {locked && (
          <View style={{ position: 'absolute', top: 6, right: 6, width: badge, height: badge, borderRadius: badge / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: INK }}>
            <Icon name="crown.fill" size={badge * 0.5} color={party.yellow} />
          </View>
        )}
      </View>
    </View>
  );
}
