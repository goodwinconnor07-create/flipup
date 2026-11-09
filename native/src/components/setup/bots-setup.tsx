import { router } from 'expo-router';
import { NavRow } from './setup-header';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_SEATS, variantInfo, type Settings } from '@/engine';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { dispatch, openLocalTable } from '@/state/session';
import { saveSettings, setDraft } from '@/state/setup-draft';
import { unlockToHost } from '@/state/unlock';
import { ForceScheme, ROUNDED, spacing, useColors } from '@/theme';

import { GrainBackground } from '../grain-background';
import { haptic } from '../haptics';
import { Icon } from '../icon';
import { GameCard } from '../lobby/game-card';
import { HouseRules } from '../lobby/house-rules';
import { PANEL_RADIUS, usePanel } from '../grouped-list';
import { Stepper } from '../stepper';
import { ThemedText } from '../themed-text';
import { randomBot, type RowBot } from './bots-row';
import { OPEN_BUTTON_ROOM, OpenTableButton } from './open-table-button';

/** Bots already sitting when the page opens, so Start game works at once. */
const START_BOTS = 4;

/**
 * Play with bots: the same page as Play with friends (the lobby's pieces on the deep blue field, always dark) with
 * no game code, and the bots up top where the code card sits. Top to bottom:
 *  1. `BotsCard`: At the table, a Bots stepper, then you and each bot as a list row (a red minus takes one off), Fill the table
 *  2. `GameCard`: the game, Change opens the `lobby-game` list, then How it plays
 *  3. `HouseRules`: the table's numbers and switches, without the online ones
 * and Start game pinned at the bottom, which deals at once with exactly these bots.
 * `settings` is the draft the route started (app/play-bots.tsx).
 */
export function BotsSetup({ settings }: { settings: Settings }) {
  return (
    <ForceScheme scheme="dark">
      <BotsSetupPage settings={settings} />
    </ForceScheme>
  );
}

