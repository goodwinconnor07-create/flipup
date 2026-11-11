import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { SwapIcon } from '@/components/swap';
import { type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { RoundButton } from '@/components/tab-screen';
import { n, signed } from '@/components/share/data';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { variantInfo } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { putIn, toggleStar, useReplays, useStars, type Replay } from '@/state/replays';
import { brand, ForceScheme, radius, ROUNDED, spacing } from '@/theme';

/** How long each move stays up while playing, in ms. */
const STEP_MS = 1100;

/** What the table looks like after `step` moves (0 is the deal, the last step is the result). */
export function frameOf(r: Replay, step: number) {
  const moves = Math.min(step, r.actions.length);
  const done = step > r.actions.length;
  const put = putIn(r, moves);
  const current = moves > 0 ? r.actions[moves - 1] : null;
  const street = done ? 'river' : (current?.street ?? 'preflop');
  const shown = done ? r.board.length : street === 'flop' ? r.streets.flop : street === 'turn' ? r.streets.turn : street === 'river' ? r.streets.river : 0;
  const folded = new Set(r.actions.slice(0, moves).filter((a) => a.move === 'fold').map((a) => a.playerId));
  const lastMove: Record<string, string> = {};
  for (const a of r.actions.slice(0, moves)) lastMove[a.playerId] = a.move === 'bet' || a.move === 'raise' || a.move === 'allin' ? `${a.move === 'allin' ? 'All in' : a.move === 'bet' ? 'Bet' : 'Raise'} ${n(a.to)}` : a.move[0].toUpperCase() + a.move.slice(1);
  return { put, current, board: r.board.slice(0, shown), folded, lastMove, done, pot: Object.values(put).reduce((a, b) => a + b, 0) };
}

/**
 * Replay (Premium): one hand from your bank, played back a move at a time. The board fills street by street, each
 * seat shows its chips, what it has in and its last move, and the last step is the result with any cards that were
 * shown. Play runs on its own (one move a second), or step with the arrows. Star keeps a hand at the top of Share.
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
  const r = replays.find((x) => x.id === id);
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!reduce);
  const last = r ? r.actions.length + 1 : 0;

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
          <ThemedText variant="title3">That hand isn’t in Saved hands.</ThemedText>
          <PressableScale accessibilityRole="button" onPress={() => router.back()}>
            <ThemedText style={{ color: brand.violetDark, fontWeight: '700' }}>Back</ThemedText>
          </PressableScale>
        </View>
      </GrainBackground>
    );
  }

  const f = frameOf(r, step);
  const starred = stars.includes(r.id);
  const go = (to: number) => {
    haptic.select();
    setPlaying(false);
    setStep(Math.max(0, Math.min(last, to)));
  };
  const what = f.done ? (r.showdown ? 'Showdown' : 'Everyone else folded') : f.current ? `${f.current.playerId === r.me ? 'You' : (r.players.find((p) => p.id === f.current!.playerId)?.name ?? '')}: ${f.lastMove[f.current.playerId]}` : `Blinds ${n(r.smallBlind)}/${n(r.bigBlind)}`;

  return (
    <GrainBackground>
      <View style={{ flex: 1, paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <RoundButton icon="chevron.left" label="Back" onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="headline" numberOfLines={1} style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
              {variantInfo(r.variant).name} · Hand {r.number}
            </ThemedText>
            <ThemedText variant="caption1" tone="secondaryLabel">
              {new Date(r.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {r.mode === 'online' ? 'Online' : 'Bots'}
            </ThemedText>
          </View>
          <RoundButton icon="star.fill" label={starred ? 'Unstar' : 'Star'} tint={starred ? brand.gold : undefined} onPress={() => (haptic.select(), toggleStar(r.id))} />
          <RoundButton icon="square.and.arrow.up" label="Share" onPress={() => router.push({ pathname: '/share-card', params: { kind: 'hand', id: r.id } })} />
        </View>

        {/* The board and the pot, on the felt. */}
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: 120, borderWidth: 4, borderColor: '#3a2a18', backgroundColor: '#14603a' }}>
          <View style={{ flexDirection: 'row', gap: 4, minHeight: 58 }}>
            {r.board.slice(0, Math.max(5, r.board.length)).map((c, i) =>
              i < f.board.length ? <PlayingCard key={c} card={c} size="md" width={40} /> : <View key={`e${i}`} style={{ width: 40, height: 56, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }} />,
            )}
          </View>
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <ThemedText variant="subhead" style={{ color: '#ffffff', fontWeight: '700' }}>
              Pot {n(f.pot)}
            </ThemedText>
          </View>
        </View>

        <View accessibilityLiveRegion="polite" style={{ alignItems: 'center' }}>
          <ThemedText variant="title3" style={{ fontFamily: ROUNDED, fontWeight: '800', color: f.done && r.net > 0 ? brand.gold : '#ffffff' }}>
            {what}
          </ThemedText>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.md }}>
          {r.players.map((p) => {
            const turn = !f.done && f.current?.playerId === p.id;
            const folded = f.folded.has(p.id);
            const cards = r.holes[p.id];
            const faceUp = p.id === r.me || (f.done && !!cards);
            const stack = p.stack - (f.put[p.id] ?? 0) + (f.done ? (r.won[p.id] ?? 0) : 0);
            const net = (r.won[p.id] ?? 0) - (putIn(r)[p.id] ?? 0);
            return (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1.5, borderColor: turn ? brand.gold : 'transparent', backgroundColor: p.id === r.me ? 'rgba(91,139,255,0.16)' : 'rgba(255,255,255,0.07)', opacity: folded ? 0.45 : 1 }}>
                <ThemedText style={{ fontSize: 26 }}>{p.emoji}</ThemedText>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ThemedText variant="callout" numberOfLines={1} style={{ fontWeight: '700', color: p.gold ? brand.gold : '#ffffff', flexShrink: 1 }}>
                      {p.id === r.me ? 'You' : p.name}
                    </ThemedText>
                    {p.id === r.buttonId && <Tag text="BTN" />}
                    {p.ultra && <Tag text="ULTRA" gold />}
                  </View>
                  <ThemedText variant="caption1" tone="secondaryLabel">
                    {n(stack)} chips{(f.put[p.id] ?? 0) > 0 && !f.done ? ` · ${n(f.put[p.id])} in` : ''}
                    {f.done && net !== 0 ? ` · ${signed(net)}` : ''}
                  </ThemedText>
                </View>
                {f.lastMove[p.id] && !f.done && (
                  <ThemedText variant="caption1" style={{ color: f.lastMove[p.id] === 'Fold' ? '#ff6b6b' : '#ffffff', fontWeight: '700' }}>
                    {f.lastMove[p.id]}
                  </ThemedText>
                )}
                {f.done && r.names[p.id] && (
                  <ThemedText variant="caption1" numberOfLines={1} style={{ maxWidth: 110, color: 'rgba(255,255,255,0.75)' }}>
                    {r.names[p.id]}
                  </ThemedText>
                )}
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {(cards ?? [null, null]).map((c, i) => (faceUp && c ? <PlayingCard key={c} card={c} size="sm" width={28} /> : <PlayingCard key={i} back size="sm" width={28} />))}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={{ gap: spacing.sm, paddingBottom: insets.bottom + spacing.sm }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <View style={{ width: `${(step / last) * 100}%`, height: '100%', backgroundColor: brand.gold }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xl }}>
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
          </View>
        </View>
      </View>
    </GrainBackground>
  );
}

function Tag({ text, gold }: { text: string; gold?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: gold ? brand.gold : 'rgba(255,255,255,0.18)' }}>
      <ThemedText style={{ fontSize: 9, fontWeight: '800', color: gold ? brand.goldInk : '#ffffff' }}>{text}</ThemedText>
    </View>
  );
}

function Control({ icon, label, onPress, big }: { icon: IconName; label: string; onPress: () => void; big?: boolean }) {
  const size = big ? 64 : 48;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: big ? '#ffffff' : 'rgba(255,255,255,0.12)' }}>
      <SwapIcon name={icon} size={big ? 26 : 18} color={big ? brand.violet : '#ffffff'} />
    </PressableScale>
  );
}
