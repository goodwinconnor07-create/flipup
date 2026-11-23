import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

/**
 * Below iOS 26 the tab bar goes see-through when a page sits at its top edge, and the Train page's scroll isn't seen
 * by it, so its content showed through the bar as it scrolled. There the bar keeps its blurred background all the
 * time. iOS 26 draws its own Liquid Glass bar and is left alone.
 */
const OLD_BAR = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) < 26;

// Apple's own tab bar (Liquid Glass on iOS 26), which stays full size when a page scrolls (minimizeBehavior never):
// Play, Train and You (23 Nov 2026, the owner's ask: your profile, stats, Saved hands, Share cards and Settings, in
// place of the face in each tab's corner and Home's round shortcuts). A party starts from Play with friends, and joining a table or party is Play's Join a game (the
// `join` sheet). Tabs are peers, so switching never slides.
export default function TabsLayout() {
  return (
    <NativeTabs minimizeBehavior="never">
      <NativeTabs.Trigger name="(play)">
        <NativeTabs.Trigger.Icon sf="suit.spade.fill" md="playing_cards" />
        <NativeTabs.Trigger.Label>Play</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(train)" disableTransparentOnScrollEdge={OLD_BAR}>
        <NativeTabs.Trigger.Icon sf="graduationcap.fill" md="school" />
        <NativeTabs.Trigger.Label>Train</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(you)">
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
