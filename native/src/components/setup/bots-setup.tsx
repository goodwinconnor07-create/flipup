import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_SEATS, variantInfo, type Settings } from '@/engine';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { dispatch, openLocalTable } from '@/state/session';
import { saveSettings, setDraft } from '@/state/setup-draft';
import { unlockToHost } from '@/state/unlock';
import { brand, ForceScheme, radius, ROUNDED, spacing, useColors, useShadows } from '@/theme';

import { GrainBackground } from '../grain-background';
import { haptic } from '../haptics';
import { Icon, type IconName } from '../icon';
import { GameCard } from '../lobby/game-card';
import { HouseRules } from '../lobby/house-rules';
import { RoundButton } from '../tab-screen';
import { ThemedText } from '../themed-text';
import { BotsRow, randomBot, type RowBot } from './bots-row';
import { OPEN_BUTTON_ROOM, OpenTableButton } from './open-table-button';

/** Bots already sitting when the page opens, so Start game works at once. */
const START_BOTS = 4;

/**
 * Play with bots: the same page as Play with friends (the lobby's pieces on the deep blue field, always dark) with
 * no game code, and the bots up top where the code card sits. Top to bottom:
 *  1. `BotsCard`: the bots as big faces (a tap takes one off, each new one says hello), Add a bot and Fill the table
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
  const room = MAX_SEATS - 1 - bots.length;

  const addBot = () => {
    if (room <= 0) return;
    const bot = randomBot(bots, profile.name || undefined);
    if (bot) setBots((have) => [...have, bot]);
  };
  // Every empty seat at once; only the first new bot says hello, so the row isn't a wall of bubbles.
  const fill = () => {
    const out = [...bots];
    while (out.length < MAX_SEATS - 1) {
      const b = randomBot(out, profile.name || undefined);
      if (!b) break;
      out.push(out.length === bots.length ? b : { ...b, key: `${b.key}:${out.length}`, greet: undefined });
    }
    setBots(out);
  };

  const deal = () => {
    if (busy || !bots.length) return;
    if (!unlockToHost([variant], premium)) return;
    setBusy(true);
    saveSettings(s);
    openLocalTable(s, bots.length, profile.name, profile.emoji, bots.map((b) => b.name));
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <RoundButton icon="chevron.left" label="Back" onPress={() => router.back()} />
          <ThemedText variant="headline" accessibilityRole="header">
            Play with bots
          </ThemedText>
          <View style={{ width: 44 }} />
        </View>

        <BotsCard
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

        <HouseRules settings={s} onChange={setDraft} online={false} />
      </ScrollView>
      <OpenTableButton
        title="Start game"
        line={bots.length ? `You and ${bots.length} ${bots.length === 1 ? 'bot' : 'bots'} · ${variantInfo(variant).name}` : 'Add a bot first'}
        busy={busy}
        onPress={deal}
      />
    </GrainBackground>
  );
}

/**
 * The page's main card, where Play with friends has its game code: who you're playing, as the big faces from the
 * setup rows, then two buttons, Add a bot (the loud one) and Fill the table, and how many seats are left.
 */
function BotsCard({
  bots,
  room,
  onAdd,
  onFill,
  onRemove,
}: {
  bots: RowBot[];
  room: number;
  onAdd: () => void;
  onFill: () => void;
  onRemove: (b: RowBot) => void;
}) {
  const colors = useColors();
  const shadows = useShadows();
  const seats = room <= 0 ? `Table full · ${MAX_SEATS} seats` : `${room} ${room === 1 ? 'seat' : 'seats'} left`;
  return (
    <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', boxShadow: shadows.card }}>
      <View
        style={{
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: colors.cell,
          overflow: 'hidden',
          padding: spacing.md,
          gap: spacing.md,
        }}
      >
        <View style={{ gap: 2 }}>
          <ThemedText
            variant="caption2"
            tone="secondaryLabel"
            style={{ fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}
          >
            Your table
          </ThemedText>
          <ThemedText variant="title2" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
            {bots.length ? `You and ${bots.length} ${bots.length === 1 ? 'bot' : 'bots'}` : 'Add some bots'}
          </ThemedText>
        </View>

        <BotsRow bots={bots} canAdd={room > 0} onAdd={onAdd} onRemove={onRemove} hideTitle />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <CardButton icon="plus" title="Add a bot" loud disabled={room <= 0} onPress={onAdd} />
          <CardButton icon="person.3.fill" title="Fill the table" disabled={room <= 0} onPress={onFill} />
        </View>

        <ThemedText variant="footnote" tone="secondaryLabel">
          {bots.length ? `Tap a bot to take it off · ${seats}` : seats}
        </ThemedText>
      </View>
    </View>
  );
}

function CardButton({ icon, title, loud, disabled, onPress }: { icon: IconName; title: string; loud?: boolean; disabled?: boolean; onPress: () => void }) {
  const colors = useColors();
  const ink = loud ? brand.violet : (colors.label as string);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: loud ? brand.paper : colors.cellPressed,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Icon name={icon} size={16} color={ink} weight="semibold" />
      <ThemedText style={{ fontWeight: '700', color: ink }}>{title}</ThemedText>
    </Pressable>
  );
}
