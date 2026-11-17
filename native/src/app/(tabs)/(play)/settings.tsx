import { showToast } from '@/state/toast';
import { userMessage } from '@/state/user-error';
import { router, Stack } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Alert, Linking, Platform, Share } from 'react-native';

import { haptic } from '@/components/haptics';
import { NativeMenu } from '@/components/native-menu';
import type { MenuGroup } from '@/components/native-menu.types';
import { useYouGroups } from '@/components/you-settings';
import { deleteMyData } from '@/state/account';
import { useBlocked } from '@/state/blocks';
import { useLabBots } from '@/state/bot-lab';
import { usePremium } from '@/state/premium';
import { manageSubscription, ON_SALE, restorePremium, storeError, useStore, type StoreState } from '@/state/purchase';

import { APP_INFO } from '../../../../appInfo';

/**
 * Settings, from your profile: how the app looks and sounds (the same rows as the table's menu), then what the App
 * Store asks for (docs/APP_STORE.md): the privacy policy, support and its email, the play-chips line, and Delete my
 * data, which removes the friend code from the server and everything FlipUp keeps on this phone. Drawn as Apple's own
 * grouped list (`NativeMenu`).
 */
export default function SettingsScreen() {
  const [deleting, setDeleting] = useState(false);
  const premium = usePremium();
  const blocked = useBlocked();
  const labCount = useLabBots().length;
  const store = useStore();
  const you = useYouGroups({});
  const restore = async () => {
    if (await restorePremium()) {
      haptic.success();
      Alert.alert('Premium is back', 'Thanks for backing FlipUp.');
    } else {
      // Read after the restore ran: `store` here is the state from before it.
      const error = storeError();
      if (error) showToast(error);
      else Alert.alert('Nothing to restore', 'This Apple Account hasn’t bought FlipUp Premium.');
    }
  };
  // The app's link for sharing and for the rating page.
  const storeUrl = `https://apps.apple.com/app/id${APP_INFO.appStoreId}`;
  const share = () => {
    void Share.share({ message: `Poker night on your phones. Play FlipUp with me: ${storeUrl}`, url: storeUrl }).catch(() => undefined);
  };
  const rate = () => {
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
      showToast(userMessage(e, "Couldn't delete your data. Check your connection and try again."));
    } finally {
      setDeleting(false);
    }
  };
  const ASK = 'This deletes what FlipUp’s server keeps about this phone, leaves any party or table you’re in, and clears your name, emoji, stats, saved hands and settings from this phone. It can’t be undone. Premium turns off on this phone too: Restore Purchases brings it back.';
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

  const groups: MenuGroup[] = [
    ...you,
    {
      id: 'store',
      header: 'FlipUp Premium',
      footer: premium ? planLine(store) : 'Bought Premium before, or on another iPhone? Restore brings it back.',
      items: ON_SALE
        ? [
            { kind: 'button', id: 'restore', title: store.busy ? 'Restoring' : 'Restore Purchases', busy: store.busy, onPress: () => void restore() },
            // Apple's own page for changing or cancelling the plan (App Store Review 3.1.2: easy to find).
            premium && (store.owned === 'monthly' || store.owned === 'yearly') && { kind: 'link', id: 'manage', title: 'Manage subscription', onPress: () => void manageSubscription() },
          ]
        : [],
    },
    {
      id: 'botlab',
      footer: premium ? 'Make your own bots and seat them from + Add Bot in any lobby you host.' : 'Make your own bots and set how they play. Bot Lab comes with Premium.',
      items: [
        premium
          ? { kind: 'link', id: 'botlab', title: 'Bot Lab', symbol: 'flask.fill', detail: labCount ? String(labCount) : undefined, onPress: () => router.push('/bot-lab') }
          : { kind: 'link', id: 'botlab', title: 'Bot Lab', symbol: 'flask.fill', trailingCrown: true, onPress: () => router.push({ pathname: '/premium', params: { reason: 'botlab' } }) },
      ],
    },
    {
      id: 'blocked',
      footer: 'To report or block someone, tap their seat at a table or their row on a party board.',
      items: [{ kind: 'link', id: 'blocked', title: 'Blocked players', detail: blocked.length ? String(blocked.length) : undefined, onPress: () => router.push('/blocked') }],
    },
    {
      id: 'new',
      items: [{ kind: 'link', id: 'new', title: 'What’s New', detail: `Version ${version}${build ? ` (${build})` : ''}`, onPress: () => router.push('/whats-new') }],
    },
    {
      id: 'help',
      header: 'Help and privacy',
      footer: "Play chips only. They have no cash value and can't be bought or won.",
      items: [
        { kind: 'link', id: 'privacy', title: 'Privacy policy', onPress: () => open(APP_INFO.privacyUrl) },
        { kind: 'link', id: 'help', title: 'Help', onPress: () => router.push('/help') },
        { kind: 'button', id: 'share', title: 'Share FlipUp', symbol: 'square.and.arrow.up', onPress: share },
        { kind: 'link', id: 'rate', title: 'Rate FlipUp', onPress: rate },
        { kind: 'link', id: 'support', title: 'Support', onPress: () => open(APP_INFO.supportUrl) },
        { kind: 'link', id: 'email', title: 'Email us', subtitle: APP_INFO.supportEmail, onPress: () => void Linking.openURL(`mailto:${APP_INFO.supportEmail}?subject=${encodeURIComponent('FlipUp')}`) },
      ],
    },
    {
      id: 'delete',
      footer: `Deletes what FlipUp's server keeps about this phone and everything the app keeps on it.\n\nFlipUp ${version}${build ? ` (${build})` : ''}${store.storefront ? ` · App Store ${store.storefront}` : ''}`,
      items: [{ kind: 'button', id: 'delete', title: deleting ? 'Deleting' : 'Delete my data', destructive: true, busy: deleting, onPress: confirmDelete }],
    },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <NativeMenu groups={groups} />
    </>
  );
}

/** "Yearly plan · renews 12 Dec 2026", "Monthly plan · ends 3 Jan 2027", or the old one-time purchase. */
function planLine(store: StoreState): string {
  if (store.owned === 'lifetime') return 'Premium for good, from the one-time purchase.';
  if (store.owned !== 'monthly' && store.owned !== 'yearly') return 'Unlocked on this phone.';
  const plan = store.owned === 'yearly' ? 'Yearly plan' : 'Monthly plan';
  if (!store.period) return plan + '.';
  const day = new Date(store.period.ends).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${plan} · ${store.period.renews === false ? 'ends' : 'renews'} ${day}.`;
}
