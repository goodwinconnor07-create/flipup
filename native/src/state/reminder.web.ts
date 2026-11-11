// The web build has no local notifications: the reminder is never offered there.
export const REMINDER_HOUR = 18;
export interface Reminder {
  on: boolean;
  hour: number;
}
export const useReminder = (): Reminder => ({ on: false, hour: REMINDER_HOUR });
export const setReminder = async (_on: boolean, _hour?: number): Promise<boolean> => false;
export const useReminderTaps = (_open: (url: string) => void): void => undefined;