function BotsSetupPage({ settings: s }: { settings: Settings }) {
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const premium = usePremium();
  const variant = s.variant ?? 'holdem';
  const [bots, setBots] = useState<RowBot[]>(() => {
    const out: RowBot[] = [];
    for (let i = 0; i < START_BOTS; i++) {
      const b = randomBot(out, undefined);
      if (b) out.push({ ...b, greet: undefined });
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const extra = Number(!!s.humanPoker);
  const room = MAX_SEATS - 1 - extra - bots.length;

  const addBot = () => {
    if (room <= 0) return;
    const bot = randomBot(bots, profile.name || undefined);
    if (bot) setBots((have) => [...have, bot]);
  };
  // Every empty seat at once; only the first new bot says hello, so the row isn't a wall of bubbles.
  const fill = () => {
    const out = [...bots];
    while (out.length < MAX_SEATS - 1 - extra) {
      const b = randomBot(out, profile.name || undefined);
      if (!b) break;
      out.push(out.length === bots.length ? b : { ...b, key: `${b.key}:${out.length}`, greet: undefined });
    }
    setBots(out);
  };

  const deal = () => {
    if (busy || (!bots.length && !extra)) return;
    if (!unlockToHost([variant], premium)) return;
    setBusy(true);
    saveSettings(s);
    openLocalTable(
      s,
      bots.length,
      profile.name,
      profile.emoji,
      bots.map((b) => b.name),
    );
    // Straight to the deal ("Dealing in 3…"): the bots are already picked here, so no second lobby.
    dispatch({ type: 'start' });
    router.push('/table');
    setBusy(false);
  };

  return (
    <GrainBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: insets.top + spacing.xs,
          paddingBottom: OPEN_BUTTON_ROOM + insets.bottom,
          gap: spacing.lg,
        }}
      >
        <NavRow title="Play with bots" />

        <BotsCard
          humanPoker={!!s.humanPoker}
          bots={bots}
          room={room}
          onAdd={addBot}
          onFill={fill}
          onRemove={(b) => {
            haptic.tap();
            setBots((have) => have.filter((x) => x.key !== b.key));
          }}
        />

        <GameCard variant={variant} host />

        <HouseRules
          settings={s}
          onChange={(next) => {
            if (next.humanPoker) setBots((b) => b.slice(0, MAX_SEATS - 2));
            setDraft(next);
          }}
          online={false}
        />
      </ScrollView>
      <OpenTableButton
        title="Start game"
        line={
          bots.length + extra
            ? `You and ${bots.length + extra} ${bots.length + extra === 1 ? 'bot' : 'bots'} · ${variantInfo(variant).name}`
            : 'Add a bot first'
        }
        busy={busy}
        disabled={!bots.length && !extra}
        onPress={deal}
      />
    </GrainBackground>
  );
}

/**
 * The page's main card, where Play with friends has its game code: who's at the table, said plainly for someone
 * new. A "Bots" stepper sets how many (Fill the table for every seat), then everyone as a list: you first, each bot
 * with a red minus to take it off, the newest one saying hello on its second line. No BOT pills, nothing to guess.
 */
function BotsCard({
  humanPoker,
  bots,
  room,
  onAdd,
  onFill,
  onRemove,
}: {
  humanPoker: boolean;
  bots: RowBot[];
  room: number;
  onAdd: () => void;
  onFill: () => void;
  onRemove: (b: RowBot) => void;
}) {
  const colors = useColors();
  const panel = usePanel();
  const profile = useProfile();
  const max = MAX_SEATS - 1 - Number(humanPoker);
  const newest = bots.at(-1);
  const setCount = (n: number) => {
    if (n > bots.length) onAdd();
    else if (n < bots.length && newest) onRemove(newest);
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.xxs }}>
        <ThemedText variant="title3" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          At the table
        </ThemedText>
        <ThemedText variant="subhead" tone="secondaryLabel">
          {bots.length + 1 + Number(humanPoker)} of {MAX_SEATS} seats
        </ThemedText>
      </View>
      <View
        style={{
          borderRadius: PANEL_RADIUS,
          borderCurve: 'continuous',
          backgroundColor: panel.fill,
          borderWidth: 1,
          borderColor: panel.edge,
          overflow: 'hidden',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: spacing.md, minHeight: 72 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="headline">Bots</ThemedText>
            <ThemedText variant="subhead" tone="secondaryLabel">
              {room <= 0 ? 'Every seat is taken' : `Up to ${max} computer players`}
            </ThemedText>
          </View>
          <ThemedText
            variant="title2"
            style={{ fontFamily: ROUNDED, fontWeight: '800', fontVariant: ['tabular-nums'], minWidth: 24, textAlign: 'center' }}
          >
            {bots.length}
          </ThemedText>
          <Stepper label="Bots" value={bots.length} min={humanPoker ? 0 : 1} max={max} onChange={setCount} />
        </View>
        <View style={{ height: 0.5, marginLeft: spacing.md, backgroundColor: panel.hairline }} />
        <SeatLine emoji={profile.emoji || '🙂'} name={profile.name || 'You'} line={profile.name ? 'You' : "That's you"} />
        {humanPoker && <SeatLine emoji="🤖" name="BOT_001" line="New experimental bot" />}
        {bots.map((b) => (
          <View key={b.key}>
            <View style={{ height: 0.5, marginLeft: 68, backgroundColor: panel.hairline }} />
            <SeatLine
              emoji={b.emoji}
              name={b.name}
              line={b.key === newest?.key && b.greet ? `“${b.greet}”` : 'Bot'}
              onRemove={bots.length > 1 || humanPoker ? () => onRemove(b) : undefined}
            />
          </View>
        ))}
        {room > 0 && (
          <>
            <View style={{ height: 0.5, marginLeft: spacing.md, backgroundColor: panel.hairline }} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Fill the table, ${room} more bots`}
              onPress={() => {
                haptic.tap();
                onFill();
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: spacing.md,
                minHeight: 56,
                backgroundColor: pressed ? panel.pressed : 'transparent',
              })}
            >
              <View style={{ width: 40, alignItems: 'center' }}>
                <Icon name="person.3.fill" size={20} color={colors.accent as string} />
              </View>
              <ThemedText variant="headline" style={{ color: colors.accent as string }}>
                Fill the table
              </ThemedText>
              <ThemedText variant="subhead" tone="secondaryLabel" style={{ marginLeft: 'auto' }}>
                +{room}
              </ThemedText>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/** One person at the table: their face, name and a grey line, and for a bot the red minus that takes it off. */
function SeatLine({ emoji, name, line, onRemove }: { emoji: string; name: string; line: string; onRemove?: () => void }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: spacing.md, minHeight: 64 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <Text style={{ fontSize: 24 }} maxFontSizeMultiplier={1}>
          {emoji}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="headline" numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText variant="subhead" tone="secondaryLabel" numberOfLines={1}>
          {line}
        </ThemedText>
      </View>
      {onRemove && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Take ${name} off`}
          hitSlop={10}
          onPress={() => {
            haptic.tap();
            onRemove();
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Icon name="minus.circle.fill" size={24} color={colors.red as string} />
        </Pressable>
      )}
    </View>
  );
}
