// Secret Missions at the table, as on the web (src/screens/table/Missions.tsx): your mission over the buttons with
// your progress in the race, and the line under the felt when someone completes one or a race is settled.
import { Text, View } from 'react-native';

import { MISSION_GOAL, MISSION_SWAP_AFTER, rewardOf, secretMission, type Game, type Player } from '@/engine';
import { brand, radius, spacing, useColors } from '@/theme';

import { ThemedText } from '../themed-text';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** Your mission, its reward, how many you've done in this race (five dots) and who's leading. */
export function MissionStrip({ game, me }: { game: Game; me?: Player }) {
  const colors = useColors();
  const hand = game.hand;
  const m = game.missions;
  // Between hands the note over Next hand says what happened, and the buttons need the room.
  if (!hand || hand.variant !== 'missions' || !m || !me || hand.result) return null;
  const mine = m.players[me.id];
  if (!mine) return null;
  const name = (id: string) => (id === me.id ? 'You' : (game.players.find((p) => p.id === id)?.name ?? 'Someone'));
  const leaders = Object.entries(m.players)
    .filter(([id]) => game.players.some((p) => p.id === id))
    .sort((a, b) => b[1].done - a[1].done)
    .slice(0, 3)
    .map(([id, p]) => `${name(id)} ${p.done}`)
    .join(' · ');
  const info = mine.mission ? secretMission(mine.mission) : null;
  const left = mine.mission ? Math.max(0, MISSION_SWAP_AFTER - (hand.number - mine.since)) : 0;
  return (
    <View
      accessibilityLabel={info ? `Your mission: ${info.name}. ${info.text}` : 'Mission complete'}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell }}
    >
      <Text style={{ fontSize: 24 }}>{info ? info.emoji : '✅'}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontWeight: '600' }} numberOfLines={1}>
          {info ? `${info.name} · +${chips(rewardOf(info.id) * game.settings.bigBlind)} each` : 'Mission complete! A new one next hand'}
        </ThemedText>
        {info && (
          <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={2}>
            {info.text}
          </ThemedText>
        )}
        <ThemedText variant="footnote" tone="secondaryLabel" numberOfLines={1}>
          Race {m.race}: {leaders}
          {info && left <= 5 ? ` · swaps in ${left}` : ''}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`${mine.done} of ${MISSION_GOAL} missions`}>
        {Array.from({ length: MISSION_GOAL }, (_, i) => (
          <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < mine.done ? brand.gold : colors.separator }} />
        ))}
      </View>
    </View>
  );
}

/** "🕶️ Mission complete: Max · Hero Call · +70" and the race's result, at the end of a hand. */
export function missionNote(game: Game): string | null {
  const hand = game.hand;
  const m = game.missions;
  if (!hand?.result || hand.variant !== 'missions') return null;
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? 'Someone';
  const lines = (hand.missionsDone ?? []).map((d) => `🕶️ Mission complete: ${name(d.by)} · ${secretMission(d.mission).name} · +${chips(Object.values(d.paid).reduce((a, b) => a + b, 0))}`);
  const race = m?.last && m.last.hand === hand.number ? m.last : null;
  if (race) lines.push(`🏁 Race ${race.race} over: ${race.places.map((x, i) => `${i + 1}. ${name(x.id)} ${x.pct > 0 ? '+' : ''}${Math.round(x.pct * 100)}%`).join(' · ')}`);
  return lines.length ? lines.join('\n') : null;
}
