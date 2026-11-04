import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { type Variant } from '@/engine';
import { radius, spacing } from '@/theme';

import { GamePicture } from './game-picture';
import { haptic } from './haptics';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

/**
 * A game's wide picture with a How to play pill on it; a tap opens How to Play, a real hand of the game recorded at
 * the table. Used by the game sheet and the Play with friends game popup; How to Play closes back to the sheet.
 */
export function HowToPicture({ variant, name, width }: { variant: Variant; name: string; width: number }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`How to play ${name}`}
      onPress={() => {
        haptic.tap();
        router.push({ pathname: '/how-to-play/[id]', params: { id: variant, from: 'game' } });
      }}
      style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' }}
    >
      <GamePicture variant={variant} width={width} height={(width * 120) / 200} rounded={radius.lg} />
      <View
        style={{
          position: 'absolute',
          left: spacing.sm,
          bottom: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          minHeight: 40,
          paddingLeft: spacing.xxs,
          paddingRight: spacing.md,
          borderRadius: radius.full,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
        }}
      >
        <View
          style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}
        >
          <Icon name="play.fill" size={14} color="#000000" />
        </View>
        <Text maxFontSizeMultiplier={1.3} style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
          How to play
        </Text>
      </View>
    </PressableScale>
  );
}
