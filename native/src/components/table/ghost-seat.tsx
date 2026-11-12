import { Text, View } from 'react-native';

import { variantOf, type Game } from '@/engine';
import { usePlainColors } from '@/theme';

import { SeatFace } from './seats';
import { PlayingCard } from './playing-card';

/**
 * Haunted Pot's ghost, locked in at the left end of the seat row behind a divider while the other players cycle
 * past on the right of it. It has no chips and no turn: its face, its two cards (face down until a showdown) and,
 * no speech: the ghost never talks. It is drawn the same size as the bots' seats.
 */
export function GhostSeat({ game, compact = false }: { game: Game; compact?: boolean }) {
  const c = usePlainColors();
  const hand = game.hand;
  if (variantOf(game) !== 'ghost') return null;
  const shown = hand?.result?.ghost ?? null;
  const cards = shown?.cards ?? hand?.ghost ?? [null, null];
  const holding = hand && !hand.result ? (hand.carry ?? 0) : (game.ghostPot ?? 0);
  const size = compact ? 15 : 17;
  // Laid out exactly like a bot's seat: bubble over the face, name, a line, then its cards.
  return (
    <View accessibilityLabel="The ghost" style={{ width: 70, alignItems: 'center', zIndex: 5 }}>
      <View style={{ width: compact ? 48 : 56, height: compact ? 40 : 54, alignItems: 'center', justifyContent: 'center' }}>
        <SeatFace emoji="👻" size={compact ? 36 : 50} turn={false} />
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: compact ? 13 : 15, lineHeight: compact ? 15 : 17, fontWeight: '700', color: c.tertiaryLabel }}>
        Ghost
      </Text>
      {/* What it holds (just the number, like a stack), so it fits the seat on the smallest phone. */}
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ maxWidth: '100%', fontSize: size, lineHeight: size + 1, fontWeight: '700', color: c.label }}>
        {holding && !shown ? Math.round(holding).toLocaleString('en-US') : ' '}
      </Text>
      <View style={{ alignItems: 'center', gap: 4, minHeight: 52, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row' }}>
          {cards.map((card, i) => (
            <View key={card ?? i} style={{ marginLeft: i === 0 ? 0 : -6 }}>
              {card ? <PlayingCard card={card} size="sm" flip delay={i * 800} ghost /> : <PlayingCard back size="sm" ghost />}
            </View>
          ))}
        </View>
        {shown && (
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ maxWidth: '100%', fontSize: 11, fontWeight: '600', color: c.secondaryLabel }}>
            {shown.name}
          </Text>
        )}
      </View>
    </View>
  );
}

/** The barrier between the ghost and the players who cycle past: a thin rounded line the height of the seats. */
export function GhostDivider({ compact = false }: { compact?: boolean }) {
  const c = usePlainColors();
  return <View accessible={false} style={{ width: 3, height: compact ? 96 : 118, marginHorizontal: 5, marginTop: 2, borderRadius: 2, backgroundColor: c.separator }} />;
}
