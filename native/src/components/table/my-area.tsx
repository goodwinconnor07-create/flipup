// The bottom of the table: your cards, big and overlapping, with "Show cards" under them after a hand you didn't have to
// show; and your box beside them, outlined in the separator colour (gold glow on your turn): your chip count biggest,
// your position, emoji and name at the very bottom, the quick messages button half over the top-left corner, and what
// you said as a small pill over the top-right corner. During an all-in run-out the box shows your odds instead.
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { handNet, holeCount, moveLabel, positionOf, seatFor, variantOf, type Card, type Game, type Player, type Talk } from '@/engine';
import { save, useStored } from '@/state/storage';
import { brand, usePlainColors } from '@/theme';

import { Avatar } from '../avatar';
import { haptic } from '../haptics';
import { bubbleOut, bubblePop, MoveBubble, moveTone, pinnedTop, Thread } from './bubbles';
import { Count } from './count';
import { CardSlot, PlayingCard } from './playing-card';
import { PowerCard, powerCardWidth } from './power-card';
import { QuickMessages } from './quick-messages';
import { pct, PositionChip } from './seats';
import { moveSig } from './use-reactions';
import { Spot } from '@/components/demo/spots';

/** Four or five cards: how much of each card shows past the next one (its corner, rank and suit). */
const SHOWING = 0.5;
/** Four or five cards: how far each card turns from the one before, in degrees. */
const FAN_DEG = 3;

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
  /** Power Cards: a tap on your power card opens its panel. */
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
  // What you're up on the hand (chips back less chips in): a split that only gave your own back isn't a win.
  const won = me && hand?.result ? Math.max(0, handNet(hand, me.id)) : 0;
  const lostWith = me && hand?.result?.showdown && !won && !(hand.result.won[me.id] > 0) ? hand.result.names[me.id] : undefined;
  const variant = variantOf(game);
  const count = seat?.cards.length || holeCount(variant);
  const { width: screen } = useWindowDimensions();
  // Power Cards: your power is a card beside your two, so the hole cards step down to leave the box room (it keeps
  // about 130pt for the chip count). The size depends only on the screen, so it's the same every hand.
  const powered = variant === 'power';
  const powerHole = Math.max(56, Math.min(compact ? 72 : 84, Math.floor((screen - 160) / 2.8)));
  // Two cards at full size; three step down so they still fit beside the box. Four or five (Bean Stalk by the river)
  // are sized from the screen: each card tucks under the next leaving half
  // its width showing, which is the rank and suit in the corner, and the box keeps at least `BOX_MIN` for the chips.
  // Bean Stalk is sized for its five from the deal, so the cards never shrink as the hand grows.
  const room = variant === 'beanstalk' ? 5 : count;
  const many = !powered && room >= 4;
  const boxMin = screen >= 375 ? 128 : 108;
  const manyW = Math.min(compact ? 62 : 68, Math.floor((screen - 32 - 12 - boxMin) / (1 + (room - 1) * SHOWING)));
  const w = powered ? powerHole : many ? manyW : count > 2 || compact ? 72 : 100;
  const overlap = many ? -Math.round(w * (1 - SHOWING)) : count > 2 ? -30 : -22;
  // A hand of four or five is held as a gentle fan, like cards in a hand (the way phone poker apps show Omaha):
  // the middle card highest, each card turned a few degrees. Bean Stalk and Hit Me grow during the hand, so their
  // cards stay straight rather than shift as the next one lands.
  const fan = many && variant !== 'beanstalk' && variant !== 'bjholdem';
  const fanned = (i: number, n: number) => {
    if (!fan) return undefined;
    const k = i - (n - 1) / 2;
    return [{ translateY: k * k * 1.5 }, { rotate: `${k * FAN_DEG}deg` }];
  };
  // With that many cards the box is narrow: the chip count shrinks to fit and your name goes (your face and position
  // stay; everyone knows their own name).
  const tight = many;
  // Bean Stalk: how many more cards your hand will get this hand (none once you've folded or the hand is over).
  const dealtIn = seat && !seat.folded && !hand?.result;
  const growing = variant === 'beanstalk' && (dealtIn || !seat?.cards.length) ? Math.max(0, room - (seat?.cards.length || count)) : 0;
  // Bean Stalk: the room for five is kept, but the cards you have sit side by side while they fit (with two or three
  // there's no reason to cover any), and the faint slots still to come tuck in behind them (the owner's call).
  const span = many ? w + (room - 1) * (w + overlap) : 0;
  const realN = seat?.cards.length || count;
  const stalk = variant === 'beanstalk' && many;
  const realStep = stalk && realN > 1 ? Math.min(w + 4, Math.floor((span - w - growing * 12) / (realN - 1))) : w + overlap;
  const growStep = stalk && growing ? Math.max(8, Math.floor((span - (w + (realN - 1) * realStep)) / growing)) : w + overlap;
  // The box's room for the count (less its padding and border), and a size that fits the number in it: the digits of
  // SF Pro bold are about 0.62 of the font size wide. Worked out here rather than with adjustsFontSizeToFit: on iOS
  // that drew nothing at all in a box whose text has no set width (Bean Stalk on TestFlight, 13 Nov 2026).
  const bb = Math.max(game.settings.bigBlind, 1);
  const boxInner = screen - 32 - 12 - (w + (room - 1) * (w + overlap)) - 22;
  const label = me ? (inBB ? `${bigBlinds(me.stack / bb)} BB` : chips(me.stack)) : '';
  const fitSize = tight && label ? Math.max(18, Math.floor(boxInner / (label.length * 0.62))) : 99;
  // Your last move clears once a new street's cards land (an all in stays, it's still true).
  const last = seat?.last && (!hand || seat.last.street === hand.street || seat.last.move === 'allin') ? seat.last : null;
  const myTurn = !!me && !!hand && !hand.result && hand.toAct === me.id;
  const big = Math.min(compact || powered || tight ? 32 : 38, fitSize);
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
      {/* Bean Stalk keeps the room for all five from the deal, so the box beside it never narrows mid-hand. */}
      <View style={{ flexDirection: 'row', paddingBottom: fan ? 6 : 0, minWidth: many ? w + (room - 1) * (w + overlap) : undefined }}>
        {seat?.cards.length
          ? seat.cards.map((card, i) => (
              <View key={`${hand!.number}-${card}`} style={{ marginLeft: i === 0 ? 0 : realStep - w, transform: fanned(i, seat.cards.length) }}>
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
              <View key={i} style={{ marginLeft: i === 0 ? 0 : realStep - w, transform: fanned(i, count) }}>
                <CardSlot width={w} fill={c.background} />
              </View>
            ))}
        {/* Bean Stalk: the cards your hand will grow into this hand, as faint dashed slots in the room kept for them. */}
        {growing > 0 &&
          Array.from({ length: growing }, (_, i) => (
            <View key={`grow-${i}`} accessible={false} style={{ marginLeft: growStep - w, zIndex: -1 }}>
              <CardSlot width={w} fill={c.background} dashed />
            </View>
          ))}
        {powered && (
          <Spot id="power.card" style={{ marginLeft: 8, justifyContent: 'center' }}>
            <PowerCard game={game} meId={me?.id} width={powerCardWidth(w)} height={Math.round(w * 1.4)} onOpen={() => onPower?.()} />
          </Spot>
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
              {won > 0 ? (
                <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: c.green }}>+{chips(won)}</Text>
              ) : lostWith ? (
                // A showdown you lost: what your hand was, so it's never a mystery why.
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: c.tertiaryLabel }}>
                  {lostWith.split(',')[0]}
                </Text>
              ) : null}
            </View>
          </View>
        )}
        {/* Name and emoji at the very bottom, with your position beside them. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, maxWidth: '100%' }}>
          <PositionChip pos={me ? positionOf(hand, me.id) : null} />
          {me && <Avatar emoji={me.emoji} size={22} />}
          {me && !tight && (
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
            <QuickMessages />
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
