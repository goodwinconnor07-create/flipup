import { View } from 'react-native';

import { gradient, party, radius, spacing, useShadows } from '@/theme';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

const CARD = `linear-gradient(150deg, ${party.blue} 0%, #5b3dff 100%)`;

/**
 * Home's one big card: a loud gradient, a heavy "Play" heading, and the two ways in, side by side as chunky white
 * buttons with a bottom edge: with friends (share a code) or with bots (on this phone).
 */
export function PlayCard({ onFriends, onBots }: { onFriends: () => void; onBots: () => void }) {
  const shadow = useShadows();
  return (
    <View
      style={{
        padding: spacing.lg,
        gap: spacing.md,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        boxShadow: shadow.soft,
        ...gradient(CARD),
      }}
    >
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="largeTitle" tone="onColor" accessibilityRole="header">
          Play
        </ThemedText>
        <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.9 }}>
          No-limit Hold&apos;em and its wilder cousins, for play chips.
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Way emoji="🥳" title="With friends" line="Share a code" onPress={onFriends} />
        <Way emoji="🦊" title="With bots" line="On this phone" onPress={onBots} />
      </View>
    </View>
  );
}

function Way({ emoji, title, line, onPress }: { emoji: string; title: string; line: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Play ${title.toLowerCase()}. ${line}`}
      onPress={onPress}
      outerStyle={{ flex: 1 }}
      style={{
        minHeight: 112,
        padding: spacing.sm,
        justifyContent: 'space-between',
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: '#ffffff',
        borderBottomWidth: 4,
        borderBottomColor: party.edge,
      }}
    >
      <ThemedText style={{ fontSize: 34, lineHeight: 40 }} maxFontSizeMultiplier={1}>
        {emoji}
      </ThemedText>
      <View>
        <ThemedText variant="headline" style={{ color: '#000000', fontWeight: '800' }}>
          {title}
        </ThemedText>
        <ThemedText variant="footnote" style={{ color: '#6c6c70' }}>
          {line}
        </ThemedText>
      </View>
    </PressableScale>
  );
}
