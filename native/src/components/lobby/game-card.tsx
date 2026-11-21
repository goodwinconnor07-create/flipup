import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { variantInfo, type Variant } from '@/engine';
import { ROUNDED, spacing, useLobbyTint } from '@/theme';

import { GameThumb } from '../game-picture';
import { PANEL_RADIUS, usePanel } from '../grouped-list';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { ThemedText } from '../themed-text';
import { showDemo } from '../demo/show';
import { TextButton } from './code-card';

/**
 * What the table plays: the game's icon, a small GAME MODE over its name and its mood line, and Change (the host's)
 * that opens the `lobby-game` sheet. Demo, under the mood line, opens the game's Demo (a hand on the real table with a
 * coach), whose finish card comes back here.
 */
export function GameCard({ variant, host, table = false }: { variant: Variant; host: boolean; /** Change sets the open table's game, not the setup draft. */ table?: boolean }) {
  const panel = usePanel();
  const tint = useLobbyTint();
  const info = variantInfo(variant);
  const change = () => {
    haptic.tap();
    router.push(table ? { pathname: '/lobby-game', params: { table: '1' } } : '/lobby-game');
  };
  const demo = () => showDemo(variant, 'lobby');
  return (
    <Pressable
      accessibilityRole={host ? 'button' : undefined}
      accessibilityLabel={`Game mode, ${info.name}. ${gameLook(variant).mood}`}
      accessibilityHint={host ? 'Change the game' : undefined}
      // The card is one element to VoiceOver, so the Demo is offered as its action too.
      accessibilityActions={[{ name: 'demo', label: `Demo of ${info.name}` }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'demo' && demo()}
      disabled={!host}
      onPress={change}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: PANEL_RADIUS,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: panel.edge,
        backgroundColor: pressed ? panel.pressed : panel.fill,
      })}
    >
      <GameThumb variant={variant} size={52} />
      <View style={{ flex: 1, gap: 1 }}>
        <ThemedText variant="caption2" tone="secondaryLabel" style={{ fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Game mode
        </ThemedText>
        <ThemedText variant="title3" numberOfLines={1} style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          {info.name}
        </ThemedText>
        <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={2}>
          {gameLook(variant).mood}
        </ThemedText>
        {/* The Demo, inside the card with the rest of the game (19 Nov 2026: on its own a link read as a stray). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Demo: play a hand of ${info.name}`}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          onPress={demo}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: spacing.xxs, opacity: pressed ? 0.5 : 1 })}
        >
          <Icon name="play.fill" size={10} color={tint.link} weight="semibold" />
          <ThemedText variant="footnote" style={{ fontWeight: '600', color: tint.link }}>
            Demo
          </ThemedText>
        </Pressable>
      </View>
      {host && <TextButton title="Change" onPress={change} label="Change the game" />}
    </Pressable>
  );
}
