import { Stack } from 'expo-router';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

import { NativeMenu } from '@/components/native-menu';
import { RELEASES } from '@/data/whats-new';

/**
 * Settings > What's New: the version this phone is running, then what's new in each release, newest first.
 * The text lives in `data/whats-new.ts`; the App Store release notes use the same lines.
 */
export default function WhatsNewScreen() {
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';
  const build = Application.nativeBuildVersion;
  return (
    <>
      <Stack.Screen options={{ title: 'What’s New' }} />
      <NativeMenu
        groups={[
          { id: 'running', header: 'You’re running', items: [{ kind: 'value', id: 'v', title: 'FlipUp', detail: `${version}${build ? ` (${build})` : ''}` }] },
          ...RELEASES.map((release, index) => ({
            id: release.version,
            header: `Version ${release.version} · ${index === 0 ? `Latest · ${release.label}` : release.label}`,
            items: release.items.map((item) => ({ kind: 'info' as const, id: item.title, title: item.title, text: item.text, symbol: item.icon })),
          })),
        ]}
      />
    </>
  );
}
