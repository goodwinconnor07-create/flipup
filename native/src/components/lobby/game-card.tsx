import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { variantInfo, type Variant } from '@/engine';
import { brand, radius, ROUNDED, spacing, useColors } from '@/theme';

import { GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { ThemedText } from '../themed-text';
import { TextButton } from './code-card';

/**
 * What the table plays: the game's icon, a small GAME MODE over its name and its mood line, and Change (the host's)
 * that opens the `lobby-game` sheet. Under the card, "How <game> plays" opens the How to Play story.
 */
export function GameCard({ variant, host }: { variant: Variant; host: boolean }) {
  const colors = useColors();
  const info = variantInfo(variant);
  const change = () => {
    haptic.tap();
    router.push('/lobby-game');
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityRole={host ? 'button' : undefined}
        accessibilityLabel={`Game mode, ${info.name}. ${gameLook(variant).mood}`}
        accessibilityHint={host ? 'Change the game' : undefined}
        disabled={!host}
        onPress={change}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: pressed ? colors.cellPressed : colors.cell,
        })}
      >
        <GameThumb variant={variant} size={52} />
        <View style={{ flex: 1, gap: 1 }}>
          <ThemedText
            variant="caption2"
            tone="secondaryLabel"
            style={{ fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}
          >
            Game mode
          </ThemedText>
          <ThemedText variant="title3" numberOfLines={1} style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
            {info.name}
          </ThemedText>
          <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={2}>
            {gameLook(variant).mood}
          </ThemedText>
        </View>
        {host && <TextButton title="Change" onPress={change} label="Change the game" />}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`How ${info.name} plays`}
        hitSlop={8}
        onPress={() => {
          haptic.tap();
          router.push({ pathname: '/how-to-play/[id]', params: { id: variant, from: 'game' } });
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.xxs,
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <ThemedText variant="callout" style={{ fontWeight: '600', color: brand.violetDark }}>
          How {info.name} plays
        </ThemedText>
        <Icon name="chevron.right" size={13} color={brand.violetDark} weight="semibold" />
      </Pressable>
    </View>
  );
}
