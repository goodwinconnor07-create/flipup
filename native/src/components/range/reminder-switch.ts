// Turning the daily reminder on or off, from the Train tab's daily card and from Settings. Turned off for FlipUp in
// iOS Settings earlier, iOS won't ask again, so it says where to turn notifications back on.
import { Alert, Linking } from 'react-native';

import { haptic } from '@/components/haptics';
import { reminderBlocked, setReminder } from '@/state/reminder';

export function toggleReminder(on: boolean) {
  haptic.select();
  if (on)
    void reminderBlocked().then((blocked) => {
      if (!blocked) return;
      Alert.alert('Notifications are off for FlipUp', 'Turn them on in Settings to get the daily reminder.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Settings', onPress: () => void Linking.openSettings() },
      ]);
    });
  void setReminder(on);
}
