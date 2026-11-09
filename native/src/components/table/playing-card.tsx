// A playing card drawn to the web's measurements (.pcard in table.css): 5:7, corners at a fifth of the width, the
// rank at 54% of the width and the suit at 40%, in the four-colour deck. A card that's dealt turns over the way the
// web's does: it starts face down (in the owner's card pack), lifts a little and grows 6% as it turns, and lands
// face up, in 0.65s. Under Reduce Motion it fades in instead.
import { createContext, useContext, useEffect, type ReactNode } from 'react';
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
import { useDrift } from '@/motion/use-drift';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient, usePlainColors } from '@/theme';

/** Card widths, as on the web table: your cards, the board, smaller boards, and the cards under a seat. */
export const CARD_W = { xl: 100, lg: 66, md: 48, sm: 26 } as const;
export type CardSize = keyof typeof CARD_W;
const SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;
const INK = { s: '#16161d', h: '#e5322d', d: '#2563eb', c: '#16a34a' } as const;

/** True at a Crazy Deuces table: every 2 is wild there, so it's drawn in shining gold (set once by the table screen). */
export const WildDeuces = createContext(false);
const GOLD_INK = '#5b3a00';

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
export function CardBack({ w, pack, small, mark }: { w: number; pack?: string; small?: boolean; mark?: string }) {
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
    >
      {mark ? <BackMark mark={mark} small={small} w={w} /> : null}
    </View>
  );
}

/**
 * A position chip (SB, BB, BTN) on a card's back: a small dark pill with soft white letters, so it reads on every
 * card pack. It lives on the back only; a face never draws it, so nothing is left after the flip.
 */
function BackMark({ mark, small, w }: { mark: string; small?: boolean; w: number }) {
  const size = small ? 7 : Math.max(9, w * 0.14);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
      <View
        accessibilityLabel={`Position ${mark}`}
        style={{
          paddingHorizontal: small ? 3 : 5,
          height: small ? 11 : size + 8,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.42)',
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.35)',
        }}
      >
        <Text maxFontSizeMultiplier={1} style={{ fontSize: size, lineHeight: size + 2, fontWeight: '800', letterSpacing: 0.2, color: 'rgba(255,255,255,0.88)' }}>
          {mark}
        </Text>
      </View>
    </View>
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
  mark,
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
  /** A position chip (SB, BB, BTN) for a face-down card. Never drawn on a face. */
  mark?: string;
}) {
  const w = width ?? CARD_W[size];
  const small = size === 'sm';
  if (back || !card) return <CardBack w={w} pack={pack} small={small} mark={mark} />;
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
  // A wild deuce: gold with a shine sweeping across it, a gold glow round it and a "WILD" tag, so a 2 can't be missed.
  const wild = useContext(WildDeuces) && card[0] === '2' && !dim;
  const ink = wild ? GOLD_INK : INK[suit];
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={cardName(card)}
      style={[
        frame(w, small),
        {
          backgroundColor: dim ? dimBg : wild ? '#f7c948' : '#ffffff',
          ...(wild ? gradient('linear-gradient(145deg, #fff3b0 0%, #f7c948 38%, #e39a12 70%, #ffd75e 100%)') : null),
          opacity: dim && !dark ? 0.55 : 1,
          paddingTop: small ? 3 : w * 0.1,
          paddingHorizontal: small ? 4 : w * 0.16,
          paddingBottom: small ? 3 : w * 0.14,
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: edge,
          overflow: 'visible',
          transform: glow ? [{ translateY: small ? -3 : -8 }] : undefined,
          boxShadow: wild
            ? `0 0 0 ${small ? 1.5 : 2.5}px #ffb400, 0 0 ${small ? 8 : 20}px ${small ? 1 : 3}px rgba(255,190,20,0.7)`
            : glow
            ? `0 0 0 ${small ? 2 : 3}px #ff9f0a, 0 0 ${small ? 8 : 18}px ${small ? 1 : 2}px rgba(245,158,11,${small ? 0.6 : 0.55})`
            : small
              ? '0 2px 4px -2px rgba(18,18,40,0.3)'
              : shadow,
        },
      ]}
    >
      {wild && <Shine small={small} />}
      <Text
        maxFontSizeMultiplier={1}
        style={{
          color: ink,
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
        style={{ color: ink, opacity: fade, fontSize: small ? 11 : w * 0.4, lineHeight: small ? 12 : w * 0.42 }}
      >
        {SYMBOL[suit]}
      </Text>
      {wild && !small && (
        <Text maxFontSizeMultiplier={1} style={{ position: 'absolute', right: w * 0.1, top: w * 0.12, fontSize: Math.max(8, w * 0.13), fontWeight: '900', letterSpacing: 0.5, color: GOLD_INK }}>
          WILD
        </Text>
      )}
    </View>
  );
}

/** A bright band that sweeps across a wild deuce every couple of seconds (transform only; still under Reduce Motion). */
function Shine({ small }: { small: boolean }) {
  const { t } = useDrift(1500);
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: -140 + 280 * t.get() }, { rotate: '20deg' }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: small ? 5 : 14, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', top: -20, bottom: -20, width: small ? 10 : 26, ...gradient('linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.85), rgba(255,255,255,0))') }, band]} />
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
