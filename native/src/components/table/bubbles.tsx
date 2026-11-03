// Speech bubbles over a seat, drawn to the web's measurements (Bubbles.tsx and the bubble rules in table.css): a
// move ("Raise 120") in bold 13pt, table talk in semibold 13pt, the typing dots in a bubble exactly as tall as a
// one-line message so the dots turn into words without a jump, and a bot's line coming through a few words at a
// time like a conveyor. Plain capsules, no tail. A player's Premium bubble colour (`fx`) paints all of them but the
// dots. Each bubble pops in the way a Messages bubble does: a quick, small grow from the seat, no bounce.
import { useEffect, useState } from 'react';
import { Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, Keyframe, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { bubbleLook } from '@design/premiumLooks';
import { CHAT, isBubbleId, ticker, widestWindow, windowAt, type Message, type Talk } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient, usePlainColors } from '@/theme';

const emojiOnly = (text: string) => !/[A-Za-z]/.test(text);

/** The web's `.pop`, toned down for a bubble: in from 60% to a hair over full size and settled, in 0.28s. */
export const bubblePop = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.6 }] },
  60: { opacity: 1, transform: [{ scale: 1.05 }], easing: Easing.out(Easing.quad) },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.inOut(Easing.quad) },
}).duration(280);

const SHADOW = '0 2px 6px -2px rgba(18, 18, 40, 0.35)';

/** The capsule's paint: a Premium look, else the blue gradient for chips going in and grey for the rest. */
function useTint(tone: 'blue' | 'grey', fx?: string): { box: ViewStyle; ink: string } {
  const c = usePlainColors();
  const look = isBubbleId(fx) ? bubbleLook(fx) : undefined;
  if (look) {
    return {
      box: {
        ...gradient(`linear-gradient(${look.angle ?? 135}deg, ${look.fill.join(', ')})`),
        borderWidth: look.edge ? 1.5 : 0,
        borderColor: look.edge,
        boxShadow: look.glow ? `0 0 10px ${look.glow}, ${SHADOW}` : SHADOW,
      },
      ink: look.ink,
    };
  }
  if (tone === 'blue') return { box: { ...gradient(`linear-gradient(180deg, ${c.bubbleBlueHi}, ${c.bubbleBlue})`), backgroundColor: c.bubbleBlue, boxShadow: SHADOW }, ink: '#ffffff' };
  return { box: { backgroundColor: c.bubbleGrey, boxShadow: SHADOW }, ink: c.label };
}

/** A move: "Call 10", "Fold". Blue when chips go in. From an earlier street it's a touch quieter. `big` is yours, on your box. */
export function MoveBubble({ text, tone, fx, old, big }: { text: string; tone: 'blue' | 'grey'; fx?: string; old?: boolean; big?: boolean }) {
  const { box, ink } = useTint(tone, fx);
  return (
    <View style={[{ paddingHorizontal: big ? 11 : 10, paddingVertical: big ? 5 : 4, borderRadius: 999, opacity: old ? 0.72 : 1 }, box]}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: big ? 15 : 13, lineHeight: big ? 18 : 16, fontWeight: '700', color: ink, fontVariant: ['tabular-nums'] }}>
        {text}
      </Text>
    </View>
  );
}

/** Talk said whole (a person's quick message): semibold, wrapping inside the seat's share of the row. */
function TalkBubble({ text, fx, room }: { text: string; fx?: string; room?: number }) {
  const { box, ink } = useTint('grey', fx);
  const emoji = emojiOnly(text);
  return (
    <View style={[{ paddingHorizontal: emoji ? 8 : 10, paddingVertical: emoji ? 1 : 4, borderRadius: 999, maxWidth: room }, box]}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: emoji ? 22 : 13, lineHeight: emoji ? 26 : 16, fontWeight: '600', color: ink, textAlign: 'center' }}>
        {text}
      </Text>
    </View>
  );
}

/** The typing dots, as in Messages: a grey bubble the height of one line, three dots that brighten and lift in turn. */
export function TypingBubble({ label }: { label?: string }) {
  const c = usePlainColors();
  return (
    <View accessibilityLabel={label ?? 'Typing'} style={{ height: 24, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: c.bubbleGrey, boxShadow: SHADOW }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 150} color={c.tertiaryLabel} size={6} lift={1.5} />
      ))}
    </View>
  );
}

/**
 * One dot of a typing indicator. Every 1.1s it brightens from 35% to full and lifts a touch, 0.15s after the one
 * before it, so the three ripple left to right. Under Reduce Motion they sit still at 60%.
 */
