import { Host, Switch as NativeSwitch } from '@expo/ui';
import { View } from 'react-native';

import { useForcedScheme } from '@/theme';

import { haptic } from './haptics';

/** The switch on the web build. The row shows the title; the label here is for screen readers. */
export function Switch({ value, onValueChange, label }: { value: boolean; onValueChange: (on: boolean) => void; label: string }) {
  // A page that forces its scheme (the dark grain pages) gets a control drawn to match.
  const forced = useForcedScheme();
  return (
    <View accessible accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }}>
      <Host colorScheme={forced ?? undefined} matchContents>
        <NativeSwitch
          value={value}
          onValueChange={(on) => {
            haptic.select();
            onValueChange(on);
          }}
        />
      </Host>
    </View>
  );
}
