import { SymbolView } from 'expo-symbols';
import { Text, View, type ColorValue } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { radius } from '@/theme';

/** The coloured square at the start of a Settings row, with a white SF Symbol in it (an emoji where there are no symbols). */
export function IconSquare({ symbol, color, fallback, size = 29 }: { symbol: SFSymbol; color: ColorValue; fallback: string; size?: number }) {
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
      <SymbolView name={symbol} tintColor="#ffffff" size={size * 0.62} weight="semibold" fallback={<FallbackGlyph glyph={fallback} size={size} />} />
    </View>
  );
}

function FallbackGlyph({ glyph, size }: { glyph: string; size: number }) {
  return <Text style={{ fontSize: size * 0.55, color: '#ffffff' }}>{glyph}</Text>;
}