export function Dot({ delay, color, size, lift }: { delay: number; color: string; size: number; lift: number }) {
  const reduce = useReduceMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    const up = withTiming(1, { duration: 330, easing: Easing.inOut(Easing.quad) });
    const down = withTiming(0, { duration: 330, easing: Easing.inOut(Easing.quad) });
    t.set(withDelay(delay, withRepeat(withSequence(up, down, withTiming(0, { duration: 440 })), -1)));
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({
    opacity: reduce ? 0.6 : 0.35 + 0.65 * t.get(),
    transform: [{ translateY: -lift * t.get() }, { scale: 0.85 + 0.15 * t.get() }],
  }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

/**
 * A bot's line said the way a game character says it, as on the web: the bubble is sized from the start by an
 * invisible copy of its widest few words, and the real words come in at the right, each sliding 6pt as it fades in,
 * while the oldest fades and its place closes up, so the rest slide left like a conveyor.
 */
function Ticker({ text, fx, room }: { text: string; fx?: string; room?: number }) {
  const { box, ink } = useTint('grey', fx);
  const { words, at } = ticker(text);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = at.slice(1).map((ms, i) => setTimeout(() => setShown(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // About 7.2pt a letter at this size: a narrow seat shows fewer letters at a time, so nothing is cut off.
  const chars = room ? Math.max(6, Math.min(CHAT.windowChars, Math.floor((room - 20) / 7.2))) : CHAT.windowChars;
  const [first, last] = windowAt(words, shown, chars, CHAT.windowWords);
  return (
    <View accessibilityLabel={text} style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' }, box]}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[FONT, { opacity: 0 }]}>
        {widestWindow(words, chars, CHAT.windowWords)}
      </Text>
      <View style={{ position: 'absolute', top: 4, bottom: 4, left: 10, right: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        {words.slice(0, last + 1).map((w, i) => (
          <Word key={i} text={w} ink={ink} gone={i < first} lead={i > first} />
        ))}
      </View>
    </View>
  );
}

const FONT = { fontSize: 13, lineHeight: 16, fontWeight: '600' as const };

/** One word on the conveyor: slides in from 6pt right; once it's gone, it fades as its width closes to nothing. */
function Word({ text, ink, gone, lead }: { text: string; ink: string; gone: boolean; lead: boolean }) {
  const reduce = useReduceMotion();
  const width = useSharedValue(-1);
  const enter = useSharedValue(reduce ? 1 : 0);
  const out = useSharedValue(0);
  useEffect(() => {
    if (!reduce) enter.set(withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (gone) out.set(reduce ? 1 : withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }));
  }, [gone]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => {
    const w = width.get();
    return {
      opacity: enter.get() * (1 - out.get()),
      marginLeft: lead ? 3.6 * (1 - out.get()) : 0,
      transform: [{ translateX: 6 * (1 - enter.get()) }],
      ...(w >= 0 ? { width: w * (1 - out.get()) } : {}),
    };
  });
  const measure = (e: LayoutChangeEvent) => {
    if (width.get() < 0) width.set(e.nativeEvent.layout.width);
  };
  return (
    <Animated.View style={[{ flexShrink: 0, overflow: 'hidden' }, style]}>
      <Text onLayout={measure} maxFontSizeMultiplier={1.2} numberOfLines={1} style={[FONT, { color: ink }]}>
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * Where a bubble sits: pinned by its bottom edge to an anchor of no height. A bubble that leaves fades where it
 * stood; in a box that grew and shrank with its content the leaving bubble lost its place and dropped as it faded.
 */
export const pinned = (align: 'center' | 'flex-end'): ViewStyle => ({ position: 'absolute', bottom: 0, left: align === 'center' ? 0 : undefined, right: 0, alignItems: align });

/** How every bubble leaves: a quick fade in place. */
export const bubbleOut = FadeOut.duration(220).easing(Easing.out(Easing.quad));

/** A seat's talk: its newest message, or the typing dots while the next one comes. One bubble a seat. */
export function Thread({ talk, fx, room, place }: { talk: Talk; fx?: string; room?: number; place: ViewStyle }) {
  const reduce = useReduceMotion();
  const item: Message | null = talk.typing ? null : (talk.shown.at(-1) ?? null);
  return (
    <Animated.View key={item?.key ?? 'typing'} accessibilityLiveRegion="polite" entering={reduce ? FadeIn.duration(150) : bubblePop} exiting={bubbleOut} style={place}>
      {!item ? <TypingBubble /> : item.rolling ? <Ticker text={item.text} fx={fx} room={room} /> : <TalkBubble text={item.text} fx={fx} room={room} />}
    </Animated.View>
  );
}
