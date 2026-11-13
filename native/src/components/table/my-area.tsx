// The bottom of the table: your cards, big and overlapping, with "Show cards" under them after a hand you didn't have to
// show; and your box beside them, outlined in the separator colour (gold glow on your turn): your chip count biggest,
// your position, emoji and name at the very bottom, the quick messages button half over the top-left corner, and what
// you said as a small pill over the top-right corner. During an all-in run-out the box shows your odds instead.
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { holeCount, moveLabel, positionOf, seatFor, variantOf, type Card, type Game, type Player, type Talk } from '@/engine';
import { save, useStored } from '@/state/storage';
import { brand, usePlainColors } from '@/theme';

import { Avatar } from '../avatar';
import { haptic } from '../haptics';
import { bubbleOut, bubblePop, MoveBubble, moveTone, pinnedTop, Thread } from './bubbles';
import { Count } from './count';
import { CardSlot, PlayingCard } from './playing-card';
import { MissionCard } from './mission-card';
import { PowerCard, powerCardWidth } from './power-card';
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
  onPower,
}: {
  game: Game;
  compact?: boolean;
  /** Power Cards and Secret Missions: a tap on your power or mission card opens its panel. */
  onPower?: () => void;
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
  const variant = variantOf(game);
  // Headband: your forehead card isn't sent to you until the cards turn over, but it's still one of your two.
  const forehead = variant === 'headband' && !!seat && seat.cards.length === 1;
  const count = forehead ? 2 : seat?.cards.length || holeCount(variant, hand?.seats.length ?? 0);
  const { width: screen } = useWindowDimensions();
  // Power Cards: your power is a card beside your two, so the hole cards step down to leave the box room (it keeps
  // about 130pt for the chip count). The size depends only on the screen, so it's the same every hand. Secret
  // Missions lays out the same way, with your mission as the third card.
  const special = variantOf(game);
  const powered = special === 'power' || special === 'missions';
  const powerHole = Math.max(56, Math.min(compact ? 72 : 84, Math.floor((screen - 160) / 2.8)));
  // Two cards at full size; three or more step down so they still fit beside the box.
  const w = powered ? powerHole : count >= 4 ? 58 : count > 2 || compact ? 72 : 100;
  const overlap = count >= 4 ? -32 : count > 2 ? -30 : -22;
  // Your last move clears once a new street's cards land (an all in stays, it's still true).
  const last = seat?.last && (!hand || seat.last.street === hand.street || seat.last.move === 'allin') ? seat.last : null;
  const bb = Math.max(game.settings.bigBlind, 1);
  const myTurn = !!me && !!hand && !hand.result && hand.toAct === me.id;
  const big = compact || powered ? 32 : 38;
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
              <View key={`${hand!.number}-${card}`} style={{ marginLeft: i === 0 ? 0 : overlap }}>
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
              <View key={i} style={{ marginLeft: i === 0 ? 0 : overlap }}>
                <CardSlot width={w} />
              </View>
            ))}
        {forehead && (
          // Headband: your forehead card, face down for you, with a headband over it.
          <View accessibilityLabel="Your headband card. Everyone else can see it, you can't." style={{ marginLeft: overlap }}>
            <PlayingCard back width={w} pack={me?.cardPack} />
            <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: Math.round(w * 0.42) }}>🤕</Text>
            </View>
          </View>
        )}
        {powered && (
          <View style={{ marginLeft: 8, justifyContent: 'center' }}>
            {special === 'missions' ? (
              <MissionCard game={game} meId={me?.id} width={powerCardWidth(w)} height={Math.round(w * 1.4)} onOpen={() => onPower?.()} />
            ) : (
              <PowerCard game={game} meId={me?.id} width={powerCardWidth(w)} height={Math.round(w * 1.4)} onOpen={() => onPower?.()} />
            )}
          </View>
        )}
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
          // Win and Tie side by side, each shrinking to fit its half, so the box never needs more height than it has
          // and the numbers can't run into the name row or the move pill on the corner.
          <View
            style={{
              flex: 1,
              alignSelf: 'stretch',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingTop: 12,
              minHeight: 0,
            }}
          >
            <OddsCell label="Win" value={pct(odds.win)} size={28} colour={c.gold} caption={c.tertiaryLabel} />
            <OddsCell label="Tie" value={pct(odds.tie)} size={24} colour={c.label} caption={c.tertiaryLabel} />
          </View>
        ) : (
          // The chip count is the biggest thing in the box, sat a little low so the corner bubbles have room above it.
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: compact ? 10 : 14 }}>
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
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={{ flexShrink: 1, fontSize: 13, fontWeight: me.gold ? '800' : '600', color: me.gold ? brand.gold : c.tertiaryLabel }}
            >
              {me.name}
            </Text>
          )}
        </View>
        {/* Quick messages: top-left corner, half over the box's edge. */}
        {me && (
          <View style={{ position: 'absolute', top: -15, left: -9 }}>
            <QuickMessages imposter={variantOf(game) === 'imposter'} />
          </View>
        )}
        {/* What you just did or said: a small pill whose top is pinned to the top-right corner, a little outside the box's edge, mirroring the
            quick-messages button on the left. */}
        <View pointerEvents="none" style={{ position: 'absolute', right: -9, top: -17, width: 150, height: 0 }}>
          {talk ? (
            <Thread talk={talk} room={140} place={pinnedTop('flex-end')} />
          ) : last && hand && quiet !== moveSig(hand.number, last) ? (
            <Animated.View key={`${hand.number}-${moveLabel(last)}`} entering={bubblePop} exiting={bubbleOut} style={pinnedTop('flex-end')}>
              <MoveBubble text={moveLabel(last)} tone={moveTone(last.move, hand, me?.id, game.settings.bigBlind)} old={last.street !== hand.street} />
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** One half of the odds readout: a small label over a number that shrinks rather than overflow. */
function OddsCell({
  label,
  value,
  size,
  colour,
  caption,
}: {
  label: string;
  value: string;
  size: number;
  colour: string;
  caption: string;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
      <Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: caption }}>
        {label}
      </Text>
      <Text
        maxFontSizeMultiplier={1.1}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={{
          alignSelf: 'stretch',
          textAlign: 'center',
          fontSize: size,
          lineHeight: size + 4,
          fontWeight: '700',
          color: colour,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
