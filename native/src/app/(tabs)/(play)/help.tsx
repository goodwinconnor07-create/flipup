import { Stack } from 'expo-router';
import { Linking } from 'react-native';

import { NativeMenu } from '@/components/native-menu';
import { HELP } from '@/data/help';

import { APP_INFO } from '../../../../appInfo';

/**
 * Settings > Help: the questions people ask most, in groups, each opening its answer under it like Apple's own
 * disclosure rows. Still stuck? There's the support email at the bottom.
 */
export default function HelpScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Help' }} />
      <NativeMenu
        groups={[
          ...HELP.map((section) => ({
            id: section.id,
            header: section.title,
            items: section.items.map((it) => ({ kind: 'faq' as const, id: it.q, title: it.q, text: it.a })),
          })),
          {
            id: 'stuck',
            header: 'Still stuck?',
            footer: 'Email us and we’ll help. Tell us your iPhone model and the version at the bottom of Settings.',
            items: [{ kind: 'link', id: 'mail', title: APP_INFO.supportEmail, chevron: false, onPress: () => void Linking.openURL(`mailto:${APP_INFO.supportEmail}?subject=${encodeURIComponent('FlipUp help')}`) }],
          },
        ]}
      />
    </>
  );
}
