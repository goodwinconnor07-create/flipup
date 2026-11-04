import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { StoryStep } from '@/state/range-logic';
import { bb, type Street } from '@train/ranges/model';
import { brand, radius, spacing } from '@/theme';

import { GlassSurface } from '../glass-surface';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { useFadeIn } from './use-fade';

const STREET: Record<Street, string> = { preflop: 'BEFORE THE FLOP', flop: 'THE FLOP', turn: 'THE TURN', river: 'THE RIVER' };

/**
 * The hand told one street at a time: which street, and what happened on it in one line. While it plays, Skip
 * jumps to your move; once it's there, Replay tells it again (not in Blitz, where the clock is running).
 */
export function Story({ step, playing, onSkip, onReplay }: { step: StoryStep; playing: boolean; onSkip: () => void; onReplay: (() => void) | null }) {
  const fade = useFadeIn(step.street);
  return (
    <View style={{ paddingHorizontal: spacing.md, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: step.final ? brand.gold : 'rgba(255,255,255,0.55)' }}>
          {step.final ? `${STREET[step.street]} · YOUR MOVE` : STREET[step.street]}
        </Text>
        {playing ? <Chip icon="forward.fill" label="Skip" onPress={onSkip} /> : onReplay ? <Chip icon="arrow.counterclockwise" label="Replay" onPress={onReplay} /> : null}
      </View>
      <Animated.View style={fade}>
        <Text maxFontSizeMultiplier={1.5} accessibilityLiveRegion="polite" style={{ fontSize: 17, lineHeight: 23, fontWeight: '600', color: '#ffffff' }}>
          {step.line}
        </Text>
      </Animated.View>
    </View>
  );
}

function Chip({ icon, label, onPress }: { icon: 'forward.fill' | 'arrow.counterclockwise'; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label === 'Skip' ? 'Skip to your move' : 'Replay the hand'} onPress={onPress} style={{ borderRadius: radius.full, overflow: 'hidden' }}>
      <GlassSurface interactive style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: spacing.sm, borderRadius: radius.full }}>
        <Icon name={icon} size={12} color="#ffffff" />
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
          {label}
        </Text>
      </GlassSurface>
    </PressableScale>
  );
}

/**
 * The price, as a picture: facing a bet, a bar of the pot with your call in gold and "Pay 28bb to win 79bb", and
 * how often you'd need to win for the call to pay. Otherwise "Check, or bet?", after "You're first to act" when
 * nobody has.
 */
export function Price({ toCall, pot, quiet }: { toCall: number; pot: number; quiet: string }) {
  if (toCall <= 0) {
    return (
      <View style={{ paddingHorizontal: spacing.md }}>
        <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
          {quiet ? `${quiet}. ` : ''}Check, or bet?
        </Text>
      </View>
    );
  }
  const total = pot + toCall;
  const need = Math.round((toCall / total) * 100);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Pay ${bb(toCall)} to win ${bb(pot)}. Calling pays if you win at least ${need}% of the time.`}
      accessibilityHint="What the price means"
      haptics={false}
      onPress={() => router.push({ pathname: '/range-glossary', params: { term: 'price' } })}
      outerStyle={{ paddingHorizontal: spacing.md }}
      style={{ gap: 6 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
          Pay <Text style={{ color: brand.gold }}>{bb(toCall)}</Text> to win {bb(pot)}
        </Text>
        <View style={{ flex: 1 }} />
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>
          need {need}%
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden', backgroundColor: 'rgba(139,109,255,0.45)' }}>
        <View style={{ width: `${need}%`, backgroundColor: brand.gold }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text maxFontSizeMultiplier={1.4} style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
          Calling pays if you win at least {need}% of the time
        </Text>
        <Icon name="questionmark.circle.fill" size={12} color="rgba(255,255,255,0.45)" />
      </View>
    </PressableScale>
  );
}
