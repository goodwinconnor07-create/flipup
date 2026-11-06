import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useReduceMotion } from '@/motion/use-reduce-motion';
import type { Pile, PileGroup, PileId } from '@/state/range-logic';
import type { Role } from '@train/ranges/model';
import { EASE_IN_OUT, EASE_OUT } from '@/motion/presets';
import { brand, motion, radius, ROUNDED, spacing } from '@/theme';

import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { CardBack, PlayingCard } from '../table/playing-card';
import { MiniRing } from './dial';

export const PILE: Record<PileId, { name: string; line: string; tint: string; back: string }> = {
  behind: { name: 'Beat you', line: 'Hands that are ahead of yours', tint: 'rgba(255,255,255,0.55)', back: 'rgba(255,255,255,0.07)' },
  close: { name: 'Close', line: 'Hands that could go either way', tint: brand.violetDark, back: 'rgba(139,109,255,0.16)' },
  ahead: { name: 'You beat', line: 'Hands yours is ahead of', tint: brand.gold, back: 'rgba(245,183,0,0.14)' },
};

/** What a group of their hands does here, in a word or two. */
export function roleWord(role: Role, facing: boolean): string {
  if (facing) return role === 'value' ? 'Betting for value' : role === 'bluff' ? 'Bluffing' : 'Called';
  return role === 'calls' ? 'Calls a bet' : role === 'folds' ? 'Folds to a bet' : role === 'raises' ? 'Raises a bet' : role === 'value' ? 'Value' : 'Bluff';
}

/**
 * Their range as a deck, not a table: up to three piles of cards (hands that beat you, close ones, hands you
 * beat), each fanned from a real hand in it, sized by its share of their range, with a gold ring for how often you
 * win against it. Tap a pile to open its hands.
 */
export function Piles({ piles, facing, light }: { piles: Pile[]; facing: boolean; light?: boolean }) {
  const [open, setOpen] = useState<PileId | null>(null);
  const reduce = useReduceMotion();
  const ink = light ? '#000000' : '#ffffff';
  const sub = light ? 'rgba(60,60,67,0.6)' : 'rgba(255,255,255,0.6)';
  const shown = piles.find((p) => p.id === open);
  return (
    <Animated.View layout={reduce ? undefined : LinearTransition.duration(motion.base).easing(EASE_IN_OUT)} style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {piles.map((p, i) => (
          <PressableScale
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${PILE[p.id].name}: ${Math.round(p.share * 100)}% of their hands. You win ${Math.round(p.equity * 100)}% against these.`}
            accessibilityState={{ expanded: open === p.id }}
            haptics={false}
            onPress={() => setOpen(open === p.id ? null : p.id)}
            outerStyle={{ flex: 1 }}
            style={{ alignItems: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: 4, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: PILE[p.id].back, borderWidth: open === p.id ? 1.5 : 0, borderColor: PILE[p.id].tint }}
          >
            <MiniFan group={p.groups[0]} share={p.share} delay={i * 120} />
            <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 28, fontWeight: '800', color: ink, fontVariant: ['tabular-nums'] }}>
              {Math.round(p.share * 100)}%
            </Text>
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: PILE[p.id].tint }}>
              {PILE[p.id].name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MiniRing value={p.equity} size={18} />
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 11, fontWeight: '700', color: sub }}>
                you win {Math.round(p.equity * 100)}%
              </Text>
            </View>
          </PressableScale>
        ))}
      </View>
      {shown && (
        <Animated.View entering={FadeIn.duration(motion.base).easing(EASE_OUT)} style={{ gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1, color: sub }}>
            {PILE[shown.id].line.toUpperCase()}
          </Text>
          {shown.groups.map((g) => (
            <GroupRow key={g.label + g.role} group={g} facing={facing} ink={ink} sub={sub} />
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

/** One group: a real hand from it, its name, what it does, and its share of their range. */
export function GroupRow({ group, facing, ink, sub }: { group: PileGroup; facing: boolean; ink: string; sub: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }} accessible accessibilityLabel={`${group.label}, ${roleWord(group.role, facing)}, ${Math.round(group.share * 100)}% of their range. You win ${Math.round(group.equity * 100)}%.`}>
      <View style={{ flexDirection: 'row' }}>
        {group.example ? group.example.map((c, i) => <View key={c} style={{ marginLeft: i ? -8 : 0 }}><PlayingCard card={c} size="sm" width={24} /></View>) : <CardBack w={24} small />}
      </View>
      <View style={{ flex: 1 }}>
        <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 14, fontWeight: '600', color: ink }}>
          {group.label}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 12, color: sub }}>
          {roleWord(group.role, facing)} · you win {Math.round(group.equity * 100)}%
        </Text>
      </View>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 14, fontWeight: '700', color: ink, fontVariant: ['tabular-nums'] }}>
        {Math.round(group.share * 100)}%
      </Text>
    </View>
  );
}

/** A small fan of cards for a pile: a real hand from it face up, with backs behind it; bigger piles fan wider. */
function MiniFan({ group, share, delay }: { group: PileGroup | undefined; share: number; delay: number }) {
  const backs = share > 0.5 ? 3 : share > 0.2 ? 2 : 1;
  return (
    <View style={{ height: 44, width: 64, alignItems: 'center', justifyContent: 'flex-end' }}>
      {Array.from({ length: backs }, (_, i) => (
        <View key={i} style={{ position: 'absolute', bottom: 0, transform: [{ rotate: `${(i - (backs - 1) / 2) * 14 - 10}deg` }, { translateX: -6 }] }}>
          <CardBack w={26} small />
        </View>
      ))}
      {group?.example && (
        <View style={{ flexDirection: 'row', transform: [{ translateX: 8 }] }}>
          {group.example.map((c, i) => (
            <View key={c} style={{ marginLeft: i ? -10 : 0, transform: [{ rotate: i ? '8deg' : '-4deg' }] }}>
              <PlayingCard card={c} size="sm" width={26} flip delay={delay + i * 80} />
            </View>
          ))}
        </View>
      )}
      {!group && <Icon name="questionmark.circle.fill" size={18} color="rgba(255,255,255,0.4)" />}
    </View>
  );
}
