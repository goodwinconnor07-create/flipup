// The bottom of the table, as on the web (MyBox in Pods.tsx, .me-area and .my-box in table.css): your cards, big and
// overlapping, with "Show cards" under them after a hand you didn't have to show; and your box beside them, outlined
// in the separator colour: your move or what you said on its top edge, the quick messages button in its corner, your
// name, your stack (counting as it changes; tap it to see it in big blinds), and what you've put in or won. During an
// all-in run-out the box shows your odds instead.
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { holeCount, moveLabel, positionOf, seatFor, variantOf, type Card, type Game, type Player, type Talk } from '@/engine';
import { dispatch } from '@/state/session';
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
  const canShow = !!hand?.result && !!seat && !seat.shown && seat.cards.length === 2;
  const won = me ? (hand?.result?.won[me.id] ?? 0) : 0;
  const count = seat?.cards.length || holeCount(variantOf(game));
  // Two cards at full size; three or more step down so they still fit beside the box.
  const w = count > 2 || compact ? 72 : 100;
  const last = seat?.last;
  const money = !!last && last.move !== 'fold' && last.move !== 'check' && last.move !== 'sb' && last.move !== 'bb';
  const bb = Math.max(game.settings.bigBlind, 1);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: canShow ? 28 : 0,
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
                  dim={seat.folded || dim(card)}
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
        {canShow && (
          <Animated.View
            entering={bubblePop}
            style={{ position: 'absolute', top: '100%', marginTop: 5, left: 0, right: 0, alignItems: 'center' }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show my cards"
              onPress={() => {
                haptic.tap();
                if (hand) dispatch({ type: 'show', hand: hand.number });
              }}
              style={{ height: 22, paddingHorizontal: 10, borderRadius: 11, justifyContent: 'center', backgroundColor: c.cell }}
            >
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: '600', color: c.secondaryLabel }}>
                Show cards
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          padding: 8,
          borderRadius: 24,
          borderCurve: 'continuous',
          borderWidth: 3,
          borderColor: c.separator,
        }}
      >
        {odds ? (
          <>
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.tertiaryLabel }}>Win</Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: c.gold, fontVariant: ['tabular-nums'] }}>{pct(odds.win)}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.tertiaryLabel }}>Tie</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: c.label, fontVariant: ['tabular-nums'] }}>{pct(odds.tie)}</Text>
          </>
        ) : (
          <>
            {me && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' }}>
                <Avatar emoji={me.emoji} size={22} />
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                  style={{ flexShrink: 1, fontSize: 13, fontWeight: '600', color: c.tertiaryLabel }}
                >
                  {me.name}
                </Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${inBB ? 'Stack in big blinds' : 'Stack in chips'}, tap to switch`}
              onPress={() => {
                haptic.select();
                save('flipup.bb', !inBB);
              }}
            >
              {!me ? (
                <Text style={{ fontSize: 28, fontWeight: '700', color: c.label }}>–</Text>
              ) : me.stack === 0 && (!hand || hand.result) ? (
                <Text style={{ fontSize: 28, lineHeight: 31, fontWeight: '700', color: c.label }}>Out</Text>
              ) : inBB ? (
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={{ fontSize: 28, lineHeight: 31, fontWeight: '700', color: c.label, fontVariant: ['tabular-nums'] }}
                >
                  {bigBlinds(me.stack / bb)}
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.tertiaryLabel }}> BB</Text>
                </Text>
              ) : (
                <Count value={me.stack} style={{ fontSize: 28, lineHeight: 31, fontWeight: '700', color: c.label }} />
              )}
            </Pressable>
            {/* A fixed slot, so the win line coming or going never changes the box's height and moves the table. */}
            <View style={{ height: 20, justifyContent: 'center' }}>
              {won > 0 && <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: c.green }}>+{chips(won)}</Text>}
            </View>
          </>
        )}
        <View style={{ position: 'absolute', left: 8, bottom: 8 }}>
          <PositionChip pos={me ? positionOf(hand, me.id) : null} />
        </View>
        {me && (
          <View style={{ position: 'absolute', top: 6, left: 6 }}>
            <QuickMessages />
          </View>
        )}
        {/* What you just did or said, on the top edge of the box. */}
        <View pointerEvents="none" style={{ position: 'absolute', right: 12, bottom: '100%', marginBottom: -16, width: 240, height: 0 }}>
          {talk ? (
            <Thread talk={talk} fx={me?.bubble} room={220} place={pinned('flex-end')} />
          ) : last && hand && quiet !== moveSig(hand.number, last) ? (
            <Animated.View key={`${hand.number}-${moveLabel(last)}`} entering={bubblePop} exiting={bubbleOut} style={pinned('flex-end')}>
              <MoveBubble text={moveLabel(last)} tone={money ? 'blue' : 'grey'} fx={me?.bubble} old={last.street !== hand.street} big />
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
