// Power Cards at the table, as on the web (src/screens/table/Powers.tsx): your power for this hand, the Play button
// on your turn, the choice a power needs (who, which card, which rank), and the line everyone sees when one is played.
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { effectOf, options, powerInfo, powerLine, powerTargets, rankName, type Game, type Player, type PowerId, type Seat } from '@/engine';
import { dispatch } from '@/state/session';
import { brand, minTap, radius, spacing, useColors, usePlainColors } from '@/theme';

import { haptic } from '../haptics';
import { ThemedText } from '../themed-text';

const SUIT: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
/** "Q♥", "10♠": a card's short label for a button. */
const short = (c: string) => `${c[0] === 'T' ? '10' : c[0]}${SUIT[c[1]] ?? ''}`;
/** "[Qh]" in a power line becomes "Q♥". */
const plain = (text: string) => text.replace(/\[([2-9TJQKA][shdc])\]/g, (_m, c: string) => short(c));
const RANKS = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const rankChar = (r: number) => (r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : String(r));

/** A small grey-cell button, for the choices a power needs. */
function Choice({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={{ minHeight: minTap, minWidth: minTap, paddingHorizontal: spacing.sm, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cell }}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: '600', color: colors.label }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Your power this hand, what it showed you once played, and Play (with its choice) on your turn. */
export function PowerStrip({ game, me, seat, myTurn, sending }: { game: Game; me?: Player; seat?: Seat; myTurn: boolean; sending: boolean }) {
  const colors = useColors();
  const c = usePlainColors();
  const hand = game.hand;
  const [choosing, setChoosing] = useState(false);
  const key = hand ? `${hand.number}-${hand.seq}` : '';
  useEffect(() => setChoosing(false), [key]);
  if (!hand || hand.variant !== 'power' || !me || !seat || hand.result) return null;
  const mine = hand.powers?.[me.id];
  if (!mine) return null;
  const use = hand.powerUses?.find((u) => u.by === me.id);
  const can = myTurn && !use ? (options(game, hand, seat).power ?? null) : null;
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? 'Someone';
  const shown = use ? effectOf(use) : mine;
  const info = powerInfo(shown);
  let note = info.short;
  if (use) {
    if (effectOf(use) === 'peek' && use.seen?.[0]) note = `Next card: ${short(use.seen[0])}`;
    else if (effectOf(use) === 'xray' && use.seen?.[0] && use.target) note = `${name(use.target)} has ${short(use.seen[0])}`;
    else if (effectOf(use) === 'bounty' && use.rank) note = `Bounty on ${rankName(use.rank, true)}`;
    else if (effectOf(use) === 'shield') note = 'Shield up';
    else note = 'Played';
  }
  const silenced = hand.silenced?.[me.id] === hand.street && !seat.folded;

  if (choosing && can) return <PowerChoice game={game} seat={seat} effect={can.effect} onCancel={() => setChoosing(false)} />;
  return (
    <View
      accessibilityLabel={`Your power: ${powerInfo(mine).name}. ${note}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell, opacity: use ? 0.75 : 1, borderWidth: can ? 2 : 0, borderColor: brand.gold }}
    >
      <Text style={{ fontSize: 26 }}>{info.emoji}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontWeight: '600' }}>{powerInfo(mine).name}</ThemedText>
        <ThemedText variant="footnote" tone="secondaryLabel">
          {note}
        </ThemedText>
        {silenced && (
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, color: c.redInk }}>
            🤐 Silenced: no betting or raising this street
          </Text>
        )}
      </View>
      {can && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${powerInfo(can.effect).name}`}
          disabled={sending}
          onPress={() => {
            haptic.tap();
            if (powerInfo(can.effect).needs) setChoosing(true);
            else dispatch({ type: 'power', hand: hand.number, seq: hand.seq });
          }}
          style={{ minHeight: minTap, paddingHorizontal: spacing.md, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.gold }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: brand.goldInk }}>Play</Text>
        </Pressable>
      )}
    </View>
  );
}

/** The choice a power needs: who, which card, or which rank. */
function PowerChoice({ game, seat, effect, onCancel }: { game: Game; seat: Seat; effect: PowerId; onCancel: () => void }) {
  const colors = useColors();
  const hand = game.hand!;
  const info = powerInfo(effect);
  const play = (more: { target?: string; card?: string; rank?: number }) => dispatch({ type: 'power', hand: hand.number, seq: hand.seq, ...more });
  let title = '';
  let choices: { label: string; more: { target?: string; card?: string; rank?: number } }[] = [];
  if (info.needs === 'player') {
    title = effect === 'xray' ? 'Whose card do you want to see?' : 'Who do you want to silence?';
    choices = powerTargets(hand, seat, effect).map((s) => {
      const p = game.players.find((x) => x.id === s.playerId);
      return { label: `${p?.emoji ?? ''} ${p?.name ?? 'Someone'}`, more: { target: s.playerId } };
    });
  } else if (info.needs === 'ownCard' || info.needs === 'boardCard') {
    title = info.needs === 'ownCard' ? 'Which card do you want to swap?' : 'Which board card do you want to reroll?';
    choices = (info.needs === 'ownCard' ? seat.cards : hand.board).map((card) => ({ label: short(card), more: { card } }));
  } else if (info.needs === 'rank') {
    title = 'Call a rank for your bounty';
    choices = RANKS.map((r) => ({ label: rankChar(r), more: { rank: r } }));
  }
  return (
    <View style={{ gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.background }}>
      <ThemedText style={{ fontWeight: '600', textAlign: 'center' }}>
        {info.emoji} {title}
      </ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs }}>
        {choices.map((ch) => (
          <Choice key={ch.label} label={ch.label} onPress={() => play(ch.more)} />
        ))}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={onCancel} style={{ alignSelf: 'center', minHeight: minTap, justifyContent: 'center' }}>
        <ThemedText tone="secondaryLabel">Not now</ThemedText>
      </Pressable>
    </View>
  );
}

/** The line everyone sees while a power is being played: "🩻 Sam X-rayed Maya". */
export function powerNote(game: Game): string | null {
  const hand = game.hand;
  const last = hand?.powerUses?.[hand.powerUses.length - 1];
  if (!hand || hand.moment?.kind !== 'power' || !last) return null;
  return plain(powerLine(last, (id) => game.players.find((p) => p.id === id)?.name ?? 'Someone'));
}
