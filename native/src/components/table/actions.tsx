import { Host, Slider } from '@expo/ui';
import { Children, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { lastStanding, options, pot, type Game, type Hand, type Player, type Seat } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { dispatch } from '@/state/session';
import { minTap, radius, spacing, useColors, useShadows } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';
import { useNow } from './use-now';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** Set before your turn. `current` only plays while the bet is still the `bet` it was set against. */
export type PreAction = { kind: 'checkfold' | 'callany' | 'current'; bet: number } | null;

type Tone = 'fold' | 'green' | 'blue' | 'dark' | 'pre' | 'preOn';

/** One of the big table buttons: at least 60pt tall, in the three slots Fold, Check/Call and Raise share. */
function TableButton({ label, sub, tone, onPress, disabled }: { label: string; sub?: string; tone: Tone; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  const look: Record<Tone, { bg: string; ink: string }> = {
    fold: { bg: 'rgba(255,59,48,0.14)', ink: colors.red as string },
    green: { bg: colors.green as string, ink: '#ffffff' },
    blue: { bg: colors.accent as string, ink: '#ffffff' },
    dark: { bg: colors.label as string, ink: colors.background as string },
    pre: { bg: colors.cell as string, ink: colors.secondaryLabel as string },
    preOn: { bg: colors.accent as string, ink: '#ffffff' },
  };
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label} ${sub}` : label}
      accessibilityState={{ disabled: !!disabled, selected: tone === 'preOn' }}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: 60, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs, backgroundColor: look[tone].bg }}
    >
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ color: look[tone].ink, fontSize: tone === 'pre' || tone === 'preOn' ? 15 : 19, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {label}
        {sub ? ` ${sub}` : ''}
      </Text>
    </PressableScale>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <ThemedText variant="headline" style={{ textAlign: 'center' }}>
      {children}
    </ThemedText>
  );
}

/** Buttons side by side, sharing the width equally. */
const Row = ({ children }: { children: ReactNode }) => (
  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
    {Children.toArray(children).map((c, i) => (
      <View key={i} style={{ flex: 1 }}>
        {c}
      </View>
    ))}
  </View>
);

/** Everything under the felt: whose turn it is, your buttons, pre-actions, and what happens between hands. */
export function ActionArea({ game, me, seat, myTurn, sending, pre, setPre, onRaise }: { game: Game; me?: Player; seat?: Seat; myTurn: boolean; sending: boolean; pre: PreAction; setPre: (p: PreAction) => void; onRaise: () => void }) {
  const hand = game.hand;
  const waiting = game.nextHandAt !== null && (!hand || !!hand.result);
  const now = useNow(waiting ? 200 : 60_000);

  if (!me) return <Note>You&apos;re watching this table.</Note>;

  if (hand && !hand.result) {
    if (myTurn && seat) return <MyTurn game={game} hand={hand} seat={seat} sending={sending} onRaise={onRaise} />;
    const who = game.players.find((p) => p.id === hand.toAct);
    if (hand.runout) return <Note>Running it out…</Note>;
    const canPre = !!seat && !seat.folded && !seat.allIn && !me.sittingOut;
    const o = canPre && seat ? options(game, hand, seat) : null;
    const set = (kind: 'checkfold' | 'callany' | 'current') => {
      haptic.select();
      setPre(pre?.kind === kind ? null : { kind, bet: hand.currentBet });
    };
    return (
      <View style={{ gap: spacing.sm }}>
        <Note>
          {who ? `${who.name} ${who.bot ? 'is thinking…' : who.offline ? 'is offline…' : 'to act…'}` : hand.nextStreetAt != null ? `Dealing the ${hand.street === 'preflop' ? 'flop' : hand.street === 'flop' ? 'turn' : 'river'}…` : '…'}
        </Note>
        {o && (
          <Row>
            {o.canFold && <TableButton label="Check / Fold" tone={pre?.kind === 'checkfold' ? 'preOn' : 'pre'} onPress={() => set('checkfold')} />}
            <TableButton label={o.canCheck ? 'Check' : `Call ${chips(o.toCall)}`} tone={pre?.kind === 'current' ? 'preOn' : 'pre'} onPress={() => set('current')} />
            <TableButton label="Call any" tone={pre?.kind === 'callany' ? 'preOn' : 'pre'} onPress={() => set('callany')} />
          </Row>
        )}
      </View>
    );
  }

  const rebuy = () => dispatch({ type: 'rebuy' });
  if (game.status === 'playing' && hand?.result && lastStanding(game) && game.nextHandAt) {
    const secs = Math.max(0, Math.ceil((game.nextHandAt - now) / 1000));
    return me.stack === 0 && game.settings.rebuys ? (
      <TableButton label={`Rebuy for ${chips(game.settings.startingStack)} · ${secs}s`} tone="green" onPress={rebuy} />
    ) : (
      <Note>{me.stack > 0 ? 'Everyone else is out of chips.' : "You're out of chips."} The game ends in {secs}s.</Note>
    );
  }
  if (me.stack === 0) {
    return game.settings.rebuys ? <TableButton label={`Rebuy for ${chips(game.settings.startingStack)}`} tone="green" onPress={rebuy} /> : <Note>You&apos;re out of chips. Stick around and watch.</Note>;
  }
  if (me.sittingOut) return <TableButton label="I'm back. Deal me in" tone="green" onPress={() => dispatch({ type: 'sitOut', out: false })} />;
  if (!hand && game.status === 'playing' && game.nextHandAt !== null) {
    if (game.players.length === 2) return <View />;
    return <Note>Dealing in {Math.max(1, Math.ceil((game.nextHandAt - now) / 1000))}…</Note>;
  }
  if (!hand?.result || game.nextHandAt === null) return <Note>Waiting for more players…</Note>;
  const ready = game.ready.includes(me.id);
  return <TableButton label={ready ? 'Waiting for the others…' : 'Next hand'} tone="dark" disabled={ready} onPress={() => dispatch({ type: 'next', hand: hand.number })} />;
}

/** Your turn: Fold, Check or Call, and Raise (which opens the sizer over the bottom of the table). */
function MyTurn({ game, hand, seat, sending, onRaise }: { game: Game; hand: Hand; seat: Seat; sending: boolean; onRaise: () => void }) {
  const o = options(game, hand, seat);
  const act = (move: 'fold' | 'check' | 'call') => dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move });
  return (
    <View style={{ gap: spacing.sm }}>
      <Note>Your turn</Note>
      <Row>
        {o.canFold && <TableButton label="Fold" tone="fold" disabled={sending} onPress={() => act('fold')} />}
        {o.canCheck ? (
          <TableButton label="Check" tone="green" disabled={sending} onPress={() => act('check')} />
        ) : (
          <TableButton label={o.callIsAllIn ? 'All in' : 'Call'} sub={chips(o.toCall)} tone="green" disabled={sending} onPress={() => act('call')} />
        )}
        {o.canRaise && <TableButton label={o.word} tone="blue" disabled={sending} onPress={onRaise} />}
      </Row>
    </View>
  );
}

/** The bet sizer, pinned over the bottom of the table as on the web: presets, a slider with − and +, and the same three slots. */
export function RaisePanel({ game, hand, seat, onClose }: { game: Game; hand: Hand; seat: Seat; onClose: () => void }) {
  const colors = useColors();
  const shadow = useShadows();
  const reduce = useReduceMotion();
  const o = options(game, hand, seat);
  const [to, setTo] = useState(o.minTo);
  const act = (move: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin', amount?: number) => {
    onClose();
    dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move, ...(amount !== undefined ? { to: amount } : {}) });
  };
  const onCancel = onClose;
  const onFold = () => act('fold');
  const onCall = () => act(o.canCheck ? 'check' : 'call');
  const onRaise = (n: number) => act(n >= o.maxTo ? 'allin' : o.word === 'Bet' ? 'bet' : 'raise', n);
  const potNow = pot(hand);
  const potRaise = (fraction: number) => hand.currentBet + Math.round((potNow + o.toCall) * fraction);
  const clamp = (n: number) => Math.max(o.minTo, Math.min(o.maxTo, n));
  const presets = [
    { label: 'Min', to: o.minTo },
    { label: '½ pot', to: clamp(potRaise(0.5)) },
    { label: '¾ pot', to: clamp(potRaise(0.75)) },
    { label: 'Pot', to: clamp(potRaise(1)) },
    { label: 'All in', to: o.maxTo },
  ].filter((p, i, all) => all.findIndex((q) => q.to === p.to) === i);
  const step = Math.max(1, Math.min(game.settings.bigBlind, Math.floor((o.maxTo - o.minTo) / 50) || 1));
  const nudge = (dir: 1 | -1) => {
    haptic.select();
    setTo((t) => clamp(t + dir * step));
  };
  return (
    <Animated.View
      entering={reduce ? FadeIn.duration(150) : SlideInDown.duration(250)}
      exiting={reduce ? FadeOut.duration(120) : SlideOutDown.duration(160)}
      accessibilityViewIsModal
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm, backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, boxShadow: shadow.raised }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.xs }}>
        <ThemedText tone="tertiaryLabel">{o.word} to</ThemedText>
        <ThemedText variant="title1" style={{ fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {chips(to)}
        </ThemedText>
        <ThemedText tone="tertiaryLabel">of {chips(o.maxTo)}</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onCancel} hitSlop={12} style={{ position: 'absolute', right: 0, top: 4 }}>
          <Icon name="xmark" size={20} color={colors.label} />
        </Pressable>
      </View>
      <Row>
        {presets.map((p) => {
          const on = p.to === to;
          return (
            <Pressable
              key={p.label}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptic.select();
                setTo(p.to);
              }}
              style={{ flex: 1, minHeight: minTap + 8, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : colors.cell }}
            >
              <Text maxFontSizeMultiplier={1.2} style={{ fontWeight: '700', fontSize: 14, color: on ? '#fff' : colors.label }}>
                {p.label}
              </Text>
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, color: on ? '#fff' : colors.tertiaryLabel, fontVariant: ['tabular-nums'] }}>
                {chips(p.to)}
              </Text>
            </Pressable>
          );
        })}
      </Row>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Less" disabled={to <= o.minTo} onPress={() => nudge(-1)} hitSlop={10} style={{ opacity: to <= o.minTo ? 0.3 : 1 }}>
          <Icon name="minus" size={22} color={colors.label} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Host matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }}>
            <Slider value={to} min={o.minTo} max={o.maxTo} step={step} onValueChange={(v) => setTo(v + step > o.maxTo ? o.maxTo : Math.round(v))} />
          </Host>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="More" disabled={to >= o.maxTo} onPress={() => nudge(1)} hitSlop={10} style={{ opacity: to >= o.maxTo ? 0.3 : 1 }}>
          <Icon name="plus" size={22} color={colors.label} />
        </Pressable>
      </View>
      <Row>
        <TableButton label="Fold" tone="fold" onPress={onFold} />
        <TableButton label={o.canCheck ? 'Check' : o.callIsAllIn ? 'All in' : 'Call'} sub={!o.canCheck && !o.callIsAllIn ? chips(o.toCall) : undefined} tone="green" onPress={onCall} />
        <TableButton label={to >= o.maxTo ? 'All in' : o.word} tone="blue" onPress={() => onRaise(to)} />
      </Row>
    </Animated.View>
  );
}
