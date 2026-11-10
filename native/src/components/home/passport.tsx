import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { usePokerRecord } from '@/state/record';
import { cardColors, radius, ROUNDED, spacing } from '@/theme';

import { haptic } from '../haptics';
import { LivingCard } from '../living-card';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { useStatsShare } from './share-card';

const n = (v: number) => v.toLocaleString('en-US');
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * Your poker on one card, after Flighty's Passport: deep blue, small spaced capitals, big rounded numbers, and on
 * Home a bar along the bottom to every stat. Counted on this phone.
 */
export function PassportCard({ full }: { full?: boolean }) {
  const record = usePokerRecord();
  const wins = record.games.filter((g) => g.place === 1).length;
  const { share, card, busy } = useStatsShare();
  return (
    <LivingCard colors={cardColors.night} style={{ padding: spacing.lg, gap: spacing.lg }}>
      {card}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 1.5, color: '#ffffff' }}>
            YOUR POKER
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 13, fontWeight: '600', letterSpacing: 1.2, color: 'rgba(255,255,255,0.65)' }}>
            ALL-TIME · ON THIS PHONE
          </Text>
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel="Share your stats as a picture" haptics={false} onPress={() => void share()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', opacity: busy ? 0.5 : 1 }}>
          <Icon name="square.and.arrow.up" size={19} color="#ffffff" />
        </PressableScale>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat label="Hands" value={n(record.hands)} note={`${n(record.won)} won`} big />
        <Stat label="Win rate" value={`${pct(record.won, record.hands)}%`} note="of hands you played" big />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat label="Biggest pot" value={n(record.biggestPot)} grow={1.6} />
        <Stat label="Games" value={n(record.games.length)} />
        <Stat label="Table wins" value={n(wins)} />
      </View>

      {!full && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="All your stats"
          onPress={() => {
            haptic.tap();
            router.push('/stats');
          }}
          style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.lg, borderRadius: radius.full, backgroundColor: 'rgba(255, 255, 255, 0.16)' }}
        >
          <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontFamily: ROUNDED, fontSize: 17, fontWeight: '700', color: '#ffffff' }}>
            All stats
          </Text>
          <Icon name="chevron.right" size={15} color="#ffffff" />
        </PressableScale>
      )}
    </LivingCard>
  );
}

export function Stat({ label, value, note, big, grow = 1 }: { label: string; value: string; note?: string; big?: boolean; grow?: number }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`} style={{ flex: grow, gap: 2 }}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 13, fontWeight: '600', letterSpacing: 1, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: big ? 44 : 28, lineHeight: big ? 50 : 34, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      {note && (
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>
          {note}
        </Text>
      )}
    </View>
  );
}
