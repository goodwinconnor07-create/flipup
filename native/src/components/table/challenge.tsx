// The table's challenge pieces: the strip under the bar, Short Stack's Shove buttons, Detective's tag on a seat,
// the sheets that open by themselves, and the result card at the end of a run.
import { router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';

import {
  challengeById,
  DETECTIVE,
  heroOf,
  labelName,
  options,
  REWIND,
  SHORT_STACK,
  shareText,
  shortStackBlind,
  shortStackStats,
  statLine,
  type Game,
  type Hand,
  type Label,
  type Seat,
} from '@/engine';
import { useProfile } from '@/state/profile';
import { dispatch, me as myDevice, openChallengeTable, requestLogs, revealSuspects, useTable, type ChallengeView } from '@/state/session';
import { brand, cardColors, radius, ROUNDED, spacing, useColors, usePlainColors } from '@/theme';

import { Button } from '../button';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { LivingCard } from '../living-card';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');
const bbOf = (chipsIn: number, bb: number) => {
  const x = chipsIn / bb;
  return x >= 10 || Number.isInteger(x) ? `${Math.round(x)}` : x.toFixed(1);
};

/** Under the table's bar: where the run is, in one line, and for Short Stack your stack in big blinds, large. */
export function ChallengeStrip({ game, view }: { game: Game; view: ChallengeView }) {
  const colors = useColors();
  const me = game.players.find((p) => p.deviceId === myDevice);
  const n = game.hand?.number ?? 0;
  if (game.status !== 'playing' || !me) return null;
  if (view.id === 'shortStack') {
    const bb = game.settings.bigBlind;
    const inFront = game.hand && !game.hand.result ? (game.hand.seats.find((s) => s.playerId === me.id)?.bet ?? 0) : 0;
    const left = SHORT_STACK.every - ((Math.max(1, n) - 1) % SHORT_STACK.every) - 1;
    const nextUp = shortStackBlind(n + left + 1);
    return (
      <View accessible accessibilityLabel={`Your stack: ${bbOf(me.stack + inFront, bb)} big blinds. Hand ${n}.`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 34, lineHeight: 40, fontWeight: '800', fontVariant: ['tabular-nums'], color: colors.label }}>
          {bbOf(me.stack + inFront, bb)}
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.secondaryLabel }}> bb</Text>
        </Text>
        <ThemedText variant="footnote" tone="secondaryLabel" style={{ flexShrink: 1 }}>
          {left === 0 ? `Blinds go to ${chips(nextUp / 2)}/${chips(nextUp)} next hand` : `Blinds up in ${left + 1} hands`}
        </ThemedText>
      </View>
    );
  }
  if (view.id === 'detective') {
    const nextCheck = DETECTIVE.checks.find((c) => c >= Math.max(1, n));
    return (
      <View accessible style={{ alignItems: 'center', paddingHorizontal: spacing.md }}>
        <ThemedText variant="footnote" tone="secondaryLabel" style={{ textAlign: 'center' }}>
          Hand {Math.max(1, n)} of {DETECTIVE.hands}
          {nextCheck ? ` · Read the table after hand ${nextCheck}` : ''} · Tap a seat to tag it
        </ThemedText>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 36 }}>
      <ThemedText variant="footnote" tone="secondaryLabel">
        Hand {Math.max(1, n)} of {REWIND.hands} · {view.rewindsLeft} Rewind{view.rewindsLeft === 1 ? '' : 's'} left
      </ThemedText>
      {view.canRewind && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Rewind the last hand"
          accessibilityHint="Pick one of your decisions and play it a different way"
          onPress={() => router.push('/rewind')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: 36, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: brand.violet }}
        >
          <Icon name="arrow.uturn.backward" size={14} color="#ffffff" />
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
            Rewind
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

/** Opens a challenge's sheets when the table asks: Detective's check before the deal, Rewind's result after a rewound hand. */
export function useChallengeSheets(view: ChallengeView | null): void {
  const opened = useRef('');
  const key = !view ? '' : view.checkWaiting >= 0 ? `check:${view.checkWaiting}` : view.whatIf ? `whatif:${view.whatIf.hand}:${view.whatIf.now}` : '';
  useEffect(() => {
    if (!key || opened.current === key) return;
    opened.current = key;
    router.push(key.startsWith('check') ? '/challenge-check' : '/rewind-result');
  }, [key]);
}

