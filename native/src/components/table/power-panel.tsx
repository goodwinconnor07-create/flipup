// Power Cards: the panel your power card opens. It rises from the bottom of the table like the raise panel, over it
// rather than inside it, so nothing on the table moves. It says what the power does and where it stands; on your
// turn it holds the choice the power needs, drawn as the real thing (faces for a player, cards for a card, a row of
// ranks for a bounty), and one gold button that plays it. Nothing is sent until that button.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { powerInfo, powerTargets, rankName, seatFor, type Card, type Game, type PowerId } from '@/engine';
import { detail, rise, sink } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { myPower, powerOnShow, shortCard } from '@/state/power-view';
import { dispatch } from '@/state/session';
import { brand, minTap, radius, spacing, useColors, useShadows } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { Swap } from '../swap';
import { ThemedText } from '../themed-text';
import { PlayingCard } from './playing-card';
import { useTableNow } from './use-now';

/** Ace down to two, for the bounty. */
const RANKS = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const rankChar = (r: number) => (r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : String(r));

type Pick = { target?: string; card?: Card; rank?: number };

/** The gold button's words: what will happen, once there's enough to do it. */
function playLabel(effect: PowerId, pick: Pick, name: (id: string) => string): string {
  switch (effect) {
    case 'peek':
      return 'Peek at the next card';
    case 'xray':
      return pick.target ? `X-ray ${name(pick.target)}` : 'Pick who to X-ray';
    case 'swap':
      return pick.card ? `Swap your ${shortCard(pick.card)}` : 'Pick a card to swap';
    case 'reroll':
      return pick.card ? `Reroll the ${shortCard(pick.card)}` : 'Pick a board card';
    case 'extra':
      return 'Add a card to the board';
    case 'passleft':
      return 'Everyone passes a card left';
    case 'shield':
      return 'Put up your shield';
    case 'silence':
      return pick.target ? `Silence ${name(pick.target)}` : 'Pick who to silence';
    case 'bounty':
      return pick.rank ? `Bounty on ${rankName(pick.rank, true)}` : 'Pick a rank';
    case 'foldtax':
      return 'Start the fold tax';
    default:
      return `Play ${powerInfo(effect).name}`;
  }
}

