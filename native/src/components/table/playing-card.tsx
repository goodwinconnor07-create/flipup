import { Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FlipInEasyY } from 'react-native-reanimated';

import { SUIT_COLOUR } from '@design/gameArt';
import { cardName, rankLabel, suitOf, type Card } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient } from '@/theme';

/** Card widths, as on the web table: your cards, the board, smaller boards, and the cards under a seat. */
export const CARD_W = { xl: 100, lg: 64, md: 48, sm: 26 } as const;
export type CardSize = keyof typeof CARD_W;
const SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' } as const;

/**
 * A playing card in the four-colour deck: big rank in the corner, suit under it. `back` shows it face down.
 * `flip` turns it over as it lands (after `delay` ms); with Reduce Motion it fades in instead. `dim` greys a card
 * that isn't part of the hand that matters, `glow` gives a winning card a gold edge.
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
}) {
  const reduce = useReduceMotion();
  const w = width ?? CARD_W[size];
  const h = Math.round(w * 1.4);
  const small = size === 'sm';
  const frame: ViewStyle = { width: w, height: h, borderRadius: small ? 5 : Math.round(w * 0.12), borderCurve: 'continuous', overflow: 'hidden' };
  if (back || !card) {
    return (
      <View
        accessibilityLabel="Face-down card"
        style={[
          frame,
          { borderWidth: small ? 1.5 : 2, borderColor: 'rgba(255,255,255,0.85)' },
          gradient('repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 4px, transparent 4px, transparent 8px), linear-gradient(160deg, #1f2937, #0b0b12)'),
        ]}
      />
    );
  }
  const colour = SUIT_COLOUR[SYMBOL[suitOf(card)]];
  const face = (
    <View
      accessibilityRole="image"
      accessibilityLabel={cardName(card)}
      style={[
        frame,
        {
          backgroundColor: dim ? '#e5e5ea' : '#ffffff',
          paddingHorizontal: small ? 4 : Math.round(w * 0.1),
          paddingVertical: small ? 2 : Math.round(w * 0.06),
          justifyContent: 'space-between',
          borderWidth: glow ? 2.5 : 0.5,
          borderColor: glow ? '#ffc933' : 'rgba(18,18,40,0.12)',
          boxShadow: '0 1px 2px rgba(18,18,40,0.08), 0 6px 16px -8px rgba(18,18,40,0.28)',
        },
      ]}
    >
      <Text maxFontSizeMultiplier={1} style={{ color: colour, opacity: dim ? 0.55 : 1, fontSize: small ? 14 : w * 0.54, lineHeight: small ? 16 : w * 0.62, fontWeight: small ? '600' : '500', letterSpacing: -0.5 }}>
        {rankLabel(card)}
      </Text>
      <Text maxFontSizeMultiplier={1} style={{ color: colour, opacity: dim ? 0.55 : 1, fontSize: small ? 11 : w * 0.4, lineHeight: small ? 12 : w * 0.46 }}>
        {SYMBOL[suitOf(card)]}
      </Text>
    </View>
  );
  if (!flip) return face;
  return <Animated.View entering={reduce ? FadeIn.delay(delay).duration(200) : FlipInEasyY.delay(delay).duration(320)}>{face}</Animated.View>;
}

/** An empty place for a card that hasn't come yet: a faint outline on the felt. */
export function CardSlot({ size = 'lg', width }: { size?: CardSize; width?: number }) {
  const w = width ?? CARD_W[size];
  return <View style={{ width: w, height: Math.round(w * 1.4), borderRadius: Math.round(w * 0.12), borderCurve: 'continuous', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)' }} />;
}
