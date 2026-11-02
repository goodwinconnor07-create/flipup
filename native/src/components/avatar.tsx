import { Text, View } from 'react-native';

import { useColors } from '@/theme';

import { Icon } from './icon';

/** A person's emoji in a round cell. With no emoji (no profile yet), an empty person outline. */
export function Avatar({ emoji, size = 36 }: { emoji?: string; size?: number }) {
  const colors = useColors();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center' }}>
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