export function PowerPanel({ game, meId, inset, sending, onClose }: { game: Game; meId: string | undefined; inset: number; sending: boolean; onClose: () => void }) {
  const colors = useColors();
  const shadow = useShadows();
  const reduce = useReduceMotion();
  const hand = game.hand;
  const p = myPower(game, meId);
  const now = useTableNow(game.fast, 250);
  // A choice belongs to the turn it was made on: a new move (or hand) clears it.
  const turnKey = hand ? `${hand.number}-${hand.seq}` : '';
  const [state, setState] = useState<{ key: string; pick: Pick }>({ key: turnKey, pick: {} });
  const pick = state.key === turnKey ? state.pick : {};
  const choose = (next: Pick) => {
    haptic.select();
    setState({ key: turnKey, pick: next });
  };
  if (!hand || !p.power) return null;
  const info = powerInfo(p.power);
  const effect = p.effect ?? null;
  const doing = effect ? powerInfo(effect) : null;
  const ready = p.state === 'ready' && !!effect && !!doing;
  const seat = seatFor(hand, meId);
  const name = (id: string) => game.players.find((x) => x.id === id)?.name ?? 'Someone';
  const needs = ready ? doing!.needs : null;
  const enough = !needs || (needs === 'player' ? !!pick.target : needs === 'rank' ? !!pick.rank : !!pick.card);
  const busy = sending || powerOnShow(hand, now);
  const play = () => {
    if (!ready || !enough || busy) return;
    haptic.tap();
    onClose();
    dispatch({ type: 'power', hand: hand.number, seq: hand.seq, ...pick });
  };

  return (
    <Animated.View
      entering={rise(reduce)}
      exiting={sink(reduce)}
      accessibilityViewIsModal
      style={{
        transformOrigin: '50% 100%',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: -inset,
        padding: spacing.md,
        paddingBottom: inset + spacing.sm,
        gap: spacing.md,
        backgroundColor: colors.background,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        boxShadow: shadow.raised,
      }}
    >
      {/* The power: its picture on a small gold card, its name, and close. */}
      <Animated.View entering={detail(0, reduce)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: 44, height: 60, borderRadius: 9, borderCurve: 'continuous', padding: 2, backgroundColor: brand.gold }}>
          <View style={{ flex: 1, borderRadius: 7, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: brand.violetDeep }}>
            <Text maxFontSizeMultiplier={1} accessible={false} style={{ fontSize: 26 }}>
              {info.emoji}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="title2" style={{ fontWeight: '800' }}>
            {info.name}
          </ThemedText>
          <ThemedText variant="subhead" tone="secondaryLabel">
            {p.power === 'copycat' && effect && effect !== 'copycat' ? `Copies ${powerInfo(effect).name} right now` : info.short}
          </ThemedText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={{ minWidth: minTap, minHeight: minTap, alignItems: 'flex-end', justifyContent: 'flex-start' }}>
          <Icon name="xmark" size={20} color={colors.label} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={detail(1, reduce)} style={{ gap: spacing.xs }}>
        <ThemedText variant="callout" tone="secondaryLabel">
          {doing && p.power === 'copycat' ? doing.rule : info.rule}
        </ThemedText>
        <ThemedText variant="callout" style={{ fontWeight: '700', color: ready ? colors.label : colors.secondaryLabel }}>
          {p.note}
        </ThemedText>
      </Animated.View>

      {ready && needs === 'player' && seat && (
        <Animated.View entering={detail(2, reduce)} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
          {powerTargets(hand, seat, effect!).map((s) => {
            const who = game.players.find((x) => x.id === s.playerId);
            const on = pick.target === s.playerId;
            return (
              <PressableScale
                key={s.playerId}
                accessibilityRole="radio"
                accessibilityLabel={who?.name ?? 'Someone'}
                accessibilityState={{ checked: on }}
                onPress={() => choose({ target: s.playerId })}
                style={{ width: 72, alignItems: 'center', gap: 4, paddingVertical: spacing.xs, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: 2, borderColor: on ? brand.gold : 'transparent', backgroundColor: on ? 'rgba(245,183,0,0.14)' : colors.cell }}
              >
                <Text maxFontSizeMultiplier={1} accessible={false} style={{ fontSize: 32, lineHeight: 38 }}>
                  {who?.emoji ?? '🙂'}
                </Text>
                <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ maxWidth: 64, fontSize: 13, fontWeight: '700', color: colors.label }}>
                  {who?.name ?? 'Someone'}
                </Text>
              </PressableScale>
            );
          })}
        </Animated.View>
      )}

      {ready && (needs === 'ownCard' || needs === 'boardCard') && seat && (
        <Animated.View entering={detail(2, reduce)} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.xs }}>
          {(needs === 'ownCard' ? seat.cards : hand.board).map((card) => {
            const on = pick.card === card;
            return (
              <Pressable
                key={card}
                accessibilityRole="radio"
                accessibilityLabel={shortCard(card)}
                accessibilityState={{ checked: on }}
                onPress={() => choose({ card })}
                hitSlop={4}
              >
                {/* The chosen card lifts and is ringed in gold (the card's own glow). */}
                <PlayingCard card={card} width={needs === 'ownCard' ? 64 : 50} glow={on} />
              </Pressable>
            );
          })}
        </Animated.View>
      )}

      {ready && needs === 'rank' && (
        <Animated.View entering={detail(2, reduce)} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {RANKS.map((r) => {
            const on = pick.rank === r;
            return (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityLabel={rankName(r, true)}
                accessibilityState={{ checked: on }}
                onPress={() => choose({ rank: r })}
                style={{ width: 40, height: 48, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? brand.gold : 'transparent', backgroundColor: on ? 'rgba(245,183,0,0.14)' : colors.cell }}
              >
                <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 18, fontWeight: '800', color: colors.label }}>
                  {rankChar(r)}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      )}

      {ready && (
        <Animated.View entering={detail(3, reduce)}>
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: !enough || busy }}
            disabled={!enough || busy}
            onPress={play}
            style={{ minHeight: 56, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, backgroundColor: enough ? brand.gold : colors.cell }}
          >
            <Swap id={playLabel(effect!, pick, name)} kind="text">
              <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 17, fontWeight: '800', color: enough ? brand.goldInk : colors.secondaryLabel }}>
                {playLabel(effect!, pick, name)}
              </Text>
            </Swap>
          </PressableScale>
        </Animated.View>
      )}
    </Animated.View>
  );
}
