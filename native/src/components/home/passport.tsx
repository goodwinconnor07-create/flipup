import { router } from 'expo-router';
import { Share, Text, View } from 'react-native';

import { usePokerRecord } from '@/state/record';
import { useStreak } from '@/state/streak';
import { gradient, radius, ROUNDED, spacing } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';

const n = (v: number) => v.toLocaleString('en-US');
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * Your poker on one card, after Flighty's Passport: deep blue, small spaced capitals, big rounded numbers, and on
 * Home a bar along the bottom to every stat. Counted on this phone.
 */
export function PassportCard({ full }: { full?: boolean }) {
  const record = usePokerRecord();
  const streak = useStreak();
  const wins = record.games.filter((g) => g.place === 1).length;
  const share = () => {
    haptic.tap();
    void Share.share({ message: `My FlipUp poker: ${n(record.hands)} hands, ${n(record.won)} pots won (${pct(record.won, record.hands)}%), biggest pot ${n(record.biggestPot)}.` });
  };
  return (
    <View style={{ padding: spacing.lg, gap: spacing.lg, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', ...gradient('linear-gradient(160deg, #1b1f6b 0%, #120f3d 55%, #1d3a8a 100%)') }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 1.5, color: '#ffffff' }}>
            YOUR POKER
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1.2, color: 'rgba(255,255,255,0.65)' }}>
            ALL-TIME · ON THIS PHONE
          </Text>
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel="Share your stats" onPress={share} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="square.and.arrow.up" size={20} color="#ffffff" />
        </PressableScale>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat label="Hands" value={n(record.hands)} note={`${n(record.won)} won`} big />
        <Stat label="Win rate" value={`${pct(record.won, record.hands)}%`} note="of hands you played" big />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat label="Biggest pot" value={n(record.biggestPot)} grow={1.6} />
        <Stat label="Games" value={n(record.games.length)} />
        <Stat label={full ? 'Wins' : 'Streak'} value={full ? n(wins) : `${streak.days}d`} />
      </View>

      {!full && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="All your stats"
          onPress={() => {
            haptic.tap();
            router.push('/stats');
          }}
          style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
        >
          <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontSize: 17, fontWeight: '600', color: '#ffffff' }}>
            All stats
          </Text>
          <Icon name="chevron.right" size={15} color="#ffffff" />
        </PressableScale>
      )}
    </View>
  );
}

function Stat({ label, value, note, big, grow = 1 }: { label: string; value: string; note?: string; big?: boolean; grow?: number }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`} style={{ flex: grow, gap: 2 }}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: big ? 44 : 28, lineHeight: big ? 50 : 34, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      {note && (
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>
          {note}
        </Text>
      )}
    </View>
  );
}
