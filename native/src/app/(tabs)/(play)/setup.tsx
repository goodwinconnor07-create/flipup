import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { GameThumb } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { SeatPreview } from '@/components/seat-preview';
import { Stepper } from '@/components/stepper';
import { SettingsFields } from '@/components/settings-fields';
import { isVariant, MAX_SEATS, variantInfo } from '@/engine';
import { inviteFriends, usePals, type Pal } from '@/state/pals';
import { usePremium } from '@/state/premium';
import { useProfile } from '@/state/profile';
import { openLocalTable, openOnlineTable } from '@/state/session';
import { saveSettings, setDraft, startDraft, useDraft, useSavedSettings } from '@/state/setup-draft';
import { unlockToHost } from '@/state/unlock';
import { party, spacing, useColors } from '@/theme';

/**
 * Setting up a table: the table itself at the top (the game's felt, you and a face for each bot, open seats for
 * friends), then a native grouped form: who plays, the game, chips and blinds, and the house rules, each
 * section with a footer that says what it does. Steppers, a segmented control and switches; the Game row opens
 * the list of games.
 */
export default function SetupScreen() {
  const params = useLocalSearchParams<{ mode?: string; variant?: string; invite?: string }>();
  const mode = params.mode === 'friends' ? 'friends' : 'bots';
  const saved = useSavedSettings();
  // A fresh draft each time the screen opens, from the last table's settings and any game picked on Home.
  useEffect(() => startDraft(saved, mode, isVariant(params.variant) ? params.variant : undefined), []); // eslint-disable-line react-hooks/exhaustive-deps
  const s = useDraft();
  const [bots, setBots] = useState(mode === 'bots' ? 4 : 0);
  const variant = s.variant ?? 'holdem';
  const minBots = mode === 'bots' ? 1 : 0;
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
  // Friends to invite as soon as the table opens (with friends only). A friend you came from is already ticked.
  const pals = usePals();
  const [invited, setInvited] = useState<string[]>(() => (params.invite ? [params.invite] : []));
  const premium = usePremium();
  const open = async () => {
    if (busy) return;
    if (!unlockToHost([variant], premium)) return;
    saveSettings(s);
    if (mode === 'bots') {
      openLocalTable(s, bots, profile.name, profile.emoji);
      router.push('/table');
      return;
    }
    setBusy(true);
    try {
      const code = await openOnlineTable(s, bots, profile.name, profile.emoji);
      const asked = invited.filter((c) => pals.some((p) => p.code === c));
      if (asked.length) void inviteFriends(asked, code).catch(() => 0);
      router.push('/table');
    } catch (e) {
      Alert.alert("Couldn't open a table", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: mode === 'friends' ? 'Play with friends' : 'Play with bots' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
        <SeatPreview settings={s} bots={bots} friends={mode === 'friends'} guests={pals.filter((p) => invited.includes(p.code))} />
        <Section footer={mode === 'friends' ? 'Bots fill seats your friends leave empty.' : 'Computer players at your table.'}>
          <Row
            title="Bots"
            detail={String(bots)}
            icon={{ symbol: 'cpu.fill', color: party.green }}
            accessory={<Stepper label="Bots" value={bots} min={minBots} max={MAX_SEATS - 1} onChange={setBots} />}
          />
        </Section>

        {mode === 'friends' && pals.length > 0 && (
          <InviteFriends
            pals={pals}
            picked={invited}
            onToggle={(code) => setInvited((have) => (have.includes(code) ? have.filter((c) => c !== code) : [...have, code]))}
          />
        )}

        <Section header="Game">
          <Row
            title={variantInfo(variant).name}
            subtitle={variantInfo(variant).tagline}
            leading={<GameThumb variant={variant} size={44} />}
            onPress={() => router.push('/choose-game')}
          />
        </Section>

        <SettingsFields settings={s} onChange={setDraft} online={mode === 'friends'} />

        <Button variant="party" tint={mode === 'friends' ? 'blue' : 'green'} size="lg" title={mode === 'friends' ? 'Open the table' : 'Sit down'} loading={busy} onPress={() => void open()} />
      </ScrollView>
    </>
  );
}

/**
 * Your friends as faces to tick: everyone ticked gets an invite in their Friends tab the moment the table opens.
 * Anyone else still joins with the table's code or QR code.
 */
function InviteFriends({ pals, picked, onToggle }: { pals: Pal[]; picked: string[]; onToggle: (code: string) => void }) {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.xs }}>
      <ThemedText variant="footnote" tone="tertiaryLabel" accessibilityRole="header" style={{ textTransform: 'uppercase', paddingHorizontal: spacing.md }}>
        Invite friends{picked.length ? ` · ${picked.length}` : ''}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xxs, paddingVertical: spacing.xxs }}>
        {pals.map((p) => {
          const on = picked.includes(p.code);
          return (
            <Pressable
              key={p.code}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Invite ${p.name}`}
              onPress={() => {
                haptic.tap();
                onToggle(p.code);
              }}
              style={({ pressed }) => ({ width: 72, alignItems: 'center', gap: spacing.xxs, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ borderRadius: 32, padding: 3, borderWidth: 3, borderColor: on ? party.blue : 'transparent' }}>
                <Avatar emoji={p.emoji} size={52} />
                {on && (
                  <View style={{ position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: party.blue, borderWidth: 2, borderColor: colors.background }}>
                    <Icon name="checkmark" size={12} color="#ffffff" />
                  </View>
                )}
              </View>
              <ThemedText variant="footnote" numberOfLines={1} style={{ fontWeight: on ? '700' : '400' }}>
                {p.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ paddingHorizontal: spacing.md }}>
        They get an invite when the table opens. Anyone else joins with the code.
      </ThemedText>
    </View>
  );
}
