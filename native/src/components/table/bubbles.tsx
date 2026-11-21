// Speech bubbles over a seat, drawn to the web's measurements (Bubbles.tsx and the bubble rules in table.css): a
// move ("Raise 120") in bold 13pt, table talk in semibold 13pt, the typing dots in a bubble exactly as tall as a
// one-line message so the dots turn into words without a jump, and a bot's line coming through a few words at a
// time like a conveyor. Plain capsules, no tail. Moves are coloured by what they were (Call blue, Raise green, Fold red, Check
// grey); talk is grey. Each bubble pops in the way a Messages bubble does: a quick, small grow from the seat, no bounce.
import { useEffect, useState } from 'react';
import { Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, Keyframe, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { CHAT, ticker, widestWindow, windowAt, type Hand, type Message, type Talk } from '@/engine';
import { EASE_OUT } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { brand, gradient, motion, usePlainColors } from '@/theme';

import { haptic } from '../haptics';
import { playBlip } from './sounds';

const emojiOnly = (text: string) => !/[A-Za-z]/.test(text);

/** A bubble appearing: from 95% to full size and fading in, ease-out, 250ms. No overshoot and never from nothing (motion rules 10 and 13). */
export const bubblePop = new Keyframe({
  0: { opacity: 0, transform: [{ scale: motion.popFrom }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(motion.base);

const SHADOW = '0 2px 6px -2px rgba(18, 18, 40, 0.35)';

/** A move's colour: Call blue, Raise (bet, raise, all in) green, Fold red, Check and the blinds grey. Talk is grey. */
export type Tone = 'call' | 'raise' | 'fold' | 'grey';

/** The tone for a move, from `Seat.last.move` or a hand action. */
export function moveTone(move: string, hand?: Hand | null, playerId?: string, bigBlind = 0): Tone {
  if (move === 'call') return 'call';
  // An all in only colours as a raise when it put in more than anyone had bet on that street; for less it's a call.
  if (move === 'allin' && hand && playerId) return allinRaised(hand, playerId, bigBlind) ? 'raise' : 'call';
  if (move === 'fold') return 'fold';
  if (move === 'bet' || move === 'raise' || move === 'allin') return 'raise';
  return 'grey';
}

/** Whether this player's latest all in went over the street's biggest bet before it. */
function allinRaised(hand: Hand, playerId: string, bigBlind: number): boolean {
  const acts = hand.actions ?? [];
  let i = acts.length - 1;
  while (i >= 0 && !(acts[i].playerId === playerId && acts[i].move === 'allin')) i--;
  if (i < 0) return true;
  const street = acts[i].street;
  let top = street === 'preflop' ? bigBlind : 0;
  for (let j = 0; j < i; j++) if (acts[j].street === street && acts[j].move !== 'fold' && acts[j].move !== 'check') top = Math.max(top, acts[j].to);
  return acts[i].to > top;
}

/** The capsule's paint for each tone. */
function useTint(tone: Tone): { box: ViewStyle; ink: string } {
  return tint(tone, usePlainColors());
}

function tint(tone: Tone, c: ReturnType<typeof usePlainColors>): { box: ViewStyle; ink: string } {
  if (tone === 'call') return { box: { ...gradient(`linear-gradient(180deg, ${c.bubbleBlueHi}, ${c.bubbleBlue})`), backgroundColor: c.bubbleBlue, boxShadow: SHADOW }, ink: '#ffffff' };
  if (tone === 'raise') return { box: { ...gradient(`linear-gradient(180deg, ${brand.raise}, ${brand.raiseDeep})`), backgroundColor: brand.raise, boxShadow: SHADOW }, ink: '#ffffff' };
  // Fold is the commonest move, so it's the quiet red of the Fold button: a dark red pill with red letters.
  if (tone === 'fold') return { box: { backgroundColor: c.redBg, boxShadow: SHADOW }, ink: c.redInk };
  return { box: { backgroundColor: c.bubbleGrey, boxShadow: SHADOW }, ink: c.label };
}

/** A move: "Call 10", "Fold", coloured by what it was (`moveTone`). From an earlier street it's grey and faded. `big` is yours, on your box. */
export function MoveBubble({ text, tone, old, big }: { text: string; tone: Tone; old?: boolean; big?: boolean }) {
  // From an earlier street a move turns grey and fades back, so this street's moves are the bright ones.
  const { box, ink } = useTint(old ? 'grey' : tone);
  return (
    <View style={[{ paddingHorizontal: big ? 11 : 10, paddingVertical: big ? 5 : 4, borderRadius: 999, opacity: old ? 0.55 : 1 }, box]}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: big ? 15 : 13, lineHeight: big ? 18 : 16, fontWeight: '700', color: ink, fontVariant: ['tabular-nums'] }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * Talk said whole (a person's quick message): semibold, wrapping inside the seat's share of the row. An emoji on its
 * own isn't a message in a bubble but a sticker: big, no capsule, popping in where the bubble would.
 */
function TalkBubble({ text, room }: { text: string; room?: number }) {
  const { box, ink } = useTint('grey');
  if (emojiOnly(text)) return <Sticker text={text} />;
  return (
    <View style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, maxWidth: room }, box]}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, lineHeight: 16, fontWeight: '600', color: ink, textAlign: 'center' }}>
        {text}
      </Text>
    </View>
  );
}

/** An emoji reaction: 34pt with a soft shadow for contrast on any felt, no capsule. */
function Sticker({ text }: { text: string }) {
  return (
    <Text
      maxFontSizeMultiplier={1.1}
      accessibilityLabel={text}
      style={{ fontSize: 34, lineHeight: 40, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 }}
    >
      {text}
    </Text>
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
function Ticker({ text, room, pauses, who }: { text: string; room?: number; pauses?: Record<number, number>; who?: string }) {
  const { box, ink } = useTint('grey');
  const { words, at } = ticker(text, pauses);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (who) playBlip(who);
    const timers = at.slice(1).map((ms, i) =>
      setTimeout(() => {
        setShown(i + 1);
        if (who) playBlip(who);
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // About 7.2pt a letter at this size: a narrow seat shows fewer letters at a time, so nothing is cut off.
  const chars = room ? Math.max(6, Math.min(CHAT.windowChars, Math.floor((room - 20) / 7.2))) : CHAT.windowChars;
  const [first, last] = windowAt(words, shown, chars, CHAT.windowWords);
  // The words stay hidden until the bubble has its width: on the first frame a word could be laid out in less room
  // than it needs and show as a fragment ("th…") before the line rolled in.
  const [ready, setReady] = useState(false);
  return (
    <View accessibilityLabel={text} style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' }, box]}>
      <Text onLayout={() => setReady(true)} maxFontSizeMultiplier={1.2} numberOfLines={1} style={[FONT, { opacity: 0 }]}>
        {widestWindow(words, chars, CHAT.windowWords)}
      </Text>
      <View style={{ position: 'absolute', top: 4, bottom: 4, left: 10, right: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', opacity: ready ? 1 : 0 }}>
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
    if (!reduce) enter.set(withTiming(1, { duration: 160, easing: EASE_OUT }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (gone) out.set(reduce ? 1 : withTiming(1, { duration: motion.exit, easing: EASE_OUT }));
  }, [gone]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => {
    const w = width.get();
    return {
      opacity: enter.get() * (1 - out.get()),
      marginLeft: lead ? 3.6 * (1 - out.get()) : 0,
      transform: [{ translateX: 6 * (1 - enter.get()) }],
      ...(w > 0 ? { width: w * (1 - out.get()) } : {}),
    };
  });
  const measure = (e: LayoutChangeEvent) => {
    if (width.get() <= 0) width.set(e.nativeEvent.layout.width);
  };
  return (
    <Animated.View style={[{ flexShrink: 0, overflow: 'hidden' }, style]}>
      {/* Clipped, never "…": a word is either whole or closing to nothing. */}
      <Text onLayout={measure} maxFontSizeMultiplier={1.2} numberOfLines={1} ellipsizeMode="clip" style={[FONT, { color: ink }]}>
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * Where a bubble sits: pinned by its bottom edge to an anchor of no height. A bubble that leaves fades where it
 * stood; in a box that grew and shrank with its content the leaving bubble lost its place and dropped as it faded.
 */
export const pinned = (align: 'center' | 'flex-end' | 'flex-start'): ViewStyle => ({
  position: 'absolute',
  bottom: 0,
  left: align === 'flex-end' ? undefined : 0,
  right: align === 'flex-start' ? undefined : 0,
  alignItems: align,
});

/** Like `pinned`, but by the top edge: the bubble's top stays put and a longer one grows downward. */
export const pinnedTop = (align: 'center' | 'flex-end' | 'flex-start'): ViewStyle => ({
  ...pinned(align),
  bottom: undefined,
  top: 0,
});

/** How every bubble leaves: a quick fade in place. */
export const bubbleOut = FadeOut.duration(motion.exit).easing(EASE_OUT);

/** A seat's talk: its newest message, or the typing dots while the next one comes. One bubble a seat. */
export function Thread({ talk, room, place }: { talk: Talk; room?: number; place: ViewStyle }) {
  const reduce = useReduceMotion();
  const item: Message | null = talk.typing ? null : (talk.shown.at(-1) ?? null);
  // A line aimed at you gets a light tap as it lands.
  const key = item?.key;
  useEffect(() => {
    if (key && item?.toYou) haptic.tap();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  // A bubble is read out only when it's for you or a person's own message; eight bots talking would drown VoiceOver.
  const live = item && (item.toYou || !item.rolling) ? 'polite' : 'none';
  return (
    <Animated.View key={item?.key ?? 'typing'} accessibilityLiveRegion={live} entering={reduce ? FadeIn.duration(150) : bubblePop} exiting={bubbleOut} style={place}>
      {!item ? (
        <TypingBubble />
      ) : item.rolling && !emojiOnly(item.text) ? (
        <Ticker text={item.text} room={room} pauses={item.pauses} who={item.who} />
      ) : (
        <TalkBubble text={item.text} room={room} />
      )}
    </Animated.View>
  );
}
