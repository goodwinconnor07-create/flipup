import { router, Stack } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';

import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { YouSettings } from '@/components/you-settings';
import { deleteMyData } from '@/state/account';
import { spacing, useColors } from '@/theme';

import { APP_INFO } from '../../../../appInfo';

/**
 * Settings, from your profile: how the app looks and sounds (the same rows as the table's menu), then what the App
 * Store asks for (docs/APP_STORE.md): the privacy policy, support and its email, the play-chips line, and Delete my
 * data, which removes the friend code from the server and everything FlipUp keeps on this phone.
 */
export default function SettingsScreen() {
  const colors = useColors();
  const [deleting, setDeleting] = useState(false);
  const open = (url: string) => void openBrowserAsync(url).catch(() => Linking.openURL(url));

  const run = async () => {
    setDeleting(true);
    try {
      await deleteMyData();
      haptic.success();
      Alert.alert('Your data is deleted', 'FlipUp starts fresh the next time you open it.');
      router.dismissTo('/');
    } catch (e) {
      haptic.failure();
      Alert.alert("Couldn't delete your data", e instanceof Error ? e.message : 'Check your connection and try again.');
    } finally {
      setDeleting(false);
    }
  };
  const ASK = 'This deletes your friend code, leaves any party or table you’re in, and clears your name, emoji, friends, streak and settings from this phone. It can’t be undone. Premium stays: Restore brings it back.';
  const confirmDelete = () => {
    // The web build's Alert has no buttons, so it asks with the browser's own confirm.
    if (process.env.EXPO_OS === 'web') {
      if (window.confirm(`Delete your data? ${ASK}`)) void run();
      return;
    }
    Alert.alert('Delete your data?', ASK, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void run() },
    ]);
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xl }}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <YouSettings />

      <Section header="Help and privacy" footer="Play chips only. They have no cash value and can't be bought or won.">
        <Row title="Privacy policy" icon={{ symbol: 'hand.raised.fill', color: colors.accent as string }} onPress={() => open(APP_INFO.privacyUrl)} />
        <Row title="Support" icon={{ symbol: 'lifepreserver.fill', color: colors.green as string }} onPress={() => open(APP_INFO.supportUrl)} />
        <Row
          title="Email us"
          subtitle={APP_INFO.supportEmail}
          icon={{ symbol: 'envelope.fill', color: colors.indigo as string }}
          onPress={() => void Linking.openURL(`mailto:${APP_INFO.supportEmail}?subject=${encodeURIComponent('FlipUp')}`)}
        />
      </Section>

      <Section footer="Deletes your friend code from FlipUp's server and everything the app keeps on this phone.">
        <Row
          title={deleting ? 'Deleting…' : 'Delete my data'}
          icon={{ symbol: 'trash.fill', color: colors.red as string }}
          destructive
          chevron={false}
          trailing={deleting ? <ActivityIndicator /> : undefined}
          onPress={deleting ? undefined : confirmDelete}
        />
      </Section>
    </ScrollView>
  );
}
