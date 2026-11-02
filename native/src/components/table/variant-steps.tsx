// The extra steps two games add to a hand: Crazy Pineapple's discard after the flop betting, and Imposter's vote
// after the river. They take the place of the action buttons while they're on.
import { Text, View } from 'react-native';

import { cardName, pendingDiscards, pendingVoters, type Game, type Player, type Seat } from '@/engine';
import { dispatch } from '@/state/session';
import { radius, spacing, useColors } from '@/theme';

import { Avatar } from '../avatar';
import { haptic } from '../haptics';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';
import { PlayingCard } from './playing-card';

function Waiting({ text }: { text: string }) {
  return (
    <ThemedText variant="callout" tone="secondaryLabel" accessibilityLiveRegion="polite" style={{ textAlign: 'center', paddingVertical: spacing.md }}>
      {text}
    </ThemedText>
  );
}

/** Crazy Pineapple: tap the card you're throwing away. */
export function Discard({ game, seat, pack }: { game: Game; seat: Seat; pack?: string }) {
  const hand = game.hand!;
  if (seat.cards.length < 3) {
    const waiting = pendingDiscards(game).length;
    return <Waiting text={waiting ? `Waiting for ${waiting === 1 ? 'one player' : `${waiting} players`} to throw a card away…` : 'Here comes the turn…'} />;
  }
  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <ThemedText variant="headline">Tap the card to throw away</ThemedText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {seat.cards.map((c) => (
          <PressableScale
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`Throw away the ${cardName(c)}`}
            onPress={() => {
              haptic.tap();
              dispatch({ type: 'discard', hand: hand.number, card: c });
            }}
          >
            <PlayingCard card={c} size="lg" pack={pack} />
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/** Imposter: after the river, everyone dealt in votes for who they think the imposter is. */
export function Vote({ game, me }: { game: Game; me: Player }) {
  const colors = useColors();
  const hand = game.hand!;
  if (hand.votes?.[me.id]) {
    const waiting = pendingVoters(game).length;
    return <Waiting text={waiting ? `Waiting for ${waiting === 1 ? 'one more vote' : `${waiting} more votes`}…` : 'Counting the votes…'} />;
  }
  const suspects = hand.seats.map((s) => game.players.find((p) => p.id === s.playerId)).filter((p): p is Player => !!p && p.id !== me.id);
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="headline" style={{ textAlign: 'center' }}>
        {"Who's the imposter?"}
      </ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' }}>
        {suspects.map((p) => (
          <PressableScale
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`Vote for ${p.name}`}
            onPress={() => {
              haptic.tap();
              dispatch({ type: 'vote', hand: hand.number, playerId: p.id });
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: spacing.sm, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}
          >
            <Avatar emoji={p.emoji} size={28} />
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: '700', color: colors.label }}>
              {p.name}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}
