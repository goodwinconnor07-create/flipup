import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameThumb } from '@/components/game-picture';
import { GrainBackground } from '@/components/grain-background';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { OPEN_BUTTON_ROOM, OpenTableButton } from '@/components/setup/open-table-button';
import { SetupHeader, SetupRowTitle } from '@/components/setup/setup-header';
import { ThemedText } from '@/components/themed-text';
import { isPremiumVariant, PARTY_MAX_GAMES, PARTY_MIN_GAMES, shufflePlaylist, variantInfo, VARIANTS, type Variant } from '@/engine';
import { readPartyDraft, setPartyGames } from '@/state/party-draft';
import { usePremium } from '@/state/premium';
import { ForceScheme, radius, spacing, useColors } from '@/theme';

const ALL = VARIANTS.map((v) => v.id);
const THUMB = 36;

/**
 * A party's playlist, from "Start a party" on Play with friends: the games in order (4 to 12, repeats allowed),
 * Shuffle for a fresh random list, and a grid to add games from. Save takes the playlist back to Play with friends,
 * where the chips, blinds and bots are set and the party opens. On the same dark grain page.
 */
export default function PartyPlaylistScreen() {
  return (
    <ForceScheme scheme="dark">
      <Playlist />
    </ForceScheme>
  );
}

function Playlist() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const premium = usePremium();
  const [games, setGames] = useState<Variant[]>(() => readPartyDraft()?.games ?? ['holdem', ...shufflePlaylist(ALL.filter((v) => v !== 'holdem'), 5)]);
  const ok = games.length >= PARTY_MIN_GAMES && games.length <= PARTY_MAX_GAMES;

  const add = (v: Variant) => {
    if (games.length >= PARTY_MAX_GAMES) {
      haptic.failure();
      Alert.alert('The playlist is full', `A party has at most ${PARTY_MAX_GAMES} games.`);
      return;
    }
    setGames([...games, v]);
  };

  const save = () => {
    if (!ok) {
      haptic.failure();
      Alert.alert('Add a few more games', `A party needs at least ${PARTY_MIN_GAMES} games.`);
      return;
    }
    haptic.success();
    setPartyGames(games);
    router.back();
  };

  return (
    <GrainBackground>
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.xs, paddingBottom: OPEN_BUTTON_ROOM + insets.bottom, gap: spacing.xl }}>
        <SetupHeader title="Party playlist" line="One short table per game. Finish higher, score more." />

        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SetupRowTitle title="Playlist" detail={`${games.length} of ${PARTY_MIN_GAMES}–${PARTY_MAX_GAMES}`} />
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Shuffle the playlist"
            onPress={() => setGames(shufflePlaylist(ALL, Math.max(games.length, PARTY_MIN_GAMES)))}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 44, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <Icon name="shuffle" size={16} color="#ffffff" />
            <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
              Shuffle
            </Text>
          </PressableScale>
          <Section inset={spacing.md + 20 + spacing.sm + THUMB + spacing.sm}>
            {games.map((g, i) => {
              const info = variantInfo(g);
              const canRemove = games.length > 1;
              return (
                <Row
                  key={`${i}-${g}`}
                  title={info.name}
                  chevron={false}
                  leading={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text maxFontSizeMultiplier={1.3} style={{ width: 20, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'], color: colors.tertiaryLabel }}>
                        {i + 1}
                      </Text>
                      <GameThumb variant={g} size={THUMB} />
                    </View>
                  }
                  trailing={!premium && isPremiumVariant(g) ? <Icon name="crown.fill" size={15} color={colors.gold} /> : undefined}
                  accessory={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${info.name}`}
                      accessibilityState={{ disabled: !canRemove }}
                      disabled={!canRemove}
                      hitSlop={8}
                      onPress={() => {
                        haptic.tap();
                        setGames(games.filter((_, j) => j !== i));
                      }}
                      style={({ pressed }) => ({ opacity: !canRemove ? 0.3 : pressed ? 0.5 : 1 })}
                    >
                      <Icon name="minus.circle.fill" size={22} color={colors.red} />
                    </Pressable>
                  }
                />
              );
            })}
          </Section>
        </View>

        <View style={{ gap: spacing.xs }}>
          <SetupRowTitle title="Add a game" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {VARIANTS.map((v) => (
              <PressableScale
                key={v.id}
                accessibilityRole="button"
                accessibilityLabel={`Add ${v.name}`}
                onPress={() => add(v.id)}
                outerStyle={{ width: '48.5%', flexGrow: 1 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, minHeight: 56, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.cell }}
              >
                <GameThumb variant={v.id} size={30} />
                <ThemedText variant="subhead" numberOfLines={2} style={{ flex: 1 }}>
                  {v.name}
                </ThemedText>
                {!premium && isPremiumVariant(v.id) && <Icon name="crown.fill" size={12} color={colors.gold} />}
                <Icon name="plus" size={15} color={colors.accent} />
              </PressableScale>
            ))}
          </View>
          {!premium && (
            <ThemedText variant="footnote" tone="tertiaryLabel">
              Games with a crown need Premium to host. Friends who join never need it.
            </ThemedText>
          )}
        </View>
      </ScrollView>
      <OpenTableButton title="Save playlist" line={ok ? `${games.length} games` : `Pick at least ${PARTY_MIN_GAMES} games`} onPress={save} />
    </GrainBackground>
  );
}
