import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { GameThumb } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { PARTY_MAX_GAMES, PARTY_MIN_GAMES, VARIANTS } from '@/engine';
import { ensureMyCode, myPalCode, refreshPals, removePal, useMyPalCode, usePals, type Pal } from '@/state/pals';
import { usePartyRef } from '@/state/party';
import { useProfile } from '@/state/profile';
import { gradient, party, radius, spacing, useColors, useShadows } from '@/theme';

const SHOWCASE = VARIANTS.slice(0, 6);
/** The web's host card: blue to violet. */
const HOST = `linear-gradient(150deg, #4aa3ff 0%, ${party.blue} 50%, #7b3df0 100%)`;

/** When friends and the friend card were last checked with the server. Switching tabs shouldn't ask every time. */
let lastSync = 0;
const SYNC_EVERY = 60_000;

/**
 * The Party tab, as on the web: one loud "Host a party" card, flat rows (your party, join one), then Friends: your
 * friend code, Add a friend and the list.
 */
export default function PartyTab() {
  const colors = useColors();
  const profile = useProfile();
  const named = profile.name.trim().length > 0;
  const pals = usePals();
  const code = useMyPalCode();
  const partyRef = usePartyRef();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Date.now() - lastSync < SYNC_EVERY) return;
    lastSync = Date.now();
    void refreshPals();
    // A phone that already has a code keeps its name and picture fresh on the server.
    if (myPalCode() && named) void ensureMyCode().catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hosting, joining and a friend code need a name first.
  const needName = (): boolean => {
    if (named) return false;
    Alert.alert('Add your name first', 'Friends see your name and picture at the table.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Set up profile', onPress: () => router.push('/profile') },
    ]);
    return true;
  };

  const makeCode = async () => {
    if (busy || needName()) return;
    setBusy(true);
    try {
      await ensureMyCode();
    } catch (e) {
      Alert.alert("Couldn't make your code", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = (pal: Pal) =>
    Alert.alert(`Remove ${pal.name}?`, 'You can add them again with their code.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePal(pal.code) },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: 'Party', headerLargeTitleEnabled: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
        <HostCard onPress={() => !needName() && router.push('/party-setup')} />

        <Section>
          {partyRef && <Row title="Your party" subtitle={`Code ${partyRef.code}`} icon={{ symbol: 'person.3.fill', color: colors.gold as string }} onPress={() => router.push('/party-room')} />}
          <Row
            title="Join a party"
            subtitle="Type the code from your host"
            icon={{ symbol: 'circle.grid.3x3.fill', color: party.green }}
            onPress={() => !needName() && router.push({ pathname: '/code-entry', params: { kind: 'party' } })}
          />
        </Section>

        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="title2" accessibilityRole="header" style={{ fontWeight: '800' }}>
            Friends
          </ThemedText>
          <FriendCode code={code} busy={busy} onMake={() => void makeCode()} />
          <Section inset={spacing.md + 36 + spacing.sm} footer={pals.length === 0 ? 'No friends yet. Add one with their code.' : undefined}>
            <Row title="Add a friend" icon={{ symbol: 'plus', color: colors.gold as string }} onPress={() => router.push({ pathname: '/code-entry', params: { kind: 'friend' } })} />
            {pals.map((pal) => (
              <Row
                key={pal.code}
                title={pal.name}
                subtitle={pal.code}
                leading={<Avatar emoji={pal.emoji} size={36} />}
                accessory={
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${pal.name}`} hitSlop={8} onPress={() => remove(pal)} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: spacing.xs })}>
                    <ThemedText tone="red">Remove</ThemedText>
                  </Pressable>
                }
              />
            ))}
          </Section>
        </View>
      </ScrollView>
    </>
  );
}

/** The one loud card: the first six games fanned over a blue-violet gradient, a heavy heading, and a darker action bar. */
function HostCard({ onPress }: { onPress: () => void }) {
  const shadow = useShadows();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Host a party. Play ${PARTY_MIN_GAMES} to ${PARTY_MAX_GAMES} mini games in a row. Set it up`}
      onPress={onPress}
      style={{ borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', boxShadow: shadow.soft, ...gradient(HOST) }}
    >
      <View style={{ padding: spacing.lg, paddingBottom: 0, gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SHOWCASE.map((v, i) => (
            <View key={v.id} style={{ borderRadius: 38 * 0.28, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.55)', transform: [{ rotate: `${(i - 2.5) * 4}deg` }] }}>
              <GameThumb variant={v.id} size={38} />
            </View>
          ))}
        </View>
        <Text maxFontSizeMultiplier={1.4} style={{ marginTop: spacing.sm, fontSize: 28, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5, color: '#ffffff' }}>
          Host a party
        </Text>
        <ThemedText variant="subhead" tone="onColor" style={{ opacity: 0.9 }}>
          Play {PARTY_MIN_GAMES} to {PARTY_MAX_GAMES} mini games in a row. The best finisher wins.
        </ThemedText>
      </View>
      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: 'rgba(0, 0, 0, 0.22)' }}>
        <ThemedText variant="headline" tone="onColor" style={{ fontWeight: '700' }}>
          Set it up
        </ThemedText>
        <Icon name="chevron.right" size={16} color="#ffffff" />
      </View>
    </PressableScale>
  );
}

/** Your friend code as a flat cell with Share, or a button that makes one. */
function FriendCode({ code, busy, onMake }: { code: string | null; busy: boolean; onMake: () => void }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.cell }}>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textTransform: 'uppercase', fontWeight: '600' }}>
          Your friend code
        </ThemedText>
        {code ? (
          <Text accessibilityLabel={code.split('').join(' ')} maxFontSizeMultiplier={1.3} style={{ fontSize: 24, fontWeight: '700', letterSpacing: 4, color: colors.label }}>
            {code}
          </Text>
        ) : (
          <ThemedText variant="subhead" tone="tertiaryLabel">
            Give friends a code so they can add you.
          </ThemedText>
        )}
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={code ? 'Share your friend code' : 'Get my code'}
        disabled={busy}
        onPress={code ? () => void Share.share({ message: `Add me on FlipUp. My friend code is ${code}` }) : onMake}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, minHeight: 40, borderRadius: radius.full, backgroundColor: colors.accent }}
      >
        {busy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            {code && <Icon name="square.and.arrow.up" size={16} color="#ffffff" />}
            <ThemedText variant="headline" tone="onColor">
              {code ? 'Share' : 'Get my code'}
            </ThemedText>
          </>
        )}
      </PressableScale>
    </View>
  );
}
