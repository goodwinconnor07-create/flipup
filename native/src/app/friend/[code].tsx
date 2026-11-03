import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { useFriendActions } from '@/components/friend-menu';
import { Row, Section } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { usePals } from '@/state/pals';
import { spacing, useColors } from '@/theme';

const since = (at: number) => new Date(at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/** A friend's profile, as a sheet: their emoji big, name and username, how long you've been friends, and Invite. */
export default function FriendProfile() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const pal = usePals().find((p) => p.code === code);
  const colors = useColors();
  const { invite, remove, inviteLabel } = useFriendActions();
  if (!pal) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
        <Stack.Screen options={{ title: 'Friend' }} />
        <ThemedText tone="tertiaryLabel">They’re not on your list any more.</ThemedText>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xl, gap: spacing.xl }}>
      <Stack.Screen options={{ title: pal.name, headerShown: false }} />
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar emoji={pal.emoji} size={120} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <ThemedText variant="title1" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {pal.name}
          </ThemedText>
          {pal.username && (
            <ThemedText variant="body" tone="secondaryLabel">
              @{pal.username}
            </ThemedText>
          )}
        </View>
      </View>
      <Button
        variant="party"
        tint="blue"
        size="lg"
        title={inviteLabel}
        onPress={() => {
          router.back();
          void invite(pal);
        }}
      />
      <Section>
        <Row title="Friends since" detail={since(pal.addedAt)} icon={{ symbol: 'person.2.fill', color: colors.pink as string }} chevron={false} />
      </Section>
      <Section>
        <Row title="Remove friend" destructive chevron={false} onPress={() => remove(pal, () => router.back())} />
      </Section>
    </ScrollView>
  );
}
