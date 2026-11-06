import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { FRIENDS_ON } from '@/scope';
import { useFriendBox } from '@/state/pals';

// Apple's own tab bar (Liquid Glass on iOS 26): Play, Party, Friends and Join. Tabs are peers, so switching never slides. Join is the search-role
// tab, which iOS 26 sets apart from the bar as its own round button: the round "Join with a code" button the plan
// asks for. Below iOS 26 it's the last tab.
export default function TabsLayout() {
  // Friend requests and table invites arrive while the app is open (the check runs in the root layout); the
  // Friends tab shows how many are waiting. The tab is hidden while friends are off (scope.ts).
  const box = useFriendBox();
  const waiting = box.requests.length + box.invites.length;
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(play)">
        <NativeTabs.Trigger.Icon sf="suit.spade.fill" md="playing_cards" />
        <NativeTabs.Trigger.Label>Play</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(party)">
        <NativeTabs.Trigger.Icon sf="person.3.fill" md="groups" />
        <NativeTabs.Trigger.Label>Party</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(friends)" hidden={!FRIENDS_ON}>
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
        <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
        {/* The web build's tab bar ignores `hidden` and showed a red 0, so there the badge is left out at zero. */}
        {(Platform.OS !== 'web' || waiting > 0) && <NativeTabs.Trigger.Badge hidden={waiting === 0}>{String(waiting)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(join)" role="search">
        <NativeTabs.Trigger.Icon sf="circle.grid.3x3.fill" md="dialpad" />
        <NativeTabs.Trigger.Label>Join</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
