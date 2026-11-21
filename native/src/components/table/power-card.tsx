// Power Cards: your power drawn as a card, beside your own two (`MyArea`). It keeps its place every hand, face down
// between hands and turned up once you're dealt one, so nothing at the bottom of the table moves. It lifts and glows
// gold on your turn when it can be played; a tap opens the power panel (`power-panel.tsx`) with what it does and,
// when it can be played, the choice it needs.
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { powerInfo, type Game } from '@/engine';
import { EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { myPower, type PowerState } from '@/state/power-view';
import { brand, gradient, motion } from '@/theme';

import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { Swap } from '../swap';

/** The gold foil round the card (the same family as the share cards' Gold Foil). */
const FOIL = 'linear-gradient(150deg, #fff1c1 0%, #f5c84b 30%, #b97a12 55%, #f7d77e 78%, #c88a1c 100%)';
/** The card's face: the app's deep blue going to night. */
const FACE = 'linear-gradient(170deg, #2557d6 0%, #163a9e 45%, #081433 100%)';

/** A power card's width for a hole card of width `hole`: a little narrower, and the same height. */
export const powerCardWidth = (hole: number) => Math.round(hole * 0.78);

const LABEL: Record<PowerState, string> = { none: '', ready: 'PLAY', waiting: 'POWER', played: 'PLAYED', out: 'POWER', over: 'POWER' };

export function PowerCard({ game, meId, width, height, onOpen }: { game: Game; meId: string | undefined; width: number; height: number; onOpen: () => void }) {
  const reduce = useReduceMotion();
  const p = myPower(game, meId);
  const ready = p.state === 'ready';
  const faded = p.state === 'played' || p.state === 'out' || p.state === 'over';
  // Ready: the card rises a little out of the row. A transform, so nothing around it moves; still under Reduce Motion.
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.set(withTiming(ready && !reduce ? -6 : 0, { duration: ready ? motion.base : motion.exit, easing: EASE_OUT }));
  }, [ready, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const lifted = useAnimatedStyle(() => ({ transform: [{ translateY: lift.get() }] }));
  const info = p.power ? powerInfo(p.power) : null;
  const radius = Math.round(width * 0.18);
  const emoji = Math.round(width * 0.46);
  const label = LABEL[p.state];
  const hand = game.hand;
  return (
    // Played, folded or over: the card fades back. On the outer view, so the press dim stays its own.
    <Animated.View style={[lifted, { opacity: faded ? 0.5 : 1 }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={info ? `Your power: ${info.name}. ${p.note}` : 'Your power card. You get one when the next hand is dealt.'}
        accessibilityHint={info ? 'Shows what it does' : undefined}
        accessibilityState={{ disabled: !info }}
        disabled={!info}
        onPress={onOpen}
        style={{
          width,
          height,
          borderRadius: radius,
          borderCurve: 'continuous',
          padding: 2.5,
          // Ready: a gold glow round it. A shadow, so nothing moves.
          boxShadow: ready ? '0 0 16px 3px rgba(245,183,0,0.6)' : '0 6px 14px -8px rgba(8,12,30,0.6)',
          ...gradient(FOIL),
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: radius - 2,
            borderCurve: 'continuous',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: Math.max(4, Math.round(height * 0.06)),
            paddingBottom: Math.max(4, Math.round(height * 0.07)),
            paddingHorizontal: 3,
            ...gradient(FACE),
          }}
        >
          {/* POWER, PLAY or PLAYED along the top: PLAY on a gold capsule. */}
          <Swap id={label || null} kind="text" style={{ height: 16 }}>
            <View style={{ paddingHorizontal: ready ? 6 : 0, borderRadius: 8, backgroundColor: ready ? brand.gold : 'transparent' }}>
              <Text maxFontSizeMultiplier={1} style={{ fontSize: width < 56 ? 8 : 9, lineHeight: 16, fontWeight: '800', letterSpacing: 1, color: ready ? brand.goldInk : 'rgba(255,224,138,0.9)' }}>
                {label}
              </Text>
            </View>
          </Swap>
          {/* The face: the power's picture, or a bolt on the back between hands. */}
          <Swap id={info ? `${hand?.number ?? 0}-${info.id}` : 'back'} kind="icon" size={emoji + 6}>
            {info ? (
              <Text maxFontSizeMultiplier={1} accessible={false} style={{ fontSize: emoji, lineHeight: emoji + 6 }}>
                {info.emoji}
              </Text>
            ) : (
              <Icon name="bolt.fill" size={Math.round(emoji * 0.8)} color="rgba(255,224,138,0.45)" />
            )}
          </Swap>
          <Text
            maxFontSizeMultiplier={1}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{ alignSelf: 'stretch', textAlign: 'center', fontSize: width < 56 ? 10 : 12, lineHeight: width < 56 ? 12 : 14, fontWeight: '800', color: '#ffffff', minHeight: width < 56 ? 12 : 14 }}
          >
            {info?.name ?? ''}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}
