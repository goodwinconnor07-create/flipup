import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RAILS } from '@design/tableLooks';
import { tableThemes } from '@design/tokens';
import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { SwapIcon } from '@/components/swap';
import { type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { RoundButton } from '@/components/tab-screen';
import { n, signed } from '@/components/share/data';
import { shade } from '@/components/table/felt';
import { CardSlot, PlayingCard } from '@/components/table/playing-card';
import { PotChips } from '@/components/table/pot-chips';
import { FELT_WEAVE, WOOD_GRAIN } from '@/components/table/textures';
import { ThemedText } from '@/components/themed-text';
import { variantInfo, type Card, type HandAction, type Street } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { useTableLook } from '@/state/prefs';
import { noteWatched } from '@/state/record';
import { netOf, putIn, saveLastHand, toggleStar, useLastHand, useReplays, useStars, winnersOf, type Replay } from '@/state/replays';
import { brand, ForceScheme, gradient, radius, ROUNDED, spacing } from '@/theme';

/** How long each move stays up while playing, in ms. */
const STEP_MS = 1100;

const STREET_NAME: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];

/** A move as the table says it: "Raise to 400", "Call 200", "All in 1,500". */
export function moveText(a: Pick<HandAction, 'move' | 'to'>): string {
  switch (a.move) {
    case 'bet':
      return `Bet ${n(a.to)}`;
    case 'raise':
      return `Raise to ${n(a.to)}`;
    case 'allin':
      return `All in ${n(a.to)}`;
    case 'call':
      return `Call ${n(a.to)}`;
    default:
      return a.move[0].toUpperCase() + a.move.slice(1);
  }
}

/** The board cards that are out on a street (the run-out after an all in counts too). */
function boardOn(r: Replay, street: Street): Card[] {
  const upTo = street === 'preflop' ? 0 : street === 'flop' ? r.streets.flop : street === 'turn' ? r.streets.turn : r.streets.river;
  return r.board.slice(0, upTo);
}

/** What the table looks like after `step` moves (0 is the deal, the last step is the result). */
export function frameOf(r: Replay, step: number) {
  const moves = Math.min(step, r.actions.length);
  const done = step > r.actions.length;
  const put = putIn(r, moves);
  const current = moves > 0 ? r.actions[moves - 1] : null;
  const street: Street = done ? 'river' : (current?.street ?? 'preflop');
  const folded = new Set<string>();
  const foldedOn: Record<string, Street> = {};
  const lastMove: Record<string, string> = {};
  for (const a of r.actions.slice(0, moves)) {
    lastMove[a.playerId] = moveText(a);
    if (a.move === 'fold') {
      folded.add(a.playerId);
      foldedOn[a.playerId] = a.street;
    }
  }
  return { put, current, street, board: done ? r.board : boardOn(r, street), folded, foldedOn, lastMove, done, pot: Object.values(put).reduce((a, b) => a + b, 0) };
}

/** The hand as streets: each with its new cards, the pot going in and its moves (with the step each one is). */
export function streetsOf(r: Replay): { street: Street; cards: Card[]; pot: number; moves: { step: number; action: HandAction }[] }[] {
  const out: ReturnType<typeof streetsOf> = [];
  for (const street of STREETS) {
    const moves = r.actions.map((action, i) => ({ step: i + 1, action })).filter((m) => m.action.street === street);
    const before = street === 'preflop' ? [] : boardOn(r, STREETS[STREETS.indexOf(street) - 1]);
    const cards = boardOn(r, street).slice(before.length);
    if (street !== 'preflop' && !cards.length && !moves.length) continue;
    const first = r.actions.findIndex((a) => STREETS.indexOf(a.street) >= STREETS.indexOf(street));
    const pot = Object.values(putIn(r, first < 0 ? r.actions.length : first)).reduce((a, b) => a + b, 0);
    out.push({ street, cards, pot, moves });
  }
  return out;
}

