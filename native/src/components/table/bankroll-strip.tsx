import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { BANKROLL, bankrollHandsToday, bankrollNow, type Game } from '@/engine';
import { brand, radius, spacing, useColors } from '@/theme';

/** A Bankroll table's header line: your bankroll, the hand of the day, your place, and what's waiting in the bank. */
export function BankrollStrip({ game }: { game: Game }) {
  const colors = useColors();
  const tag = game.bankroll!;
  const now = bankrollNow(game) ?? 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, paddingHorizontal: spacing.sm, minHeight: 32, borderRadius: radius.full, backgroundColor: colors.cell }}>
      <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 14, fontWeight: '800', color: brand.gold, fontVariant: ['tabular-nums'] }}>
        {now.toLocaleString()}
      </Text>
      <ThemedText variant="footnote" tone="secondaryLabel" style={{ flex: 1 }} numberOfLines={1}>
        {`Hand ${Math.min(bankrollHandsToday(tag), tag.limit)} of ${BANKROLL.handsADay}${tag.rank ? ` · #${tag.rank.toLocaleString()}` : ''}`}
      </ThemedText>
      {tag.bank > 0 && (
        <ThemedText variant="footnote" tone="secondaryLabel" style={{ fontVariant: ['tabular-nums'] }}>
          {`+ ${tag.bank.toLocaleString()} in the bank`}
        </ThemedText>
      )}
    </View>
  );
}

const WHY = { left: 'You got up.', limit: 'That’s today’s 50 hands. Back tomorrow.', busted: 'You’re busted.', cut: 'You were cut this week.', season: 'The month is over.' } as const;

/** When a Bankroll sitting closes: today's result big, the bankroll, the place, then back to the start sheet. */
export function BankrollEnded({ game, onLeave }: { game: Game; onLeave: () => void }) {
  const tag = game.bankroll!;
  const now = bankrollNow(game) ?? 0;
  const today = now - tag.dayStart;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md }}>
      <ThemedText tone="secondaryLabel">{WHY[tag.closed ?? 'left']}</ThemedText>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 48, fontWeight: '800', color: today >= 0 ? brand.gold : '#8e8e93', fontVariant: ['tabular-nums'] }}>
        {`${today >= 0 ? '+' : ''}${today.toLocaleString()} today`}
      </Text>
      <ThemedText variant="title3">{`Bankroll ${now.toLocaleString()}${tag.rank ? ` · #${tag.rank.toLocaleString()}` : ''}`}</ThemedText>
      <Button
        title="Done"
        variant="party"
        size="lg"
        onPress={() => {
          onLeave();
          router.push('/bankroll');
        }}
      />
    </View>
  );
}
