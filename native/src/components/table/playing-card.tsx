// A playing card drawn to the web's measurements (.pcard in table.css): 5:7, corners at a fifth of the width, the
// rank at 54% of the width and the suit at 40%, in the four-colour deck. A card that's dealt turns over the way the
// web's does: it starts face down (in the owner's card pack), lifts a little and grows 6% as it turns, and lands
// face up, in 0.65s. Under Reduce Motion it fades in instead.
import { useEffect, type ReactNode } from 'react';
import { Text, useColorScheme, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { cardBack } from '@design/premiumLooks';
import { cardName, rankLabel, suitOf, type Card } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient, usePlainColors } from '@/theme';

/** Card widths, as on the web table: your cards, the board, smaller boards, and the cards under a seat. */
export const CARD_W = { xl: 100, lg: 66, md: 48, sm: 26 } as const;
export type CardSize = keyof typeof CARD_W;
const SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;
const INK = { s: '#16161d', h: '#e5322d', d: '#2563eb', c: '#16a34a' } as const;

function useCardLook() {
  const dark = useColorScheme() === 'dark';
  const c = usePlainColors();
  return {
    edge: dark ? 'rgba(255,255,255,0.14)' : 'rgba(18,18,40,0.1)',
    shadow: dark
      ? '0 1px 2px rgba(0,0,0,0.4), 0 6px 16px -8px rgba(0,0,0,0.7)'
      : '0 1px 2px rgba(18,18,40,0.08), 0 6px 16px -8px rgba(18,18,40,0.28)',
    dimBg: dark ? '#565868' : (c.cellPressed as string),
    dark,
    c,
  };
}

/** The back of a card: the owner's card pack, or the plain back in the page's own shade. */
export function CardBack({ w, pack, small }: { w: number; pack?: string; small?: boolean }) {
  const { c, shadow } = useCardLook();
  const look = pack ? cardBack(pack) : null;
  const base = look ? look.base.join(', ') : `${c.cardBack1}, ${c.cardBack2}`;
  const ink = look?.ink ?? 'rgba(255,255,255,0.12)';
  return (
    <View
      accessibilityLabel="Face-down card"
      style={[
        frame(w, small),
        {
          borderWidth: small ? 1.5 : 2,
          borderColor: 'rgba(255,255,255,0.85)',
          boxShadow:
            look && look.glow !== 'transparent'
              ? `0 0 ${small ? 8 : 12}px ${look.glow}`
              : small
                ? '0 2px 4px -2px rgba(18,18,40,0.3)'
                : shadow,
        },
        // iOS draws linear and radial gradients only: the web's woven pattern becomes a fine sheen.
        gradient(
          `linear-gradient(115deg, transparent 30%, ${ink} 44%, transparent 46%, transparent 54%, ${ink} 56%, transparent 70%), linear-gradient(160deg, ${base})`,
        ),
      ]}
    />
  );
}

const frame = (w: number, small?: boolean): ViewStyle => ({
  width: w,
  height: Math.round(w * 1.4),
  borderRadius: small ? 5 : w * 0.2,
  borderCurve: 'continuous',
  overflow: 'hidden',
});

/**
 * `back` shows it face down. `flip` turns it over as it lands (after `delay` ms). `dim` greys a card that isn't part
 * of the hand that matters; `glow` lifts a winning card and rings it in gold. `pack` is the back it flips from.
 */
export function PlayingCard({
  card,
  size = 'lg',
  back = false,
  flip = false,
  delay = 0,
  dim = false,
  glow = false,
  width,
  pack,
}: {
  card?: Card;
  size?: CardSize;
  back?: boolean;
  flip?: boolean;
  delay?: number;
  dim?: boolean;
  glow?: boolean;
  /** Overrides the size's width (the board shrinks to fit narrow phones). */
  width?: number;
  pack?: string;
}) {
  const w = width ?? CARD_W[size];
  const small = size === 'sm';
  if (back || !card) return <CardBack w={w} pack={pack} small={small} />;
  const face = <Face card={card} w={w} small={small} dim={dim} glow={glow} />;
  if (!flip) return face;
  return (
    <Flip w={w} delay={delay} pack={pack} small={small}>
      {face}
    </Flip>
  );
}

