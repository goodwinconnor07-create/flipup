import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { MAX_SEATS, variantInfo, type Game } from '@/engine';
import { joinLink } from '@/state/api';
import { inviteFriends, usePals } from '@/state/pals';
import { dispatch, me as myDevice } from '@/state/session';
import { party, radius, spacing, useColors } from '@/theme';

import { Button } from '../button';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { InviteTicket } from '../invite-ticket';
import { ThemedText } from '../themed-text';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** Before the first deal: who's at the table (add or take away bots), what it plays, and Deal. */
export function Lobby({ game, online }: { game: Game; online: boolean }) {
  const colors = useColors();
  const host = game.hostDeviceId === myDevice;
  const s = game.settings;
  const humans = game.players.filter((p) => !p.bot).length;
  const deal = () => {
    if (!online || humans > 1) return dispatch({ type: 'start' });
    Alert.alert('Deal without friends?', "Nobody's joined yet. Friends can still sit down later and get dealt in on the next hand.", [
      { text: 'Wait', style: 'cancel' },
      { text: 'Deal', onPress: () => dispatch({ type: 'start' }) },
    ]);
  };
  const remove = (id: string, name: string) =>
    Alert.alert(`Take ${name} off the table?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'remove', playerId: id }) },
    ]);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.xl }}>
        <View style={{ gap: spacing.xxs }}>
          <ThemedText variant="largeTitle" accessibilityRole="header">
            {host ? (online ? 'Invite your friends' : 'Your table') : "You're in!"}
          </ThemedText>
          <ThemedText tone="tertiaryLabel">{host ? (online ? 'Friends scan this from the Join tab, or type the code.' : 'Add or remove bots, then deal.') : 'Waiting for the host to deal.'}</ThemedText>
        </View>
        {online && game.code && host && <InviteTicket code={game.code} link={joinLink(game.code)} share="Come play poker with me on FlipUp." />}
        {online && game.code && host && <InviteRow table={game.code} seated={game.players.map((p) => p.name)} />}
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textTransform: 'uppercase' }}>
            At the table · {game.players.length}/{MAX_SEATS}
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md }}>
            {game.players.map((p, i) => {
              const you = p.deviceId === myDevice;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name}${you ? ', you' : ''}${p.bot ? ', bot' : ''}`}
                  disabled={!host || you}
                  onPress={() => remove(p.id, p.name)}
                  style={{ width: '33.3%', alignItems: 'center', gap: 2 }}
                >
                  <Text style={{ fontSize: 54, lineHeight: 64 }} maxFontSizeMultiplier={1}>
                    {p.emoji}
                  </Text>
                  <ThemedText variant="headline" numberOfLines={1}>
                    {p.name}
                  </ThemedText>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: radius.full, backgroundColor: you ? colors.label : colors.cell }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: you ? (colors.background as string) : (colors.tertiaryLabel as string) }}>{you ? 'YOU' : p.bot ? 'BOT' : 'PLAYER'}</Text>
                  </View>
                </Pressable>
              );
            })}
            {host && game.players.length < MAX_SEATS && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add bot"
                onPress={() => {
                  haptic.tap();
                  dispatch({ type: 'addBot' });
                }}
                style={{ width: '33.3%', alignItems: 'center', gap: 2 }}
              >
                <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.cellPressed, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="plus" size={26} color={colors.tertiaryLabel} />
                </View>
                <ThemedText variant="headline">Add bot</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {[
            ['Game', `${variantInfo(s.variant).emoji} ${variantInfo(s.variant).name}`],
            ['Blinds', `${chips(s.smallBlind)}/${chips(s.bigBlind)}`],
            ['Stack', chips(s.startingStack)],
            ['Rebuys', s.rebuys ? 'On' : 'Off'],
          ].map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.cell }}>
              <ThemedText tone="tertiaryLabel">{k}</ThemedText>
              <ThemedText style={{ fontWeight: '700' }}>{v}</ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
      {host && (
        <View style={{ padding: spacing.md }}>
          <Button variant="party" tint="green" size="lg" title="Deal" onPress={deal} />
        </View>
      )}
    </View>
  );
}

/** Your friends with an Invite button each: an invite lands in their Friends tab. Hidden when you have none. */
function InviteRow({ table, seated }: { table: string; seated: string[] }) {
  const colors = useColors();
  const pals = usePals();
  const [sent, setSent] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  if (!pals.length) return null;
  const invite = async (code: string) => {
    if (busy) return;
    setBusy(code);
    const ok = (await inviteFriends([code], table).catch(() => 0)) > 0;
    setBusy(null);
    haptic[ok ? 'success' : 'failure']();
    if (ok) setSent((s) => [...s, code]);
    else Alert.alert("Couldn't send the invite", 'Check your connection and try again.');
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textTransform: 'uppercase' }}>
        Invite friends
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {pals.map((p) => {
          const here = seated.includes(p.name);
          const done = sent.includes(p.code);
          return (
            <View key={p.code} style={{ width: 92, alignItems: 'center', gap: spacing.xxs, padding: spacing.xs, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell }}>
              <Text style={{ fontSize: 34, lineHeight: 42 }} maxFontSizeMultiplier={1}>
                {p.emoji}
              </Text>
              <ThemedText variant="footnote" numberOfLines={1} style={{ fontWeight: '600' }}>
                {p.name}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={here ? `${p.name} is here` : done ? `${p.name} is invited` : `Invite ${p.name}`}
                disabled={here || done || busy === p.code}
                onPress={() => void invite(p.code)}
                style={({ pressed }) => ({ alignSelf: 'stretch', minHeight: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: here || done ? colors.cellPressed : party.blue, opacity: pressed ? 0.7 : 1 })}
              >
                <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '700', color: here || done ? (colors.secondaryLabel as string) : '#ffffff' }}>
                  {here ? 'Here' : done ? 'Invited' : busy === p.code ? '…' : 'Invite'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
