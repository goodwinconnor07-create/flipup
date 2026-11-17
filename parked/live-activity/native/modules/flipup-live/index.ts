// FlipUp's Live Activity module (iPhone only): starts, updates and ends a table's Live Activity and reports the push
// token Apple gives it, which the app hands to the table so the server can keep it up to date. Null when the module
// isn't in this build (the web, Expo Go, or an older build): the app then simply has no Live Activity.
import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export interface RunningActivity {
  id: string;
  code: string;
}

export interface PushTokenEvent {
  id: string;
  code: string;
  token: string;
}

interface FlipupLive {
  /** Live Activities are allowed for FlipUp (Settings > FlipUp > Live Activities). */
  isEnabled(): boolean;
  /** Starts one from JSON: the fixed attributes and the first state. Returns its id. */
  start(attributes: string, state: string): Promise<string>;
  update(id: string, state: string): Promise<void>;
  /** Ends one (or every one, with a null id). With a state, it shows that for a minute first. */
  end(id: string | null, state: string | null): Promise<void>;
  running(): RunningActivity[];
  /** The latest push token for an activity, if Apple has given one yet. */
  tokenOf(id: string): string | null;
  addListener(event: 'onPushToken', listener: (e: PushTokenEvent) => void): EventSubscription;
}

export const FlipupLive = process.env.EXPO_OS === 'ios' ? requireOptionalNativeModule<FlipupLive>('FlipupLive') : null;
