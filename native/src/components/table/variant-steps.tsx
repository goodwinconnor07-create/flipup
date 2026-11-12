// The extra steps the mini games add to a hand: Crazy Pineapple's discard after the flop betting, Imposter's
// pointing, talking, voting and the vote being read out, and the bar of suspects under the felt. They take the
// place of the action buttons while they're on.
import { Text, View } from 'react-native';

import { cardName, discardWaiting, pendingVoters, tallyOrder, tallyShown, type Game, type Player, type Seat } from '@/engine';
import { seatPowerBadge } from '@/state/power-view';
import { dispatch } from '@/state/session';
import { radius, spacing, useColors, usePlainColors } from '@/theme';

import { Avatar } from '../avatar';
import { haptic } from '../haptics';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';
import { PlayingCard } from './playing-card';
import { useMomentNow } from './use-moment';
import { useTableNow } from './use-now';

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

/** Imposter: the table talks it over. Point a finger at whoever played oddly; the vote comes when the time is up. */
export function Discuss({ game, me }: { game: Game; me: Player }) {
  const colors = useColors();
  const now = useTableNow(game.fast, 250);
  const hand = game.hand!;
  const left = Math.max(0, Math.ceil(((hand.moment?.until ?? now) - now) / 1000));
  const mine = hand.points?.[me.id];
  const suspects = hand.seats.map((s) => game.players.find((p) => p.id === s.playerId)).filter((p): p is Player => !!p && p.id !== me.id);
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="headline" style={{ textAlign: 'center' }}>
        {`Who's the imposter? · ${left}s`}
      </ThemedText>
      <Suspects game={game} me={me} suspects={suspects} mine={mine} big />
      <ThemedText variant="footnote" tone="secondaryLabel" style={{ textAlign: 'center' }}>
        Everyone has the same cards but one. The vote comes next.
      </ThemedText>
      <View style={{ height: 0 }} accessibilityElementsHidden>
        <Text style={{ color: colors.label }} />
      </View>
    </View>
  );
}

/** A face to tap for each suspect, with how many fingers are pointing at them. */
function Suspects({ game, me, suspects, mine, big }: { game: Game; me: Player; suspects: Player[]; mine?: string; big?: boolean }) {
  const colors = useColors();
  const c = usePlainColors();
  const hand = game.hand!;
  const fingers = (id: string) => Object.entries(hand.points ?? {}).filter(([who, at]) => at === id && who !== me.id).length;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' }}>
      {suspects.map((p) => {
        const on = mine === p.id;
        const n = fingers(p.id) + (on ? 1 : 0);
        return (
          <PressableScale
            key={p.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={on ? `Stop pointing at ${p.name}` : `Point at ${p.name}`}
            onPress={() => {
              haptic.select();
              dispatch({ type: 'point', hand: hand.number, playerId: on ? null : p.id });
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: big ? 48 : 38,
              paddingHorizontal: big ? spacing.sm : spacing.xs,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              backgroundColor: on ? c.redBg : colors.cell,
            }}
          >
            <Avatar emoji={p.emoji} size={big ? 28 : 22} />
            {big && (
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: '700', color: on ? c.redInk : colors.label }}>
                {p.name}
              </Text>
            )}
            {n > 0 && (
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 14, fontWeight: '800', color: on ? c.redInk : colors.secondaryLabel }}>
                {`👆${n}`}
              </Text>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Imposter, during the betting: a thin row of faces. Tap one to point a finger at them (tap again to take it back). */
export function SuspectBar({ game, me }: { game: Game; me: Player }) {
  const hand = game.hand!;
  const suspects = hand.seats.map((s) => game.players.find((p) => p.id === s.playerId)).filter((p): p is Player => !!p && p.id !== me.id);
  return (
    <View accessibilityLabel="Point a finger at who you suspect" style={{ paddingBottom: 4 }}>
      <Suspects game={game} me={me} suspects={suspects} mine={hand.points?.[me.id]} />
    </View>
  );
}

/** Imposter: after the river, everyone dealt in votes for who they think the imposter is. */
export function Vote({ game, me }: { game: Game; me: Player }) {
  const colors = useColors();
  const hand = game.hand!;
  if (hand.votes?.[me.id]) {
    const waiting = pendingVoters(game).map((s) => s.playerId);
    return <WaitingFaces game={game} ids={waiting} text={waiting.length ? `Waiting for ${waiting.length === 1 ? 'one more vote' : `${waiting.length} more votes`}…` : 'Counting the votes…'} />;
  }
  const suspects = hand.seats.map((s) => game.players.find((p) => p.id === s.playerId)).filter((p): p is Player => !!p && p.id !== me.id);
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="headline" style={{ textAlign: 'center' }}>
        {"Who's the imposter? Vote"}
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
            {Object.entries(hand.points ?? {}).filter(([, at]) => at === p.id).length > 0 && (
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.secondaryLabel }}>{`👆${Object.values(hand.points ?? {}).filter((at) => at === p.id).length}`}</Text>
            )}
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/** Imposter: the votes being read out, one at a time. Who voted for whom builds up here and on the seats. */
export function Tally({ game }: { game: Game }) {
  const now = useMomentNow(game);
  const hand = game.hand!;
  const order = tallyOrder(hand);
  const shown = tallyShown(hand, order, now);
  const read = order.slice(0, shown);
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? '?';
  const last = read[read.length - 1];
  const counts = new Map<string, number>();
  for (const v of read) counts.set(hand.votes![v], (counts.get(hand.votes![v]) ?? 0) + 1);
  const lead = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return (
    <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 4, paddingVertical: spacing.xs }}>
      <ThemedText variant="headline">{shown >= order.length ? 'And the imposter is…' : 'Reading out the votes…'}</ThemedText>
      <ThemedText variant="callout" tone="secondaryLabel">
        {last ? `${name(last)} votes for ${name(hand.votes![last])}` : ' '}
        {lead ? ` · ${name(lead[0])} ×${lead[1]}` : ''}
      </ThemedText>
    </View>
  );
}

/** A small badge on a seat's face for the game being played: fingers pointing at them, votes read out so far, a bust, their 21 count. */
export function SeatBadge({ game, playerId }: { game: Game; playerId: string }) {
  const c = usePlainColors();
  const now = useMomentNow(game);
  const hand = game.hand;
  if (!hand) return null;
  let text = '';
  let hot = false;
  if (hand.variant === 'imposter') {
    if (hand.tally || hand.result) {
      const order = tallyOrder(hand);
      const shown = hand.result ? order.length : tallyShown(hand, order, now);
      const n = order.slice(0, shown).filter((v) => hand.votes?.[v] === playerId).length;
      if (n) text = `🗳${n}`;
      if (hand.result?.imposter?.id === playerId) {
        text = '🕵️';
        hot = true;
      }
    } else {
      const n = Object.values(hand.points ?? {}).filter((at) => at === playerId).length;
      if (n) text = `👆${n}`;
    }
  } else if (hand.variant === 'power') {
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
    <View pointerEvents="none" style={{ position: 'absolute', right: -14, top: -4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: hot ? c.redBg : c.surface, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
      <Text maxFontSizeMultiplier={1.1} style={{ fontSize: 11, fontWeight: '800', color: hot ? c.redInk : c.label }}>
        {text}
      </Text>
    </View>
  );
}
