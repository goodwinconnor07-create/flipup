// Power Cards: while a power is played the table stops (1.8s, `MOMENT_TIMING.power`) and everyone sees it here, a
// banner along the bottom of the felt, over the hand's name, so the board stays in view (a Reroll's new card, an Extra
// Card): the power's picture and who played it on whom. A Peek or X-ray you played also shows the card it showed you
// (nobody else is sent it). It sits over the felt, so nothing on the table moves.
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { type Game } from '@/engine';
import { EASE_OUT, popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { powerBanner } from '@/state/power-view';
import { brand, motion } from '@/theme';

import { PlayingCard } from './playing-card';
import { useMomentNow } from './use-moment';

export function PowerBanner({ game, meId }: { game: Game; meId: string | undefined }) {
  const reduce = useReduceMotion();
  const now = useMomentNow(game);
  const b = powerBanner(game, meId, now);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 }}>
      {b && (
        <Animated.View
          key={b.key}
          accessibilityRole="text"
          accessibilityLiveRegion="assertive"
          accessibilityLabel={b.text}
          entering={reduce ? FadeIn.duration(motion.base).easing(EASE_OUT) : popIn()}
          exiting={FadeOut.duration(motion.exit).easing(EASE_OUT)}
          style={{
            maxWidth: '82%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 6,
            paddingLeft: 10,
            paddingRight: 14,
            borderRadius: 20,
            borderCurve: 'continuous',
            borderWidth: 1.5,
            borderColor: 'rgba(245,183,0,0.85)',
            backgroundColor: 'rgba(8,20,51,0.94)',
            boxShadow: '0 10px 30px -8px rgba(0,0,0,0.6), 0 0 18px rgba(245,183,0,0.35)',
          }}
        >
          <Text maxFontSizeMultiplier={1} accessible={false} style={{ fontSize: 26, lineHeight: 32 }}>
            {b.emoji}
          </Text>
          <View style={{ flexShrink: 1, gap: 2 }}>
            <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={{ fontSize: 15, lineHeight: 19, fontWeight: '800', color: '#ffffff' }}>
              {b.text}
            </Text>
            {b.seen && (
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, lineHeight: 16, fontWeight: '700', color: brand.gold }}>
                Only you see this
              </Text>
            )}
          </View>
          {b.seen && <PlayingCard card={b.seen} width={28} flip />}
        </Animated.View>
      )}
    </View>
  );
}
