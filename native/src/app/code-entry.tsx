import { router, Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { CodePad, useCode } from '@/components/code-pad';
import { ThemedText } from '@/components/themed-text';
import { joinParty } from '@/state/party';
import { spacing } from '@/theme';

const KINDS = {
  party: { title: 'Join a party', line: 'Type the 5-letter code from your host.', label: 'Party code' },
} as const;

/** A sheet for typing a party code with the iPhone keyboard. Five letters in, it looks the code up. (Friends are added by username, in `add-friend`.) */
export default function CodeEntry() {
  const k = KINDS.party;
  const state = useCode(async (code) => {
    try {
      await joinParty(code);
      router.back();
      router.navigate('/party-room');
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Couldn't look that up. Try again.";
    }
  });
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xxl, gap: spacing.lg }} bounces={false}>
      {/* No nav bar: its title sat over this one and blurred it. The sheet's own title is the big one below. */}
      <Stack.Screen options={{ title: k.title, headerShown: false }} />
      <View style={{ gap: spacing.xxs }}>
        <ThemedText variant="title1" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {k.title}
        </ThemedText>
        <ThemedText tone="tertiaryLabel" style={{ textAlign: 'center' }}>
          {k.line}
        </ThemedText>
      </View>
      <CodePad state={state} label={k.label} />
    </ScrollView>
  );
}
