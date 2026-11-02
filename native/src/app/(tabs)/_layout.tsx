import { NativeTabs } from 'expo-router/unstable-native-tabs';

// Apple's own tab bar (Liquid Glass on iOS 26). Tabs are peers, so switching never slides. Join is the search-role
// tab, which iOS 26 sets apart from the bar as its own round button: the round "Join with a code" button the plan
// asks for. Below iOS 26 it's the last tab.
export default function TabsLayout() {
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
      <NativeTabs.Trigger name="(join)" role="search">
        <NativeTabs.Trigger.Icon sf="circle.grid.3x3.fill" md="dialpad" />
        <NativeTabs.Trigger.Label>Join</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
