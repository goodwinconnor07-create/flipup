import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { usePokerRecord, type PokerRecord } from '@/state/record';
import { bbLabel } from '@/state/record-stats';
import { cardColors, radius, ROUNDED, spacing } from '@/theme';

import { haptic } from '../haptics';
import { LivingCard } from '../living-card';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';

const n = (v: number) => v.toLocaleString('en-US');
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * Your poker on one card, after Flighty's Passport: deep blue, small spaced capitals, big rounded numbers, and on
 * the You tab a bar along the bottom to every stat. Counted on this phone. `compact` (the You tab, 23 Nov 2026, the
 * owner: the full card filled the screen) is about half the height: three numbers in one row, games and table wins
 * folded into the All stats bar.
 */
export function PassportCard({ full, compact, record: shown, scope = 'ALL-TIME' }: { full?: boolean; /** Half the height: one row of three numbers. */ compact?: boolean; /** What to count (Stats passes one mode's); your whole record when left out. */ record?: PokerRecord; /** The small line under the title: "ALL-TIME", "TEXAS HOLD'EM"... */ scope?: string }) {
  const own = usePokerRecord();
  const record = shown ?? own;
  const wins = record.games.filter((g) => g.place === 1).length;
  if (compact) return <CompactPassport record={record} wins={wins} scope={scope} />;
  return (
    <LivingCard colors={cardColors.night} style={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 1.5, color: '#ffffff' }}>
            YOUR POKER
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '600', letterSpacing: 1.2, color: 'rgba(255,255,255,0.65)' }}>
            {scope} · ON THIS PHONE
          </Text>
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel="Share cards: your stats, top hands and games" onPress={() => router.push('/share')} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}>
          <Icon name="square.and.arrow.up" size={19} color="#ffffff" />
        </PressableScale>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat label="Hands" value={n(record.hands)} note={`${n(record.won)} won`} big />
        <Stat label="Win rate" value={`${pct(record.won, record.hands)}%`} note="of hands you played" big />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat label="Biggest pot" value={bbLabel(record.biggestPot)} grow={1.6} />
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
          style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
        >
          <Text maxFontSizeMultiplier={1.3} style={{ flex: 1, fontSize: 17, fontWeight: '600', color: '#ffffff' }}>
            All stats
          </Text>
          <Icon name="chevron.right" size={15} color="#ffffff" />
        </PressableScale>
      )}
    </LivingCard>
  );
}

export function Stat({ label, value, note, big, small, grow = 1 }: { label: string; value: string; note?: string; big?: boolean; /** The compact card's size: smaller label and number. */ small?: boolean; grow?: number }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`} style={{ flex: grow, gap: 2 }}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit={small} minimumFontScale={0.85} style={{ fontSize: small ? 11 : 13, fontWeight: '600', letterSpacing: small ? 0.8 : 1, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: ROUNDED, fontSize: big ? 44 : small ? 26 : 28, lineHeight: big ? 50 : small ? 31 : 34, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
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

/** The You tab's card: the title row, then hands, win rate and biggest pot in one row, then All stats with games and wins. */
function CompactPassport({ record, wins, scope }: { record: PokerRecord; wins: number; scope: string }) {
  const games = record.games.length;
  const more = games ? `${n(games)} ${games === 1 ? 'game' : 'games'} · ${n(wins)} won` : undefined;
  return (
    <LivingCard colors={cardColors.night} style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 1 }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: ROUNDED, fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: 1.2, color: '#ffffff' }}>
            YOUR POKER
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, color: 'rgba(255,255,255,0.65)' }}>
            {scope} · ON THIS PHONE
          </Text>
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel="Share cards: your stats, top hands and games" onPress={() => router.push('/share')} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}>
          <Icon name="square.and.arrow.up" size={17} color="#ffffff" />
        </PressableScale>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Stat label="Hands" value={n(record.hands)} small />
        <Stat label="Win rate" value={`${pct(record.won, record.hands)}%`} small />
        <Stat label="Biggest pot" value={bbLabel(record.biggestPot)} grow={1.3} small />
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={more ? `All your stats. ${more}` : 'All your stats'}
        onPress={() => {
          haptic.tap();
          router.push('/stats');
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
      >
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
          All stats
        </Text>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ flex: 1, textAlign: 'right', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
          {more ?? ''}
        </Text>
        <Icon name="chevron.right" size={13} color="#ffffff" />
      </PressableScale>
    </LivingCard>
  );
}
