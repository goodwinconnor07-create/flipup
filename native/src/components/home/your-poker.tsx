import { router } from 'expo-router';
import { Text, View, type ColorValue } from 'react-native';

import { gameLook } from '@design/gameArt';
import { variantInfo } from '@/engine';
import { usePokerRecord, type GameLine } from '@/state/record';
import { useStreak } from '@/state/streak';
import { gradient, radius, spacing, useColors } from '@/theme';

import { GameThumb } from '../game-picture';
import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { PressableScale } from '../pressable-scale';
import { PlayingCard } from '../table/playing-card';
import { ThemedText } from '../themed-text';

const place = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

function ago(at: number): string {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * What you've done at the tables on this phone: hands, pots won and the streak, your best hand as real cards, and
 * your last game with a way back into it. Before your first hand, How to Play in its place.
 */
export function YourPoker() {
  const record = usePokerRecord();
  const streak = useStreak();
  const colors = useColors();
  if (record.hands === 0) return <FirstHand />;
  const last = record.games.at(-1);
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="title2" accessibilityRole="header" style={{ fontWeight: '800' }}>
        Your poker
      </ThemedText>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <Stat icon="suit.spade.fill" colour={colors.indigo} value={record.hands} label={record.hands === 1 ? 'Hand' : 'Hands'} />
        <Stat icon="trophy.fill" colour={colors.gold} value={record.won} label={record.won === 1 ? 'Pot won' : 'Pots won'} />
        <Stat icon="flame.fill" colour={colors.red} value={streak.days} label="Day streak" />
      </View>
      {record.best && <BestHand name={record.best.name} cards={record.best.cards} biggest={record.biggestPot} />}
      {last && <LastGame line={last} />}
    </View>
  );
}

function Stat({ icon, colour, value, label }: { icon: IconName; colour: ColorValue; value: number; label: string }) {
  const colors = useColors();
  return (
    <View accessible accessibilityLabel={`${value.toLocaleString('en-US')} ${label}`} style={{ flex: 1, padding: spacing.sm, gap: spacing.xxs, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      <Icon name={icon} size={18} color={colour} />
      <Text maxFontSizeMultiplier={1.4} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.label, fontVariant: ['tabular-nums'] }}>
        {value.toLocaleString('en-US')}
      </Text>
      <ThemedText variant="footnote" tone="tertiaryLabel" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

/** Your best showdown hand, as the five cards that made it. */
function BestHand({ name, cards, biggest }: { name: string; cards: string[]; biggest: number }) {
  const colors = useColors();
  return (
    <View accessible accessibilityLabel={`Best hand: ${name}`} style={{ padding: spacing.md, gap: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textTransform: 'uppercase', fontWeight: '600' }}>
          Best hand
        </ThemedText>
        {biggest > 0 && (
          <ThemedText variant="footnote" tone="tertiaryLabel">
            Biggest pot {biggest.toLocaleString('en-US')}
          </ThemedText>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {cards.map((c) => (
          <PlayingCard key={c} card={c} size="md" width={44} />
        ))}
      </View>
      <ThemedText variant="headline" style={{ fontWeight: '700' }}>
        {name}
      </ThemedText>
    </View>
  );
}

/** Your last game: the game, where you finished and when, and a tap back into it. */
function LastGame({ line }: { line: GameLine }) {
  const colors = useColors();
  const info = variantInfo(line.variant);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Play ${info.name} again. You finished ${place(line.place)} of ${line.players}`}
      onPress={() => {
        haptic.tap();
        router.push(`/game/${line.variant}`);
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell }}
    >
      <GameThumb variant={line.variant} size={48} />
      <View style={{ flex: 1 }}>
        <ThemedText variant="headline" numberOfLines={1}>
          {info.name}
        </ThemedText>
        <ThemedText variant="subhead" tone="tertiaryLabel" numberOfLines={1}>
          {line.place === 1 ? 'You won' : `${place(line.place)} of ${line.players}`} · {ago(line.at)}
        </ThemedText>
      </View>
      <View style={{ paddingHorizontal: spacing.md, minHeight: 36, justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.accent }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
          Play again
        </Text>
      </View>
    </PressableScale>
  );
}

/** Before your first hand: Texas Hold'em's How to Play, a real hand recorded at the table. */
function FirstHand() {
  const [top, bottom] = gameLook('holdem').card;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="How to play Texas Hold'em"
      onPress={() => {
        haptic.tap();
        router.push('/how-to-play/holdem');
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', ...gradient(`linear-gradient(150deg, ${top} 0%, ${bottom} 100%)`) }}
    >
      <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <Icon name="play.fill" size={22} color={bottom} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="title3" tone="onColor" style={{ fontWeight: '800' }}>
          How to play
        </ThemedText>
        <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.85 }}>
          Texas Hold&apos;em, in one hand
        </ThemedText>
      </View>
      <Icon name="chevron.right" size={16} color="#ffffff" />
    </PressableScale>
  );
}
