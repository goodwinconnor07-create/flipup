import { router } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GrainBackground } from '@/components/grain-background';
import { haptic } from '@/components/haptics';
import { SwapIcon } from '@/components/swap';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SetupHeader } from '@/components/setup/setup-header';
import { signed } from '@/components/share/data';
import { PlayingCard } from '@/components/table/playing-card';
import { ThemedText } from '@/components/themed-text';
import { variantInfo } from '@/engine';
import { usePremium } from '@/state/premium';
import { removeReplay, useReplays, useStars, type Replay } from '@/state/replays';
import { brand, ForceScheme, radius, ROUNDED, spacing } from '@/theme';

/**
 * Your hand bank (Premium): every hand you saved at the table with Save hand, newest first, starred ones on top.
 * A tap plays it back (`replay/[id]`); a long press offers Share and Remove.
 */
export default function HandBank() {
  return (
    <ForceScheme scheme="dark">
      <Bank />
    </ForceScheme>
  );
}

function Bank() {
  const insets = useSafeAreaInsets();
  const replays = useReplays();
  const stars = useStars();
  const premium = usePremium();
  const list = [...replays.filter((r) => stars.includes(r.id)), ...replays.filter((r) => !stars.includes(r.id))];
  const open = (r: Replay) => {
    haptic.tap();
    if (!premium) router.push({ pathname: '/premium', params: { reason: 'replay' } });
    else router.push({ pathname: '/replay/[id]', params: { id: r.id } });
  };
  const more = (r: Replay) => {
    haptic.select();
    Alert.alert(`Hand ${r.number}`, undefined, [
      { text: 'Share', onPress: () => router.push({ pathname: '/share-card', params: { kind: 'hand', id: r.id } }) },
      { text: 'Remove from bank', style: 'destructive', onPress: () => removeReplay(r.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  return (
    <GrainBackground>
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
        <SetupHeader title="Saved hands" line={list.length ? `${list.length} saved ${list.length === 1 ? 'hand' : 'hands'}. Tap one to watch it back.` : undefined} />
        {!list.length && (
          <View style={{ padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' }}>
            <Icon name="film.stack.fill" size={28} color={brand.violetDark} />
            <ThemedText variant="headline" style={{ textAlign: 'center' }}>
              No saved hands yet
            </ThemedText>
            <ThemedText variant="callout" tone="secondaryLabel" style={{ textAlign: 'center' }}>
              After a hand at any table, tap Save hand. It comes here to watch back and share.
            </ThemedText>
          </View>
        )}
        <View style={{ gap: spacing.xs }}>
          {list.map((r) => (
            <PressableScale
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`Hand ${r.number}, ${variantInfo(r.variant).name}, ${signed(r.net)} chips. Watch it back.`}
              accessibilityHint="Long press to share or remove"
              onPress={() => open(r)}
              onLongPress={() => more(r)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {(r.holes[r.me] ?? []).slice(0, 2).map((c) => (
                  <PlayingCard key={c} card={c} size="sm" width={30} />
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {stars.includes(r.id) && <Icon name="star.fill" size={12} color={brand.gold} />}
                  <ThemedText variant="callout" numberOfLines={1} style={{ fontWeight: '700' }}>
                    {r.myHand ?? (r.showdown ? 'Showdown' : r.net > 0 ? 'Took it down' : 'Folded')}
                  </ThemedText>
                </View>
                <ThemedText variant="caption1" tone="secondaryLabel" numberOfLines={1}>
                  {variantInfo(r.variant).name} · Hand {r.number} · {new Date(r.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </ThemedText>
              </View>
              <ThemedText style={{ fontFamily: ROUNDED, fontSize: 19, fontWeight: '800', color: r.net > 0 ? brand.gold : '#ffffff' }}>{signed(r.net)}</ThemedText>
              <SwapIcon name={premium ? 'play.fill' : 'lock.fill'} size={14} color="rgba(255,255,255,0.6)" />
            </PressableScale>
          ))}
        </View>
      </ScrollView>
    </GrainBackground>
  );
}
