import { router, Stack } from 'expo-router';
import { Alert } from 'react-native';

import { UsernameSheet } from '@/components/username-field';
import { requestByUsername } from '@/state/pals';

/** Add a friend by their username: it sends them a friend request, which they accept in their Friends tab. */
export default function AddFriend() {
  return (
    <>
      <Stack.Screen options={{ title: 'Add a friend', headerShown: false }} />
      <UsernameSheet
        title="Add a friend"
        line="Type their username. They'll get a friend request to accept."
        button="Send request"
        run={async (name) => {
          const { status, name: shown } = await requestByUsername(name);
          router.back();
          Alert.alert(status === 'friends' ? `You and ${shown} are friends` : 'Friend request sent', status === 'friends' ? 'They’re in your Friends tab.' : `Once ${shown} accepts, they’ll be in your Friends tab.`);
          return null;
        }}
      />
    </>
  );
}
