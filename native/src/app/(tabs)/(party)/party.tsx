import { router, Stack } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';

import { GameThumb } from '@/components/game-picture';
import { Row, Section } from '@/components/grouped-list';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { PARTY_MAX_GAMES, PARTY_MIN_GAMES, VARIANTS } from '@/engine';
import { usePartyRef } from '@/state/party';
import { useProfile } from '@/state/profile';
import { gradient, party, radius, spacing, useColors, useShadows } from '@/theme';

const SHOWCASE = VARIANTS.slice(0, 6);
/** The web's host card: blue to violet. */
const HOST = `linear-gradient(150deg, #4aa3ff 0%, ${party.blue} 50%, #7b3df0 100%)`;

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
