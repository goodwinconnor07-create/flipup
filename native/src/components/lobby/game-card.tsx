import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { gameLook } from '@design/gameArt';
import { variantInfo, type Variant } from '@/engine';
import { ROUNDED, spacing, useIncreaseContrast, useLobbyTint } from '@/theme';

import { PANEL_RADIUS } from '../grouped-list';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { Swap } from '../swap';
import { ThemedText } from '../themed-text';
import { GameBanner } from './game-banner';

/** Soft dark behind the words, so they read over the scene and anything drifting past. */
const LIFT = { textShadowColor: 'rgba(0, 0, 0, 0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 } as const;

/**
 * What the table plays, as a living scene (21 Nov 2026, the owner's ask, from a reference card where the picture is the
 * whole card and snow drifts over it): the game's own picture drawn big on the left in its world, with its parts
 * moving and its particles drifting over everything (`GameBanner`), and on the right a small GAME MODE over its name,
 * its mood line and "How it plays". The host's card is one big button with a chevron that opens the `lobby-game`
 * sheet; a guest's only offers How it plays.
 */
export function GameCard({ variant, host, table = false }: { variant: Variant; host: boolean; /** Change sets the open table's game, not the setup draft. */ table?: boolean }) {
  const contrast = useIncreaseContrast();
  const tint = useLobbyTint();
  const info = variantInfo(variant);
  const { width: screen } = useWindowDimensions();
  // The picture's square is the card's height on a 390pt phone, a little smaller on narrow ones, so the words keep room.
  const unit = Math.max(1, Math.min(1.34, (screen - 40) * 0.0037));
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const change = () => {
    haptic.tap();
    router.push(table ? { pathname: '/lobby-game', params: { table: '1' } } : '/lobby-game');
  };
  const howTo = () => {
    haptic.tap();
    router.push({ pathname: '/how-to-play/[id]', params: { id: variant, from: 'game' } });
  };
  return (
    <Pressable
      accessibilityRole={host ? 'button' : undefined}
      accessibilityLabel={`Game mode, ${info.name}. ${gameLook(variant).mood}`}
      accessibilityHint={host ? 'Change the game' : undefined}
      // The card is one element to VoiceOver, so How it plays is offered as its action too.
      accessibilityActions={[{ name: 'howto', label: `How ${info.name} plays` }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'howto' && howTo()}
      disabled={!host}
      onPress={change}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (!size || Math.abs(size.w - w) > 0.5 || Math.abs(size.h - h) > 0.5) setSize({ w, h });
      }}
      style={{ borderRadius: PANEL_RADIUS, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: gameLook(variant).band }}
    >
      {({ pressed }) => (
        <>
          {size && <GameBanner variant={variant} width={size.w} height={size.h} unit={unit} />}
          {/* Rows highlight rather than shrink. */}
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.1)', opacity: pressed ? 1 : 0 }} />
          <View style={{ minHeight: 100 * unit, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingLeft: 104 * unit, paddingRight: spacing.md, paddingVertical: spacing.md }}>
            <View style={{ flex: 1, gap: 1 }}>
              <ThemedText variant="caption2" style={{ ...LIFT, color: 'rgba(255, 255, 255, 0.75)', fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                Game mode
              </ThemedText>
              {/* Stretched, so the words wrap at the column's edge instead of running under the mask. */}
              <Swap id={variant} kind="text" slide={12} style={{ alignSelf: 'stretch', alignItems: 'stretch' }}>
                <View style={{ gap: 1 }}>
                  <ThemedText variant="title3" numberOfLines={2} style={{ ...LIFT, color: '#ffffff', fontFamily: ROUNDED, fontWeight: '800' }}>
                    {info.name}
                  </ThemedText>
                  <ThemedText variant="footnote" numberOfLines={3} style={{ ...LIFT, color: 'rgba(255, 255, 255, 0.85)' }}>
                    {gameLook(variant).mood}
                  </ThemedText>
                </View>
              </Swap>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`How ${info.name} plays`}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                onPress={howTo}
                style={({ pressed: down }) => ({ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', marginTop: spacing.xxs, opacity: down ? 0.5 : 1 })}
              >
                <ThemedText variant="footnote" style={{ ...LIFT, fontWeight: '600', color: tint.link }}>
                  How it plays
                </ThemedText>
                <Icon name="chevron.right" size={11} color={tint.link} weight="semibold" />
              </Pressable>
            </View>
            {host && <Icon name="chevron.right" size={17} color="rgba(255, 255, 255, 0.9)" weight="semibold" />}
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, borderRadius: PANEL_RADIUS, borderCurve: 'continuous', borderWidth: 1, borderColor: contrast ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.16)' }} />
        </>
      )}
    </Pressable>
  );
}
