// The bottom of the table: your cards, big and overlapping, with "Show cards" under them after a hand you didn't have to
// show; and your box beside them, outlined in the separator colour (gold glow on your turn): your chip count biggest,
// your position, emoji and name at the very bottom, the quick messages button half over the top-left corner, and what
// you said as a small pill over the top-right corner. During an all-in run-out the box shows your odds instead.
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { holeCount, moveLabel, positionOf, seatFor, variantOf, type Card, type Game, type Player, type Talk } from '@/engine';
import { save, useStored } from '@/state/storage';
import { usePlainColors } from '@/theme';

import { Avatar } from '../avatar';
import { haptic } from '../haptics';
import { bubbleOut, bubblePop, MoveBubble, pinned, Thread } from './bubbles';
import { Count } from './count';
import { CardSlot, PlayingCard } from './playing-card';
import { QuickMessages } from './quick-messages';
import { pct, PositionChip } from './seats';
import { moveSig } from './use-reactions';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');
/** 98.5 BB, or 120 BB: one decimal only while it's small. */
const bigBlinds = (n: number) => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString('en-US');

export function MyArea({
  game,
  compact = false,
  me,
  talk,
  quiet,
  dim,
  glow,
  odds,
}: {
  game: Game;
  compact?: boolean;
  me: Player | undefined;
  talk?: Talk;
  quiet?: string;
  dim: (c: Card) => boolean;
  glow: (c: Card) => boolean;
  odds?: { win: number; tie: number };
}) {
  const c = usePlainColors();
  const hand = game.hand;
  const seat = seatFor(hand, me?.id);
  const inBB = useStored<boolean>('flipup.bb', false) === true;
  const won = me ? (hand?.result?.won[me.id] ?? 0) : 0;
  const count = seat?.cards.length || holeCount(variantOf(game));
  // Two cards at full size; three or more step down so they still fit beside the box.
  const w = count > 2 || compact ? 72 : 100;
  const last = seat?.last;
  const money = !!last && last.move !== 'fold' && last.move !== 'check' && last.move !== 'sb' && last.move !== 'bb';
  const bb = Math.max(game.settings.bigBlind, 1);
  const myTurn = !!me && !!hand && !hand.result && hand.toAct === me.id;
  const big = compact ? 32 : 38;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 0,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {seat?.cards.length
          ? seat.cards.map((card, i) => (
              <View key={`${hand!.number}-${card}`} style={{ marginLeft: i === 0 ? 0 : count > 2 ? -30 : -22 }}>
                <PlayingCard
                  card={card}
                  width={w}
                  flip
                  delay={i * 180}
                  dim={(seat.folded && !seat.shown) || dim(card)}
                  glow={glow(card)}
                  pack={me?.cardPack}
                />
              </View>
            ))
          : Array.from({ length: count }, (_, i) => (
              <View key={i} style={{ marginLeft: i === 0 ? 0 : -22 }}>
                <CardSlot width={w} />
              </View>
            ))}
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
          paddingTop: compact ? 10 : 14,
          paddingBottom: 8,
          borderRadius: 24,
          borderCurve: 'continuous',
          borderWidth: 3,
          // Your turn: the whole box glows gold. A shadow and a border colour, so nothing moves; it's still under
          // Reduce Motion because it doesn't move at all.
          borderColor: myTurn ? 'rgba(245,183,0,0.9)' : c.separator,
          boxShadow: myTurn ? '0 0 18px 3px rgba(245,183,0,0.5)' : undefined,
        }}
      >
        {odds ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.tertiaryLabel }}>Win</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: c.gold, fontVariant: ['tabular-nums'] }}>{pct(odds.win)}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.tertiaryLabel }}>Tie</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: c.label, fontVariant: ['tabular-nums'] }}>{pct(odds.tie)}</Text>
          </View>
        ) : (
          // The chip count is the biggest thing in the box.
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${inBB ? 'Stack in big blinds' : 'Stack in chips'}, tap to switch`}
              onPress={() => {
                haptic.select();
                save('flipup.bb', !inBB);
              }}
            >
              {!me ? (
                <Text style={{ fontSize: big, fontWeight: '800', color: c.label }}>–</Text>
              ) : me.stack === 0 && (!hand || hand.result) ? (
                <Text style={{ fontSize: big, lineHeight: big + 4, fontWeight: '800', color: c.label }}>Out</Text>
              ) : inBB ? (
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={{ fontSize: big, lineHeight: big + 4, fontWeight: '800', color: c.label, fontVariant: ['tabular-nums'] }}
                >
                  {bigBlinds(me.stack / bb)}
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.tertiaryLabel }}> BB</Text>
                </Text>
              ) : (
                <Count value={me.stack} style={{ fontSize: big, lineHeight: big + 4, fontWeight: '800', color: c.label }} />
              )}
            </Pressable>
            {/* A fixed slot, so the win line coming or going never changes the box's height and moves the table. */}
            <View style={{ height: compact ? 16 : 20, justifyContent: 'center' }}>
              {won > 0 && <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: c.green }}>+{chips(won)}</Text>}
            </View>
          </View>
        )}
        {/* Name and emoji at the very bottom, with your position beside them. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, maxWidth: '100%' }}>
          <PositionChip pos={me ? positionOf(hand, me.id) : null} />
          {me && <Avatar emoji={me.emoji} size={22} />}
          {me && (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ flexShrink: 1, fontSize: 13, fontWeight: '600', color: c.tertiaryLabel }}>
              {me.name}
            </Text>
          )}
        </View>
        {/* Quick messages: top-left corner, half over the box's edge. */}
        {me && (
          <View style={{ position: 'absolute', top: -15, left: -9 }}>
            <QuickMessages />
          </View>
        )}
        {/* What you just did or said: a small pill outside the box, over its top-right corner. */}
        <View pointerEvents="none" style={{ position: 'absolute', right: -4, bottom: '100%', marginBottom: -10, width: 150, height: 0 }}>
          {talk ? (
            <Thread talk={talk} fx={me?.bubble} room={140} place={pinned('flex-end')} />
          ) : last && hand && quiet !== moveSig(hand.number, last) ? (
            <Animated.View key={`${hand.number}-${moveLabel(last)}`} entering={bubblePop} exiting={bubbleOut} style={pinned('flex-end')}>
              <MoveBubble text={moveLabel(last)} tone={money ? 'blue' : 'grey'} fx={me?.bubble} old={last.street !== hand.street} />
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
