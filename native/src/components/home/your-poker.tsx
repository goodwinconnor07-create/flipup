import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { variantInfo } from '@/engine';
import type { GameLine } from '@/state/record';
import { gradient, radius, spacing, useColors } from '@/theme';

import { GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';

const place = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

function ago(at: number): string {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Your last game: the game, where you finished and when, and a tap back into it. */
export function LastGame({ line }: { line: GameLine }) {
  const colors = useColors();
  const info = variantInfo(line.variant);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Play ${info.name} again. You finished ${place(line.place)} of ${line.players}`}
      onPress={() => {
        haptic.tap();
        router.push(`/game/${line.variant}`);
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell }}
    >
      <GameThumb variant={line.variant} size={48} />
      <View style={{ flex: 1 }}>
        <ThemedText variant="headline" numberOfLines={1}>
          {info.name}
        </ThemedText>
        <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
          {line.place === 1 ? 'You won' : `${place(line.place)} of ${line.players}`} · {ago(line.at)}
        </ThemedText>
      </View>
      <View style={{ paddingHorizontal: spacing.md, minHeight: 36, justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.accent }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
          Play again
        </Text>
      </View>
    </PressableScale>
  );
}

/** Before your first hand: Texas Hold'em's How to Play, step by step on the app's own table. */
export function FirstHand() {
  const [top, bottom] = gameLook('holdem').card;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="How to play Texas Hold'em"
      onPress={() => {
        haptic.tap();
        router.push('/how-to-play/holdem');
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', ...gradient(`linear-gradient(150deg, ${top} 0%, ${bottom} 100%)`) }}
    >
      <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <Icon name="play.fill" size={22} color={bottom} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="title3" tone="onColor">
          How to play
        </ThemedText>
        <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.85 }}>
          Texas Hold&apos;em, step by step
        </ThemedText>
      </View>
      <Icon name="chevron.right" size={16} color="#ffffff" />
    </PressableScale>
  );
}
