import { router, Stack } from 'expo-router';

import { UsernameSheet } from '@/components/username-field';
import { setMyUsername, useMyUsername } from '@/state/pals';

/** Whether a username set at `nextChange - a month` is still locked. Outside the component: it reads the clock. */
const stillLocked = (nextChange: number) => nextChange > Date.now();
const day = (at: number) => new Date(at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

/** Choose your username, or change it (once a month). Friends add you by it; your name at the table stays your own. */
export default function UsernameScreen() {
  const { username, nextChange } = useMyUsername();
  const locked = !!username && stillLocked(nextChange);
  return (
    <>
      <Stack.Screen options={{ title: 'Username', headerShown: false }} />
      <UsernameSheet
        title={username ? 'Change your username' : 'Choose a username'}
        line={
          locked
            ? `You can change it again on ${day(nextChange)}.`
            : username
              ? 'You can change it once a month. Your friends stay your friends.'
              : 'Friends add you by it. Your name at the table stays separate.'
        }
        button={username ? 'Save' : 'Choose'}
        start={username ?? ''}
        run={async (name) => {
          await setMyUsername(name);
          router.back();
          return null;
        }}
      />
    </>
  );
}
