import { router, Stack } from 'expo-router';
import { ScrollView } from 'react-native';

import { PartyPanel } from '@/components/party/panel';
import { ThemedText } from '@/components/themed-text';
import { forgetParty } from '@/state/party';
import { useTable } from '@/state/session';
import { spacing } from '@/theme';

/** The party standings over a party table, from the round pill in its bar. */
export default function PartySheet() {
  const code = useTable().game?.party?.code;
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl }}>
      <Stack.Screen options={{ title: 'Party' }} />
      {code ? (
        <PartyPanel
          code={code}
          place="sheet"
          onGone={() => {
            forgetParty();
            router.back();
          }}
        />
      ) : (
        <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center' }}>
          This table isn&apos;t part of a party.
        </ThemedText>
      )}
    </ScrollView>
  );
}
