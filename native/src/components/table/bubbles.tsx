// Speech bubbles over a seat, as on the web (src/screens/table/Bubbles.tsx): a move ("Raise 120"), a person's quick
// message, a bot's line said a few words at a time, or typing dots. Plain capsules with no tail. A player's
// Premium bubble colour (`fx`) paints all of them but the dots.
import { useEffect, useState } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';

import { bubbleLook } from '@design/premiumLooks';
import { CHAT, isBubbleId, ticker, widestWindow, windowAt, type Message, type Talk } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { gradient, radius, spacing, useColors } from '@/theme';

const emojiOnly = (text: string) => !/[A-Za-z]/.test(text);

/** The capsule's colours: a Premium look, else blue for chips going in and grey for the rest. */
function useTint(tone: 'blue' | 'grey', fx?: string): { box: ViewStyle; ink: string } {
  const colors = useColors();
  const look = isBubbleId(fx) ? bubbleLook(fx) : undefined;
  if (look) {
    return {
      box: {
        ...gradient(`linear-gradient(${look.angle ?? 135}deg, ${look.fill.join(', ')})`),
        borderWidth: look.edge ? 1.5 : 0,
        borderColor: look.edge,
        boxShadow: look.glow ? `0 0 10px ${look.glow}` : undefined,
      },
      ink: look.ink,
    };
  }
  return { box: { backgroundColor: tone === 'blue' ? colors.accent : colors.cellPressed }, ink: tone === 'blue' ? '#ffffff' : (colors.label as string) };
}

/** A plain speech capsule. */
export function Capsule({ text, tone, fx, big }: { text: string; tone: 'blue' | 'grey'; fx?: string; big?: boolean }) {
  const { box, ink } = useTint(tone, fx);
  return (
    <View style={[{ paddingHorizontal: spacing.xs + 2, paddingVertical: 3, borderRadius: radius.full, borderCurve: 'continuous' }, box]}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: big ? 20 : 13, lineHeight: big ? 24 : 17, fontWeight: '700', color: ink }}>
        {text}
      </Text>
    </View>
  );
}

/** Three dots that rise in turn while the next message is on its way. */
export function TypingDots() {
  const colors = useColors();
  return (
    <View accessibilityLabel="Typing" style={{ flexDirection: 'row', gap: 3, paddingHorizontal: spacing.xs + 2, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.cellPressed }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 150} color={colors.secondaryLabel as string} />
      ))}
    </View>
  );
}

function Dot({ delay, color }: { delay: number; color: string }) {
  const reduce = useReduceMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.set(withDelay(delay, withRepeat(withSequence(withTiming(-3, { duration: 220 }), withTiming(0, { duration: 220 }), withTiming(0, { duration: 300 })), -1)));
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }, style]} />;
}

/**
 * A bot's line, said the way a game character says it: the words come through a few at a time, each sliding in at
 * the end as the oldest goes, then the last words hold until the bubble fades. It's as wide as its widest few words
 * from the start, so it never changes size or reaches into a neighbour.
 */
function Ticker({ text, fx, room }: { text: string; fx?: string; room?: number }) {
  const { box, ink } = useTint('grey', fx);
  const { words, at } = ticker(text);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = at.slice(1).map((ms, i) => setTimeout(() => setShown(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // About 7.5 points a letter at this size: a narrow seat shows fewer letters at a time, so nothing is cut off.
  const chars = room ? Math.max(6, Math.min(CHAT.windowChars, Math.floor((room - 14) / 7.5))) : CHAT.windowChars;
  const [first, last] = windowAt(words, shown, chars, CHAT.windowWords);
  const font = { fontSize: 13, lineHeight: 17, fontWeight: '700' as const };
  return (
    <View accessibilityLabel={text} style={[{ paddingHorizontal: spacing.xs + 2, paddingVertical: 3, borderRadius: radius.full, maxWidth: room }, box]}>
      {/* Sizes the bubble to the widest window, invisibly. */}
      <Text maxFontSizeMultiplier={1.2} style={[font, { opacity: 0 }]} numberOfLines={1}>
        {widestWindow(words, chars, CHAT.windowWords)}
      </Text>
      <View style={{ position: 'absolute', left: spacing.xs + 2, right: spacing.xs + 2, top: 3, flexDirection: 'row', justifyContent: 'flex-end', overflow: 'hidden' }}>
        {first < last && (
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[font, { color: ink }]}>
            {words.slice(first, last).join(' ')}{' '}
          </Text>
        )}
        <Animated.Text key={last} entering={FadeIn.duration(140)} maxFontSizeMultiplier={1.2} numberOfLines={1} style={[font, { color: ink }]}>
          {words[last]}
        </Animated.Text>
      </View>
    </View>
  );
}

/** A seat's talk: its newest message, or the typing dots while the next one comes. One bubble a seat. */
export function Thread({ talk, fx, room }: { talk: Talk; fx?: string; room?: number }) {
  const reduce = useReduceMotion();
  const item: Message | null = talk.typing ? null : (talk.shown.at(-1) ?? null);
  return (
    <Animated.View key={item?.key ?? 'typing'} accessibilityLiveRegion="polite" entering={reduce ? FadeIn : ZoomIn.springify().damping(14)} exiting={FadeOut.duration(160)}>
      {!item ? <TypingDots /> : item.rolling ? <Ticker text={item.text} fx={fx} room={room} /> : <Capsule text={item.text} tone="grey" fx={fx} big={emojiOnly(item.text)} />}
    </Animated.View>
  );
}
