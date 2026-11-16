import { NativeTabs } from 'expo-router/native-tabs';

// Apple's own tab bar (Liquid Glass on iOS 26), which stays full size when a page scrolls (minimizeBehavior never):
// Play and Train. A party starts from Play with friends, and joining a table or party is Play's Join a game (the
// `join` sheet). Tabs are peers, so switching never slides.
export default function TabsLayout() {
  return (
    <NativeTabs minimizeBehavior="never">
      <NativeTabs.Trigger name="(play)">
        <NativeTabs.Trigger.Icon sf="suit.spade.fill" md="playing_cards" />
        <NativeTabs.Trigger.Label>Play</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(train)">
        <NativeTabs.Trigger.Icon sf="graduationcap.fill" md="school" />
        <NativeTabs.Trigger.Label>Train</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
