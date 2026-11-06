import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { popIn } from '@/motion/presets';

import { RAILS } from '@design/tableLooks';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useTableLook } from '@/state/prefs';
import { bb } from '@train/ranges/model';
import { gradient, spacing } from '@/theme';

import { CardSlot, PlayingCard } from '../table/playing-card';

/** A colour a share of the way to white (or black, for a negative share). */
function shade(hex: string, by: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const mix = (c: number) => Math.round(by >= 0 ? c + (255 - c) * by : c * (1 + by));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * The table under the spotlight: your own felt and rail (Table theme), the board dealt street by street (the cards
 * not out yet are faint outlines), and the pot as a pill with a chip.
 */
export function FeltBoard({ board, shown, pot, width, compact }: { board: string[]; shown: number; pot: number; width: number; compact?: boolean }) {
  const look = useTableLook();
  const reduce = useReduceMotion();
  const rail = RAILS.find((r) => r.id === look.rail) ?? RAILS[0];
  const pad = compact ? spacing.sm : spacing.md;
  const gap = 6;
  const cardW = Math.min(compact ? 46 : 54, Math.floor((width - 12 - pad * 2 - gap * 4) / 5));
  return (
    <View style={{ paddingHorizontal: spacing.md }}>
      <View style={{ borderRadius: 999, padding: 6, ...gradient(`linear-gradient(180deg, ${rail.colors[0]} 0%, ${rail.colors[1]} 100%)`), boxShadow: '0 18px 40px -18px rgba(0,0,0,0.85)' }}>
        <View
          style={{
            borderRadius: 999,
            paddingVertical: compact ? spacing.sm : spacing.md,
            paddingHorizontal: pad,
            alignItems: 'center',
            gap: compact ? spacing.xs : spacing.sm,
            ...gradient(`radial-gradient(ellipse at 50% 35%, ${shade(look.felt, 0.18)} 0%, ${look.felt} 55%, ${shade(look.felt, -0.35)} 100%)`),
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.45)',
          }}
        >
          <View style={{ flexDirection: 'row', gap }} accessibilityLabel={shown ? `Board: ${board.slice(0, shown).join(' ')}` : 'No board cards yet'}>
            {board.map((c, i) => (i < shown ? <PlayingCard key={c} card={c} size="md" width={cardW} flip delay={(i % 3) * 90} /> : <CardSlot key={`slot${i}`} size="md" width={cardW} />))}
          </View>
          <Animated.View key={pot} entering={reduce ? undefined : popIn()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.38)' }}>
            <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#f5b700', borderWidth: 2, borderColor: '#fff3c4' }} />
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 14, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
              Pot {bb(pot)}
            </Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
