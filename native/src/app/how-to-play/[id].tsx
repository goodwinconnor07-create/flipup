import { useEvent } from 'expo';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useEffect } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { haptic } from '@/components/haptics';
import { clipFor } from '@/components/how-to/steps';
import { VIDEOS } from '@/components/how-to/videos';
import { Icon } from '@/components/icon';
import { isVariant, variantInfo, type Variant } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { radius, spacing } from '@/theme';

/** Jumps the recording to a step and keeps it playing. (Outside the component: the player is the hook's to change.) */
function seekTo(player: VideoPlayer, seconds: number): void {
  player.currentTime = seconds;
  player.play();
}

/** The recordings are 480 × 1040, a phone screen. */
const ASPECT = 480 / 1040;

/**
 * How to Play: one real hand of the game, recorded on FlipUp's own table, playing on a loop in a phone frame. The
 * captions follow the hand (the deal, each street, the game's own twist, the showdown) with a bar for each, like
 * stories: tap the right of the video for the next step, the left for the one before. Then Play.
 */
export default function HowToPlay() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const variant: Variant = isVariant(id) ? id : 'holdem';
  const info = variantInfo(variant);
  const clip = clipFor(variant);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const player = useVideoPlayer(VIDEOS[variant], (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.timeUpdateEventInterval = 0.1;
    p.play();
  });
  // Also once the view is up: the web build's player drops a play() that comes before its <video> exists.
  useEffect(() => {
    player.play();
  }, [player]);
  const { currentTime } = useEvent(player, 'timeUpdate', { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0 });

  const steps = clip?.steps ?? [];
  const seconds = clip?.seconds ?? 1;
  let index = 0;
  for (let i = 0; i < steps.length; i++) if (currentTime >= steps[i].at) index = i;
  const endOf = (i: number) => (i + 1 < steps.length ? steps[i + 1].at : seconds);

  const go = (i: number) => {
    if (!steps.length) return;
    haptic.tap();
    const next = (i + steps.length) % steps.length;
    seekTo(player, steps[next].at + 0.05);
  };
  const play = () => {
    haptic.tap();
    router.back();
    // From a game's sheet, back is the sheet with its Play buttons; from Home, open that sheet.
    if (from !== 'game') router.push(`/game/${variant}`);
  };

  // As big as the screen allows under the bars and over the caption and the button.
  const room = height - insets.top - insets.bottom - 64 - 190;
  const frameH = Math.max(280, Math.min(room, (width - spacing.xxl * 2) / ASPECT));
  const frameW = frameH * ASPECT;

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.md }}>
      <Stack.Screen options={{ title: `How to play ${info.name}`, headerShown: false }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 44 }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {steps.map((s, i) => {
            const done = i < index ? 1 : i > index ? 0 : Math.min(1, Math.max(0, (currentTime - s.at) / Math.max(0.1, endOf(i) - s.at)));
            return (
              <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.28)' }}>
                <View style={{ width: `${done * 100}%`, height: '100%', backgroundColor: '#ffffff' }} />
              </View>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          onPress={() => {
            haptic.tap();
            router.back();
          }}
          style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.16)', opacity: pressed ? 0.6 : 1 })}
        >
          <Icon name="xmark" size={16} color="#ffffff" />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: frameW + 10, height: frameH + 10, padding: 5, borderRadius: radius.xl + 6, borderCurve: 'continuous', backgroundColor: '#1c1c1e', boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.14)' }}>
          <View style={{ flex: 1, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: '#000000' }}>
            <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} accessible accessibilityLabel={`A hand of ${info.name}, recorded at the table`} />
            {/* Tap the left third for the step before, the rest for the next one. */}
            <View style={{ position: 'absolute', inset: 0, flexDirection: 'row' }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Step before" onPress={() => go(index - 1)} style={{ flex: 1 }} />
              <Pressable accessibilityRole="button" accessibilityLabel="Next step" onPress={() => go(index + 1)} style={{ flex: 2 }} />
            </View>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <View style={{ minHeight: 84, justifyContent: 'center' }} accessibilityLiveRegion="polite">
          <Text maxFontSizeMultiplier={1} style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'center' }}>
            {info.name}
            {steps.length ? ` · ${index + 1} of ${steps.length}` : ''}
          </Text>
          <Animated.Text key={index} entering={reduce ? undefined : FadeIn.duration(220)} maxFontSizeMultiplier={1.3} style={{ marginTop: spacing.xxs, color: '#ffffff', fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center' }}>
            {steps[index]?.text ?? info.rules[0]}
          </Animated.Text>
        </View>
        <Button variant="party" tint="green" size="lg" title={`Play ${info.name}`} onPress={play} />
      </View>
    </View>
  );
}
