import { router, Stack } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { GameThumb } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { Icon } from '@/components/icon';
import { LivingCard } from '@/components/living-card';
import { PressableScale } from '@/components/pressable-scale';
import { ProfileMenu } from '@/components/profile-menu';
import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { PARTY_MAX_GAMES, PARTY_MIN_GAMES, VARIANTS } from '@/engine';
import { usePartyRef } from '@/state/party';
import { useProfile } from '@/state/profile';
import { cardColors, party, ROUNDED, spacing, useColors } from '@/theme';

const SHOWCASE = VARIANTS.slice(0, 6);

/** The Party tab: one loud "Host a party" card and flat rows (your party, join one). Friends have their own tab. */
export default function PartyTab() {
  const colors = useColors();
  const profile = useProfile();
  const named = profile.name.trim().length > 0;
  const partyRef = usePartyRef();

  // Hosting and joining need a name first.
  const needName = (): boolean => {
    if (named) return false;
    Alert.alert('Add your name first', 'Friends see your name and picture at the table.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Set up profile', onPress: () => router.push('/profile') },
    ]);
    return true;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Party', headerShown: false }} />
      <TabScreen title="Party" accessory={<ProfileMenu />}>
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
      </TabScreen>
    </>
  );
}

/** The one loud card: the first six games fanned over a blue-violet gradient, a heavy heading, and a darker action bar. */
function HostCard({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Host a party. Play ${PARTY_MIN_GAMES} to ${PARTY_MAX_GAMES} mini games in a row. Set it up`}
      onPress={onPress}
    >
      <LivingCard colors={cardColors.violet}>
      <View style={{ padding: spacing.lg, paddingBottom: 0, gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SHOWCASE.map((v, i) => (
            <View key={v.id} style={{ borderRadius: 38 * 0.28, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.55)', transform: [{ rotate: `${(i - 2.5) * 4}deg` }] }}>
              <GameThumb variant={v.id} size={38} />
            </View>
          ))}
        </View>
        <Text maxFontSizeMultiplier={1.4} style={{ marginTop: spacing.sm, fontFamily: ROUNDED, fontSize: 28, lineHeight: 32, fontWeight: '800', color: '#ffffff' }}>
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
      </LivingCard>
    </PressableScale>
  );
}
