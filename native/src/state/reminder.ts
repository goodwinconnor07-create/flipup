// The daily quiz reminder (off until you turn it on): one local notification a day, "Today's hand is ready", at
// the hour you pick. Scheduled on the phone with expo-notifications; nothing goes to a server and there's no push.
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { save, useStored } from './storage';

const KEY = 'flipup.dailyreminder';
const ID = 'daily-quiz';
/** Six in the evening: after work and school, before a night's poker. */
export const REMINDER_HOUR = 18;

export interface Reminder {
  on: boolean;
  hour: number;
}

export const useReminder = (): Reminder => {
  const r = useStored<Partial<Reminder> | null>(KEY, null);
  return { on: r?.on === true, hour: typeof r?.hour === 'number' ? r.hour : REMINDER_HOUR };
};

/**
 * Turns the reminder on (asking iOS for permission the first time) or off. Resolves to whether it's on now: false
 * when permission was refused, so the switch goes back.
 */
export async function setReminder(on: boolean, hour: number = REMINDER_HOUR): Promise<boolean> {
  try {
    await Notifications.cancelScheduledNotificationAsync(ID).catch(() => undefined);
    if (!on) {
      save(KEY, { on: false, hour });
      return false;
    }
    const asked = await Notifications.getPermissionsAsync();
    const granted = asked.granted || (asked.canAskAgain && (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })).granted);
    if (!granted) {
      save(KEY, { on: false, hour });
      return false;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: { title: 'Today’s hand is ready', body: 'A new hand, the same for everyone. Keep your streak going.', data: { url: '/train' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
    });
    save(KEY, { on: true, hour });
    return true;
  } catch {
    save(KEY, { on: false, hour });
    return false;
  }
}

/** A tap on the reminder opens the Train tab. Mounted once, in the root layout. */
export function useReminderTaps(open: (url: string) => void): void {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const url = r.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) open(url);
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
