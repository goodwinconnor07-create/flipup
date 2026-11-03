import { Stack } from 'expo-router';
import { ScrollView, Share, Text, View } from 'react-native';

import { haptic } from '@/components/haptics';
import { PassportCard } from '@/components/home/passport';
import { Icon } from '@/components/icon';
import { GameThumb } from '@/components/game-picture';
import { PressableScale } from '@/components/pressable-scale';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { variantInfo, type Variant } from '@/engine';
import { usePokerRecord, type PokerRecord } from '@/state/record';
import { useStreakInfo } from '@/state/streak';
import { gradient, radius, ROUNDED, spacing, useColors } from '@/theme';

const n = (v: number) => v.toLocaleString('en-US');
const place = (p: number) => (p === 1 ? '1st' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`);

/**
 * Your stats, the way Flighty's Passport shows a year of flying: one big all-time card, then a card each for what
 * stands out (your best hand, your streak), then the games you play and how you finished. Everything here is
 * counted on this phone (`flipup.record`, `flipup.days`).
 */
export default function StatsScreen() {
  const record = usePokerRecord();
  const streak = useStreakInfo();
  const colors = useColors();
  return (
    <>
      <Stack.Screen options={{ title: 'Your stats', headerLargeTitleEnabled: false }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md, width: '100%', maxWidth: 560 + spacing.md * 2, alignSelf: 'center' }}>
        <PassportCard full />

        {record.best && (
          <Card colors={['#7a1f1f', '#3d0b0b']} label="Best hand" onShare={() => share(`My best hand on FlipUp: ${record.best?.name}.`)}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {record.best.cards.map((c) => (
                <PlayingCard key={c} card={c} size="md" width={52} />
              ))}
            </View>
            <Big>{record.best.name}</Big>
            <Faint>{variantInfo(record.best.variant).name}, at a showdown</Faint>
          </Card>
        )}

        {streak.total > 0 && (
        <Card colors={['#b4500c', '#5a2002']} label="Streak" onShare={() => share(`I'm on a ${streak.days}-day poker streak on FlipUp.`)}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 64, lineHeight: 70, fontWeight: '800', color: '#ffffff' }}>
            {streak.days}
          </Text>
          <Big>{streak.days === 1 ? 'day in a row' : 'days in a row'}</Big>
          <Faint>
            Longest {streak.best} · {streak.total} {streak.total === 1 ? 'day' : 'days'} played
          </Faint>
        </Card>
        )}

        <GamesYouPlay record={record} />

        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center', paddingTop: spacing.sm, color: colors.tertiaryLabel }}>
          Counted on this phone. Play chips only.
        </ThemedText>
      </ScrollView>
    </>
  );
}

function share(message: string) {
  haptic.tap();
  void Share.share({ message });
}

/** A big gradient card with a small caps label and a share button, like each of Flighty's report cards. */
function Card({ colors: [top, bottom], label, onShare, children }: { colors: [string, string]; label: string; onShare?: () => void; children: React.ReactNode }) {
  return (
    <View style={{ padding: spacing.lg, gap: spacing.sm, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', ...gradient(`linear-gradient(160deg, ${top} 0%, ${bottom} 100%)`) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 32 }}>
        <Text maxFontSizeMultiplier={1.2} style={{ flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>
          {label}
        </Text>
        {onShare && (
          <PressableScale accessibilityRole="button" accessibilityLabel={`Share your ${label.toLowerCase()}`} onPress={onShare} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="square.and.arrow.up" size={20} color="#ffffff" />
          </PressableScale>
        )}
      </View>
      {children}
    </View>
  );
}

const Big = ({ children }: { children: React.ReactNode }) => (
  <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 24, lineHeight: 30, fontWeight: '700', color: '#ffffff' }}>
    {children}
  </Text>
);
const Faint = ({ children }: { children: React.ReactNode }) => (
  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, lineHeight: 22, color: 'rgba(255,255,255,0.7)' }}>
    {children}
  </Text>
);

/** Which games you've played lately, most played first, and where you finished in each. */
function GamesYouPlay({ record }: { record: PokerRecord }) {
  const colors = useColors();
  if (!record.games.length) return null;
  const by = new Map<Variant, { games: number; wins: number; bestPlace: number }>();
  for (const g of record.games) {
    const row = by.get(g.variant) ?? { games: 0, wins: 0, bestPlace: 99 };
    by.set(g.variant, { games: row.games + 1, wins: row.wins + (g.place === 1 ? 1 : 0), bestPlace: Math.min(row.bestPlace, g.place) });
  }
  const rows = [...by.entries()].sort((a, b) => b[1].games - a[1].games);
  return (
    <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
      <ThemedText variant="title2" accessibilityRole="header">
        Games you play
      </ThemedText>
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.cell }}>
        {rows.map(([v, r], i) => (
          <View key={v} accessible accessibilityLabel={`${variantInfo(v).name}: ${r.games} games, ${r.wins} won`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingLeft: spacing.md, borderTopWidth: i ? 0.5 : 0, borderTopColor: colors.separator }}>
            <GameThumb variant={v} size={44} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="headline" numberOfLines={1}>
                {variantInfo(v).name}
              </ThemedText>
              <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
                {r.games} {r.games === 1 ? 'game' : 'games'} · best {place(r.bestPlace)}
              </ThemedText>
            </View>
            {r.wins > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="trophy.fill" size={15} color={colors.gold} />
                <ThemedText variant="headline">{n(r.wins)}</ThemedText>
              </View>
            )}
          </View>
        ))}
      </View>
      <ThemedText variant="footnote" tone="tertiaryLabel">
        Your last {record.games.length} {record.games.length === 1 ? 'game' : 'games'}.
      </ThemedText>
    </View>
  );
}
