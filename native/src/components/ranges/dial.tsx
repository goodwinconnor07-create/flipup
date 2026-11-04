import { Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { brand, ROUNDED } from '@/theme';

import { useCountTo } from './count-up';

/**
 * Your chance to win as a ring that fills, against the price as a gold notch on it: when the fill passes the notch,
 * calling pays. With no price (nobody's bet), the ring is just your chance to win at a showdown now.
 */
export function OddsDial({ equity, price, size = 112, delay = 250 }: { equity: number; price: number | null; size?: number; delay?: number }) {
  const shown = useCountTo(equity, { delay, ms: 1000 });
  const stroke = Math.round(size * 0.09);
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  const enough = price == null || equity >= price;
  const fill = enough ? brand.gold : brand.violetDark;
  // The notch: a short line across the ring at the price, measured clockwise from the top.
  const a = price == null ? 0 : price * 2 * Math.PI - Math.PI / 2;
  const inner = r - stroke * 0.9;
  const outer = r + stroke * 0.9;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={price == null ? `You win ${Math.round(equity * 100)}% at a showdown` : `You win ${Math.round(equity * 100)}%, you need ${Math.round(price * 100)}%`}>
      <Svg width={size} height={size}>
        <Circle cx={mid} cy={mid} r={r} stroke="rgba(255,255,255,0.13)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={mid}
          cy={mid}
          r={r}
          stroke={fill}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - Math.max(0.001, shown))}
          transform={`rotate(-90 ${mid} ${mid})`}
        />
        {price != null && <Line x1={mid + inner * Math.cos(a)} y1={mid + inner * Math.sin(a)} x2={mid + outer * Math.cos(a)} y2={mid + outer * Math.sin(a)} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />}
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text maxFontSizeMultiplier={1.1} style={{ fontFamily: ROUNDED, fontSize: size * 0.26, lineHeight: size * 0.3, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
          {Math.round(shown * 100)}%
        </Text>
        <Text maxFontSizeMultiplier={1.1} style={{ fontSize: size * 0.1, fontWeight: '700', color: 'rgba(255,255,255,0.65)' }}>
          you win
        </Text>
      </View>
    </View>
  );
}

/** A small ring for a pile: how often you win against it, in gold. */
export function MiniRing({ value, size = 30 }: { value: number; size?: number }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  return (
    <Svg width={size} height={size}>
      <Circle cx={mid} cy={mid} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} fill="none" />
      {value > 0.005 && <Circle cx={mid} cy={mid} r={r} stroke={brand.gold} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - value)} transform={`rotate(-90 ${mid} ${mid})`} />}
    </Svg>
  );
}