/** Short Stack at 12 big blinds or less: Fold (or Check when it's free), Call when you face a bet, and a big Shove. */
export function shoveTime(game: Game, seat: Seat): boolean {
  if (game.challenge?.id !== 'shortStack') return false;
  const me = game.players.find((p) => p.id === seat.playerId);
  return !!me && (me.stack + seat.bet) / game.settings.bigBlind <= SHORT_STACK.shoveAt;
}

export function ShoveTurn({ game, hand, seat, sending }: { game: Game; hand: Hand; seat: Seat; sending: boolean }) {
  const c = usePlainColors();
  const colors = useColors();
  const o = options(game, hand, seat);
  const me = game.players.find((p) => p.id === seat.playerId)!;
  const bb = game.settings.bigBlind;
  const act = (move: 'fold' | 'check' | 'call' | 'allin') => dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move });
  const shoveBb = bbOf(me.stack + seat.bet, bb);
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="headline" style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">
        Your turn
      </ThemedText>
      <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'stretch' }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          {o.canCheck ? (
            <SmallButton label="Check" bg={colors.label as string} ink={colors.background as string} disabled={sending} onPress={() => act('check')} />
          ) : (
            <SmallButton label="Fold" bg={c.redBg} ink={c.redInk} disabled={sending} onPress={() => act('fold')} />
          )}
          {!o.canCheck && (o.canRaise || !o.callIsAllIn) && <SmallButton label={o.callIsAllIn ? 'Call all in' : `Call ${bbOf(o.toCall, bb)} bb`} bg={colors.label as string} ink={colors.background as string} disabled={sending} onPress={() => act('call')} />}
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Shove, all in for ${shoveBb} big blinds`}
          disabled={sending}
          onPress={() => act(o.canRaise ? 'allin' : 'call')}
          outerStyle={{ flex: 2 }}
          style={{ flex: 1, minHeight: 76, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: brand.raise, paddingHorizontal: spacing.sm }}
        >
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 24, lineHeight: 28, fontWeight: '800', color: '#ffffff' }}>
            Shove
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'], color: '#ffffff' }}>
            {shoveBb} bb
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

function SmallButton({ label, bg, ink, onPress, disabled }: { label: string; bg: string; ink: string; onPress: () => void; disabled?: boolean }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{ flex: 1, minHeight: 52, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: bg, paddingHorizontal: spacing.xs }}>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontSize: 17, lineHeight: 20, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'], color: ink }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Detective: the style you tagged a seat with, as a small chip on it. */
export function TagChip({ label }: { label: Label }) {
  return (
    <View accessibilityLabel={`Tagged ${labelName(label)}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, backgroundColor: brand.violet }}>
      <Icon name="tag.fill" size={9} color="#ffffff" />
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontSize: 11, lineHeight: 13, fontWeight: '700', color: '#ffffff' }}>
        {labelName(label)}
      </Text>
    </View>
  );
}

// ── The end of a run ──