function Face({ card, w, small, dim, glow }: { card: Card; w: number; small: boolean; dim: boolean; glow: boolean }) {
  const { edge, shadow, dimBg, dark } = useCardLook();
  const suit = suitOf(card);
  const fade = dim ? (dark ? 0.75 : 1) : 1;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={cardName(card)}
      style={[
        frame(w, small),
        {
          backgroundColor: dim ? dimBg : '#ffffff',
          opacity: dim && !dark ? 0.55 : 1,
          paddingTop: small ? 3 : w * 0.1,
          paddingHorizontal: small ? 4 : w * 0.16,
          paddingBottom: small ? 3 : w * 0.14,
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: edge,
          overflow: 'visible',
          transform: glow ? [{ translateY: small ? -3 : -8 }] : undefined,
          boxShadow: glow
            ? `0 0 0 ${small ? 2 : 3}px #ff9f0a, 0 0 ${small ? 8 : 18}px ${small ? 1 : 2}px rgba(245,158,11,${small ? 0.6 : 0.55})`
            : small
              ? '0 2px 4px -2px rgba(18,18,40,0.3)'
              : shadow,
        },
      ]}
    >
      <Text
        maxFontSizeMultiplier={1}
        style={{
          color: INK[suit],
          opacity: fade,
          fontSize: small ? 14 : w * 0.54,
          lineHeight: small ? 15 : w * 0.56,
          fontWeight: small ? '600' : '500',
          letterSpacing: small ? 0 : -0.04 * w * 0.54,
        }}
      >
        {rankLabel(card)}
      </Text>
      <Text
        maxFontSizeMultiplier={1}
        style={{ color: INK[suit], opacity: fade, fontSize: small ? 11 : w * 0.4, lineHeight: small ? 12 : w * 0.42 }}
      >
        {SYMBOL[suit]}
      </Text>
    </View>
  );
}

/** Face down, lifting a little and growing 6% as it turns, face up: the web's flip-in, 0.65s. */
function Flip({ w, delay, pack, small, children }: { w: number; delay: number; pack?: string; small: boolean; children: ReactNode }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      cancelAnimation(p);
      p.set(1);
    } else if (p.get() < 1) {
      p.set(withDelay(delay, withTiming(1, { duration: 650, easing: Easing.bezier(0.3, 0.7, 0.3, 1) })));
    }
    return () => cancelAnimation(p);
  }, [reduce, delay, p]);
  const lift = (v: number) => {
    'worklet';
    return Math.sin(Math.PI * v);
  };
  // A flat flip: the card narrows to an edge and opens out the other side. No 3D transform, which on iPhone could
  // project the card many times its size for a few frames as it turned.
  const turn = (v: number) => {
    'worklet';
    return Math.max(0.001, Math.abs(Math.cos(Math.PI * v)));
  };
  const faceStyle = useAnimatedStyle(() => ({
    opacity: p.get() >= 0.5 ? 1 : 0,
    transform: [{ translateY: -10 * lift(p.get()) }, { scale: 1 + 0.06 * lift(p.get()) }, { scaleX: turn(p.get()) }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: p.get() < 0.5 ? 1 : 0,
    transform: [{ translateY: -10 * lift(p.get()) }, { scale: 1 + 0.06 * lift(p.get()) }, { scaleX: turn(p.get()) }],
  }));
  if (reduce) return <Animated.View entering={FadeIn.delay(delay).duration(200)}>{children}</Animated.View>;
  return (
    <View style={{ width: w, height: Math.round(w * 1.4) }}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, backStyle]}>
        <CardBack w={w} pack={pack} small={small} />
      </Animated.View>
      <Animated.View style={faceStyle}>{children}</Animated.View>
    </View>
  );
}

/** Where a card will land: a faint outline on the felt. */
export function CardSlot({ size = 'lg', width }: { size?: CardSize; width?: number }) {
  const w = width ?? CARD_W[size];
  return (
    <View
      style={{
        width: w,
        height: Math.round(w * 1.4),
        borderRadius: w * 0.2,
        borderCurve: 'continuous',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
      }}
    />
  );
}
