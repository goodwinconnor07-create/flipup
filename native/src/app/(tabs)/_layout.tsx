import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { useFriendBox } from '@/state/pals';

// Apple's own tab bar (Liquid Glass on iOS 26): Play, Train and Friends. A party starts from Play with
// friends, and joining a table or party is the round button in Play's title row (the `join` sheet). Tabs are peers,
// so switching never slides.
export default function TabsLayout() {
  // Friend requests and table invites arrive while the app is open (the check runs in the root layout); the
  // Friends tab shows how many are waiting.
  const box = useFriendBox();
  const waiting = box.requests.length + box.invites.length;
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(play)">
        <NativeTabs.Trigger.Icon sf="suit.spade.fill" md="playing_cards" />
        <NativeTabs.Trigger.Label>Play</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(train)">
        <NativeTabs.Trigger.Icon sf="graduationcap.fill" md="school" />
        <NativeTabs.Trigger.Label>Train</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(friends)">
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
        <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
        {/* The web build's tab bar ignores `hidden` and showed a red 0, so there the badge is left out at zero. */}
        {(Platform.OS !== 'web' || waiting > 0) && <NativeTabs.Trigger.Badge hidden={waiting === 0}>{String(waiting)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