/**
 * Replay: one hand played back a move at a time, from Saved hands or straight from the table (`id=last`, the hand
 * that just finished, opened by the recap card after each hand). The board sits on your own felt and rail, the pot
 * and the hand's moves under it; every seat shows its position, chips, what it has in, its last move and its cards.
 * At a bots-only table every bot's cards are known (`allCards`), so they're always face up, folded ones too. The
 * last step is the result: who took each pot, with what, and what everyone won or lost. Bot chat is left out.
 */
export default function ReplayScreen() {
  return (
    <ForceScheme scheme="dark">
      <Viewer />
    </ForceScheme>
  );
}

function Viewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const replays = useReplays();
  const stars = useStars();
  const live = useLastHand();
  const fromTable = id === 'last';
  // The table's last hand, or the saved copy of it once it's in Saved hands (cards shown later reach that one too).
  const r = fromTable ? (live ? (replays.find((x) => x.id === live.id) ?? live) : undefined) : replays.find((x) => x.id === id);
  const saved = !!r && replays.some((x) => x.id === r.id);
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const last = r ? r.actions.length + 1 : 0;

  // Counts toward "Hands replayed" on the Stats page, once each time a hand opens here (saved, or the last one at the table).
  const found = !!r;
  useEffect(() => {
    if (found) noteWatched();
  }, [id, found]);

  useEffect(() => {
    if (!playing || !r || step >= last) return;
    const t = setTimeout(() => {
      setStep(step + 1);
      // The last move has been shown: playback stops by itself.
      if (step + 1 >= last) setPlaying(false);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, step, last, r]);

  if (!r) {
    return (
      <GrainBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
          <ThemedText variant="title3">{fromTable ? 'That hand has gone.' : 'That hand isn’t in Saved hands.'}</ThemedText>
          <PressableScale accessibilityRole="button" onPress={() => router.back()}>
            <ThemedText style={{ color: brand.violetDark, fontWeight: '700' }}>Back</ThemedText>
          </PressableScale>
        </View>
      </GrainBackground>
    );
  }

  const f = frameOf(r, step);
  const starred = stars.includes(r.id);
  const winners = winnersOf(r);
  const nameOf = (pid: string) => (pid === r.me ? 'You' : (r.players.find((p) => p.id === pid)?.name ?? 'Someone'));
  const go = (to: number) => {
    haptic.select();
    setPlaying(false);
    setStep(Math.max(0, Math.min(last, to)));
  };
  const positions = (pid: string): string[] => (pid === r.buttonId ? ['BTN'] : pid === r.sbId ? ['SB'] : pid === r.bbId ? ['BB'] : []);
  const winLine = () => {
    const names = winners.map(nameOf);
    const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} split it` : `${names[0] ?? 'Nobody'} ${names[0] === 'You' ? 'win' : 'wins'} ${n(r.pot)}`;
    const how = r.showdown && winners.length === 1 && r.names[winners[0]] ? ` with ${r.names[winners[0]].charAt(0).toLowerCase()}${r.names[winners[0]].slice(1)}` : '';
    return `${who}${how}`;
  };
  const what = f.done
    ? winLine()
    : f.current
      ? `${nameOf(f.current.playerId)}: ${moveText(f.current)}`
      : `Blinds ${n(r.smallBlind)}/${n(r.bigBlind)}`;

  return (
    <GrainBackground>
      <View style={{ flex: 1, paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <RoundButton icon={fromTable ? 'xmark' : 'chevron.left'} label={fromTable ? 'Close' : 'Back'} onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="headline" numberOfLines={1} style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
              {variantInfo(r.variant).name}
            </ThemedText>
            <ThemedText variant="caption1" tone="secondaryLabel" numberOfLines={1}>
              Hand {r.number} · {fromTable ? 'Just now' : new Date(r.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {r.mode === 'online' ? 'Online' : 'Bots'} · Blinds {n(r.smallBlind)}/{n(r.bigBlind)}
            </ThemedText>
          </View>
          {saved ? (
            <RoundButton icon="star.fill" label={starred ? 'Unstar' : 'Star'} tint={starred ? brand.gold : undefined} onPress={() => (haptic.select(), toggleStar(r.id))} />
          ) : (
            <RoundButton icon="bookmark" label="Save to Saved hands" onPress={() => saveLastHand() && haptic.success()} />
          )}
          <RoundButton icon="square.and.arrow.up" label="Share" onPress={() => router.push({ pathname: '/share-card', params: { kind: 'hand', id: fromTable && !saved ? 'last' : r.id } })} />
        </View>

        <ReplayFelt r={r} board={f.board} pot={f.done ? r.pot : f.pot} name={f.done && r.showdown && winners.length === 1 ? r.names[winners[0]] : undefined} />

        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 28 }}>
          {!f.done && <Tag text={STREET_NAME[f.street].toUpperCase()} />}
          <ThemedText variant="headline" numberOfLines={2} style={{ flexShrink: 1, textAlign: 'center', fontFamily: ROUNDED, fontWeight: '800', color: f.done && r.net > 0 ? brand.gold : '#ffffff' }}>
            {what}
          </ThemedText>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.md }}>
          {r.players.map((p) => {
            const turn = !f.done && f.current?.playerId === p.id;
            const folded = f.folded.has(p.id);
            const cards = r.holes[p.id];
            const stack = p.stack - (f.put[p.id] ?? 0) + (f.done ? (r.won[p.id] ?? 0) : 0);
            const net = netOf(r, p.id);
            const won = f.done && winners.includes(p.id);
            const line = f.done
              ? folded
                ? `Folded ${f.foldedOn[p.id] === 'preflop' ? 'preflop' : `on the ${f.foldedOn[p.id]}`}`
                : (r.names[p.id] ?? (r.showdown ? 'Showdown' : 'Took it down'))
              : `${n(stack)} chips${(f.put[p.id] ?? 0) > 0 ? ` · ${n(f.put[p.id])} in` : ''}`;
            return (
              <View
                key={p.id}
                accessible
                accessibilityLabel={`${p.id === r.me ? 'You' : p.name}${positions(p.id).length ? `, ${positions(p.id).join(' ')}` : ''}. ${line}.${cards ? ` Cards ${cards.join(' ')}.` : ''}${f.done && net ? ` ${signed(net)}.` : ''}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.sm,
                  borderRadius: radius.lg,
                  borderCurve: 'continuous',
                  borderWidth: 1.5,
                  borderColor: turn || won ? brand.gold : 'transparent',
                  backgroundColor: p.id === r.me ? 'rgba(91,139,255,0.16)' : 'rgba(255,255,255,0.07)',
                }}
              >
                {/* A line height taller than the emoji, or its head is clipped (the body type's line is shorter than 26pt). */}
                <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', opacity: folded ? 0.5 : 1 }}>
                  <Text maxFontSizeMultiplier={1} style={{ fontSize: 26, lineHeight: 34 }}>
                    {p.emoji}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ThemedText variant="callout" numberOfLines={1} style={{ fontWeight: '700', color: p.gold ? brand.gold : '#ffffff', flexShrink: 1, opacity: folded ? 0.6 : 1 }}>
                      {p.id === r.me ? 'You' : p.name}
                    </ThemedText>
                    {positions(p.id).map((t) => (
                      <Tag key={t} text={t} />
                    ))}
                  </View>
                  <ThemedText variant="caption1" numberOfLines={1} style={{ color: folded ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.7)' }}>
                    {line}
                  </ThemedText>
                </View>
                {f.done ? (
                  <ThemedText variant="subhead" style={{ fontFamily: ROUNDED, fontWeight: '800', fontVariant: ['tabular-nums'], color: won ? brand.gold : net < 0 ? '#ffffff' : 'rgba(255,255,255,0.5)' }}>
                    {signed(net)}
                  </ThemedText>
                ) : (
                  f.lastMove[p.id] && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: folded ? 'rgba(255,107,107,0.16)' : turn ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)' }}>
                      <ThemedText variant="caption1" style={{ color: folded ? '#ff6b6b' : '#ffffff', fontWeight: '700' }}>
                        {f.lastMove[p.id]}
                      </ThemedText>
                    </View>
                  )
                )}
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {(cards ?? [null, null]).map((c, i) => (c ? <PlayingCard key={c} card={c} size="sm" width={28} dim={folded} /> : <PlayingCard key={i} back size="sm" width={28} />))}
                </View>
              </View>
            );
          })}
          {r.ghost && r.ghost.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Text maxFontSizeMultiplier={1} style={{ fontSize: 26, lineHeight: 34 }}>
                  👻
                </Text>
              </View>
              <ThemedText variant="callout" style={{ flex: 1, fontWeight: '700', color: '#ffffff' }}>
                The ghost
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {r.ghost.map((c) => (
                  <PlayingCard key={c} card={c} size="sm" width={28} />
                ))}
              </View>
            </View>
          )}

          <HandLog r={r} step={step} last={last} onJump={go} nameOf={nameOf} winners={winners} />
        </ScrollView>

        <View style={{ gap: spacing.sm, paddingBottom: insets.bottom + spacing.sm }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <View style={{ width: `${(step / last) * 100}%`, height: '100%', backgroundColor: brand.gold }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
            <Control icon="backward.end.fill" label="Back to the deal" onPress={() => go(0)} />
            <Control icon="backward.fill" label="Back a move" onPress={() => go(step - 1)} />
            <Control
              icon={playing ? 'pause.fill' : 'play.fill'}
              label={playing ? 'Pause' : 'Play'}
              big
              onPress={() => {
                haptic.tap();
                if (step >= last) setStep(0);
                setPlaying((v) => !v);
              }}
            />
            <Control icon="forward.fill" label="Next move" onPress={() => go(step + 1)} />
            <Control icon="forward.end.fill" label="Skip to the result" onPress={() => go(last)} />
          </View>
        </View>
      </View>
    </GrainBackground>
  );
}

