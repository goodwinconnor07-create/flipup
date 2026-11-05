import { router } from 'expo-router';
import { Text, View } from 'react-native';

import type { IconId } from '@design/gameIcons';
import type { Variant } from '@/engine';
import { gradient, radius, spacing, usePlainColors } from '@/theme';

import { ArtBackdrop, GameIcon, iconCorner } from './game-icon';
import { haptic } from './haptics';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

const ICON = 128;
/** How far the art reaches down the sheet before it has faded into the page. */
const WASH = 330;

/**
 * The top of a game's or solo card's sheet, the way Apple's profile sheet takes its colour from your picture: the
 * icon's art, blurred, fading into the page, the icon big in the middle, then the name and a line, centred. `howTo`
 * adds a How to play capsule (a real hand of that game). It reaches the sheet's edges: put it first in a scroll view
 * padded `spacing.md` at the sides and nothing at the top.
 */
export function SheetHeader({ id, title, line, eyebrow, howTo }: { id: IconId; title: string; line?: string; eyebrow?: string; howTo?: Variant }) {
  const page = usePlainColors().background;
  return (
    <View style={{ marginHorizontal: -spacing.md, alignItems: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: WASH }}>
        <ArtBackdrop id={id} dim={0.08} blur={40} />
        <View style={{ position: 'absolute', inset: 0, ...gradient(`linear-gradient(180deg, ${page}00 0%, ${page}33 40%, ${page} 100%)`) }} />
      </View>
      <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl, paddingHorizontal: spacing.lg }}>
        <View style={{ borderRadius: iconCorner(ICON), borderCurve: 'continuous', boxShadow: '0 16px 32px -10px rgba(0, 0, 0, 0.55)' }}>
          <GameIcon id={id} size={ICON} />
        </View>
        {howTo && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`How to play ${title}`}
            onPress={() => {
              haptic.tap();
              router.push({ pathname: '/how-to-play/[id]', params: { id: howTo, from: 'game' } });
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: 'rgba(0, 0, 0, 0.32)' }}
          >
            <Icon name="play.fill" size={13} color="#ffffff" />
            <Text maxFontSizeMultiplier={1.3} style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
              How to play
            </Text>
          </PressableScale>
        )}
        <View style={{ alignItems: 'center', gap: spacing.xxs }}>
          {eyebrow && (
            <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontWeight: '700', letterSpacing: 0.4, textAlign: 'center' }}>
              {eyebrow.toUpperCase()}
            </ThemedText>
          )}
          <ThemedText variant="title1" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {title}
          </ThemedText>
          {line && (
            <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center' }}>
              {line}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}
