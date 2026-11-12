import { Children, useState, type ReactNode } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { count21, lastStanding, options, pot, type Game, type Hand, type Player, type Seat } from '@/engine';
import { detail, rise, sink } from '@/motion/presets';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { dispatch, me as myDevice } from '@/state/session';
import { brand, minTap, radius, spacing, useColors, usePlainColors, useShadows } from '@/theme';

import { haptic } from '../haptics';
import { Icon } from '../icon';
import { Swap } from '../swap';
import { PressableScale } from '../pressable-scale';
import { ThemedText } from '../themed-text';
import { Dot } from './bubbles';
import { shoveTime, ShoveTurn } from './challenge';
import { RaiseSlider } from './raise-slider';
import { useTableNow } from './use-now';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** Set before your turn. `current` only plays while the bet is still the `bet` it was set against. */
export type PreAction = { kind: 'checkfold' | 'callany' | 'current'; bet: number } | null;

type Tone = 'fold' | 'green' | 'blue' | 'raise' | 'dark' | 'pre' | 'preOn' | 'quietFold' | 'quietCall';

/** One of the big table buttons: at least 60pt tall, in the three slots Fold, Check/Call and Raise share. */
function TableButton({ label, sub, tone, onPress, disabled, fill, height = 60, big }: { label: string; sub?: string; tone: Tone; onPress: () => void; disabled?: boolean; fill?: number; height?: number; big?: boolean }) {
  const colors = useColors();
  const c = usePlainColors();
  // Apple's system blue (the owner's call for Call and Check; the rest of the app's actions stay violet).
  const blue = useColorScheme() === 'dark' ? '#0a84ff' : '#007aff';
  const look: Record<Tone, { bg: string; ink: string }> = {
    fold: { bg: c.redBg, ink: c.redInk },
    // Call and Check are system blue, Raise the app's one green and Fold red.
    green: { bg: colors.label as string, ink: colors.background as string },
    blue: { bg: blue, ink: '#ffffff' },
    raise: { bg: brand.raise, ink: '#ffffff' },
    dark: { bg: colors.label as string, ink: colors.background as string },
    pre: { bg: colors.cell as string, ink: colors.secondaryLabel as string },
    preOn: { bg: blue, ink: '#ffffff' },
    quietFold: { bg: colors.cell as string, ink: c.redInk },
    quietCall: { bg: colors.cell as string, ink: blue },
  };
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label} ${sub}` : label}
      accessibilityState={{ disabled: !!disabled, selected: tone === 'preOn' }}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: height, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs, backgroundColor: look[tone].bg }}
    >
      {fill !== undefined && <View style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${fill * 100}%`, backgroundColor: 'rgba(255,255,255,0.85)' }} />}
      <Swap id={label} kind="text">
        {/* Pre-actions stay on one line (shrinking a little if they must), so Check / Fold never stands taller than its neighbours. */}
        <Text maxFontSizeMultiplier={1.3} numberOfLines={tone === 'pre' || tone === 'preOn' ? 1 : 2} adjustsFontSizeToFit={tone === 'pre' || tone === 'preOn'} minimumFontScale={0.75} style={{ color: look[tone].ink, fontSize: big ? 20 : 17, lineHeight: big ? 24 : 20, textAlign: 'center', fontWeight: big ? '800' : tone === 'pre' || tone === 'preOn' ? '600' : '700', fontVariant: ['tabular-nums'] }}>
          {label}
          {sub ? ` ${sub}` : ''}
        </Text>
      </Swap>
    </PressableScale>
  );
}

/** The line over the buttons, as on the web: 17pt semibold in grey, names in full colour, at least 44pt tall. */
function Note({ children, strong }: { children: ReactNode; strong?: boolean }) {
  const c = usePlainColors();
  return (
    <View accessibilityLiveRegion="polite" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 4 }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: strong ? '700' : '600', color: strong ? c.label : c.tertiaryLabel, textAlign: 'center' }}>
        {children}
      </Text>
    </View>
  );
}

