import { View, type ColorValue } from 'react-native';

import { radius } from '@/theme';

import { Icon, type IconName } from './icon';

/** The coloured square at the start of a Settings row, with a white SF Symbol in it. */
export function IconSquare({ symbol, color, size = 29 }: { symbol: IconName; color: ColorValue; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.sm * (size / 36),
        borderCurve: 'continuous',
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={symbol} size={size * 0.6} color="#ffffff" />
    </View>
  );
}
