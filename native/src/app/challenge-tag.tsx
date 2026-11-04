import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { SheetScroll } from '@/components/sheet-scroll';
import { ThemedText } from '@/components/themed-text';
import { LABELS, type Label } from '@/engine';
import { tagBot, useTable } from '@/state/session';
import { brand, minTap, radius, spacing, useColors } from '@/theme';

/** Style Detective: tag a bot's seat with the style you think it plays. Only a note to yourself until a check. */
export default function ChallengeTag() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTable();
  const colors = useColors();
  const player = t.game?.players.find((p) => p.id === id && p.bot);
  if (!player || t.challenge?.id !== 'detective') return null;
  const current = t.challenge.tags[player.id];
  const pick = (label: Label | null) => {
    haptic.select();
    tagBot(player.id, label);
    router.back();
  };
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Stack.Screen options={{ title: `Tag ${player.name}` }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ fontSize: 40 }} maxFontSizeMultiplier={1} accessible={false}>
          {player.emoji}
        </Text>
        <ThemedText variant="title2" style={{ flex: 1 }}>
          How does {player.name} play?
        </ThemedText>
      </View>
      <View style={{ gap: spacing.xs }}>
        {LABELS.map((l) => {
          const on = current === l.id;
          return (
            <Pressable
              key={l.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${l.name}. ${l.blurb}`}
              onPress={() => pick(l.id)}
              style={({ pressed }) => ({ minHeight: minTap + 12, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: pressed ? colors.cellPressed : colors.cell })}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="headline">{l.name}</ThemedText>
                <ThemedText variant="subhead" tone="secondaryLabel">
                  {l.blurb}
                </ThemedText>
              </View>
              {on && <Icon name="checkmark" size={18} color={brand.violet} />}
            </Pressable>
          );
        })}
      </View>
      {current && (
        <Pressable accessibilityRole="button" onPress={() => pick(null)} hitSlop={8} style={{ alignSelf: 'center', minHeight: minTap, justifyContent: 'center' }}>
          <ThemedText tone="accent">Clear the tag</ThemedText>
        </Pressable>
      )}
    </SheetScroll>
  );
}