/** "Remi is thinking" with three dots that lift and brighten in turn. */
function Thinking({ name, what }: { name: string; what: string }) {
  const c = usePlainColors();
  return (
    <View accessibilityLiveRegion="polite" accessibilityLabel={`${name} ${what}`} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 17, fontWeight: '600', color: c.tertiaryLabel }}>
        <Text style={{ color: c.label, fontWeight: '700' }}>{name}</Text> {what}
      </Text>
      <View style={{ flexDirection: 'row', gap: 4, marginLeft: 6, paddingTop: 4 }}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} delay={i * 150} color={c.tertiaryLabel} size={6} lift={4} />
        ))}
      </View>
    </View>
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
  const now = useTableNow(game.fast, hand?.moment?.gate || waiting ? 200 : 60_000);

  if (!me) return <Note>You&apos;re watching this table.</Note>;

  if (hand && !hand.result) {
    // Short Stack, at 12 big blinds or less: Fold, Call and a big Shove in place of the raise panel.
    // A bust is on show: nobody acts until it has been seen.
    // Power Cards: a power on show has its own banner over the felt (power-banner.tsx). The buttons stay where they
    // are, greyed until it's been seen, so the bottom of the table never changes height.
    const onShow = !!hand.moment?.gate && now < hand.moment.until;
    if (myTurn && onShow && hand.moment?.kind === 'bust') {
      const who = game.players.find((p) => p.id === hand.moment!.who)?.name ?? 'Someone';
      return <Note strong>{`💥 ${who} busts with ${hand.moment.value}`}</Note>;
    }
    if (myTurn && seat && shoveTime(game, seat)) return <ShoveTurn game={game} hand={hand} seat={seat} sending={sending} />;
    if (myTurn && seat) return <MyTurn game={game} hand={hand} seat={seat} sending={sending || onShow} onRaise={onRaise} />;
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
        {who ? (
          <Thinking name={who.name} what={who.bot ? 'is thinking' : who.offline ? 'is offline' : 'to act'} />
        ) : (
          <Note>{hand.bettingAt != null ? (hand.moment?.kind === 'rivers' ? 'Three rivers…' : hand.moment?.kind === 'redriver' ? 'Is the river red?' : 'Look at the board…') : hand.showdownAt != null ? (hand.moment?.kind === 'suspense' ? 'Hold your breath…' : 'Showdown…') : hand.nextStreetAt != null ? `Dealing the ${hand.street === 'preflop' ? 'flop' : hand.street === 'flop' ? 'turn' : 'river'}…` : '…'}</Note>
        )}
        {me.sittingOut && <TableButton label="I'm back" tone="pre" onPress={() => dispatch({ type: 'sitOut', out: false })} />}
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
    return <Note>Dealing in {Math.max(1, Math.ceil((game.nextHandAt - now) / 1000))}…</Note>;
  }
  if (!hand?.result || game.nextHandAt === null) {
    if (game.emptyAt) return <View />;
    return (
      <View style={{ gap: spacing.sm }}>
        <Note>Waiting for more players…</Note>
        {game.hostDeviceId === myDevice && <TableButton label="Add a bot" tone="pre" onPress={() => dispatch({ type: 'addBot' })} />}
      </View>
    );
  }
  const ready = game.ready.includes(me.id);
  // The next hand deals itself when the bar along the bottom of the button runs out.
  const total = waitFor(hand.number, game.nextHandAt - now);
  const left = Math.max(0, Math.min(1, (game.nextHandAt - now) / total));
  const next = <TableButton label={ready ? 'Waiting for the others…' : 'Next hand'} tone="dark" disabled={ready} fill={left} onPress={() => dispatch({ type: 'next', hand: hand.number })} />;
  // Your cards stayed hidden (you folded, won without a showdown, or mucked): once the hand is over you can turn
  // them over. Tapping sends the `show` action; the greyed cards turn white as the answer. Never during play.
  const canShow = !!seat && !seat.shown && seat.cards.length > 0;
  if (!canShow) return next;
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      <View>
        <TableButton
          label="Show cards"
          tone="pre"
          onPress={() => {
            haptic.tap();
            dispatch({ type: 'show', hand: hand.number });
          }}
        />
      </View>
      <View style={{ flex: 1 }}>{next}</View>
    </View>
  );
}

/** How long this pause was when it began, so the bar drains from full whatever extra time was added. */
let pause = { hand: -1, ms: 0 };
function waitFor(hand: number, remaining: number): number {
  if (pause.hand !== hand || remaining > pause.ms) pause = { hand, ms: Math.max(remaining, 1) };
  return pause.ms;
}

