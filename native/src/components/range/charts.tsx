// The small charts the Stats dashboard is made of, drawn with react-native-svg: a half-circle gauge, a donut, a
// ring with a number in it, and a row of bars. No chart library; each is a few shapes.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/theme';

const NUM = { fontVariant: ['tabular-nums' as const] };

/** A half-circle gauge filled to `value` (0 to 1), with `children` in the hollow. */
export function Gauge({ value, color, width = 150, children }: { value: number; color: string; width?: number; children?: ReactNode }) {
  const colors = useColors();
  const stroke = 14;
  const r = (width - stroke) / 2;
  const arc = `M ${stroke / 2} ${r + stroke / 2} A ${r} ${r} 0 0 1 ${width - stroke / 2} ${r + stroke / 2}`;
  const len = Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width, height: r + stroke, alignItems: 'center' }}>
      <Svg width={width} height={r + stroke}>
        <Path d={arc} stroke={colors.cellPressed as string} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        {v > 0 && <Path d={arc} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${len * v} ${len}`} />}
      </Svg>
      <View style={{ position: 'absolute', bottom: 0, alignItems: 'center' }}>{children}</View>
    </View>
  );
}

/** Rings split into parts: each part is `value` of the whole, drawn in its colour, starting at the top. */
export function Donut({ parts, size = 110, stroke = 14, children }: { parts: { value: number; color: string }[]; size?: number; stroke?: number; children?: ReactNode }) {
  const colors = useColors();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = parts.reduce((n, p) => n + p.value, 0);
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.cellPressed as string} strokeWidth={stroke} fill="none" />
        {total > 0 &&
          parts.map((p, i) => {
            const len = (p.value / total) * c;
            const el = <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={p.color} strokeWidth={stroke} fill="none" strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>{children}</View>
    </View>
  );
}

/** One ring filled to `value`, with the percentage in the middle and a label under it. */
export function RateRing({ value, color, label, size = 64 }: { value: number; color: string; label: string; size?: number }) {
  return (
    <View accessibilityLabel={`${label}: ${Math.round(value * 100)}%`} style={{ alignItems: 'center', gap: 4 }}>
      <Donut parts={[{ value, color }, { value: 1 - value, color: 'transparent' }]} size={size} stroke={7}>
        <ThemedText variant="footnote" style={[{ fontWeight: '800' }, NUM]}>
          {Math.round(value * 100)}
        </ThemedText>
      </Donut>
      <ThemedText variant="caption1" tone="secondaryLabel" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}
