// The table for Range training: a felt with every seat round it (your position at the bottom), the pot, the board,
// each player's stack and what they've bet this street. Players are their positions, nothing more: no faces or
// names made up. It shows the hand as it stands at your decision, and, only while you replay the hand, as it stood
// after each move.
import { useState } from 'react';
import { Text, View } from 'react-native';

import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { bb, seatName, seatPositions, type BoardView } from '@/state/range-view';
import { gradient, radius, spacing } from '@/theme';
import { seatsOf, type Pos, type Scenario } from '@train/ranges/model';

const NUM = { fontVariant: ['tabular-nums' as const] };

export function BoardTable({ scenario, view }: { scenario: Scenario; view: BoardView }) {
  const [width, setWidth] = useState(0);
  const nine = seatsOf(scenario).length > 6;
  const height = nine ? 250 : 214;
  const inHand: Pos[] = [scenario.hero.pos, ...scenario.opponents.map((o) => o.pos)];
  const seatW = nine ? 52 : 60;
  const seats = width ? seatPositions(scenario, width, height) : [];
  const cardW = Math.min(40, Math.floor((width - (nine ? 130 : 150)) / 5.2)) || 36;
  const cy = height / 2;
  return (
    <View
      accessibilityLabel={`The table. Pot ${bb(view.pot)}. Board ${view.board.join(' ') || 'not dealt yet'}.`}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        height,
        borderRadius: height / 2,
        borderCurve: 'continuous',
        // The app's deep blue, so the page isn't split between a green table and a blue app.
        ...gradient('radial-gradient(ellipse at 50% 38%, #2a56c4 0%, #1a3a8f 50%, #0c1d4d 100%)'),
        borderWidth: 5,
        borderColor: 'rgba(5,12,40,0.7)',
        boxShadow: 'inset 0 3px 14px rgba(0,0,0,0.4)',
        overflow: 'visible',
      }}
    >
      {/* The pot and the board, in the middle. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 3, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.42)' }}>
          <ThemedText variant="footnote" tone="onColor" style={[{ fontWeight: '700' }, NUM]}>
            Pot {bb(view.pot)}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const c = view.board[i];
            return c ? (
              <PlayingCard key={c} card={c} size="md" width={cardW} />
            ) : (
              <View key={i} style={{ width: cardW, height: Math.round(cardW * 1.4), borderRadius: cardW * 0.18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)' }} />
            );
          })}
        </View>
      </View>

      {seats.map((s) => {
        const playing = inHand.includes(s.pos);
        const folded = view.folded.includes(s.pos);
        const acting = view.acting === s.pos;
        const stack = view.stacks[s.pos];
        const bet = view.bets[s.pos];
        // The bet sits just inside its seat, above it for seats in the lower half and below it for the upper, so it
        // never lands on the board.
        // The top seat sits over the pot, so its bet goes beside it.
        const top = s.y < 40;
        const bx = top ? s.x + seatW / 2 + 26 : s.x;
        const by = top ? s.y : s.y > cy + 4 ? s.y - 36 : s.y + 36;
        return (
          <View key={s.pos} pointerEvents="none">
            <View
              style={{
                position: 'absolute',
                left: s.x - seatW / 2,
                top: s.y - 21,
                width: seatW,
                height: 42,
                borderRadius: 12,
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: s.hero ? 'rgba(255,255,255,0.96)' : playing ? 'rgba(0,0,0,0.46)' : 'rgba(0,0,0,0.16)',
                borderWidth: acting || s.hero ? 2.5 : 0,
                borderColor: acting ? '#8fd0ff' : '#ffffff',
                opacity: !playing ? 0.4 : folded ? 0.55 : 1,
              }}
            >
              <Text maxFontSizeMultiplier={1.1} style={{ fontSize: nine ? 12 : 13, fontWeight: '800', color: s.hero ? '#111111' : '#ffffff' }}>
                {s.hero ? 'You' : seatName(s.pos)}
              </Text>
              {playing && stack !== undefined && (
                <Text maxFontSizeMultiplier={1.1} style={[{ fontSize: 12, fontWeight: '700', color: s.hero ? '#333333' : 'rgba(255,255,255,0.85)' }, NUM]}>
                  {bb(Math.round(stack * 10) / 10)}
                </Text>
              )}
            </View>
            {s.pos === 'BTN' && (
              <View style={{ position: 'absolute', left: s.x + seatW / 2 - 9, top: s.y - 28, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
                <Text maxFontSizeMultiplier={1} style={{ fontSize: 9, fontWeight: '900', color: '#111111' }}>
                  D
                </Text>
              </View>
            )}
            {bet !== undefined && bet > 0 && !folded && (
              <View style={{ position: 'absolute', left: bx - 18, top: by - 9, minWidth: 36, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
                <Text maxFontSizeMultiplier={1} style={[{ fontSize: 11.5, fontWeight: '800', color: '#0c1d4d' }, NUM]}>
                  {bb(bet)}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
