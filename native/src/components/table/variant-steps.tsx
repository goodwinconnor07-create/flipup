// The extra steps the mini games add to a hand: Crazy Pineapple's discard after the flop betting, and Hit Me and Power Cards' badges on the seats. They take the
// place of the action buttons while they're on.
import { Text, View } from 'react-native';

import { cardName, discardWaiting, type Game, type Seat } from '@/engine';
import { seatPowerBadge } from '@/state/power-view';
import { dispatch } from '@/state/session';
import { spacing, usePlainColors } from '@/theme';

import { Avatar } from '../avatar';
import { haptic } from '../haptics';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';
import { PlayingCard } from './playing-card';

/** Faces of the players the table is still waiting for. */
function WaitingFaces({ game, ids, text }: { game: Game; ids: string[]; text: string }) {
  return (
    <View accessibilityLiveRegion="polite" accessibilityLabel={text} style={{ alignItems: 'center', gap: 6, paddingVertical: spacing.xs }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {ids.slice(0, 8).map((id) => {
          const p = game.players.find((x) => x.id === id);
          return p ? <Avatar key={id} emoji={p.emoji} size={30} /> : null;
        })}
      </View>
      <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center' }}>
        {text}
      </ThemedText>
    </View>
  );
}

/** Crazy Pineapple: tap the card you're throwing away. Everyone's thrown card is turned up together afterwards. */
export function Discard({ game, seat, pack }: { game: Game; seat: Seat; pack?: string }) {
  const hand = game.hand!;
  const waiting = discardWaiting(hand).map((s) => s.playerId);
  if (seat.cards.length < 3) {
    return <WaitingFaces game={game} ids={waiting} text={waiting.length ? `Waiting for ${waiting.length === 1 ? 'one player' : `${waiting.length} players`} to throw a card away…` : 'Here come the thrown cards…'} />;
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
      {waiting.length > 1 && (
        <ThemedText variant="footnote" tone="secondaryLabel">
          {waiting.length - 1} other{waiting.length === 2 ? '' : 's'} still choosing
        </ThemedText>
      )}
    </View>
  );
}

/** A small badge on a seat's face for the game being played: a bust, their 21 count. */
export function SeatBadge({ game, playerId }: { game: Game; playerId: string }) {
  const c = usePlainColors();
  const hand = game.hand;
  if (!hand) return null;
  let text = '';
  let hot = false;
  if (hand.variant === 'power') {
    // Power Cards: 🤐 while silenced, 🛡️ once a shield is up, and after the hand the power each player was dealt.
    const badge = seatPowerBadge(hand, playerId);
    if (badge) {
      text = badge.text;
      hot = badge.hot;
    }
  } else if (hand.variant === 'bjholdem') {
    if (hand.busted?.includes(playerId)) {
      text = 'BUST';
      hot = true;
    } else if (hand.result?.blackjack && playerId in hand.result.blackjack.counts) text = `21:${hand.result.blackjack.counts[playerId]}`;
  }
  if (!text) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: -14, bottom: 2, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: hot ? c.redBg : c.surface, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
      <Text maxFontSizeMultiplier={1.1} style={{ fontSize: 11, fontWeight: '800', color: hot ? c.redInk : c.label }}>
        {text}
      </Text>
    </View>
  );
}
