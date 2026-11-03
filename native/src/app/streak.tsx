import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { SheetScroll } from '@/components/sheet-scroll';
import { Row, Section } from '@/components/grouped-list';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useStreakInfo } from '@/state/streak';
import { party, radius, spacing, useColors } from '@/theme';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The daily streak up close, as on the web: the number, the last seven days, when it started, the best and the total. */
export default function StreakSheet() {
  const colors = useColors();
  const info = useStreakInfo();
  const started = info.start?.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <SheetScroll contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Daily streak' }} />
      <View accessible accessibilityLabel={`${plural(info.days, 'day')} in a row`} style={{ alignItems: 'center', gap: spacing.xxs }}>
        <Icon name="flame.fill" size={48} color={party.orange} />
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 56, lineHeight: 64, fontWeight: '800', fontVariant: ['tabular-nums'], color: colors.label }}>
          {info.days}
        </Text>
        <ThemedText tone="tertiaryLabel">{info.days === 1 ? 'day in a row' : 'days in a row'}</ThemedText>
      </View>
      <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center' }}>
        {info.days === 0 ? 'Play a hand to start a streak.' : info.today ? "You've played today. Come back tomorrow to keep it going." : 'Play a hand today to keep your streak alive.'}
      </ThemedText>
      <View accessible accessibilityLabel={`The last seven days: ${info.week.filter((d) => d.played).length} played`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {info.week.map((d, i) => (
          <View key={i} style={{ alignItems: 'center', gap: spacing.xxs }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: d.played ? colors.goldBg : colors.cell,
                borderWidth: 2,
                borderColor: d.today ? party.orange : 'transparent',
              }}
            >
              {d.played && <Icon name="flame.fill" size={18} color={party.orange} />}
            </View>
            <ThemedText variant="footnote" tone={d.today ? 'label' : 'tertiaryLabel'} style={{ fontWeight: '600' }}>
              {d.label}
            </ThemedText>
          </View>
        ))}
      </View>
      <Section>
        {started ? <Row title="Started" detail={started} /> : null}
        <Row title="Longest streak" detail={plural(info.best, 'day')} />
        <Row title="Days played" detail={String(info.total)} />
      </Section>
    </SheetScroll>
  );
}
