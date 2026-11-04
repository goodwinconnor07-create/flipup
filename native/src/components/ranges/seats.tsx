import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Character, Sampled } from '@/state/range-logic';
import { bb, type Pos } from '@train/ranges/model';
import { brand, radius, ROUNDED, spacing } from '@/theme';

import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { CardBack, PlayingCard } from '../table/playing-card';
import { useFadeIn } from './use-fade';
import { vibeOf } from './words';

export interface SeatInfo {
  pos: Pos;
  who: Character;
  type: string;
  live: boolean;
  /** Chips in front of them on this street, once the story reaches it. */
  bet: number;
}

/**
 * The other players across the top of the room: each one's face (one of the app's bots), name and what kind of
 * player they are, two cards face down with the robot on the back, and the chips they've put in on this street.
 * Tap a player to read them. On the answer their cards turn over: one hand they could have.
 */
export function Seats({ seats, open, reveal, onOpen }: { seats: SeatInfo[]; open: Pos | null; reveal: Sampled[] | null; onOpen: (pos: Pos | null) => void }) {
  const many = seats.length > 3;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: many ? spacing.xs : spacing.md, paddingHorizontal: spacing.sm }}>
      {seats.map((s) => (
        <Seat key={s.pos} seat={s} small={many} active={open === s.pos} shown={reveal?.find((h) => h.pos === s.pos) ?? null} onPress={() => onOpen(open === s.pos ? null : s.pos)} />
      ))}
    </View>
  );
}

function Seat({ seat, small, active, shown, onPress }: { seat: SeatInfo; small: boolean; active: boolean; shown: Sampled | null; onPress: () => void }) {
  const face = small ? 44 : 54;
  const cardW = small ? 22 : 26;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${seat.who.name}, ${seat.type}${seat.live ? '' : ', folded'}${seat.bet ? `, ${bb(seat.bet)} in` : ''}`}
      accessibilityHint="Reads what their play usually means"
      accessibilityState={{ expanded: active }}
      onPress={onPress}
      outerStyle={{ flexShrink: 1 }}
      style={{ alignItems: 'center', gap: 4, opacity: seat.live ? 1 : 0.4, width: small ? 76 : 96 }}
    >
      <View>
        <View
          style={{
            width: face,
            height: face,
            borderRadius: face / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderWidth: active ? 2 : 1,
            borderColor: active ? brand.gold : 'rgba(255,255,255,0.18)',
          }}
        >
          <Text maxFontSizeMultiplier={1} style={{ fontSize: face * 0.56 }}>
            {seat.who.emoji}
          </Text>
        </View>
        {/* Their two cards, tucked behind the face's corner; they turn over on the answer. */}
        {seat.live && (
          <View style={{ position: 'absolute', right: -cardW * 0.9, bottom: -4, flexDirection: 'row' }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ marginLeft: i ? -cardW * 0.45 : 0, transform: [{ rotate: i ? '8deg' : '-6deg' }] }}>
                {shown ? (
                  <PlayingCard card={shown.cards[i]} size="sm" width={cardW} flip delay={i * 120} />
                ) : (
                  <View>
                    <CardBack w={cardW} small />
                    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="cpu.fill" size={9} color="rgba(255,255,255,0.7)" />
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontFamily: ROUNDED, fontSize: small ? 13 : 15, fontWeight: '700', color: '#ffffff' }}>
        {seat.who.name}
      </Text>
      {seat.bet > 0 && seat.live ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 20, borderRadius: 10, backgroundColor: 'rgba(245,183,0,0.18)' }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: brand.gold, borderWidth: 1.5, borderColor: '#fff3c4' }} />
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: '800', color: brand.gold, fontVariant: ['tabular-nums'] }}>
            {bb(seat.bet)}
          </Text>
        </View>
      ) : (
        <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={{ fontSize: 12, lineHeight: 15, fontWeight: '600', textAlign: 'center', color: 'rgba(255,255,255,0.55)' }}>
          {seat.live ? vibeOf(seat.type) : 'Folded'}
        </Text>
      )}
    </PressableScale>
  );
}

/**
 * A player's thoughts, as a bubble under the seats: what kind of player they are and what their move on this
 * street usually means. After the answer it names the hand they turned over too.
 */
export function ThoughtBubble({ seat, read, shown }: { seat: SeatInfo | null; read: string; shown: Sampled | null }) {
  const fade = useFadeIn(seat?.pos ?? null);
  if (!seat) return null;
  return (
    <Animated.View style={[{ paddingHorizontal: spacing.md }, fade]}>
      <View
        accessibilityLiveRegion="polite"
        style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.16)' }}
      >
        <Text maxFontSizeMultiplier={1} style={{ fontSize: 24 }}>
          {seat.who.emoji}
        </Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>
            {seat.who.name} · {vibeOf(seat.type)}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: '#ffffff' }}>
            {read}
          </Text>
          {shown && (
            <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, lineHeight: 18, color: brand.gold, fontWeight: '600' }}>
              One hand they could have: {shown.label}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
