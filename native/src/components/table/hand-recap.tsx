import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { haptic } from '@/components/haptics';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { popIn } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useLastHand, winnersOf } from '@/state/replays';
import { releaseRecap, useTable } from '@/state/session';
import { brand, motion, radius, ROUNDED, spacing } from '@/theme';

const chips = (n: number) => Math.abs(Math.round(n)).toLocaleString('en-US');

/**
 * Replay after every hand (a bots-only house rule): once a hand you played past preflop is over, the table blurs a
 * little and this small card says what you won or lost and who took the pot, faces and names only. The deal waits
 * (`recap` in `session.ts`): Next hand lets it go, Replay opens the hand in the replay screen, and closing that
 * comes back here.
 */
export function HandRecap() {
  const t = useTable();
  const hand = useLastHand();
  const reduce = useReduceMotion();
  if (!t.recap || !hand || hand.id !== t.recap) return null;
  const winners = winnersOf(hand)
    .map((id) => hand.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const net = hand.net;
  const amount = net === 0 ? 'Even' : `${net > 0 ? '+' : '−'}${chips(net)}`;
  const next = () => {
    haptic.tap();
    releaseRecap();
  };
  const replay = () => {
    haptic.tap();
    router.push({ pathname: '/replay/[id]', params: { id: 'last' } });
  };
  return (
    <Animated.View
      entering={FadeIn.duration(motion.base)}
      exiting={FadeOut.duration(motion.exit)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}
    >
      {/* A light blur and a little shade: the table is still there, just out of focus. */}
      <BlurView tint="dark" intensity={12} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)' }} />
      <Animated.View
        entering={reduce ? undefined : popIn()}
        accessibilityViewIsModal
        style={{
          width: '100%',
          maxWidth: 320,
          padding: spacing.lg,
          gap: spacing.md,
          borderRadius: 28,
          borderCurve: 'continuous',
          alignItems: 'center',
          backgroundColor: 'rgba(20,24,40,0.94)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.45)',
        }}
      >
        <View accessible accessibilityLabel={`Hand ${hand.number}. ${net === 0 ? 'You broke even' : net > 0 ? `You won ${chips(net)}` : `You lost ${chips(net)}`}.`} style={{ alignItems: 'center', gap: 2 }}>
          <ThemedText variant="caption1" style={{ color: 'rgba(255,255,255,0.55)', fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Hand {hand.number}
          </ThemedText>
          <ThemedText
            maxFontSizeMultiplier={1.4}
            style={{ fontFamily: ROUNDED, fontSize: 44, lineHeight: 52, fontWeight: '800', fontVariant: ['tabular-nums'], color: net > 0 ? brand.gold : net < 0 ? '#ffffff' : 'rgba(255,255,255,0.7)' }}
          >
            {amount}
          </ThemedText>
        </View>

        {winners.length > 0 && (
          <View accessible accessibilityLabel={`Won by ${winners.map((p) => (p.id === hand.me ? 'you' : p.name)).join(' and ')}`} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs }}>
            {winners.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: spacing.sm, height: 36, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <Text maxFontSizeMultiplier={1} style={{ fontSize: 20, lineHeight: 26 }}>
                  {p.emoji}
                </Text>
                <ThemedText variant="subhead" numberOfLines={1} style={{ maxWidth: 140, fontWeight: '700', color: p.gold ? brand.gold : '#ffffff' }}>
                  {p.id === hand.me ? 'You' : p.name}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Replay hand ${hand.number}`}
            onPress={replay}
            outerStyle={{ flex: 1 }}
            style={{ height: 50, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <ThemedText variant="headline" style={{ color: '#ffffff' }}>
              Replay
            </ThemedText>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            onPress={next}
            outerStyle={{ flex: 1 }}
            style={{ height: 50, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}
          >
            <ThemedText variant="headline" style={{ color: brand.violet, fontWeight: '700' }}>
              Next hand
            </ThemedText>
          </PressableScale>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
