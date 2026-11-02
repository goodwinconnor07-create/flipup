import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { MAX_SEATS, variantInfo, type Game } from '@/engine';
import { useReduceMotion } from '@/motion/use-reduce-motion';
import { joinLink } from '@/state/api';
import { dispatch, me as myDevice } from '@/state/session';
import { radius, spacing, useColors } from '@/theme';

import { Button } from '../button';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { ThemedText } from '../themed-text';

const chips = (n: number) => Math.round(n).toLocaleString('en-US');

/** Before the first deal: who's at the table (add or take away bots), what it plays, and Deal. */
export function Lobby({ game, online }: { game: Game; online: boolean }) {
  const colors = useColors();
  const reduce = useReduceMotion();
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
          <ThemedText tone="tertiaryLabel">{host ? (online ? 'They join with this code, on their own phones.' : 'Add or remove bots, then deal.') : 'Waiting for the host to deal.'}</ThemedText>
        </View>
        {online && game.code && host && <Invite code={game.code} />}
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
                  <Animated.View entering={reduce ? FadeIn : ZoomIn.delay(i * 60).springify().damping(14)}>
                    <Text style={{ fontSize: 54, lineHeight: 64 }} maxFontSizeMultiplier={1}>
                      {p.emoji}
                    </Text>
                  </Animated.View>
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

/** The join code in five big tiles, and the phone's share sheet with a link to it. */
function Invite({ code }: { code: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.sm }}>
      <View accessible accessibilityLabel={`Table code ${code.split('').join(' ')}`} style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' }}>
        {code.split('').map((ch, i) => (
          <View key={i} style={{ width: 56, height: 68, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell, alignItems: 'center', justifyContent: 'center' }}>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 34, fontWeight: '800', color: colors.label }}>
              {ch}
            </Text>
          </View>
        ))}
      </View>
      <Button
        variant="secondary"
        title="Share the link"
        onPress={() => {
          haptic.tap();
          void Share.share({ message: `Come play poker with me on FlipUp. Code ${code}: ${joinLink(code)}`, url: joinLink(code) });
        }}
      />
    </View>
  );
}
