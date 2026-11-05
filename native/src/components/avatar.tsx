import { Text, View } from 'react-native';

import { useColors } from '@/theme';

import { Icon } from './icon';

/**
 * A person's emoji in a round cell. With no emoji (no profile yet), an empty person outline. `onColour` is for an
 * avatar on a coloured wash (a profile sheet): a see-through white disc with a soft shadow instead of the grey cell.
 */
export function Avatar({ emoji, size = 36, onColour }: { emoji?: string; size?: number; onColour?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: onColour ? 'rgba(255, 255, 255, 0.24)' : colors.cell,
        boxShadow: onColour ? '0 12px 28px -12px rgba(0, 0, 0, 0.45)' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {emoji ? (
        <Text style={{ fontSize: size * 0.6 }} maxFontSizeMultiplier={1}>
          {emoji}
        </Text>
      ) : (
        <Icon name="person.fill" size={size * 0.5} color={colors.tertiaryLabel} />
      )}
    </View>
  );
}
