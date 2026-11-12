import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { PlayingCard } from '@/components/table/playing-card';
import { SetupHeader, SetupRowTitle } from '@/components/setup/setup-header';
import { n, signed } from '@/components/share/data';
import { ThemedText } from '@/components/themed-text';
import { variantInfo } from '@/engine';
import { usePokerRecord } from '@/state/record';
import { momentOf } from '@/state/hand-moments';
import { momentsOf, useReplays, useStars, type Moment } from '@/state/replays';
import { brand, ForceScheme, radius, ROUNDED, spacing } from '@/theme';

const open = (params: Record<string, string>) => {
  haptic.tap();
  router.push({ pathname: '/share-card', params });
};

/**
 * Share cards: everything worth sending in one place. Your stats, the top hands from your hand bank
 * (biggest wins, best hands, bluffs that worked, coolers, starred ones), and your recent games. Each opens the
 * composer (`share-card`) with its designs to pick from. Reached from Home's passport and Settings.
 */
export default function ShareHub() {
  return (
    <ForceScheme scheme="dark">
      <Hub />
    </ForceScheme>
  );
}

function Hub() {
  const insets = useSafeAreaInsets();
  const record = usePokerRecord();
  const replays = useReplays();
  const stars = useStars();
  const moments = momentsOf(replays, stars);
  const games = record.games.map((g, i) => ({ g, i })).reverse().slice(0, 6);

  return (
    <GrainBackground>
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.xl, gap: spacing.xl }}>
        <SetupHeader title="Share" line="Pick a moment, pick a look, send it." />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <BigTile icon="chart.bar.xaxis" title="My stats" value={`${record.hands ? Math.round((record.won / record.hands) * 100) : 0}%`} line={`${n(record.hands)} hands`} onPress={() => open({ kind: 'stats' })} />
          <BigTile icon="trophy.fill" title="Best pot" value={record.biggestPot.toLocaleString('en-US')} line={`${n(record.won)} pots won`} gold onPress={() => open({ kind: 'stats' })} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <SetupRowTitle title="Top hands" detail={replays.length ? `${replays.length} saved` : undefined} />
          {moments.length ? (
            moments.map((m) => <MomentRow key={`${m.kind}:${m.replay.id}`} m={m} />)
          ) : (
            <Empty
              line="Tap Save hand at the table after a hand you want to keep. It lands here."
            />
          )}
          {replays.length > 0 && (
            <PressableScale accessibilityRole="button" onPress={() => router.push('/replays')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingVertical: spacing.xs }}>
              <Icon name="film.stack.fill" size={15} color={brand.violetDark} />
              <ThemedText variant="callout" style={{ color: brand.violetDark, fontWeight: '600' }}>
                Every saved hand
              </ThemedText>
            </PressableScale>
          )}
        </View>

        {games.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <SetupRowTitle title="Recent games" />
            {games.map(({ g, i }) => (
              <Row
                key={i}
                title={variantInfo(g.variant).name}
                line={`${new Date(g.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${g.players} players`}
                right={g.place === 1 ? '1st' : `${g.place}${g.place === 2 ? 'nd' : g.place === 3 ? 'rd' : 'th'}`}
                gold={g.place === 1}
                onPress={() => open({ kind: 'game', id: String(i) })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </GrainBackground>
  );
}

function BigTile({ icon, title, value, line, gold, onPress }: { icon: IconName; title: string; value: string; line: string; gold?: boolean; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`Share ${title}: ${value}, ${line}`} onPress={onPress} outerStyle={{ flex: 1 }} style={{ flex: 1, padding: spacing.md, gap: 4, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Icon name={icon} size={18} color={gold ? brand.gold : brand.violetDark} />
        <Icon name="square.and.arrow.up" size={15} color="rgba(255,255,255,0.6)" />
      </View>
      <ThemedText style={{ fontFamily: ROUNDED, fontSize: 34, lineHeight: 40, fontWeight: '800', color: gold ? brand.gold : '#ffffff' }}>{value}</ThemedText>
      <ThemedText variant="subhead" style={{ color: '#ffffff', fontWeight: '700' }}>
        {title}
      </ThemedText>
      <ThemedText variant="caption1" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {line}
      </ThemedText>
    </PressableScale>
  );
}

function MomentRow({ m }: { m: Moment }) {
  const r = m.replay;
  const hole = r.holes[r.me] ?? [];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${m.title}: ${signed(r.net)} chips${r.myHand ? `, ${r.myHand}` : ''}. Share.`}
      onPress={() => open({ kind: 'hand', id: r.id, title: m.title })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)' }}
    >
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {hole.slice(0, 2).map((c) => (
          <PlayingCard key={c} card={c} size="sm" width={30} />
        ))}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <ThemedText variant="caption1" style={{ color: m.kind === 'starred' || m.kind === 'bigWin' ? brand.gold : 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 0.6 }}>
          {m.title.toUpperCase()}
        </ThemedText>
        <ThemedText variant="callout" numberOfLines={1} style={{ color: '#ffffff', fontWeight: '600' }}>
          {momentOf(r, { odds: false })?.headline ?? r.myHand ?? (r.showdown ? 'Showdown' : 'No showdown')}
        </ThemedText>
        <ThemedText variant="caption1" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.55)' }}>
          {variantInfo(r.variant).name} · {r.mode === 'online' ? 'Online' : 'Bots'}
        </ThemedText>
      </View>
      <ThemedText style={{ fontFamily: ROUNDED, fontSize: 20, fontWeight: '800', color: r.net > 0 ? brand.gold : '#ffffff' }}>{signed(r.net)}</ThemedText>
      <Icon name="square.and.arrow.up" size={15} color="rgba(255,255,255,0.6)" />
    </PressableScale>
  );
}

function Row({ title, line, right, gold, onPress }: { title: string; line: string; right: string; gold?: boolean; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${title}, ${right}. Share.`} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <View style={{ flex: 1 }}>
        <ThemedText variant="callout" style={{ color: '#ffffff', fontWeight: '600' }}>
          {title}
        </ThemedText>
        <ThemedText variant="caption1" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {line}
        </ThemedText>
      </View>
      <ThemedText style={{ fontFamily: ROUNDED, fontSize: 20, fontWeight: '800', color: gold ? brand.gold : '#ffffff' }}>{right}</ThemedText>
      <Icon name="square.and.arrow.up" size={15} color="rgba(255,255,255,0.6)" />
    </PressableScale>
  );
}

function Empty({ line, action }: { line: string; action?: { title: string; go: () => void } }) {
  return (
    <View style={{ padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <ThemedText variant="callout" style={{ color: 'rgba(255,255,255,0.75)' }}>
        {line}
      </ThemedText>
      {action && (
        <PressableScale accessibilityRole="button" onPress={action.go} style={{ alignSelf: 'flex-start' }}>
          <ThemedText variant="callout" style={{ color: brand.gold, fontWeight: '700' }}>
            {action.title}
          </ThemedText>
        </PressableScale>
      )}
    </View>
  );
}
