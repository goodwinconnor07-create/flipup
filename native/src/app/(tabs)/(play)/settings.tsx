import { router, Stack } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, Share } from 'react-native';

import { Row, Section } from '@/components/grouped-list';
import { haptic } from '@/components/haptics';
import { YouSettings } from '@/components/you-settings';
import { deleteMyData } from '@/state/account';
import { useBlocked } from '@/state/blocks';
import { usePremium } from '@/state/premium';
import { ON_SALE, restorePremium, useStore } from '@/state/purchase';
import { ThemedText } from '@/components/themed-text';
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
  const premium = usePremium();
  const blocked = useBlocked();
  const store = useStore();
  const restore = async () => {
    if (await restorePremium()) {
      haptic.success();
      Alert.alert('Premium is back', 'Thanks for backing FlipUp.');
    } else Alert.alert(store.error ? "Couldn't reach the App Store" : 'Nothing to restore', store.error ?? 'This Apple Account hasn’t bought FlipUp Premium.');
  };
  // The app's link for sharing and for the rating page.
  const storeUrl = `https://apps.apple.com/app/id${APP_INFO.appStoreId}`;
  const share = () => {
    haptic.tap();
    void Share.share({ message: `Poker night on your phones. Play FlipUp with me: ${storeUrl}`, url: storeUrl }).catch(() => undefined);
  };
  const rate = () => {
    haptic.tap();
    const review = `itms-apps://apps.apple.com/app/id${APP_INFO.appStoreId}?action=write-review`;
    void Linking.openURL(Platform.OS === 'ios' ? review : storeUrl).catch(() => Linking.openURL(storeUrl));
  };
  // Version and build, so a screenshot sent to support says which one it is.
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';
  const build = Application.nativeBuildVersion;
  const open = (url: string) => void openBrowserAsync(url).catch(() => Linking.openURL(url));

  const run = async () => {
    setDeleting(true);
    try {
      await deleteMyData();
      haptic.success();
      Alert.alert('Your data is deleted', 'Your profile, settings and device identity have been reset.');
      router.dismissTo('/');
    } catch (e) {
      haptic.failure();
      Alert.alert("Couldn't delete your data", e instanceof Error ? e.message : 'Check your connection and try again.');
    } finally {
      setDeleting(false);
    }
  };
  const ASK = 'This deletes your friend code, leaves any party or table you’re in, and clears your name, emoji, friends and settings from this phone. It can’t be undone. Premium stays: Restore brings it back.';
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

      {ON_SALE && (
        <Section header="FlipUp Premium" footer={premium ? 'Unlocked on this phone.' : 'Bought Premium before, or on another iPhone? Restore brings it back.'}>
          <Row
            title={store.busy ? 'Restoring…' : 'Restore Purchases'}
            icon={{ symbol: 'arrow.clockwise', color: colors.gold as string }}
            chevron={false}
            trailing={store.busy ? <ActivityIndicator /> : undefined}
            onPress={store.busy ? undefined : () => void restore()}
          />
        </Section>
      )}

      <Section footer="To report or block someone, tap their seat at a table or their row on a party board.">
        <Row title="Blocked players" detail={blocked.length ? String(blocked.length) : undefined} icon={{ symbol: 'hand.raised.slash.fill', color: colors.red as string }} onPress={() => router.push('/blocked')} />
      </Section>

      <Section header="Help and privacy" footer="Play chips only. They have no cash value and can't be bought or won.">
        <Row title="Privacy policy" icon={{ symbol: 'hand.raised.fill', color: colors.accent as string }} onPress={() => open(APP_INFO.privacyUrl)} />
        <Row title="Share FlipUp" icon={{ symbol: 'square.and.arrow.up', color: colors.accent as string }} chevron={false} onPress={share} />
        <Row title="Rate FlipUp" icon={{ symbol: 'star.fill', color: colors.gold as string }} onPress={rate} />
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

      <ThemedText variant="footnote" tone="tertiaryLabel" style={{ textAlign: 'center' }} selectable>
        FlipUp {version}
        {build ? ` (${build})` : ''}
      </ThemedText>
    </ScrollView>
  );
}