/** Your turn: Fold, Check or Call, and Raise (which opens the sizer over the bottom of the table). */
function MyTurn({ game, hand, seat, sending, onRaise }: { game: Game; hand: Hand; seat: Seat; sending: boolean; onRaise: () => void }) {
  const o = options(game, hand, seat);
  const act = (move: 'fold' | 'check' | 'call') => dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move });
  // Power Cards: silenced players can only check, call or fold this street, so the line says why Raise is gone.
  const silenced = hand.silenced?.[seat.playerId] === hand.street;
  return (
    <View style={{ gap: spacing.sm }}>
      <Note strong>{silenced ? 'Your turn · 🤐 no betting this street' : 'Your turn'}</Note>
      {o.canHit && (
        // Blackjack Hold'em: take another card before your move. Over 21 folds your hand.
        <Row>
          <TableButton label={`Hit · you're on ${count21(seat.cards)}`} tone="pre" height={48} disabled={sending} onPress={() => dispatch({ type: 'hit', hand: hand.number, seq: hand.seq })} />
        </Row>
      )}
      <Row>
        {o.canFold && <TableButton label="Fold" tone="fold" disabled={sending} onPress={() => act('fold')} />}
        {o.canCheck ? (
          <TableButton label="Check" tone="blue" disabled={sending} onPress={() => act('check')} />
        ) : (
          <TableButton label={o.callIsAllIn ? 'All in' : 'Call'} sub={chips(o.toCall)} tone="blue" disabled={sending} onPress={() => act('call')} />
        )}
        {o.canRaise &&
          (o.minTo >= o.maxTo ? (
            // The smallest raise is already everything you have: no sizer, just All in.
            <TableButton label="All in" sub={chips(o.maxTo)} tone="raise" disabled={sending} onPress={() => dispatch({ type: 'act', hand: hand.number, seq: hand.seq, move: 'allin' })} />
          ) : (
            <TableButton label={o.word} tone="raise" disabled={sending} onPress={onRaise} />
          ))}
      </Row>
    </View>
  );
}

/**
 * The bet sizer, pinned to the bottom edge of the screen (`inset` is the table screen's bottom padding, which the
 * panel reaches down over): presets, a slider with − and +, then Raise as the big middle button with Fold and Call
 * small and quiet either side, so a thumb that slid the amount lands on Raise and never calls by habit.
 */
export function RaisePanel({ game, hand, seat, inset, onClose }: { game: Game; hand: Hand; seat: Seat; inset: number; onClose: () => void }) {
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
      entering={rise(reduce)}
      exiting={sink(reduce)}
      accessibilityViewIsModal
      style={{ transformOrigin: '50% 100%', position: 'absolute', left: 0, right: 0, bottom: -inset, padding: spacing.md, paddingBottom: inset + spacing.sm, gap: spacing.md, backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, boxShadow: shadow.raised }}
    >
      <Animated.View entering={detail(0, reduce)} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.xs }}>
        <ThemedText tone="tertiaryLabel">{o.word} to</ThemedText>
        <ThemedText variant="title1" style={{ fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {chips(to)}
        </ThemedText>
        <ThemedText tone="tertiaryLabel">of {chips(o.maxTo)}</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onCancel} hitSlop={12} style={{ position: 'absolute', right: 0, top: 4 }}>
          <Icon name="xmark" size={20} color={colors.label} />
        </Pressable>
      </Animated.View>
      <Animated.View entering={detail(1, reduce)}>
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
              style={{ flex: 1, minHeight: minTap + 8, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? brand.raise : colors.cell }}
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
      </Animated.View>
      <Animated.View entering={detail(2, reduce)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Less" disabled={to <= o.minTo} onPress={() => nudge(-1)} hitSlop={10} style={{ opacity: to <= o.minTo ? 0.3 : 1 }}>
          <Icon name="minus" size={22} color={colors.label} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <RaiseSlider value={to} min={o.minTo} max={o.maxTo} step={step} tint={brand.raise} onChange={setTo} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="More" disabled={to >= o.maxTo} onPress={() => nudge(1)} hitSlop={10} style={{ opacity: to >= o.maxTo ? 0.3 : 1 }}>
          <Icon name="plus" size={22} color={colors.label} />
        </Pressable>
      </Animated.View>
      <Animated.View entering={detail(3, reduce)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {/* Imposter has no folding: the panel follows the action row and leaves Fold out. */}
        {o.canFold && (
          <View style={{ flex: 1 }}>
            <TableButton label="Fold" tone="quietFold" height={52} onPress={onFold} />
          </View>
        )}
        <View style={{ flex: 2 }}>
          <TableButton big height={76} label={to >= o.maxTo ? 'All in' : o.word} sub={to >= o.maxTo ? undefined : chips(to)} tone="raise" onPress={() => onRaise(to)} />
        </View>
        <View style={{ flex: 1 }}>
          <TableButton label={o.canCheck ? 'Check' : o.callIsAllIn ? 'All in' : 'Call'} sub={!o.canCheck && !o.callIsAllIn ? chips(o.toCall) : undefined} tone="quietCall" height={52} onPress={onCall} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