/** The board on your table's felt and rail (each mini game's own look), the pot pill under it, and at the end the winning hand. */
function ReplayFelt({ r, board, pot, name }: { r: Replay; board: Card[]; pot: number; name?: string }) {
  const look = useTableLook();
  const theme = r.variant === 'holdem' ? null : tableThemes[r.variant];
  const felt = theme?.felt ?? look.felt;
  const rail = theme?.rail ?? RAILS.find((x) => x.id === look.rail)!.colors;
  const slots = Math.max(5, r.board.length);
  // Cards as big as fit in one or two rows inside the rail.
  const perRow = slots > 7 ? Math.ceil(slots / 2) : slots;
  const w = Math.min(46, Math.floor(280 / perRow) - 4);
  return (
    <View
      style={{
        padding: 10,
        borderRadius: radius.full,
        boxShadow: '0 8px 16px -12px rgba(18,18,40,0.5), inset 0 1px 0 rgba(255,255,255,0.28)',
        ...gradient(`${look.rail === 'wood' && !theme ? `${WOOD_GRAIN}, ` : ''}linear-gradient(165deg, ${rail[0]}, ${rail[1]})`),
      }}
    >
      <View
        style={{
          alignItems: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.full,
          overflow: 'hidden',
          boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.45)',
          ...gradient(`${FELT_WEAVE}, radial-gradient(ellipse at 50% 38%, ${shade(felt, 0.14)} 0%, ${felt} 42%, ${shade(felt, -0.42)} 100%)`),
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, maxWidth: perRow * (w + 4) }}>
          {Array.from({ length: slots }, (_, i) => (i < board.length ? <PlayingCard key={board[i]} card={board[i]} size="md" width={w} /> : <CardSlot key={`e${i}`} size="md" width={w} />))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <PotChips pot={pot} bigBlind={r.bigBlind} />
          <ThemedText variant="subhead" style={{ color: '#ffffff', fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            Pot {n(pot)}
          </ThemedText>
        </View>
        {name && (
          <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full, backgroundColor: brand.gold }}>
            <ThemedText variant="caption1" numberOfLines={1} style={{ color: brand.goldInk, fontWeight: '800' }}>
              {name}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

/** Every move in order, street by street with the cards that came and the pot going in; a tap jumps there. */
function HandLog({ r, step, last, onJump, nameOf, winners }: { r: Replay; step: number; last: number; onJump: (to: number) => void; nameOf: (id: string) => string; winners: string[] }) {
  const pots = r.pots?.length ? r.pots : [{ amount: r.pot, winners }];
  return (
    <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
      <ThemedText variant="title3" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
        Hand log
      </ThemedText>
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <LogLine text={`Blinds: ${r.sbId ? `${nameOf(r.sbId)} ${n(r.smallBlind)}, ` : ''}${nameOf(r.bbId)} ${n(r.bigBlind)}`} at={0} step={step} onJump={onJump} quiet />
        {streetsOf(r).map((s) => (
          <View key={s.street}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 4 }}>
              <ThemedText variant="caption1" style={{ color: 'rgba(255,255,255,0.55)', fontWeight: '800', letterSpacing: 0.6 }}>
                {STREET_NAME[s.street].toUpperCase()}
              </ThemedText>
              {s.cards.map((c) => (
                <PlayingCard key={c} card={c} size="sm" width={20} />
              ))}
              <View style={{ flex: 1 }} />
              {s.street !== 'preflop' && (
                <ThemedText variant="caption1" style={{ color: 'rgba(255,255,255,0.55)', fontVariant: ['tabular-nums'] }}>
                  Pot {n(s.pot)}
                </ThemedText>
              )}
            </View>
            {s.moves.map((m) => (
              <LogLine key={m.step} text={`${nameOf(m.action.playerId)} · ${moveText(m.action)}`} at={m.step} step={step} onJump={onJump} fold={m.action.move === 'fold'} />
            ))}
          </View>
        ))}
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 4 }}>
          <ThemedText variant="caption1" style={{ color: 'rgba(255,255,255,0.55)', fontWeight: '800', letterSpacing: 0.6 }}>
            {r.showdown ? 'SHOWDOWN' : 'RESULT'}
          </ThemedText>
        </View>
        {pots.map((p, i) => (
          <LogLine
            key={`pot${i}`}
            text={`${pots.length > 1 ? (i === 0 ? 'Main pot' : `Side pot ${pots.length > 2 ? i : ''}`.trim()) : 'Pot'} ${n(p.amount)} · ${p.winners.map((w) => `${nameOf(w)}${r.showdown && r.names[w] ? ` (${r.names[w]})` : ''}`).join(', ') || 'Nobody'}`}
            at={last}
            step={step}
            onJump={onJump}
            gold
          />
        ))}
      </View>
    </View>
  );
}

