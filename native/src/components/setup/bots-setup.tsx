import { router } from 'expo-router';
import { NavRow } from './setup-header';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_SEATS, variantInfo, type Settings } from '@/engine';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { dispatch, openLocalTable } from '@/state/session';
import { saveSettings, setDraft } from '@/state/setup-draft';
import { unlockToHost } from '@/state/unlock';
import { ForceScheme, ROUNDED, spacing } from '@/theme';

import { GrainBackground } from '../grain-background';
import { GameCard } from '../lobby/game-card';
import { HouseRules } from '../lobby/house-rules';
import { PANEL_RADIUS, usePanel } from '../grouped-list';
import { ThemedText } from '../themed-text';
import { randomBot, type RowBot } from './bots-row';
import { FloatTable } from './float-table';
import { OPEN_BUTTON_ROOM, OpenTableButton } from './open-table-button';

/** Bots already sitting when the page opens, so Start game works at once. */
const START_BOTS = 4;

/**
 * Play with bots: the same page as Play with friends (the lobby's pieces on the deep blue field, always dark) with
 * no game code, and the bots up top where the code card sits. Top to bottom:
 *  1. `BotsCard`: At the table, everyone floating in a small group (`FloatTable`: Add pops a bot in, hold a bot to take it off)
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
      const b = randomBot(out, undefined, premium);
      if (b) out.push({ ...b, greet: undefined });
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const extra = Number(!!s.humanPoker);
  const room = MAX_SEATS - 1 - extra - bots.length;

  const addBot = () => {
    if (room <= 0) return;
    const bot = randomBot(bots, profile.name || undefined, premium);
    // Bots sit down quietly here (the owner's call): their hello is for the table, not the lobby.
    if (bot) setBots((have) => [...have, { ...bot, greet: undefined }]);
    else if (!premium) router.push({ pathname: '/premium', params: { reason: 'bots' } });
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
          onRemove={(b) => setBots((have) => have.filter((x) => x.key !== b.key))}
        />

        <GameCard variant={variant} host />

        <HouseRules
          settings={s}
          onChange={(next) => {
            if (next.humanPoker) setBots((b) => b.slice(0, MAX_SEATS - 2));
            setDraft(next);
          }}
          online={false}
          bots={bots.length}
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
 * new: everyone floating in a small group (`FloatTable`) with a same-sized Add button at its end. A new bot pops in,
 * and holding one pops it back out. No stepper and no Fill the table row (the owner's call), to keep it short. No BOT pills, nothing
 * to guess, and no hello lines: bots talk at the table.
 */
function BotsCard({
  humanPoker,
  bots,
  room,
  onAdd,
  onRemove,
}: {
  humanPoker: boolean;
  bots: RowBot[];
  room: number;
  onAdd: () => void;
  onRemove: (b: RowBot) => void;
}) {
  const panel = usePanel();
  const profile = useProfile();
  // Bots on their way out: still drawn while they pop out, but no longer counted.
  const [leaving, setLeaving] = useState<string[]>([]);
  const staying = bots.filter((b) => !leaving.includes(b.key));
  const min = humanPoker ? 0 : 1;
  const popOut = (key: string) => setLeaving((l) => (l.includes(key) ? l : [...l, key]));

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.xxs }}>
        <ThemedText variant="title3" accessibilityRole="header" style={{ fontFamily: ROUNDED, fontWeight: '800' }}>
          At the table
        </ThemedText>
        <ThemedText variant="subhead" tone="secondaryLabel">
          {staying.length + 1 + Number(humanPoker)} of {MAX_SEATS} seats
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
        <View style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.sm, gap: spacing.xs }}>
          <FloatTable
            seats={[
              { key: 'you', emoji: profile.emoji || '🙂', name: profile.name || 'You', you: true },
              ...bots.map((b) => ({ key: b.key, emoji: b.emoji, name: b.name, leaving: leaving.includes(b.key) })),
            ]}
            canRemove={staying.length > min}
            onHold={popOut}
            onAdd={room > 0 ? onAdd : undefined}
            onGone={(key) => {
              const b = bots.find((x) => x.key === key);
              setLeaving((l) => l.filter((k) => k !== key));
              if (b) onRemove(b);
            }}
          />
          <ThemedText variant="footnote" tone="secondaryLabel" style={{ textAlign: 'center' }}>
            Hold a bot to take it off
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
