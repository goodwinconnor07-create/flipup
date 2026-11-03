import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { CodePad, useCode } from '@/components/code-pad';
import { ThemedText } from '@/components/themed-text';
import { addPal } from '@/state/pals';
import { joinParty } from '@/state/party';
import { spacing } from '@/theme';

const KINDS = {
  party: { title: 'Join a party', line: 'Type the 5-letter code from your host.', label: 'Party code' },
  friend: { title: 'Add a friend', line: 'Type their 5-letter friend code. They find it on their Party tab.', label: 'Friend code' },
} as const;

/** A sheet for typing a party code or a friend code with the iPhone keyboard. Five letters in, it looks the code up. */
export default function CodeEntry() {
  const { kind: raw } = useLocalSearchParams<{ kind?: string }>();
  const kind = raw === 'friend' ? 'friend' : 'party';
  const k = KINDS[kind];
  const state = useCode(async (code) => {
    try {
      if (kind === 'friend') {
        await addPal(code);
        router.back();
      } else {
        await joinParty(code);
        router.back();
        router.navigate('/party-room');
      }
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