function LogLine({ text, at, step, onJump, quiet, fold, gold }: { text: string; at: number; step: number; onJump: (to: number) => void; quiet?: boolean; fold?: boolean; gold?: boolean }) {
  const now = at === step;
  const future = at > step;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${text}. Jump here.`}
      onPress={() => onJump(at)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 7, backgroundColor: now ? 'rgba(255,255,255,0.1)' : 'transparent' }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: now ? brand.gold : 'transparent' }} />
      <ThemedText
        variant="subhead"
        style={{
          flex: 1,
          fontWeight: now ? '700' : '400',
          color: gold ? brand.gold : fold ? '#ff6b6b' : quiet ? 'rgba(255,255,255,0.6)' : '#ffffff',
          opacity: future ? 0.4 : 1,
        }}
      >
        {text}
      </ThemedText>
    </PressableScale>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)' }}>
      <ThemedText style={{ fontSize: 9, fontWeight: '800', color: '#ffffff' }}>{text}</ThemedText>
    </View>
  );
}

function Control({ icon, label, onPress, big }: { icon: IconName; label: string; onPress: () => void; big?: boolean }) {
  const size = big ? 64 : 44;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: big ? '#ffffff' : 'rgba(255,255,255,0.12)' }}>
      <SwapIcon name={icon} size={big ? 26 : 16} color={big ? brand.violet : '#ffffff'} />
    </PressableScale>
  );
}
