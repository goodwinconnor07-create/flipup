import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { GameThumb } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Stepper } from '@/components/stepper';
import { ThemedText } from '@/components/themed-text';
import { isPremiumVariant, PARTY_BLIND_HANDS, PARTY_FILL, PARTY_MAX_GAMES, PARTY_MIN_GAMES, PARTY_STACKS, shufflePlaylist, variantInfo, VARIANTS, type Variant } from '@/engine';
import { createParty } from '@/state/party';
import { usePremium } from '@/state/premium';
import { unlockToHost } from '@/state/unlock';
import { party, radius, spacing, useColors } from '@/theme';

const ALL = VARIANTS.map((v) => v.id);
const THUMB = 36;
const chips = (n: number) => n.toLocaleString('en-US');

/**
 * Setting up a party, as on the web's PartySetup: the playlist (4 to 12 games, repeats allowed, Shuffle), a grid to
 * add games from, then chips per game, how often the blinds double and how far bots fill the table.
 */
export default function PartySetup() {
  const colors = useColors();
  const premium = usePremium();
  const [games, setGames] = useState<Variant[]>(() => ['holdem', ...shufflePlaylist(ALL.filter((v) => v !== 'holdem'), 5)]);
  const [stack, setStack] = useState(1000);
  const [blindHands, setBlindHands] = useState(3);
  const [fill, setFill] = useState(6);
  const [busy, setBusy] = useState(false);
  const ok = games.length >= PARTY_MIN_GAMES && games.length <= PARTY_MAX_GAMES;

  const add = (v: Variant) => {
    if (games.length >= PARTY_MAX_GAMES) {
      haptic.failure();
      Alert.alert('The playlist is full', `A party has at most ${PARTY_MAX_GAMES} games.`);
      return;
    }
    setGames([...games, v]);
  };

  const open = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      // The Premium gate for hosting: the host needs Premium for any Premium game in the playlist.
      if (!unlockToHost(games, premium)) return setBusy(false);
      await createParty({ games, startingStack: stack, blindHands, fillTo: fill });
      router.replace('/party-room');
    } catch (e) {
      Alert.alert("Couldn't open the party", e instanceof Error ? e.message : 'Try again.');
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New party' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
        <View style={{ gap: spacing.xxs }}>
          <ThemedText variant="largeTitle" accessibilityRole="header">
            Pick the games
          </ThemedText>
          <ThemedText tone="tertiaryLabel">Everyone plays one short table per game. Finish higher, score more. Blinds climb fast, so each game is over in minutes.</ThemedText>
        </View>

        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: spacing.md }}>
            <ThemedText variant="footnote" tone="tertiaryLabel" accessibilityRole="header" style={{ textTransform: 'uppercase' }}>
              Your playlist · {games.length} of {PARTY_MIN_GAMES}–{PARTY_MAX_GAMES}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Shuffle the playlist"
              hitSlop={8}
              onPress={() => {
                haptic.tap();
                setGames(shufflePlaylist(ALL, games.length));
              }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.5 : 1, paddingHorizontal: spacing.xs, minHeight: 32 })}
            >
              <Icon name="shuffle" size={14} color={colors.accent} />
              <ThemedText variant="subhead" tone="accent" style={{ fontWeight: '600' }}>
                Shuffle
              </ThemedText>
            </Pressable>
          </View>
          <Section inset={spacing.md + 20 + spacing.sm + THUMB + spacing.sm}>
            {games.map((g, i) => {
              const info = variantInfo(g);
              const canRemove = games.length > PARTY_MIN_GAMES;
              return (
                <Row
                  key={`${i}-${g}`}
                  title={info.name}
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
          <ThemedText variant="footnote" tone="tertiaryLabel" accessibilityRole="header" style={{ textTransform: 'uppercase', paddingHorizontal: spacing.md }}>
            Add a game
          </ThemedText>
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
            <ThemedText variant="footnote" tone="tertiaryLabel" style={{ paddingHorizontal: spacing.md }}>
              Pick any game. Games with a crown need Premium or one short ad from the host when the party opens. Friends who join never need either.
            </ThemedText>
          )}
        </View>

        <Section header="House rules" footer={`Everyone starts each game with ${chips(stack)} chips, and the blinds double every ${blindHands} hands. No rebuys, and 20 seconds to act.`}>
          <Pick label="Chips" symbol="dollarsign.circle.fill" color={party.blue} value={stack} options={PARTY_STACKS} onChange={setStack} format={chips} />
          <Pick label="Hands per level" symbol="chart.line.uptrend.xyaxis" color={party.orange} value={blindHands} options={PARTY_BLIND_HANDS} onChange={setBlindHands} format={String} />
          <Pick label="Bots fill to" symbol="cpu.fill" color={party.green} value={fill} options={PARTY_FILL} onChange={setFill} format={(n) => (n === 0 ? 'None' : `${n} seats`)} />
        </Section>

        <Button variant="party" tint="blue" size="lg" title="Open the party" disabled={!ok} loading={busy} onPress={() => void open()} />
      </ScrollView>
    </>
  );
}

/** A row with a stepper that walks through a fixed list of choices. */
function Pick({ label, symbol, color, value, options, onChange, format }: { label: string; symbol: 'dollarsign.circle.fill' | 'chart.line.uptrend.xyaxis' | 'cpu.fill'; color: string; value: number; options: number[]; onChange: (n: number) => void; format: (n: number) => string }) {
  const at = Math.max(0, options.indexOf(value));
  return (
    <Row title={label} detail={format(options[at])} icon={{ symbol, color }} accessory={<Stepper label={label} value={at} min={0} max={options.length - 1} onChange={(i) => onChange(options[i])} />} />
  );
}
