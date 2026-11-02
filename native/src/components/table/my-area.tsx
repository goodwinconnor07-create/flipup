import { Text, View } from 'react-native';

import { holeCount, positionOf, seatFor, variantOf, type Card, type Game, type Player } from '@/engine';
import { dispatch } from '@/state/session';
import { radius, spacing, useColors } from '@/theme';

import { Avatar } from '../avatar';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';
import { useHighlight } from './felt';
import { CardSlot, PlayingCard } from './playing-card';
import { PositionChip } from './seats';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** The bottom of the table: your cards, big, and your box (name, stack, what you've put in, your position). */
export function MyArea({ game, me }: { game: Game; me: Player | undefined }) {
  const colors = useColors();
  const hand = game.hand;
  const seat = seatFor(hand, me?.id);
  const highlight = useHighlight(game, me);
  const lit = new Set(highlight?.best ?? []);
  const showdown = !!hand?.result?.showdown && !!highlight;
  const dim = (c: Card) => !!seat?.folded || (showdown && !lit.has(c));
  const glow = (c: Card) => showdown && lit.has(c);
  const canShow = !!hand?.result && !!seat && !seat.shown && seat.cards.length === 2;
  const won = me ? (hand?.result?.won[me.id] ?? 0) : 0;
  const many = (seat?.cards.length ?? holeCount(variantOf(game))) > 2;
  const w = many ? 64 : 100;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md }}>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center' }}>
        {seat?.cards.length
          ? seat.cards.map((c, i) => (
              <View key={`${hand!.number}-${c}`} style={{ marginLeft: i === 0 ? 0 : many ? -16 : -14, transform: [{ rotate: `${(i - (seat.cards.length - 1) / 2) * 4}deg` }] }}>
                <PlayingCard card={c} width={w} flip delay={i * 180} dim={dim(c)} glow={glow(c)} />
              </View>
            ))
          : Array.from({ length: holeCount(variantOf(game)) }, (_, i) => (
              <View key={i} style={{ marginLeft: i === 0 ? 0 : -14 }}>
                <CardSlot width={w} />
              </View>
            ))}
        {canShow && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Show my cards"
            onPress={() => dispatch({ type: 'show', hand: hand!.number })}
            outerStyle={{ position: 'absolute', bottom: -6, alignSelf: 'center' }}
            style={{ paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.label }}
          >
            <Text style={{ color: colors.background as string, fontWeight: '700', fontSize: 13 }}>Show cards</Text>
          </PressableScale>
        )}
      </View>
      <View
        style={{
          width: 150,
          minHeight: 132,
          padding: spacing.sm,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: colors.background,
          borderWidth: 2,
          borderColor: colors.cellPressed,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        {me && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Avatar emoji={me.emoji} size={22} />
            <ThemedText variant="footnote" tone="tertiaryLabel" numberOfLines={1}>
              {me.name}
            </ThemedText>
          </View>
        )}
        <ThemedText variant="title1" style={{ fontWeight: '800', fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.2}>
          {!me ? '–' : me.stack === 0 && (!hand || hand.result) ? 'Out' : chips(me.stack)}
        </ThemedText>
        {won > 0 ? (
          <ThemedText variant="subhead" style={{ color: colors.green, fontWeight: '700' }}>
            +{chips(won)}
          </ThemedText>
        ) : seat && seat.bet > 0 && !hand?.result ? (
          <ThemedText variant="subhead" style={{ color: colors.gold, fontWeight: '700' }}>
            In: {chips(seat.bet)}
          </ThemedText>
        ) : null}
        <View style={{ position: 'absolute', left: 8, bottom: 8 }}>
          <PositionChip pos={me ? positionOf(hand, me.id) : null} />
        </View>
      </View>
    </View>
  );
}
