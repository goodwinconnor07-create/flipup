import { View } from 'react-native';

import { PlayingCard } from '@/components/table/playing-card';
import { CARD_PACKS } from '@/engine';

/** The fan of every Premium card back: the top of the Premium offer and Home's Premium slide. */
export function CardFan({ scale = 1 }: { scale?: number }) {
  const packs = CARD_PACKS.filter((p) => !p.venue);
  const mid = (packs.length - 1) / 2;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height: 120, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', transform: [{ scale }] }}>
      {packs.map((p, i) => (
        <View key={p.id} style={{ marginHorizontal: -14, transform: [{ rotate: `${(i - mid) * 6}deg` }, { translateY: Math.abs(i - mid) * 3 }] }}>
          <PlayingCard back size="md" pack={p.id} />
        </View>
      ))}
    </View>
  );
}