/** The result card, in the night LivingCard: the score, your best, a gold "New best", then Try again, Home and Share. */
export function ChallengeEnded({ game, onLeave }: { game: Game; onLeave: () => void }) {
  const t = useTable();
  const colors = useColors();
  const profile = useProfile();
  const view = t.challenge;
  const id = game.challenge!.id;
  const c = challengeById(id)!;
  useEffect(() => requestLogs(), [game.id]);
  const hero = heroOf(game);
  const records = useMemo(() => (t.logs ?? []).flatMap((l) => (l.record && l.record.tableId === game.id ? [l.record] : [])), [t.logs, game.id]);
  const stats = id === 'shortStack' && hero ? shortStackStats(records, hero.id) : null;
  const suspects = id === 'detective' ? revealSuspects() : null;
  const result = view?.result;
  const score = result?.score ?? 0;
  const unit = c.unit === 'bb' ? 'big blinds' : c.unit;
  const lastRight = suspects ? suspects.filter((s) => s.answers.at(-1) === s.label).length : 0;
  const newBest = !!result?.newBest;
  useEffect(() => {
    if (newBest) haptic.success();
  }, [newBest]);

  const share = () => {
    haptic.tap();
    void Share.share({ message: shareText(id, score, suspects ? `I read ${lastRight} of 5.` : undefined) });
  };
  const again = () => {
    haptic.tap();
    openChallengeTable(id, profile.name, profile.emoji);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.lg }}>
      <LivingCard colors={cardColors.night} style={{ padding: spacing.lg, gap: spacing.sm, alignItems: 'center' }}>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', letterSpacing: 0.6, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
          {c.name}
        </Text>
        <Text
          accessibilityRole="header"
          accessibilityLabel={`${score} ${unit}`}
          maxFontSizeMultiplier={1.2}
          style={{ fontFamily: ROUNDED, fontSize: 88, lineHeight: 96, fontWeight: '800', fontVariant: ['tabular-nums'], color: newBest ? brand.gold : '#ffffff' }}
        >
          {score}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
          {unit}
          {id === 'detective' ? ` of ${c.max}` : ''}
        </Text>
        {newBest ? (
          <View accessibilityRole="text" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.full, backgroundColor: brand.gold }}>
            <Icon name="star.fill" size={14} color={brand.goldInk} />
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '800', color: brand.goldInk }}>
              New best
            </Text>
          </View>
        ) : (
          <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
            Your best: {result?.best ?? score} {unit}
          </Text>
        )}
      </LivingCard>

      {stats && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Tile label="Shoves made" value={stats.shoves} />
          <Tile label="Shoves that won" value={stats.shovesWon} />
          <Tile label="Everyone folded" value={stats.foldedTo} />
          <Tile label="Peak stack" value={`${stats.peakBb} bb`} />
        </View>
      )}

      {suspects && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="title2" accessibilityRole="header">
            Who was who
          </ThemedText>
          <ThemedText variant="subhead" tone="secondaryLabel">
            You read {lastRight} of 5 at the last check.
          </ThemedText>
          {suspects.map((s) => (
            <View key={s.id} accessible style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
              <Text style={{ fontSize: 34 }} maxFontSizeMultiplier={1} accessible={false}>
                {s.emoji}
              </Text>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="headline">
                  {s.name} was a {labelName(s.label)}
                </ThemedText>
                <ThemedText variant="subhead" tone="secondaryLabel">
                  {statLine(s.stats)}.
                </ThemedText>
                <ThemedText variant="subhead">{s.tell}</ThemedText>
                <ThemedText variant="footnote" tone="tertiaryLabel">
                  You said {s.answers.map((a) => (a ? labelName(a) : '–')).join(', then ')}.
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}

      {id === 'rewind' && (
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="title2" accessibilityRole="header">
            Your Rewinds
          </ThemedText>
          {(view?.rewound ?? []).length === 0 ? (
            <ThemedText tone="secondaryLabel">You kept every hand as it came.</ThemedText>
          ) : (
            (view?.rewound ?? []).map((r) => (
              <ThemedText key={r.hand} tone="secondaryLabel">
                Hand {r.hand}: {signedBb(r.was, game.settings.bigBlind)} the first time, {signedBb(r.now, game.settings.bigBlind)} after the Rewind.
              </ThemedText>
            ))
          )}
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <Button title="Try again" variant="party" size="lg" onPress={again} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Share" variant="secondary" onPress={share} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Home"
              variant="secondary"
              onPress={() => {
                haptic.tap();
                onLeave();
              }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export const signedBb = (chipsIn: number, bb: number): string => {
  const x = Math.round((chipsIn / bb) * 10) / 10;
  return `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x)} bb`;
};

function Tile({ label, value }: { label: string; value: number | string }) {
  const colors = useColors();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexGrow: 1, flexBasis: '45%', padding: spacing.md, gap: 2, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: ROUNDED, fontSize: 34, lineHeight: 40, fontWeight: '800', fontVariant: ['tabular-nums'], color: colors.label }}>
        {value}
      </Text>
      <ThemedText variant="subhead" tone="secondaryLabel">
        {label}
      </ThemedText>
    </View>
  );
}
